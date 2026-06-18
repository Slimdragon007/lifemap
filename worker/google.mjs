// Google OAuth helpers + per-user token storage (Cloudflare KV).
// Pure/injectable so the Worker endpoints can be unit-tested with mock fetch + mock KV.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SCOPES = "openid email https://www.googleapis.com/auth/calendar.events";

function base64urlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecodeToString(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}

async function hmac(body, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  return base64urlEncode(new Uint8Array(signature));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function signState(payload, secret) {
  const body = base64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const sig = await hmac(body, secret);
  return `${body}.${sig}`;
}

export async function verifyState(token, secret) {
  const [body, sig] = String(token).split(".");
  if (!body || !sig) {
    return null;
  }
  const expected = await hmac(body, secret);
  if (!timingSafeEqual(sig, expected)) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(base64urlDecodeToString(body));
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    return null;
  }
  return payload;
}

export function buildAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: SCOPES,
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCode(
  { code, clientId, clientSecret, redirectUri },
  fetchImpl = fetch,
) {
  try {
    const response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    if (!response.ok) {
      const detail =
        typeof response.text === "function"
          ? await response.text().catch(() => "")
          : "";
      return { ok: false, error: `google_token_${response.status}: ${detail}` };
    }
    return { ok: true, tokens: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function googleEmailFromIdToken(idToken) {
  const parts = String(idToken).split(".");
  if (parts.length !== 3) {
    return undefined;
  }
  try {
    const payload = JSON.parse(base64urlDecodeToString(parts[1]));
    return typeof payload.email === "string" ? payload.email : undefined;
  } catch {
    return undefined;
  }
}

export async function revokeToken(token, fetchImpl = fetch) {
  return fetchImpl(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

function credsKey(userId) {
  return `google:${userId}`;
}

export async function saveCreds(kv, userId, creds) {
  await kv.put(credsKey(userId), JSON.stringify(creds));
}

export async function loadCreds(kv, userId) {
  const raw = await kv.get(credsKey(userId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function deleteCreds(kv, userId) {
  await kv.delete(credsKey(userId));
}

// Exchange a stored refresh_token for a fresh access_token (tokens expire ~1h).
export async function refreshAccessToken(
  { refreshToken, clientId, clientSecret },
  fetchImpl = fetch,
) {
  try {
    const response = await fetchImpl(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }).toString(),
    });
    if (!response.ok) {
      const detail =
        typeof response.text === "function"
          ? await response.text().catch(() => "")
          : "";
      return {
        ok: false,
        error: `google_refresh_${response.status}: ${detail}`,
      };
    }
    return { ok: true, tokens: await response.json() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Create an event on the user's primary Google Calendar. `event` is a Google
// event body, e.g. { summary, description, start, end }.
export async function createCalendarEvent(
  accessToken,
  event,
  fetchImpl = fetch,
) {
  try {
    const response = await fetchImpl(CALENDAR_EVENTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      const detail =
        typeof response.text === "function"
          ? await response.text().catch(() => "")
          : "";
      return { ok: false, error: `google_event_${response.status}: ${detail}` };
    }
    const created = await response.json();
    return { ok: true, id: created.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
