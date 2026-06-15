import { describe, expect, test, vi } from "vitest";
import { loadRemoteState, saveRemoteState } from "./remoteState";
import type { StoredDemoState } from "./storage";

const storedState: StoredDemoState = {
  intake: "stored cloud note",
  analysis: {
    dueItems: [],
    missingInfo: [],
    waitingOn: [],
    nextActions: [],
    reminders: [],
    draftMessages: [],
    sourceEvidence: [],
  },
};

describe("Supabase-backed MVP state", () => {
  test("loads LifeMap state from user_memory preferences", async () => {
    const client = makeClient({
      preferences: {
        theme: "pastel",
        lifemapState: storedState,
      },
    });

    await expect(loadRemoteState("user-1", client)).resolves.toEqual({
      ok: true,
      state: storedState,
    });
  });

  test("reports an error (does not throw) when the read fails", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: null,
              error: { message: "boom" },
            }),
          }),
        }),
        upsert: vi.fn(),
      }),
    };

    await expect(loadRemoteState("user-1", client)).resolves.toEqual({
      ok: false,
      state: {},
      error: "boom",
    });
  });

  test("saves LifeMap state without dropping existing preferences", async () => {
    const client = makeClient({
      preferences: {
        theme: "pastel",
      },
    });

    await expect(
      saveRemoteState("user-1", storedState, client),
    ).resolves.toEqual({ ok: true });

    expect(client.upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        preferences: {
          theme: "pastel",
          lifemapState: storedState,
        },
      },
      { onConflict: "user_id" },
    );
  });
});

function makeClient(data: unknown) {
  const upsert = vi.fn(() => ({
    select: () => ({
      maybeSingle: async () => ({ data: { user_id: "user-1" }, error: null }),
    }),
  }));

  return {
    upsert,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error: null }),
        }),
      }),
      upsert,
    }),
  };
}
