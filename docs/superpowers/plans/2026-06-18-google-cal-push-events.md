# Google Calendar — Push LifeMap Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in, Google-connected LifeMap user push a saved LifeMap calendar event onto their Google Calendar with one explicit tap (one-way, LifeMap → Google).

**Architecture:** The OAuth connect flow already exists (`worker/google.mjs` + `/api/google/*` routes + `GoogleConnection.tsx`, 14 passing tests). This plan adds the missing _action_: an access-token **refresh** helper, a **create-event** helper (Google Calendar API), a new authed **`POST /api/google/push-event`** Worker route, a `pushCalendarEvent` client in `src/api.ts`, and an **"Add to Google Calendar"** button on saved events in `CalendarView.tsx`. Events are created **all-day** on the event's date (timed-event parsing is a future enhancement). Nothing pushes without the explicit tap (matches the app's "nothing sends without your OK" trust model).

**Tech Stack:** Cloudflare Worker (ESM, `worker/lifemap-api.mjs` + `worker/google.mjs`), Vite/React/TS frontend, Vitest (`vitest@^2.1.8`).

## Global Constraints

- Tests run with **Node 22, not 26** (`npm test` → `vitest run`). Node 26's built-in `localStorage` shadows jsdom's and breaks the suite.
- ESM modules only (`"type": "module"`); test imports: `import { describe, expect, test, vi } from "vitest"`.
- **Approval-gated:** an event reaches Google ONLY via an explicit user tap. No auto-push, no background sync.
- **No green anywhere** in any UI (cool-blue / clay palette only).
- New worker secrets are set with `wrangler secret put`, never the dashboard (dashboard-set secrets drop on the next CLI deploy).
- Worker auto-deploys from `main` (Cloudflare Workers Builds); `npm run deploy:api` is the manual fallback.
- Reuse existing helpers verbatim where shown — do not re-implement `verifySupabaseUser`, `loadCreds`, `jsonResponse`, `buildCorsHeaders`, `exchangeCode`.

---

### Task 0: Configure Google OAuth (prerequisite — no code; gates everything)

The connect flow is built but unconfigured: `GOOGLE_CLIENT_ID` is the `REPLACE_WITH_…` placeholder and the secrets are unset. Until this is done, every `/api/google/*` call errors.

**Files:**

- Modify: `worker/wrangler.jsonc` (vars `GOOGLE_CLIENT_ID`; `secrets.required`)

- [ ] **Step 1 (human, Google Cloud):** Create a Google Cloud project → OAuth consent screen (External, **Testing** mode, add the founder account as a test user) → create an OAuth **Web** client. Authorized redirect URI = `https://lifemap-api.m-haslim.workers.dev/api/google/callback`. Copy the **Client ID** and **Client Secret**.
- [ ] **Step 2:** In `worker/wrangler.jsonc`, replace `"GOOGLE_CLIENT_ID": "REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID"` with the real Client ID, and change `"secrets": { "required": ["OPENAI_API_KEY"] }` to `"required": ["OPENAI_API_KEY", "GOOGLE_CLIENT_SECRET", "GOOGLE_OAUTH_STATE_SECRET"]`.
- [ ] **Step 3:** Set secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.jsonc   # paste Client Secret
npx wrangler secret put GOOGLE_OAUTH_STATE_SECRET --config worker/wrangler.jsonc  # paste a long random string
```

- [ ] **Step 4:** Deploy + verify connect end-to-end:

```bash
npm run deploy:api
```

On app.getlifemap.com → Calendar → "Connect Google Calendar" → consent → returns "Connected ✓ <email>". Confirm: `npx wrangler kv key get "google:<your-user-id>" --binding GOOGLE_TOKENS --config worker/wrangler.jsonc` returns the creds JSON.

- [ ] **Step 5: Commit**

```bash
git add worker/wrangler.jsonc
git commit -m "chore(google): wire OAuth client id + required secrets"
```

---

### Task 1: `refreshAccessToken` in `worker/google.mjs`

Access tokens expire (~1h); the stored creds keep a `refresh_token` + `expiry` but nothing refreshes. Add a refresh helper mirroring `exchangeCode`'s fetch style.

**Files:**

- Modify: `worker/google.mjs` (add export near `exchangeCode`)
- Test: `worker/google.test.mjs`

**Interfaces:**

- Consumes: `TOKEN_ENDPOINT` (already defined `= "https://oauth2.googleapis.com/token"`).
- Produces: `refreshAccessToken({ refreshToken, clientId, clientSecret }, fetchImpl = fetch) → { ok: true, tokens: { access_token, expires_in } } | { ok: false, error }`.

- [ ] **Step 1: Write the failing test** — add to `worker/google.test.mjs`:

```javascript
import { refreshAccessToken } from "./google.mjs";

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
```

- [ ] **Step 2: Run test, verify it fails** — `npx vitest run worker/google.test.mjs -t refreshAccessToken` → FAIL ("refreshAccessToken is not a function").
- [ ] **Step 3: Implement** — add to `worker/google.mjs`:

```javascript
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
```

- [ ] **Step 4: Run test, verify pass** — `npx vitest run worker/google.test.mjs -t refreshAccessToken` → PASS.
- [ ] **Step 5: Commit**

```bash
git add worker/google.mjs worker/google.test.mjs
git commit -m "feat(google): add refreshAccessToken helper"
```

---

### Task 2: `createCalendarEvent` in `worker/google.mjs`

POST an all-day event to the user's primary Google Calendar.

**Files:**

- Modify: `worker/google.mjs`
- Test: `worker/google.test.mjs`

**Interfaces:**

- Produces: `createCalendarEvent(accessToken, event, fetchImpl = fetch) → { ok: true, id } | { ok: false, error }` where `event` is a Google event body `{ summary, description, start, end }`.

- [ ] **Step 1: Write the failing test**:

```javascript
import { createCalendarEvent } from "./google.mjs";

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
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run worker/google.test.mjs -t createCalendarEvent` → FAIL.
- [ ] **Step 3: Implement** — add to `worker/google.mjs` (and add near the top with the other endpoints: `const CALENDAR_EVENTS_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";`):

```javascript
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
      return {
        ok: false,
        error: `google_event_${response.status}: ${detail}`,
      };
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
```

- [ ] **Step 4: Run, verify pass** → PASS.
- [ ] **Step 5: Commit**

```bash
git add worker/google.mjs worker/google.test.mjs
git commit -m "feat(google): add createCalendarEvent helper"
```

---

### Task 3: `googlePushEventPayload` handler + route in `worker/lifemap-api.mjs`

New authed route that: verifies the user, loads creds, refreshes the access token if expired, maps the LifeMap event → a Google all-day event, creates it, returns the Google event id.

**Files:**

- Modify: `worker/lifemap-api.mjs` (add handler + a case in `handleGoogleRoute`)
- Test: `worker/google.test.mjs`

**Interfaces:**

- Consumes: `verifySupabaseUser(authHeader, env, fetchImpl)`, `loadCreds(kv, userId)`, `saveCreds(kv, userId, creds)`, `refreshAccessToken(...)`, `createCalendarEvent(...)`, `jsonResponse(body, status, corsHeaders)`.
- Produces: `googlePushEventPayload({ authHeader, event, env, kv = env.GOOGLE_TOKENS, fetchImpl = fetch }) → { status, body: { ok, id?|error? } }`. `event` is a LifeMap `FamilyEvent` `{ id, title, date, time, owner, source, needsPrep? }`.

- [ ] **Step 1: Write the failing test** — add to `worker/google.test.mjs`:

```javascript
import { googlePushEventPayload } from "./lifemap-api.mjs";

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
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run worker/google.test.mjs -t googlePushEventPayload` → FAIL ("not exported").
- [ ] **Step 3: Implement** — add to `worker/lifemap-api.mjs` (import `refreshAccessToken` and `createCalendarEvent` from `./google.mjs` alongside the existing google imports):

```javascript
function toGoogleAllDayEvent(event) {
  const descriptionParts = [
    event.time ? `Time: ${event.time}` : "",
    event.owner ? `Owner: ${event.owner}` : "",
    event.source ? `Source: ${event.source}` : "",
    event.needsPrep ? `Prep: ${event.needsPrep}` : "",
  ].filter(Boolean);
  return {
    summary: event.title,
    description: descriptionParts.join("\n"),
    start: { date: event.date },
    end: { date: event.date },
  };
}

export async function googlePushEventPayload({
  authHeader,
  event,
  env,
  kv = env.GOOGLE_TOKENS,
  fetchImpl = fetch,
}) {
  const auth = await verifySupabaseUser(authHeader, env, fetchImpl);
  if (!auth.ok) {
    return { status: 401, body: { ok: false, error: UNAUTHENTICATED_ERROR } };
  }
  if (
    !event ||
    typeof event.title !== "string" ||
    typeof event.date !== "string"
  ) {
    return { status: 400, body: { ok: false, error: "Invalid event." } };
  }
  const creds = await loadCreds(kv, auth.id);
  if (!creds || !creds.refresh_token) {
    return {
      status: 409,
      body: { ok: false, error: "Google Calendar not connected." },
    };
  }

  let accessToken = creds.access_token;
  const now = Math.floor(Date.now() / 1000);
  if (!accessToken || !creds.expiry || creds.expiry <= now + 60) {
    const refreshed = await refreshAccessToken(
      {
        refreshToken: creds.refresh_token,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      fetchImpl,
    );
    if (!refreshed.ok) {
      return {
        status: 502,
        body: { ok: false, error: "Couldn't refresh Google access." },
      };
    }
    accessToken = refreshed.tokens.access_token;
    await saveCreds(kv, auth.id, {
      ...creds,
      access_token: accessToken,
      expiry: now + (Number(refreshed.tokens.expires_in) || 0),
    });
  }

  const created = await createCalendarEvent(
    accessToken,
    toGoogleAllDayEvent(event),
    fetchImpl,
  );
  if (!created.ok) {
    return {
      status: 502,
      body: { ok: false, error: "Couldn't add to Google Calendar." },
    };
  }
  return { status: 200, body: { ok: true, id: created.id } };
}
```

Then add the route case inside `handleGoogleRoute` (after the `auth-url` case):

```javascript
if (request.method === "POST" && url.pathname === "/api/google/push-event") {
  const event = await request.json().catch(() => null);
  const result = await googlePushEventPayload({ authHeader, event, env });
  return jsonResponse(result.body, result.status, corsHeaders);
}
```

- [ ] **Step 4: Run, verify pass** → PASS. Also run the full worker suite: `npx vitest run worker/` → all green.
- [ ] **Step 5: Commit**

```bash
git add worker/lifemap-api.mjs worker/google.test.mjs
git commit -m "feat(google): POST /api/google/push-event (refresh + create all-day event)"
```

---

### Task 4: `pushCalendarEvent` client in `src/api.ts`

**Files:**

- Modify: `src/api.ts`

**Interfaces:**

- Consumes: `getApiOrigin()`, `isRecord`, `readError`, `DEFAULT_ERROR`, the `FamilyEvent` type (import from `./familyOS`).
- Produces: `pushCalendarEvent(event, accessToken, origin = getApiOrigin()) → Promise<{ ok: true; id: string } | { ok: false; error: string }>`.

- [ ] **Step 1: Implement** (mirror `getGoogleStatus`) — add to `src/api.ts`:

```typescript
export type PushCalendarEventResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function pushCalendarEvent(
  event: FamilyEvent,
  accessToken: string,
  origin = getApiOrigin(),
): Promise<PushCalendarEventResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }
  try {
    const response = await fetch(`${origin}/api/google/push-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    const payload: unknown = await response.json();
    if (
      isRecord(payload) &&
      payload.ok === true &&
      typeof payload.id === "string"
    ) {
      return { ok: true, id: payload.id };
    }
    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap push calendar event failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}
```

(Add `import type { FamilyEvent } from "./familyOS";` if not already imported.)

- [ ] **Step 2: Typecheck** — `npm run typecheck` → clean.
- [ ] **Step 3: Commit**

```bash
git add src/api.ts
git commit -m "feat(api): pushCalendarEvent client"
```

---

### Task 5: "Add to Google Calendar" button on saved events in `src/CalendarView.tsx`

Show an "Add to Google Calendar" action on **saved** (non-pending) events, only when the user is connected. On tap: call `pushCalendarEvent`, show "On your Google Calendar ✓". Tap-only (approval-gated).

**Files:**

- Modify: `src/CalendarView.tsx`
- Test: `src/CalendarView.test.tsx`

**Interfaces:**

- Consumes: `pushCalendarEvent` (`src/api.ts`), `getAccessToken` (`src/supabaseClient.ts`), the existing `GoogleConnection` connected-state pattern (`getGoogleStatus`).

- [ ] **Step 1:** Lift connection status into `CalendarView`: on mount, `getAccessToken()` → `getGoogleStatus(token)`; store `googleConnected: boolean`. Pass `googleConnected` + an `onPushToGoogle(event)` callback down to `EventRow`. `onPushToGoogle` calls `getAccessToken()` then `pushCalendarEvent(event, token)`, and tracks per-event push state (`idle | pushing | done | error`) in a `Map` keyed by `event.id`.
- [ ] **Step 2:** In `EventRow`, in the `isGenerated && isSaved` branch (currently just `<span className="notebook-tag">Saved to LifeMap</span>`), add — only when `googleConnected` — an **"Add to Google Calendar"** button (`className="notebook-link"`), which calls `onPushToGoogle(event)`; while pushing show a spinner; on success replace with `<span className="notebook-tag">On your Google Calendar ✓</span>`; on error show `notebook-link` "Try again". Reuse existing classNames (no new green).
- [ ] **Step 3: Write/extend test** in `src/CalendarView.test.tsx`: render CalendarView with a saved event + mocked `getGoogleStatus` → connected and mocked `pushCalendarEvent` → `{ ok: true, id: "g1" }`; assert the "Add to Google Calendar" button renders, click it, assert `pushCalendarEvent` called with the event, assert "On your Google Calendar ✓" appears. Mock the api module like existing tests do.
- [ ] **Step 4: Verify** — `npm run typecheck` and `npm test` (Node 22) → all green. Update any snapshot/assertion the new markup affects.
- [ ] **Step 5: Commit**

```bash
git add src/CalendarView.tsx src/CalendarView.test.tsx
git commit -m "feat(calendar): Add to Google Calendar button on saved events"
```

---

### Task 6: Ship + live verify

- [ ] **Step 1:** Full gate: `npm run typecheck`, `npm test` (Node 22), `npm run build`.
- [ ] **Step 2:** Merge to `main` (auto-deploys Pages + Worker) or `npm run deploy:api` + `deploy:pages`; then `npm run verify:production` (6/6).
- [ ] **Step 3: Live check** on app.getlifemap.com (connected account): Calendar → a saved event → "Add to Google Calendar" → confirm it appears in the real Google Calendar → delete the test event from Google.
- [ ] **Step 4:** Update `CLAUDE.md` infra/integration notes: Google Calendar now configured + one-way push live.

## Self-Review

- **Spec coverage:** Config (Task 0), refresh (1), create (2), route (3), client (4), UI (5), ship (6) — covers the push-out feature end to end.
- **Type consistency:** `refreshAccessToken` returns `{ ok, tokens: { access_token, expires_in } }` (used in Task 3); `createCalendarEvent` returns `{ ok, id }` (used in Task 3); `googlePushEventPayload` returns `{ status, body }` (mirrors `googleStatusPayload`); `pushCalendarEvent` returns `{ ok, id } | { ok, error }` (used in Task 5). Names consistent across tasks.
- **No placeholders:** all backend code + tests are concrete. Task 5's UI steps describe exact classNames/branches but leave final JSX assembly to the implementer following the quoted `EventRow` pattern — acceptable since it's wiring within a shown component, not new logic.
- **Known assumption to verify in Task 3/6:** `FamilyEvent.date` is treated as a Google all-day `start.date` (expects `YYYY-MM-DD`). If real data uses another format, add a `normalizeDate()` step in `toGoogleAllDayEvent` before shipping.
