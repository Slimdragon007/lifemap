# LifeMap — Send Approved Drafts as Email (Design)

**Date:** 2026-06-15
**Status:** Approved design, ready for implementation plan
**Depends on:** PR #1 (`stabilize/single-cloudflare-api`) — single Cloudflare Worker API. Branch this work off that branch (or off `feat/mvp-now-auth-persistence` after it merges).

## Problem & Goal

LifeMap extracts draft messages and gates them behind approval, but nothing is ever sent — the loop dead-ends at "staged." Goal: let a user **actually send an approved draft as real email**, server-side, via Cloudflare Email Sending, with an explicit per-message confirmation and a durable record of what was sent.

This deliberately changes the current "nothing is ever sent or scheduled" promise. Sending stays explicit and per-message (never automatic), and sent items are clearly marked.

## Decisions (settled during brainstorming)

- **Send model:** server-side. A Cloudflare Worker transmits the email.
- **Transport:** Cloudflare Email Sending, from a verified address on the user's own Cloudflare domain. `Reply-To` = the signed-in user's email so replies reach the user, not LifeMap.
- **Recipient address:** the analyze model extracts a `recipientEmail` from the source when present; the user confirms/edits it in the approval card before Send is enabled. Manual entry is the fallback.
- **Auth:** `/api/send` verifies the caller's Supabase access token (no service-role bypass).
- **Record:** durable `sent_messages` Supabase table with row-level security.
- **Trigger:** per-message Send button + confirm modal. No bulk send (v1).

## Architecture

Five units, each with one responsibility and a clear interface.

### 1. `mailer` interface (Worker)

```
sendEmail({ to, from, replyTo, subject, body })
  -> { ok: true, providerId: string } | { ok: false, error: string }
```

One adapter: `cloudflareEmailMailer`, using the Cloudflare Email Sending binding configured in `worker/wrangler.jsonc`. The interface is injectable so the endpoint can be unit-tested with a mock mailer (mirrors the existing `fetchImpl` injection pattern in `worker/lifemap-api.test.mjs`). Exact Cloudflare Email API specifics (binding type, MIME construction, verified-domain constraints) come from the `cloudflare:cloudflare-email-service` skill at implementation time.

### 2. `POST /api/send` endpoint (Worker — first authenticated route)

- **Input:** `{ draftId, to, recipientName, subject, body }`. (Body/subject come from the client so user edits are honored; `to` is the user-confirmed address.)
- **Auth:** requires `Authorization: Bearer <supabase access token>`. The Worker verifies it by calling `GET <SUPABASE_URL>/auth/v1/user` with the token + anon `apikey` header. On 200 it gets the trusted `{ id, email }`; otherwise → 401. (Simple, robust, no JWT crypto in the Worker; sends are infrequent so the extra call is fine.)
- **Send:** `From` = `SEND_FROM` (wrangler var, e.g. `notify@<domain>`), `Reply-To` = verified user email, `To` = `to`. Calls the mailer.
- **Record:** inserts into `sent_messages` via Supabase REST using the **user's** bearer token (so RLS enforces `user_id = auth.uid()`), with `status: 'sent'` + `provider_id`, or `status: 'failed'` + `error` on mailer failure.
- **Response:** `{ ok: true, id, sentAt }` or `{ ok: false, error }` (legible — same ethos as the C3 error work).
- analyze/classify/brief stay open and unchanged.

### 3. `sent_messages` table + RLS (Supabase migration)

New migration under `supabase/migrations/`:

```
sent_messages(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  draft_id text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body text not null,
  reply_to text,
  provider_id text,
  status text not null check (status in ('sent','failed')),
  error text,
  created_at timestamptz not null default now()
)
```

RLS enabled; policies: `select` and `insert` where `user_id = auth.uid()` (insert uses `with check (user_id = auth.uid())`).

### 4. analyze schema: extract `recipientEmail` (Worker + client types)

- Add `recipientEmail` to the draft-message object in `lifeMapSchema` (strict mode requires it in `required`; the model returns `""` when no address is in the source). System prompt updated to "include recipientEmail only when an address is explicit in the source; otherwise empty string."
- Normalizer (`normalizeAnalysis` / `parseDraftMessage` in the Worker) accepts `recipientEmail` and treats `""` as absent.
- Mirror the `recipientEmail` field in `src/lifemap.ts` `DraftMessage` type + its normalizer, and surface it on `ApprovalItem`.

### 5. Client: confirm + send UI + `sendDraftEmail()`

- `src/api.ts` `sendDraftEmail({ draftId, to, recipientName, subject, body })` posts to `/api/send` with the Authorization bearer token read from the Supabase session.
- Approval/draft card (in `App.tsx` `ApprovalQueue`): a recipient-email field pre-filled from `recipientEmail` (editable, validated). **Send email** button disabled until a syntactically valid email is present. Click → confirm modal (To / From / Reply-To = your email / subject / body preview) → `sendDraftEmail` → on success show **Sent ✓ <time>** and disable resend; on failure show the error and allow retry.
- Rewrite the staged-confirmation copy so it no longer claims nothing is ever sent.

## Data Flow

```
analyze (model fills recipientEmail when present)
  -> approval card pre-fills + user confirms/edits the address
  -> Send enabled only with a valid address
  -> confirm modal
  -> POST /api/send  (Authorization: Bearer <supabase token>)
  -> Worker verifies user via /auth/v1/user
  -> mailer.sendEmail({ from: SEND_FROM, replyTo: userEmail, to, subject, body })
  -> insert sent_messages (RLS as the user)
  -> { ok, id, sentAt }
  -> card shows Sent ✓, resend disabled
```

## Error Handling

- Missing/invalid token → 401; client surfaces "Please sign in again."
- Invalid recipient email → Send stays disabled client-side; server also 400s defensively.
- Mailer failure → record `status:'failed'` + `error`, return legible error, client shows it, retry allowed.
- Double-send prevention → button disabled after a successful send; optional server check for an existing `status:'sent'` row for the same `draftId`.
- No silent swallows anywhere (consistent with the C2/C3 work).

## Testing

- **Worker `sendPayload`:** unit tests with injected mock mailer + mock auth — valid token + mailer ok → records 'sent'; mailer fail → records 'failed' + legible error; missing/invalid token → 401; missing recipient → 400.
- **Client:** `sendDraftEmail` posts to `/api/send` with the bearer token; recipient validation enables/disables Send; UI renders the Sent state after success (App.test style).
- **analyze schema:** normalizer maps `recipientEmail` and treats `""` as absent.
- **Migration/RLS:** documented SQL check that a user cannot read another user's `sent_messages` (follows the existing `user_memory` RLS pattern).
- All gates run on **Node 22** (Node 26 breaks jsdom localStorage locally).

## Config the user provides (not built by the agent)

- The verified Cloudflare domain + the `SEND_FROM` address (set as a wrangler var).
- Cloudflare Email Sending enabled with DKIM/SPF DNS records on that domain.
- The Email Sending binding added to `worker/wrangler.jsonc`.
- `VITE_SUPABASE_URL` / anon key already present; the Worker also needs `SUPABASE_URL` + anon `apikey` available as vars for the `/auth/v1/user` verification call.

## Out of Scope (YAGNI)

- Bulk "send all approved" (per-message only).
- Send-later / scheduling (the `Scheduled` status stays cosmetic).
- Attachments.
- Contacts / address book.
- Converting reminders into real notifications.
