import { describe, expect, test, vi } from "vitest";
import {
  buildAuthUrl,
  deleteCreds,
  exchangeCode,
  googleEmailFromIdToken,
  loadCreds,
  revokeToken,
  saveCreds,
  signState,
  verifyState,
} from "./google.mjs";

const SECRET = "state-secret";

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
