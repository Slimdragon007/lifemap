import { describe, expect, test, vi } from "vitest";
import {
  buildAuthUrl,
  createCalendarEvent,
  deleteCreds,
  exchangeCode,
  googleEmailFromIdToken,
  loadCreds,
  refreshAccessToken,
  revokeToken,
  saveCreds,
  signState,
  verifyState,
} from "./google.mjs";

import {
  googleAuthUrlPayload,
  googleCallback,
  googleDisconnectPayload,
  googlePushEventPayload,
  googleStatusPayload,
} from "./lifemap-api.mjs";

const SECRET = "state-secret";

const gEnv = {
  SUPABASE_URL: "https://proj.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  GOOGLE_CLIENT_ID: "client-123",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REDIRECT_URI: "https://api.example.com/api/google/callback",
  GOOGLE_OAUTH_STATE_SECRET: SECRET,
  APP_ORIGIN: "https://app.example.com",
};

function authedFetch(user, googleResponse) {
  return vi.fn(async (url) => {
    if (String(url).includes("/auth/v1/user")) {
      return { ok: Boolean(user), json: async () => user ?? {} };
    }
    return googleResponse ?? { ok: true, json: async () => ({}) };
  });
}

function base64url(value) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeIdToken(payload) {
  return `h.${base64url(JSON.stringify(payload))}.s`;
}

function makeKv() {
  const store = new Map();
  return {
    store,
    put: vi.fn(async (key, value) => void store.set(key, value)),
    get: vi.fn(async (key) => store.get(key) ?? null),
    delete: vi.fn(async (key) => void store.delete(key)),
  };
}

describe("signed state", () => {
  test("round-trips a valid payload", async () => {
    const token = await signState({ userId: "u1", exp: 9999999999 }, SECRET);
    const payload = await verifyState(token, SECRET);
    expect(payload).toMatchObject({ userId: "u1" });
  });

  test("rejects a tampered token", async () => {
    const token = await signState({ userId: "u1", exp: 9999999999 }, SECRET);
    expect(await verifyState(token, "wrong-secret")).toBeNull();
    expect(await verifyState(`${token}x`, SECRET)).toBeNull();
  });

  test("rejects an expired token", async () => {
    const token = await signState({ userId: "u1", exp: 1 }, SECRET);
    expect(await verifyState(token, SECRET)).toBeNull();
  });
});

describe("buildAuthUrl", () => {
  test("includes client, redirect, scopes, offline access, and state", () => {
    const url = buildAuthUrl({
      clientId: "client-123",
      redirectUri: "https://api.example.com/api/google/callback",
      state: "STATE",
    });
    expect(url).toContain("client_id=client-123");
    expect(url).toContain(
      "redirect_uri=https%3A%2F%2Fapi.example.com%2Fapi%2Fgoogle%2Fcallback",
    );
    expect(url).toContain("access_type=offline");
    expect(url).toContain("state=STATE");
    expect(url).toContain("calendar.events");
  });
});

describe("exchangeCode", () => {
  test("returns tokens on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        refresh_token: "r",
        access_token: "a",
        expires_in: 3600,
        id_token: "i",
      }),
    });
    const result = await exchangeCode(
      {
        code: "abc",
        clientId: "c",
        clientSecret: "s",
        redirectUri: "https://api.example.com/api/google/callback",
      },
      fetchImpl,
    );
    expect(result).toEqual({
      ok: true,
      tokens: {
        refresh_token: "r",
        access_token: "a",
        expires_in: 3600,
        id_token: "i",
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("returns an error when Google rejects the code", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid_grant",
    });
    const result = await exchangeCode(
      { code: "bad", clientId: "c", clientSecret: "s", redirectUri: "x" },
      fetchImpl,
    );
    expect(result.ok).toBe(false);
  });
});

describe("googleEmailFromIdToken", () => {
  test("decodes the email claim", () => {
    const idToken = makeIdToken({ email: "alex@example.com" });
    expect(googleEmailFromIdToken(idToken)).toBe("alex@example.com");
  });

  test("returns undefined for a malformed token", () => {
    expect(googleEmailFromIdToken("not-a-jwt")).toBeUndefined();
  });
});

describe("credential storage (KV)", () => {
  test("saves, loads, and deletes per-user creds", async () => {
    const kv = makeKv();
    await saveCreds(kv, "u1", { refresh_token: "r", email: "a@b.com" });
    expect(await loadCreds(kv, "u1")).toEqual({
      refresh_token: "r",
      email: "a@b.com",
    });
    await deleteCreds(kv, "u1");
    expect(await loadCreds(kv, "u1")).toBeNull();
  });
});

describe("revokeToken", () => {
  test("posts the token to Google's revoke endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await revokeToken("r", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("https://oauth2.googleapis.com/revoke"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("google endpoints", () => {
  test("auth-url returns a consent URL for an authed user", async () => {
    const result = await googleAuthUrlPayload({
      authHeader: "Bearer tok",
      env: gEnv,
      fetchImpl: authedFetch({ id: "u1", email: "alex@example.com" }),
    });
    expect(result.status).toBe(200);
    expect(result.body.url).toContain("client_id=client-123");
    expect(result.body.url).toContain("state=");
  });

  test("auth-url rejects an unauthenticated request", async () => {
    const result = await googleAuthUrlPayload({
      authHeader: "",
      env: gEnv,
      fetchImpl: authedFetch(null),
    });
    expect(result.status).toBe(401);
  });

  test("status reflects whether creds exist", async () => {
    const kv = makeKv();
    const fetchImpl = authedFetch({ id: "u1" });
    const before = await googleStatusPayload({
      authHeader: "Bearer tok",
      env: gEnv,
      kv,
      fetchImpl,
    });
    expect(before.body).toMatchObject({ connected: false });

    await saveCreds(kv, "u1", {
      refresh_token: "r",
      email: "alex@example.com",
    });
    const after = await googleStatusPayload({
      authHeader: "Bearer tok",
      env: gEnv,
      kv,
      fetchImpl,
    });
    expect(after.body).toMatchObject({
      connected: true,
      email: "alex@example.com",
    });
  });

  test("callback exchanges a valid state and stores creds", async () => {
    const kv = makeKv();
    const state = await signState({ userId: "u1", exp: 9999999999 }, SECRET);
    const requestUrl = new URL(
      `https://api.example.com/api/google/callback?code=abc&state=${encodeURIComponent(state)}`,
    );
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        refresh_token: "r",
        access_token: "a",
        expires_in: 3600,
        id_token: makeIdToken({ email: "alex@example.com" }),
      }),
    }));

    const location = await googleCallback({
      requestUrl,
      env: gEnv,
      kv,
      fetchImpl,
    });
    expect(location).toBe("https://app.example.com/?google=connected");
    expect(await loadCreds(kv, "u1")).toMatchObject({
      refresh_token: "r",
      email: "alex@example.com",
    });
  });

  test("callback rejects an invalid state", async () => {
    const kv = makeKv();
    const requestUrl = new URL(
      "https://api.example.com/api/google/callback?code=abc&state=tampered",
    );
    const location = await googleCallback({
      requestUrl,
      env: gEnv,
      kv,
      fetchImpl: vi.fn(),
    });
    expect(location).toBe("https://app.example.com/?google=error");
  });

  test("disconnect revokes and clears creds", async () => {
    const kv = makeKv();
    await saveCreds(kv, "u1", {
      refresh_token: "r",
      email: "alex@example.com",
    });
    const fetchImpl = authedFetch({ id: "u1" }, { ok: true });
    const result = await googleDisconnectPayload({
      authHeader: "Bearer tok",
      env: gEnv,
      kv,
      fetchImpl,
    });
    expect(result.body).toEqual({ ok: true });
    expect(await loadCreds(kv, "u1")).toBeNull();
  });
});

describe("refreshAccessToken", () => {
  test("returns a fresh access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "fresh", expires_in: 3600 }),
    });
    const result = await refreshAccessToken(
      { refreshToken: "r", clientId: "c", clientSecret: "s" },
      fetchImpl,
    );
    expect(result).toEqual({
      ok: true,
      tokens: { access_token: "fresh", expires_in: 3600 },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("returns an error when Google rejects the refresh", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "invalid_grant",
    });
    const result = await refreshAccessToken(
      { refreshToken: "bad", clientId: "c", clientSecret: "s" },
      fetchImpl,
    );
    expect(result.ok).toBe(false);
  });
});

describe("createCalendarEvent", () => {
  test("posts the event and returns its id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "evt_123" }),
    });
    const result = await createCalendarEvent(
      "access",
      {
        summary: "Renew passport",
        description: "Owner: You",
        start: { date: "2026-07-12" },
        end: { date: "2026-07-12" },
      },
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, id: "evt_123" });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access" }),
      }),
    );
  });

  test("returns an error when Google rejects the event", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });
    const result = await createCalendarEvent(
      "bad",
      { summary: "x" },
      fetchImpl,
    );
    expect(result.ok).toBe(false);
  });
});

describe("googlePushEventPayload", () => {
  test("creates a Google event from a LifeMap event", async () => {
    const kv = makeKv();
    await saveCreds(kv, "u1", {
      refresh_token: "r",
      access_token: "a",
      expiry: Math.floor(Date.now() / 1000) + 3600, // still valid
      email: "you@example.com",
    });
    const fetchImpl = vi.fn(async (url) => {
      if (String(url).includes("/auth/v1/user")) {
        return { ok: true, json: async () => ({ id: "u1" }) };
      }
      if (String(url).includes("calendar/v3")) {
        return { ok: true, json: async () => ({ id: "g_evt_1" }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    const result = await googlePushEventPayload({
      authHeader: "Bearer tok",
      event: {
        id: "e1",
        title: "Renew passport",
        date: "2026-07-12",
        time: "10:30 AM",
        owner: "You",
        source: "Passport checklist",
      },
      env: gEnv,
      kv,
      fetchImpl,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, id: "g_evt_1" });
  });

  test("401 when not authenticated", async () => {
    const result = await googlePushEventPayload({
      authHeader: "",
      event: {
        id: "e1",
        title: "x",
        date: "2026-07-12",
        time: "",
        owner: "",
        source: "",
      },
      env: gEnv,
      kv: makeKv(),
      fetchImpl: vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    });
    expect(result.status).toBe(401);
  });

  test("409 when the user is not connected to Google", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "u1" }),
    }));
    const result = await googlePushEventPayload({
      authHeader: "Bearer tok",
      event: {
        id: "e1",
        title: "x",
        date: "2026-07-12",
        time: "",
        owner: "",
        source: "",
      },
      env: gEnv,
      kv: makeKv(),
      fetchImpl,
    });
    expect(result.status).toBe(409);
  });
});
