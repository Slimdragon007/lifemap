import type { StoredDemoState } from "./storage";
import { normalizeStoredDemoState } from "./storage";

type QueryResult = {
  data: unknown;
  error: { message?: string } | null;
};

type SelectQuery = {
  eq: (
    column: string,
    value: string,
  ) => {
    maybeSingle: () => Promise<QueryResult>;
  };
};

type UpsertQuery = {
  select: (columns: string) => {
    maybeSingle: () => Promise<QueryResult>;
  };
};

export type RemoteStateClient = {
  from: (table: "user_memory") => {
    select: (columns: string) => SelectQuery;
    upsert: (
      payload: { user_id: string; preferences: Record<string, unknown> },
      options: { onConflict: "user_id" },
    ) => UpsertQuery;
  };
};

export type LoadRemoteResult =
  | { ok: true; state: StoredDemoState }
  | { ok: false; state: StoredDemoState; error: string };

export async function loadRemoteState(
  userId: string,
  client: RemoteStateClient,
): Promise<LoadRemoteResult> {
  const result = await readPreferences(userId, client);
  if (!result.ok) {
    return { ok: false, state: {}, error: result.error };
  }
  return {
    ok: true,
    state: normalizeStoredDemoState(result.preferences.lifemapState),
  };
}

export async function saveRemoteState(
  userId: string,
  state: StoredDemoState,
  client: RemoteStateClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await readPreferences(userId, client);
  const preferences = result.ok ? result.preferences : {};
  const write = await client
    .from("user_memory")
    .upsert(
      {
        user_id: userId,
        preferences: {
          ...preferences,
          lifemapState: state,
        },
      },
      { onConflict: "user_id" },
    )
    .select("user_id")
    .maybeSingle();

  if (write.error) {
    return {
      ok: false,
      error: write.error.message ?? "LifeMap could not save remote state.",
    };
  }

  return { ok: true };
}

async function readPreferences(
  userId: string,
  client: RemoteStateClient,
): Promise<
  | { ok: true; preferences: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const result = await client
    .from("user_memory")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) {
    return {
      ok: false,
      error: result.error.message ?? "LifeMap could not load remote state.",
    };
  }

  if (!isRecord(result.data) || !isRecord(result.data.preferences)) {
    return { ok: true, preferences: {} };
  }

  return { ok: true, preferences: result.data.preferences };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
