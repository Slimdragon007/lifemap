import type {
  CalendarLayer,
  FamilyEvent,
  FamilyMember,
  RecurringCareItem,
  VaultCategory,
  VaultItem,
} from "./familyOS";

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

const EMPTY_COLLECTIONS: FamilyCollections = {
  familyMembers: [],
  familyEvents: [],
  vaultItems: [],
  recurringCareItems: [],
};

export type FamilyTable =
  | "family_members"
  | "family_events"
  | "vault_items"
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
): Promise<LoadFamilyResult> {
  // Each read is scoped to userId; RLS guarantees no cross-user leakage.
  const [members, events, vault, care] = await Promise.all([
    readTable(client, "family_members", userId),
    readTable(client, "family_events", userId),
    readTable(client, "vault_items", userId),
    readTable(client, "recurring_care_items", userId),
  ]);

  const failure = [members, events, vault, care].find((r) => !r.ok);
  if (failure && !failure.ok) {
    return { ok: false, collections: EMPTY_COLLECTIONS, error: failure.error };
  }

  return {
    ok: true,
    collections: {
      familyMembers: rowsOf(members).map(mapMemberRow),
      familyEvents: rowsOf(events).map(mapEventRow),
      vaultItems: rowsOf(vault).map(mapVaultRow),
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
): Promise<WriteResult<FamilyMember>> {
  return writeRow(
    client,
    "family_members",
    memberToRow(userId, member),
    mapMemberRow,
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
): Promise<WriteResult<VaultItem>> {
  return writeRow(client, "vault_items", vaultToRow(userId, item), mapVaultRow);
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
  map: (row: Record<string, unknown>) => T,
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

  return { ok: true, item: map(result.data) };
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

// ── Row ↔ type mappers ───────────────────────────────────────────────────────
//
// id is included in the write payload only when it's a real DB uuid; for items
// the AI just created (temp ids like "ai-vault-…") we omit it so Postgres mints
// a uuid, and the caller re-reads the returned row to learn the durable id.

function memberToRow(
  userId: string,
  member: FamilyMember,
): Record<string, unknown> {
  return withId(member.id, {
    user_id: userId,
    name: member.name,
    role: member.role,
    initials: member.initials,
    profile_type: member.profileType,
    details: member.details,
    care_notes: member.careNotes,
    updated_at: nowIso(),
  });
}

function mapMemberRow(row: Record<string, unknown>): FamilyMember {
  return {
    id: str(row.id),
    name: str(row.name),
    role: str(row.role),
    initials: str(row.initials),
    profileType: (str(row.profile_type) ||
      "adult") as FamilyMember["profileType"],
    details: Array.isArray(row.details)
      ? (row.details as FamilyMember["details"])
      : [],
    careNotes: Array.isArray(row.care_notes)
      ? (row.care_notes as string[])
      : [],
  };
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
    updated_at: nowIso(),
  });
}

function mapEventRow(row: Record<string, unknown>): FamilyEvent {
  const needsPrep = str(row.needs_prep);
  return {
    id: str(row.id),
    title: str(row.title),
    date: str(row.event_date),
    time: str(row.event_time),
    layer: (str(row.layer) || "admin") as CalendarLayer,
    owner: str(row.owner),
    source: str(row.source),
    ...(needsPrep ? { needsPrep } : {}),
  };
}

function vaultToRow(userId: string, item: VaultItem): Record<string, unknown> {
  return withId(item.id, {
    user_id: userId,
    title: item.title,
    category: item.category,
    owner: item.owner,
    status: item.status,
    detail: item.detail,
    renewal_date: item.renewalDate ?? null,
    linked_event_id: linkedEventIdForRow(item.linkedEventId),
    updated_at: nowIso(),
  });
}

function mapVaultRow(row: Record<string, unknown>): VaultItem {
  const renewalDate = str(row.renewal_date);
  const linkedEventId = str(row.linked_event_id);
  return {
    id: str(row.id),
    title: str(row.title),
    category: (str(row.category) || "identity") as VaultCategory,
    owner: str(row.owner),
    status: (str(row.status) || "Current") as VaultItem["status"],
    detail: str(row.detail),
    ...(renewalDate ? { renewalDate } : {}),
    ...(linkedEventId ? { linkedEventId } : {}),
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
