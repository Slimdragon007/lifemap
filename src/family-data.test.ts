import { describe, expect, test, vi } from "vitest";
import {
  deleteFamilyRow,
  loadFamilyCollections,
  upsertVaultItem,
  type FamilyDataClient,
} from "./family-data";
import type { VaultItem } from "./familyOS";

const UUID = "11111111-1111-4111-8111-111111111111";
const EVENT_UUID = "22222222-2222-4222-8222-222222222222";

describe("family-data RLS-scoped persistence", () => {
  test("loads and maps the four collections for the signed-in user", async () => {
    const { client, selectEq } = makeReadClient({
      family_members: [
        {
          id: UUID,
          user_id: "user-1",
          name: "Casey Kim",
          role: "Grade 4",
          initials: "CK",
          profile_type: "child",
          details: [{ label: "Allergy", value: "Peanuts" }],
          care_notes: ["MCV4 due"],
        },
      ],
      vault_items: [
        {
          id: UUID,
          user_id: "user-1",
          title: "Casey passport",
          category: "identity",
          owner: "Casey",
          status: "Expires soon",
          detail: "Renewal started",
          renewal_date: "2026-08-14",
          linked_event_id: EVENT_UUID,
        },
      ],
      family_events: [],
      recurring_care_items: [],
    });

    const result = await loadFamilyCollections("user-1", client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.collections.familyMembers[0]).toEqual({
      id: UUID,
      name: "Casey Kim",
      role: "Grade 4",
      initials: "CK",
      profileType: "child",
      details: [{ label: "Allergy", value: "Peanuts" }],
      careNotes: ["MCV4 due"],
    });
    expect(result.collections.vaultItems[0]).toEqual({
      id: UUID,
      title: "Casey passport",
      category: "identity",
      owner: "Casey",
      status: "Expires soon",
      detail: "Renewal started",
      renewalDate: "2026-08-14",
      linkedEventId: EVENT_UUID,
    });
    // every read is scoped to the user — RLS-backed isolation
    expect(selectEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  test("reports an error (does not throw) when a read fails", async () => {
    const client: FamilyDataClient = {
      from: () => ({
        select: () => ({
          eq: async () => ({ data: null, error: { message: "boom" } }),
        }),
        upsert: vi.fn(),
        delete: vi.fn(),
      }),
    };

    await expect(loadFamilyCollections("user-1", client)).resolves.toEqual({
      ok: false,
      collections: {
        familyMembers: [],
        familyEvents: [],
        vaultItems: [],
        recurringCareItems: [],
      },
      error: "boom",
    });
  });

  test("omits a temp client id on insert so Postgres mints the uuid", async () => {
    const upsert = vi.fn((..._args: unknown[]) => ({
      select: () => ({
        maybeSingle: async () => ({
          data: {
            id: UUID,
            title: "MCV4 record",
            category: "health",
            owner: "Casey",
            status: "Needs update",
            detail: "Waiting on PDF",
          },
          error: null,
        }),
      }),
    }));
    const client: FamilyDataClient = {
      from: () => ({ select: vi.fn(), upsert, delete: vi.fn() }),
    };

    const newItem: VaultItem = {
      id: "ai-vault-1",
      title: "MCV4 record",
      category: "health",
      owner: "Casey",
      status: "Needs update",
      detail: "Waiting on PDF",
      linkedEventId: "event-peds", // temp id, must not be persisted as uuid FK
    };

    const result = await upsertVaultItem("user-1", newItem, client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.item.id).toBe(UUID);

    const payload = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.id).toBeUndefined();
    expect(payload.user_id).toBe("user-1");
    expect(payload.linked_event_id).toBeNull();
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "id" });
  });

  test("keeps a real uuid id on update", async () => {
    const upsert = vi.fn((..._args: unknown[]) => ({
      select: () => ({
        maybeSingle: async () => ({
          data: {
            id: UUID,
            title: "x",
            category: "identity",
            owner: "",
            status: "Current",
            detail: "",
          },
          error: null,
        }),
      }),
    }));
    const client: FamilyDataClient = {
      from: () => ({ select: vi.fn(), upsert, delete: vi.fn() }),
    };

    await upsertVaultItem(
      "user-1",
      {
        id: UUID,
        title: "x",
        category: "identity",
        owner: "",
        status: "Current",
        detail: "",
      },
      client,
    );

    const payload = upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.id).toBe(UUID);
  });

  test("delete scopes by both id and user_id", async () => {
    const innerEq = vi.fn(async () => ({ data: null, error: null }));
    const outerEq = vi.fn(() => ({ eq: innerEq }));
    const del = vi.fn(() => ({ eq: outerEq }));
    const client: FamilyDataClient = {
      from: () => ({ select: vi.fn(), upsert: vi.fn(), delete: del }),
    };

    await expect(
      deleteFamilyRow("user-1", "vault_items", UUID, client),
    ).resolves.toEqual({ ok: true });
    expect(outerEq).toHaveBeenCalledWith("id", UUID);
    expect(innerEq).toHaveBeenCalledWith("user_id", "user-1");
  });
});

function makeReadClient(tables: Record<string, Record<string, unknown>[]>) {
  const selectEq = vi.fn();
  const client: FamilyDataClient = {
    from: (table) => ({
      select: () => ({
        eq: (column: string, value: string) => {
          selectEq(column, value);
          return Promise.resolve({ data: tables[table] ?? [], error: null });
        },
      }),
      upsert: vi.fn(),
      delete: vi.fn(),
    }),
  };
  return { client, selectEq };
}
