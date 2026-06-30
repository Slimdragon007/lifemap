import type {
  CalendarLayer,
  DateCategory,
  FamilyEvent,
  FamilyMember,
  RecurringCareItem,
  VaultCategory,
  VaultItem,
  VaultItemFile,
} from "./familyOS";
import { type FieldCrypto, identityFieldCrypto } from "./field-crypto";

// Per-user, RLS-protected data layer for the sensitive family collections that
// V1 must durably store (tables defined in supabase/migrations/0003_family_data.sql).
//
// Like src/remoteState.ts, this talks to the **anon-key** Supabase client only —
// never the service role. Row-Level Security ("auth.uid() = user_id") is what
// actually isolates each household's data, so every read is implicitly scoped to
// the signed-in user and every write carries the user_id the policy checks. The
// explicit .eq("user_id", …) on writes/deletes is defense-in-depth alongside RLS.
//
// Rows are snake_case (Postgres); the app types are camelCase. The mappers below
// are the single seam between the two so the rest of the app never sees a raw row.

export type FamilyCollections = {
  familyMembers: FamilyMember[];
  familyEvents: FamilyEvent[];
  vaultItems: VaultItem[];
  recurringCareItems: RecurringCareItem[];
};

export const EMPTY_COLLECTIONS: FamilyCollections = {
  familyMembers: [],
  familyEvents: [],
  vaultItems: [],
  recurringCareItems: [],
};

export type FamilyTable =
  | "family_members"
  | "family_events"
  | "vault_items"
  | "vault_item_files"
  | "recurring_care_items";

type QueryResult = {
  data: unknown;
  error: { message?: string } | null;
};

// Minimal structural view of the Supabase query builder — only the chains this
// module uses. The real client is cast to this at the call site (as remoteState
// does) so unit tests can supply a fake without pulling in @supabase/supabase-js.
export type FamilyDataClient = {
  from: (table: FamilyTable) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<QueryResult>;
    };
    upsert: (
      payload: Record<string, unknown>,
      options: { onConflict: "id" },
    ) => {
      select: (columns: string) => {
        maybeSingle: () => Promise<QueryResult>;
      };
    };
    delete: () => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (column: string, value: string) => Promise<QueryResult>;
      };
    };
  };
};

export type LoadFamilyResult =
  | { ok: true; collections: FamilyCollections }
  | { ok: false; collections: FamilyCollections; error: string };

type WriteResult<T> = { ok: true; item: T } | { ok: false; error: string };
type DeleteResult = { ok: true } | { ok: false; error: string };

const FAILED_LOAD = "LifeMap could not load your family data.";
const FAILED_SAVE = "LifeMap could not save that change.";
const FAILED_DELETE = "LifeMap could not remove that item.";

// ── Load ───────────────────────────────────────────────────────────────────

export async function loadFamilyCollections(
  userId: string,
  client: FamilyDataClient,
  crypto: FieldCrypto = identityFieldCrypto,
): Promise<LoadFamilyResult> {
  // Each read is scoped to userId; RLS guarantees no cross-user leakage.
  const [members, events, vault, files, care] = await Promise.all([
    readTable(client, "family_members", userId),
    readTable(client, "family_events", userId),
    readTable(client, "vault_items", userId),
    readTable(client, "vault_item_files", userId),
    readTable(client, "recurring_care_items", userId),
  ]);

  const failure = [members, events, vault, files, care].find((r) => !r.ok);
  if (failure && !failure.ok) {
    return { ok: false, collections: EMPTY_COLLECTIONS, error: failure.error };
  }

  const vaultFiles = rowsOf(files).map(mapVaultFileRow);
  const filesByVaultId = groupVaultFilesByItem(vaultFiles);

  // family_members and vault_items carry encrypted fields, so their mappers are
  // async; events and care items have no sensitive columns.
  const [familyMembers, vaultItems] = await Promise.all([
    Promise.all(rowsOf(members).map((row) => mapMemberRow(row, crypto))),
    Promise.all(
      rowsOf(vault).map(async (row) => {
        const item = await mapVaultRow(row, crypto);
        const itemFiles = filesByVaultId.get(item.id);
        return itemFiles?.length ? { ...item, files: itemFiles } : item;
      }),
    ),
  ]);

  return {
    ok: true,
    collections: {
      familyMembers,
      familyEvents: rowsOf(events).map(mapEventRow),
      vaultItems,
      recurringCareItems: rowsOf(care).map(mapCareRow),
    },
  };
}

type ReadResult =
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; error: string };

async function readTable(
  client: FamilyDataClient,
  table: FamilyTable,
  userId: string,
): Promise<ReadResult> {
  const result = await client.from(table).select("*").eq("user_id", userId);

  if (result.error) {
    return { ok: false, error: result.error.message ?? FAILED_LOAD };
  }

  const rows = Array.isArray(result.data)
    ? (result.data.filter(isRecord) as Record<string, unknown>[])
    : [];
  return { ok: true, rows };
}

function rowsOf(result: ReadResult): Record<string, unknown>[] {
  return result.ok ? result.rows : [];
}

// ── Per-entity writes ────────────────────────────────────────────────────────

export async function upsertFamilyMember(
  userId: string,
  member: FamilyMember,
  client: FamilyDataClient,
  crypto: FieldCrypto = identityFieldCrypto,
): Promise<WriteResult<FamilyMember>> {
  return writeRow(
    client,
    "family_members",
    await memberToRow(userId, member, crypto),
    (row) => mapMemberRow(row, crypto),
  );
}

export async function upsertFamilyEvent(
  userId: string,
  event: FamilyEvent,
  client: FamilyDataClient,
): Promise<WriteResult<FamilyEvent>> {
  return writeRow(
    client,
    "family_events",
    eventToRow(userId, event),
    mapEventRow,
  );
}

export async function upsertVaultItem(
  userId: string,
  item: VaultItem,
  client: FamilyDataClient,
  crypto: FieldCrypto = identityFieldCrypto,
): Promise<WriteResult<VaultItem>> {
  return writeRow(
    client,
    "vault_items",
    await vaultToRow(userId, item, crypto),
    (row) => mapVaultRow(row, crypto),
  );
}

export async function upsertVaultItemFile(
  userId: string,
  file: VaultItemFile,
  client: FamilyDataClient,
): Promise<WriteResult<VaultItemFile>> {
  return writeRow(
    client,
    "vault_item_files",
    vaultFileToRow(userId, file),
    mapVaultFileRow,
  );
}

export async function upsertRecurringCareItem(
  userId: string,
  item: RecurringCareItem,
  client: FamilyDataClient,
): Promise<WriteResult<RecurringCareItem>> {
  return writeRow(
    client,
    "recurring_care_items",
    careToRow(userId, item),
    mapCareRow,
  );
}

async function writeRow<T>(
  client: FamilyDataClient,
  table: FamilyTable,
  payload: Record<string, unknown>,
  map: (row: Record<string, unknown>) => T | Promise<T>,
): Promise<WriteResult<T>> {
  const result = await client
    .from(table)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .maybeSingle();

  if (result.error || !isRecord(result.data)) {
    return {
      ok: false,
      error: result.error?.message ?? FAILED_SAVE,
    };
  }

  return { ok: true, item: await map(result.data) };
}

// ── Per-entity deletes ───────────────────────────────────────────────────────

export async function deleteFamilyRow(
  userId: string,
  table: FamilyTable,
  id: string,
  client: FamilyDataClient,
): Promise<DeleteResult> {
  const result = await client
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (result.error) {
    return { ok: false, error: result.error.message ?? FAILED_DELETE };
  }

  return { ok: true };
}

const FAMILY_TABLES: FamilyTable[] = [
  "vault_item_files",
  "family_members",
  "family_events",
  "vault_items",
  "recurring_care_items",
];

// Wipes every row this user owns across all family tables — the data half
// of a real-account "Clear my map / start fresh". RLS already scopes each delete
// to auth.uid(); the explicit .eq("user_id", …) is defense-in-depth (mirrors the
// per-row deletes). Returns the first error encountered, if any.
export async function deleteAllFamilyData(
  userId: string,
  client: FamilyDataClient,
): Promise<DeleteResult> {
  const results = await Promise.all(
    // The single .eq("user_id") filter is itself the awaitable query (the
    // Supabase builder is a thenable at each stage); cast to the awaited result.
    FAMILY_TABLES.map(
      (table) =>
        client
          .from(table)
          .delete()
          .eq("user_id", userId) as unknown as Promise<QueryResult>,
    ),
  );

  const failure = results.find((result) => result.error);
  if (failure?.error) {
    return { ok: false, error: failure.error.message ?? FAILED_DELETE };
  }

  return { ok: true };
}

// ── Row ↔ type mappers ───────────────────────────────────────────────────────
//
// id is included in the write payload only when it's a real DB uuid; for items
// the AI just created (temp ids like "ai-vault-…") we omit it so Postgres mints
// a uuid, and the caller re-reads the returned row to learn the durable id.

async function memberToRow(
  userId: string,
  member: FamilyMember,
  crypto: FieldCrypto,
): Promise<Record<string, unknown>> {
  // details / care_notes are SENSITIVE jsonb arrays: serialize then encrypt, and
  // store the ciphertext as a jsonb string scalar.
  return withId(member.id, {
    user_id: userId,
    name: member.name,
    role: member.role,
    initials: member.initials,
    profile_type: member.profileType,
    details: await crypto.encrypt(JSON.stringify(member.details ?? [])),
    care_notes: await crypto.encrypt(JSON.stringify(member.careNotes ?? [])),
    updated_at: nowIso(),
  });
}

async function mapMemberRow(
  row: Record<string, unknown>,
  crypto: FieldCrypto,
): Promise<FamilyMember> {
  return {
    id: str(row.id),
    name: str(row.name),
    role: str(row.role),
    initials: str(row.initials),
    profileType: (str(row.profile_type) ||
      "adult") as FamilyMember["profileType"],
    details: (await decodeJsonArray(
      row.details,
      crypto,
    )) as FamilyMember["details"],
    careNotes: (await decodeJsonArray(row.care_notes, crypto)) as string[],
  };
}

// Decodes a sensitive jsonb-array column that may be: a legacy plaintext array
// (older rows), an encrypted `v1:` string, or a plaintext JSON string. Always
// returns an array.
async function decodeJsonArray(
  raw: unknown,
  crypto: FieldCrypto,
): Promise<unknown[]> {
  if (Array.isArray(raw)) {
    return raw; // legacy jsonb array, pre-encryption
  }
  if (typeof raw !== "string" || !raw) {
    return [];
  }
  const decoded = await crypto.decrypt(raw);
  if (!decoded) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function eventToRow(
  userId: string,
  event: FamilyEvent,
): Record<string, unknown> {
  return withId(event.id, {
    user_id: userId,
    title: event.title,
    event_date: event.date,
    event_time: event.time,
    layer: event.layer,
    owner: event.owner,
    source: event.source,
    needs_prep: event.needsPrep ?? null,
    // Important Dates: default to the back-compat values so rows created before
    // 0006 (and demo/local events) round-trip unchanged.
    event_category: event.eventCategory ?? "generic",
    is_annual: event.isAnnual ?? false,
    updated_at: nowIso(),
  });
}

function mapEventRow(row: Record<string, unknown>): FamilyEvent {
  const needsPrep = str(row.needs_prep);
  // "generic" (the column default) means "not an Important Date" → leave
  // eventCategory absent so the app treats it like any other calendar event.
  const category = str(row.event_category);
  const eventCategory =
    category && category !== "generic" ? (category as DateCategory) : undefined;
  return {
    id: str(row.id),
    title: str(row.title),
    date: str(row.event_date),
    time: str(row.event_time),
    layer: (str(row.layer) || "admin") as CalendarLayer,
    owner: str(row.owner),
    source: str(row.source),
    ...(needsPrep ? { needsPrep } : {}),
    ...(eventCategory ? { eventCategory } : {}),
    ...(row.is_annual === true ? { isAnnual: true } : {}),
  };
}

async function vaultToRow(
  userId: string,
  item: VaultItem,
  crypto: FieldCrypto,
): Promise<Record<string, unknown>> {
  return withId(item.id, {
    user_id: userId,
    title: item.title,
    category: item.category,
    owner: item.owner,
    status: item.status,
    detail: await crypto.encrypt(item.detail), // SENSITIVE: policy/ID numbers
    renewal_date: item.renewalDate ?? null,
    linked_event_id: linkedEventIdForRow(item.linkedEventId),
    updated_at: nowIso(),
  });
}

async function mapVaultRow(
  row: Record<string, unknown>,
  crypto: FieldCrypto,
): Promise<VaultItem> {
  const renewalDate = str(row.renewal_date);
  const linkedEventId = str(row.linked_event_id);
  return {
    id: str(row.id),
    title: str(row.title),
    category: (str(row.category) || "identity") as VaultCategory,
    owner: str(row.owner),
    status: (str(row.status) || "Current") as VaultItem["status"],
    detail: await crypto.decrypt(str(row.detail)),
    ...(renewalDate ? { renewalDate } : {}),
    ...(linkedEventId ? { linkedEventId } : {}),
  };
}

function vaultFileToRow(
  userId: string,
  file: VaultItemFile,
): Record<string, unknown> {
  return withId(file.id, {
    user_id: userId,
    vault_item_id: file.vaultItemId,
    bucket_id: file.bucketId,
    object_path: file.objectPath,
    encryption_version: file.encryptionVersion,
    encryption_iv: file.encryptionIv,
    original_name: file.originalName,
    mime_type: file.mimeType,
    byte_size: file.byteSize,
    encrypted_byte_size: file.encryptedByteSize,
    updated_at: nowIso(),
  });
}

function mapVaultFileRow(row: Record<string, unknown>): VaultItemFile {
  return {
    id: str(row.id),
    vaultItemId: str(row.vault_item_id),
    bucketId: "lifemap-documents",
    objectPath: str(row.object_path),
    encryptionVersion: "file-v1",
    encryptionIv: str(row.encryption_iv),
    originalName: str(row.original_name),
    mimeType: str(row.mime_type),
    byteSize: num(row.byte_size),
    encryptedByteSize: num(row.encrypted_byte_size),
  };
}

function groupVaultFilesByItem(
  files: VaultItemFile[],
): Map<string, VaultItemFile[]> {
  const grouped = new Map<string, VaultItemFile[]>();
  for (const file of files) {
    const current = grouped.get(file.vaultItemId) ?? [];
    current.push(file);
    grouped.set(file.vaultItemId, current);
  }
  return grouped;
}

function careToRow(
  userId: string,
  item: RecurringCareItem,
): Record<string, unknown> {
  return withId(item.id, {
    user_id: userId,
    title: item.title,
    cadence: item.cadence,
    owner: item.owner,
    next_due: item.nextDue,
    category: item.category,
    updated_at: nowIso(),
  });
}

function mapCareRow(row: Record<string, unknown>): RecurringCareItem {
  return {
    id: str(row.id),
    title: str(row.title),
    cadence: str(row.cadence),
    owner: str(row.owner),
    nextDue: str(row.next_due),
    category: (str(row.category) ||
      "document") as RecurringCareItem["category"],
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

// linked_event_id is a uuid FK; a temp client id (e.g. "event-passport" or
// "ai-event-…") would violate the column type, so only persist real uuids.
function linkedEventIdForRow(value: string | undefined): string | null {
  return value && isUuid(value) ? value : null;
}

function withId(
  id: string | undefined,
  row: Record<string, unknown>,
): Record<string, unknown> {
  return id && isUuid(id) ? { ...row, id } : row;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function nowIso(): string {
  return new Date().toISOString();
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
