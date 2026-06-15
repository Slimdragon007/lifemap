# Email Send (Approved Drafts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user send an approved draft as real email through a new authenticated Cloudflare Worker endpoint, recording each send in a durable Supabase table.

**Architecture:** A `mailer` interface (Cloudflare Email adapter, injectable for tests) + a new `POST /api/send` Worker route that verifies the caller's Supabase token, sends, and records to `sent_messages` (RLS). The analyze model gains a `recipientEmail` field the client pre-fills and the user confirms before a per-message Send + confirm modal.

**Tech Stack:** Cloudflare Workers (`wrangler`), Supabase (Postgres + RLS), Vite + React 18 + TS, Vitest. Run all gates on **Node 22** (`source ~/.nvm/nvm.sh && nvm use 22`).

**Spec:** `docs/superpowers/specs/2026-06-15-email-send-design.md`

---

## Constraints

- Build on branch `stabilize/single-cloudflare-api` (PR #1, the single-Worker consolidation, is a prerequisite — stack this PR on top of it).
- **No `wrangler deploy`, no applying the migration to prod, no `wrangler secret put`.** Slim deploys, applies the migration at deploy, sets secrets, and configures the verified domain + Email binding. Live-send is verified by Slim afterward.
- Endpoint logic is tested with an **injected mock mailer + injected fetch** (no network, no real email) — same `fetchImpl` injection style as the existing `worker/lifemap-api.test.mjs`.

## File Structure

- **Create:** `worker/mailer.mjs` (interface + Cloudflare adapter + mock), `supabase/migrations/0002_sent_messages.sql`, `worker/send.test.mjs`.
- **Modify:** `worker/lifemap-api.mjs` (recipientEmail in schema/prompt/parser; `sendPayload`; route `/api/send`; auth helper), `worker/lifemap-api.test.mjs` (recipientEmail schema test), `worker/wrangler.jsonc` (SUPABASE_URL, SUPABASE_ANON_KEY, SEND_FROM vars + email binding), `src/lifemap.ts` + `src/lifemap.test.ts` (recipientEmail on DraftMessage/ApprovalItem/queue/parser), `src/api.ts` + `src/api.test.ts` (`sendDraftEmail`), `src/App.tsx` (recipient field + Send + confirm modal + sent state + copy), `src/supabaseClient.ts` (expose access token getter if not present), `docs/cloudflare-deployment.md`.

Each task ends green and is committed. Commands run from repo root `~/Projects/lifemap`.

---

### Task 0: Branch

- [ ] **Step 1: Create the feature branch off the consolidation branch**

Run: `git -C ~/Projects/lifemap checkout stabilize/single-cloudflare-api && git checkout -b feat/email-send`
Expected: on `feat/email-send`.

---

### Task 1: analyze schema gains `recipientEmail` (Worker)

**Files:** Modify `worker/lifemap-api.mjs` (draftMessageSchema, system prompt, `parseDraftMessage`); Test `worker/lifemap-api.test.mjs`.

- [ ] **Step 1: Write the failing test**

Add to `worker/lifemap-api.test.mjs` inside the `describe("analyzePayload", ...)` block (after the model/bad-request test):

```js
test("keeps an extracted recipientEmail on draft messages", async () => {
  const withEmail = {
    ...analysis,
    draftMessages: [
      {
        id: "draft-1",
        recipient: "Westview School",
        recipientEmail: "office@westview.org",
        subject: "Permission slip",
        body: "Sending the signed slip.",
        status: "Needs review",
      },
    ],
  };
  const fetchImpl = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ output_text: JSON.stringify(withEmail) }),
  });

  const result = await analyzePayload(
    { rawIntake: "field trip" },
    { OPENAI_API_KEY: "secret" },
    fetchImpl,
  );

  expect(result.status).toBe(200);
  expect(result.body.analysis.draftMessages[0].recipientEmail).toBe(
    "office@westview.org",
  );
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npx vitest run worker/lifemap-api.test.mjs -t "recipientEmail"`
Expected: FAIL (normalizer drops the unknown field).

- [ ] **Step 3: Add the field to the schema + parser + prompt**

In `worker/lifemap-api.mjs`, change `draftMessageSchema` to include `recipientEmail`:

```js
const draftMessageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "recipient", "recipientEmail", "subject", "body", "status"],
  properties: {
    id: { type: "string" },
    recipient: { type: "string" },
    recipientEmail: { type: "string" },
    subject: { type: "string" },
    body: { type: "string" },
    status: statusSchema,
  },
};
```

Update `parseDraftMessage` so `recipientEmail` is read but optional (empty string allowed):

```js
function parseDraftMessage(value) {
  if (!isRecord(value) || !isStatus(value.status)) {
    return undefined;
  }
  const base = readObject(value, ["id", "recipient", "subject", "body"]);
  if (!base) {
    return undefined;
  }
  const recipientEmail =
    typeof value.recipientEmail === "string" ? value.recipientEmail.trim() : "";
  return { ...base, recipientEmail, status: value.status };
}
```

In `buildOpenAiRequest`'s system prompt, append this sentence:

```
Include recipientEmail only when an email address is explicit in the source; otherwise return an empty string for it.
```

- [ ] **Step 4: Run the worker tests**

Run: `npx vitest run worker/lifemap-api.test.mjs`
Expected: PASS (existing + new). The existing draft test fixtures omit `recipientEmail`; `parseDraftMessage` defaults it to `""`, so they still pass.

- [ ] **Step 5: Commit**

```bash
git add worker/lifemap-api.mjs worker/lifemap-api.test.mjs
git commit -m "feat: extract recipientEmail in analyze schema"
```

---

### Task 2: `recipientEmail` through the client model

**Files:** Modify `src/lifemap.ts` (DraftMessage, ApprovalItem, buildApprovalQueue, parseDraftMessage); Test `src/lifemap.test.ts`.

- [ ] **Step 1: Write the failing test**

Add to `src/lifemap.test.ts`:

```ts
test("buildApprovalQueue carries recipientEmail onto draft approvals", () => {
  const map = analyzeIntake("");
  map.draftMessages = [
    {
      id: "draft-1",
      recipient: "Westview School",
      recipientEmail: "office@westview.org",
      subject: "Permission slip",
      body: "Signed slip attached.",
      status: "Needs review",
    },
  ];
  const queue = buildApprovalQueue(map);
  const draft = queue.find((item) => item.id === "draft-1");
  expect(draft?.recipientEmail).toBe("office@westview.org");
});
```

(Ensure `buildApprovalQueue` and `analyzeIntake` are imported in the test file; add to the existing import from `./lifemap` if missing.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lifemap.test.ts -t "recipientEmail"`
Expected: FAIL (type error / undefined).

- [ ] **Step 3: Add the field across the client model**

In `src/lifemap.ts`:

- `DraftMessage` type — add `recipientEmail?: string;`
- `ApprovalItem` type — add `recipientEmail?: string;`
- `buildApprovalQueue` draft branch — add `recipientEmail: draft.recipientEmail` next to `recipient: draft.recipient`.
- `parseDraftMessage` — read it (empty/absent → undefined):

```ts
function parseDraftMessage(value: unknown): DraftMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = readString(value.id);
  const recipient = readString(value.recipient);
  const subject = readString(value.subject);
  const body = readString(value.body);
  const status = readStatus(value.status);
  const recipientEmail =
    typeof value.recipientEmail === "string" && value.recipientEmail.trim()
      ? value.recipientEmail.trim()
      : undefined;
  return id && recipient && subject && body && status
    ? { id, recipient, recipientEmail, subject, body, status }
    : undefined;
}
```

- [ ] **Step 4: Run typecheck + the lifemap tests**

Run: `npm run typecheck && npx vitest run src/lifemap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lifemap.ts src/lifemap.test.ts
git commit -m "feat: carry recipientEmail through client analysis model"
```

---

### Task 3: `mailer` interface + mock + Cloudflare adapter (Worker)

**Files:** Create `worker/mailer.mjs`; Test `worker/send.test.mjs` (mock portion).

- [ ] **Step 1: Write the failing test for the mock mailer**

Create `worker/send.test.mjs`:

```js
import { describe, expect, test, vi } from "vitest";
import { createMockMailer } from "./mailer.mjs";

describe("mock mailer", () => {
  test("records the message and returns a provider id", async () => {
    const mailer = createMockMailer();
    const result = await mailer.sendEmail({
      to: "office@westview.org",
      from: "notify@lifemap.app",
      replyTo: "alex@example.com",
      subject: "Permission slip",
      body: "Signed slip attached.",
    });
    expect(result).toEqual({ ok: true, providerId: "mock-1" });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe("office@westview.org");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run worker/send.test.mjs`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the interface, mock, and Cloudflare adapter**

Create `worker/mailer.mjs`. The mock and contract are exact; the Cloudflare adapter is built against the `cloudflare:email` `send_email` binding — **verify its exact API against the `cloudflare:cloudflare-email-service` skill during implementation** and adjust the adapter body if the skill specifies different MIME/binding calls.

```js
// mailer contract:
//   sendEmail({ to, from, replyTo, subject, body })
//     -> { ok: true, providerId } | { ok: false, error }

export function createMockMailer() {
  const sent = [];
  return {
    sent,
    async sendEmail(message) {
      sent.push(message);
      return { ok: true, providerId: `mock-${sent.length}` };
    },
  };
}

// Cloudflare Email Sending adapter. `binding` is env.<SEND_EMAIL binding>.
// VERIFY against the cloudflare-email-service skill before relying on it.
export function createCloudflareMailer(binding, EmailMessageCtor) {
  return {
    async sendEmail({ to, from, replyTo, subject, body }) {
      try {
        const raw = buildMime({ to, from, replyTo, subject, body });
        const message = new EmailMessageCtor(from, to, raw);
        await binding.send(message);
        return { ok: true, providerId: `cf-${Date.now()}` };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

function buildMime({ to, from, replyTo, subject, body }) {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    replyTo ? `Reply-To: ${replyTo}` : "",
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
  ].filter(Boolean);
  return `${headers.join("\r\n")}\r\n\r\n${body}\r\n`;
}
```

- [ ] **Step 4: Run the mock test**

Run: `npx vitest run worker/send.test.mjs`
Expected: PASS (mock mailer test).

- [ ] **Step 5: Commit**

```bash
git add worker/mailer.mjs worker/send.test.mjs
git commit -m "feat: add mailer interface with mock + Cloudflare Email adapter"
```

---

### Task 4: `sent_messages` table + RLS migration (file only)

**Files:** Create `supabase/migrations/0002_sent_messages.sql`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0002_sent_messages.sql`:

```sql
create table if not exists public.sent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  draft_id text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body text not null,
  reply_to text,
  provider_id text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.sent_messages enable row level security;

create policy "sent_messages_select_own"
  on public.sent_messages for select
  using (user_id = auth.uid());

create policy "sent_messages_insert_own"
  on public.sent_messages for insert
  with check (user_id = auth.uid());

create index if not exists sent_messages_user_created_idx
  on public.sent_messages (user_id, created_at desc);
```

- [ ] **Step 2: Sanity-check the SQL parses (no DB apply)**

Run: `git diff --stat` and visually confirm the file. **Do not apply to any database** — Slim applies it at deploy (prod DDL goes through the PR/deploy, never ahead of it).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_sent_messages.sql
git commit -m "feat: sent_messages table with RLS (migration, not applied)"
```

---

### Task 5: `POST /api/send` endpoint (Worker, authenticated)

**Files:** Modify `worker/lifemap-api.mjs` (auth helper, `sendPayload`, route, error consts); Modify `worker/wrangler.jsonc` (vars + binding); Test `worker/send.test.mjs`.

- [ ] **Step 1: Write the failing tests**

Add to `worker/send.test.mjs`:

```js
import { sendPayload } from "./lifemap-api.mjs";

function authFetch(user) {
  return vi.fn().mockResolvedValue({
    ok: Boolean(user),
    json: async () => user ?? {},
  });
}

const env = {
  SUPABASE_URL: "https://proj.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SEND_FROM: "notify@lifemap.app",
};

describe("sendPayload", () => {
  test("rejects a request without a bearer token", async () => {
    const mailer = createMockMailer();
    const result = await sendPayload({
      payload: { draftId: "d1", to: "x@y.com", subject: "s", body: "b" },
      authHeader: "",
      env,
      mailer,
      fetchImpl: authFetch(null),
      recordImpl: vi.fn(),
    });
    expect(result.status).toBe(401);
    expect(mailer.sent).toHaveLength(0);
  });

  test("rejects a missing recipient", async () => {
    const result = await sendPayload({
      payload: { draftId: "d1", to: "", subject: "s", body: "b" },
      authHeader: "Bearer tok",
      env,
      mailer: createMockMailer(),
      fetchImpl: authFetch({ id: "u1", email: "alex@example.com" }),
      recordImpl: vi.fn(),
    });
    expect(result.status).toBe(400);
  });

  test("sends and records on success", async () => {
    const mailer = createMockMailer();
    const recordImpl = vi.fn().mockResolvedValue({ ok: true, id: "row-1" });
    const result = await sendPayload({
      payload: {
        draftId: "d1",
        to: "office@westview.org",
        recipientName: "Westview School",
        subject: "Permission slip",
        body: "Signed slip attached.",
      },
      authHeader: "Bearer tok",
      env,
      mailer,
      fetchImpl: authFetch({ id: "u1", email: "alex@example.com" }),
      recordImpl,
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      ok: true,
      id: "row-1",
      sentAt: result.body.sentAt,
    });
    expect(mailer.sent[0]).toMatchObject({
      to: "office@westview.org",
      from: "notify@lifemap.app",
      replyTo: "alex@example.com",
    });
    expect(recordImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        userToken: "tok",
        row: expect.objectContaining({
          user_id: "u1",
          status: "sent",
          provider_id: "mock-1",
          recipient_email: "office@westview.org",
        }),
      }),
    );
  });

  test("records a failed send and returns a legible error", async () => {
    const mailer = {
      sent: [],
      async sendEmail() {
        return { ok: false, error: "domain not verified" };
      },
    };
    const recordImpl = vi.fn().mockResolvedValue({ ok: true, id: "row-2" });
    const result = await sendPayload({
      payload: { draftId: "d1", to: "x@y.com", subject: "s", body: "b" },
      authHeader: "Bearer tok",
      env,
      mailer,
      fetchImpl: authFetch({ id: "u1", email: "alex@example.com" }),
      recordImpl,
    });
    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);
    expect(recordImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ status: "failed" }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run worker/send.test.mjs`
Expected: FAIL (`sendPayload` not exported).

- [ ] **Step 3: Implement `sendPayload`, the auth + record helpers, and constants**

In `worker/lifemap-api.mjs`, add error constants near the others:

```js
const UNAUTHENTICATED_ERROR = "Please sign in again to send.";
const SEND_FAILURE_ERROR = "LifeMap could not send this email. Try again.";
```

Add the verification + record helpers and the exported `sendPayload`:

```js
async function verifySupabaseUser(authHeader, env, fetchImpl) {
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
  if (!token) {
    return { ok: false };
  }
  const response = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!response.ok) {
    return { ok: false };
  }
  const user = await response.json();
  return user && typeof user.id === "string"
    ? { ok: true, token, id: user.id, email: user.email }
    : { ok: false };
}

async function recordSentMessage({ env, userToken, row, fetchImpl }) {
  const response = await fetchImpl(
    `${env.SUPABASE_URL}/rest/v1/sent_messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        apikey: env.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    },
  );
  if (!response.ok) {
    return { ok: false };
  }
  const [created] = await response.json();
  return { ok: true, id: created?.id };
}

export async function sendPayload({
  payload,
  authHeader,
  env,
  mailer,
  fetchImpl = fetch,
  recordImpl,
}) {
  const auth = await verifySupabaseUser(authHeader, env, fetchImpl);
  if (!auth.ok) {
    return { status: 401, body: { ok: false, error: UNAUTHENTICATED_ERROR } };
  }

  const to = typeof payload?.to === "string" ? payload.to.trim() : "";
  const subject = typeof payload?.subject === "string" ? payload.subject : "";
  const body = typeof payload?.body === "string" ? payload.body : "";
  if (!to || !to.includes("@") || !subject || !body) {
    return { status: 400, body: { ok: false, error: INVALID_INPUT_ERROR } };
  }

  const sent = await mailer.sendEmail({
    to,
    from: env.SEND_FROM,
    replyTo: auth.email,
    subject,
    body,
  });

  const record = recordImpl ?? ((args) => recordSentMessage(args));
  const row = {
    user_id: auth.id,
    draft_id: typeof payload?.draftId === "string" ? payload.draftId : "",
    recipient_email: to,
    recipient_name:
      typeof payload?.recipientName === "string" ? payload.recipientName : null,
    subject,
    body,
    reply_to: auth.email ?? null,
    provider_id: sent.ok ? sent.providerId : null,
    status: sent.ok ? "sent" : "failed",
    error: sent.ok ? null : sent.error,
  };
  const stored = await record({ env, userToken: auth.token, row, fetchImpl });

  if (!sent.ok) {
    console.error("LifeMap send failed", sent.error);
    return { status: 502, body: { ok: false, error: SEND_FAILURE_ERROR } };
  }
  return {
    status: 200,
    body: { ok: true, id: stored.id, sentAt: new Date().toISOString() },
  };
}
```

Note: `new Date().toISOString()` runs in the Worker request handler (allowed at runtime; only the workflow-script sandbox forbids it). The test asserts `sentAt` reflexively, so it is time-agnostic.

Wire the route into the `fetch` handler. Update the method/path guard and dispatch:

```js
if (
  request.method !== "POST" ||
  !["/api/analyze", "/api/classify", "/api/brief", "/api/send"].includes(
    url.pathname,
  )
) {
  return jsonResponse({ ok: false, error: "Not found." }, 404, corsHeaders);
}

try {
  const payload = await request.json();
  let result;
  if (url.pathname === "/api/send") {
    // Dynamic import so Node/vitest never resolves `cloudflare:email`
    // (worker tests import this file but never reach this branch).
    const { EmailMessage } = await import("cloudflare:email");
    result = await sendPayload({
      payload,
      authHeader: request.headers.get("Authorization"),
      env,
      mailer: createCloudflareMailer(env.SEND_EMAIL, EmailMessage),
    });
  } else if (url.pathname === "/api/classify") {
    result = await classifyPayload(payload, env);
  } else if (url.pathname === "/api/brief") {
    result = await generateBriefPayload(payload, env);
  } else {
    result = await analyzePayload(payload, env);
  }
  return jsonResponse(result.body, result.status, corsHeaders);
} catch {
  return jsonResponse(
    { ok: false, error: INVALID_INPUT_ERROR },
    400,
    corsHeaders,
  );
}
```

At the top of `worker/lifemap-api.mjs`, add ONLY the local import (do NOT top-level import `cloudflare:email` — that breaks Node/vitest, which imports this file). `EmailMessage` is loaded via the dynamic `import("cloudflare:email")` inside the `/api/send` branch above.

```js
import { createCloudflareMailer } from "./mailer.mjs";
```

- [ ] **Step 4: Add Worker vars + email binding**

In `worker/wrangler.jsonc`, extend `vars` and add the Email Sending binding (exact binding shape per the cloudflare-email-service skill):

```jsonc
  "vars": {
    "OPENAI_MODEL": "gpt-5.5",
    "ALLOWED_ORIGIN": "https://lifemap-d33.pages.dev,https://slimdragon007.github.io,http://localhost:5173,http://127.0.0.1:5173",
    "SUPABASE_URL": "https://tljijkoqfnimnkpzhozy.supabase.co",
    "SUPABASE_ANON_KEY": "<lifemap supabase anon key>",
    "SEND_FROM": "notify@<slim-domain>"
  },
  "send_email": [{ "name": "SEND_EMAIL" }]
```

(Slim fills the real anon key and `SEND_FROM` domain. The anon key is public/RLS-safe.)

- [ ] **Step 5: Run the send tests + lint the worker globals**

Run: `npx vitest run worker/send.test.mjs && npm run lint`
Expected: PASS. If lint flags `Date`/`EmailMessage`/`fetch` as undefined in `worker/**/*.mjs`, add them to that block's `globals` in `eslint.config.js` (`Date: "readonly"`, etc.).

- [ ] **Step 6: Commit**

```bash
git add worker/lifemap-api.mjs worker/send.test.mjs worker/wrangler.jsonc eslint.config.js
git commit -m "feat: authenticated /api/send endpoint that sends + records (Worker)"
```

---

### Task 6: client `sendDraftEmail()`

**Files:** Modify `src/api.ts` (new function), `src/supabaseClient.ts` (token getter if absent); Test `src/api.test.ts`.

- [ ] **Step 1: Write the failing test**

Add to `src/api.test.ts`:

```ts
test("sendDraftEmail posts to /api/send with a bearer token", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: true, id: "row-1", sentAt: "now" }), {
      status: 200,
    }),
  );

  const result = await sendDraftEmail(
    {
      draftId: "d1",
      to: "office@westview.org",
      recipientName: "Westview School",
      subject: "Permission slip",
      body: "Signed slip attached.",
    },
    "user-token",
    "https://api.example.com",
  );

  expect(result).toEqual({ ok: true, id: "row-1", sentAt: "now" });
  const [, init] = fetchSpy.mock.calls[0];
  expect((init?.headers as Record<string, string>).Authorization).toBe(
    "Bearer user-token",
  );
  fetchSpy.mockRestore();
});
```

(Add `sendDraftEmail` to the `./api` import in the test.)

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/api.test.ts -t "sendDraftEmail"`
Expected: FAIL (not exported).

- [ ] **Step 3: Implement `sendDraftEmail`**

In `src/api.ts` add (after the existing exports):

```ts
export type SendDraftInput = {
  draftId: string;
  to: string;
  recipientName?: string;
  subject: string;
  body: string;
};

export type SendDraftResult =
  | { ok: true; id?: string; sentAt: string }
  | { ok: false; error: string };

export async function sendDraftEmail(
  input: SendDraftInput,
  accessToken: string,
  origin = getApiOrigin(),
): Promise<SendDraftResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }
  try {
    const response = await fetch(`${origin}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    });
    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      return { ok: false, error: DEFAULT_ERROR };
    }
    if (payload.ok === true) {
      return {
        ok: true,
        id: typeof payload.id === "string" ? payload.id : undefined,
        sentAt: typeof payload.sentAt === "string" ? payload.sentAt : "",
      };
    }
    return { ok: false, error: readError(payload.error) };
  } catch (error) {
    console.error("LifeMap send request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}
```

In `src/supabaseClient.ts`, ensure a token getter exists (add if missing):

```ts
export async function getAccessToken(): Promise<string | undefined> {
  const client = getSupabase();
  const { data } = await client.auth.getSession();
  return data.session?.access_token;
}
```

- [ ] **Step 4: Run typecheck + api tests**

Run: `npm run typecheck && npx vitest run src/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api.ts src/api.test.ts src/supabaseClient.ts
git commit -m "feat: client sendDraftEmail posts to /api/send with bearer token"
```

---

### Task 7: Approval card — recipient field, Send, confirm modal, sent state

**Files:** Modify `src/App.tsx` (`ApprovalCard`, a new `SendDraftControl`, send handler/state, staged copy), `src/styles.css` (minimal styles); Test `src/App.test.tsx`.

- [ ] **Step 1: Write the failing test**

Add to `src/App.test.tsx` (follow the file's existing render/login helpers; this asserts the Send affordance appears for a draft with a recipient email):

```ts
test("shows a Send email control for an approved draft with a recipient email", async () => {
  renderApp(); // existing helper
  await loginAndAnalyzeSampleWithDraft(); // existing or nearest helper that yields a draft
  // a draft card exposes a recipient email input and a disabled-until-valid Send button
  expect(await screen.findByLabelText(/recipient email/i)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /send email/i }),
  ).toBeInTheDocument();
});
```

If the existing test harness has no draft-with-email fixture, seed one via the same path other App tests use to inject analysis (mirror an existing analyze-mock test in `src/App.test.tsx`), giving the draft a `recipientEmail`.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/App.test.tsx -t "Send email control"`
Expected: FAIL (no such control yet).

- [ ] **Step 3: Add send state + handler in `App`**

In `App`, add state and a handler (place near the other approval handlers):

```ts
const [sentDraftIds, setSentDraftIds] = useState<Set<string>>(() => new Set());
const [sendingDraftId, setSendingDraftId] = useState<string>();

async function handleSendDraft(item: ApprovalItem, to: string) {
  setSendingDraftId(item.id);
  const token = await getAccessToken();
  if (!token) {
    setToastMessage("Please sign in again to send.");
    setSendingDraftId(undefined);
    return;
  }
  const result = await sendDraftEmail(
    {
      draftId: item.id,
      to,
      recipientName: item.recipient,
      subject: item.title,
      body: approvalBodyEdits[item.id] ?? item.body,
    },
    token,
  );
  setSendingDraftId(undefined);
  if (result.ok) {
    setSentDraftIds((prev) => new Set(prev).add(item.id));
    setToastMessage("Sent.");
  } else {
    setToastMessage(result.error);
  }
}
```

Import `sendDraftEmail` from `./api` and `getAccessToken` from `./supabaseClient`.

- [ ] **Step 4: Add `SendDraftControl` and render it in `ApprovalCard`**

Pass `sent`, `sending`, and `onSend` down to `ApprovalCard` from `ApprovalQueue` (thread them through the same way `onSave`/`onToggle` are). Add the component:

```tsx
function SendDraftControl({
  item,
  sent,
  sending,
  onSend,
}: {
  item: ApprovalItem;
  sent: boolean;
  sending: boolean;
  onSend: (to: string) => void;
}) {
  const [to, setTo] = useState(item.recipientEmail ?? "");
  const [confirming, setConfirming] = useState(false);
  const valid = /.+@.+\..+/.test(to);

  if (sent) {
    return <p className="sent-confirm">Sent ✓</p>;
  }

  return (
    <div className="send-draft">
      <label>
        Recipient email
        <input
          type="email"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          placeholder="name@example.com"
        />
      </label>
      <button
        type="button"
        className="send-button"
        disabled={!valid || sending}
        onClick={() => setConfirming(true)}
      >
        <Send size={16} />
        {sending ? "Sending…" : "Send email"}
      </button>
      {confirming ? (
        <div className="send-confirm" role="dialog" aria-label="Confirm send">
          <p>
            Send to <strong>{to}</strong>? Replies come back to you.
          </p>
          <div className="send-confirm-actions">
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="send-button"
              onClick={() => {
                setConfirming(false);
                onSend(to);
              }}
            >
              Confirm send
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

In `ApprovalCard`, render `SendDraftControl` only for drafts:

```tsx
{
  item.kind === "draft" ? (
    <SendDraftControl
      item={item}
      sent={sent}
      sending={sending}
      onSend={(to) => onSend(to)}
    />
  ) : null;
}
```

(Add `sent`, `sending`, `onSend` to `ApprovalCard`'s props and to the `ApprovalQueue` → `ApprovalCard` wiring, sourced from `sentDraftIds.has(item.id)`, `sendingDraftId === item.id`, and `(to) => handleSendDraft(item, to)`.)

- [ ] **Step 5: Rewrite the staged "nothing was sent" copy**

In `StagedSummary` (around the "Nothing was sent or scheduled" text), replace it with copy that reflects real sending:

```tsx
        Drafts are never sent automatically — use Send email on a draft when
        you're ready. Approved items are staged for you to action.
```

- [ ] **Step 6: Add minimal styles**

In `src/styles.css`, append:

```css
.send-draft {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.send-draft label {
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
}
.send-draft input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
.sent-confirm {
  color: #1f8a4c;
  font-weight: 600;
  margin-top: 8px;
}
.send-confirm {
  margin-top: 8px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
}
.send-confirm-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
```

- [ ] **Step 7: Run typecheck + full suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: PASS. Adjust the Task-7 test to the file's actual helper names if needed.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/styles.css src/App.test.tsx
git commit -m "feat: send-email control on draft approval cards with confirm + sent state"
```

---

### Task 8: Docs, full verification, PR

**Files:** Modify `docs/cloudflare-deployment.md`.

- [ ] **Step 1: Document the send endpoint + required config**

In `docs/cloudflare-deployment.md` under the API section, note: `POST /api/send` is authenticated (Supabase bearer token), needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SEND_FROM` vars and the `send_email` binding in `worker/wrangler.jsonc`; the `sent_messages` migration (`supabase/migrations/0002_sent_messages.sql`) must be applied at deploy; the sending domain needs DKIM/SPF + a verified `SEND_FROM` address.

- [ ] **Step 2: Full gate**

Run: `source ~/.nvm/nvm.sh && nvm use 22 && npm run lint && npm run typecheck && npm test && npm run build`
Expected: ALL PASS.

- [ ] **Step 3: Worker dry-run build**

Run: `npx wrangler deploy --dry-run --config worker/wrangler.jsonc`
Expected: builds clean. If the `send_email` binding or `cloudflare:email` import errors in dry-run, reconcile the binding/import with the cloudflare-email-service skill. **No real deploy.**

- [ ] **Step 4: Push + open PR (stacked on the consolidation branch)**

```bash
git push -u origin feat/email-send
gh pr create --base stabilize/single-cloudflare-api --head feat/email-send \
  --title "Send approved drafts as email (Cloudflare Email + Supabase audit)" \
  --body "Adds authenticated POST /api/send (verifies Supabase token), a mailer interface with a Cloudflare Email adapter, recipientEmail extraction in analyze, a per-draft Send + confirm UI, and a sent_messages RLS table (migration not applied). No deploy/secret/migration-apply performed — Slim configures the verified domain + Email binding, sets the anon key/SEND_FROM, applies the migration, and verifies live send."
```

---

## Self-Review

**Spec coverage:** mailer interface + Cloudflare adapter (T3) ✓; authenticated `/api/send` via `/auth/v1/user` (T5) ✓; `sent_messages` + RLS (T4) ✓; recipientEmail extract→confirm (T1 server, T2 client, T7 UI) ✓; From/Reply-To identity (T5 `sendPayload`) ✓; per-message Send + confirm modal + sent state (T7) ✓; trust-copy rewrite (T7 Step 5) ✓; legible errors / no silent swallow (T5, T6) ✓; tests with injected mock mailer + auth (T5) ✓; docs + config callout (T8) ✓; no deploy/secret/migration-apply ✓.

**Placeholder scan:** every code step has concrete code. The only deliberate deferrals are the exact Cloudflare Email binding/`EmailMessage`/MIME specifics (T3/T5), explicitly routed to the `cloudflare:cloudflare-email-service` skill — the endpoint is fully tested against an injected mock mailer, so this does not block the testable core. Slim-supplied values (anon key, `SEND_FROM` domain) are config, not code gaps.

**Type consistency:** `sendPayload({ payload, authHeader, env, mailer, fetchImpl, recordImpl })` is defined in T5 and called with the same shape in the route and tests. `createMockMailer`/`createCloudflareMailer`/`sendEmail({to,from,replyTo,subject,body})` are consistent across T3/T5. `sendDraftEmail(input, accessToken, origin)` + `SendDraftInput`/`SendDraftResult` consistent across T6/T7. `recipientEmail` is the field name in the schema (T1), client model (T2), and UI (T7). `sent_messages` column names in the migration (T4) match the `row` object in `sendPayload` (T5).

## Out of Scope (note, don't build)

- Bulk send, send-later/scheduling, attachments, contacts book, reminders-as-notifications (per spec).
