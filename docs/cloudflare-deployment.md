# LifeMap Cloudflare Deployment Notes

## Live Production

- App: https://lifemap-d33.pages.dev/
- Worker health: https://lifemap-api.m-haslim.workers.dev/health
- Latest verified deploy path: `npm run deploy:pages` followed by `npm run verify:production`
- Current production verification checks Pages HTML, Worker origin in the client bundle, Worker health, CORS, AI analyze, and public asset secret markers.

## Frontend: Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- Deploy command: `npm run deploy:pages`
- Pages config: `wrangler.jsonc`
- Required production env vars:
  - `VITE_API_ORIGIN`: deployed LifeMap API origin, for example `https://lifemap-api.<account>.workers.dev`
  - `VITE_SUPABASE_URL`: Supabase project URL
  - `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key

Cloudflare Pages will copy `public/_headers` into the deployed `dist` output for baseline browser security headers.

## API

The API is a single Cloudflare Worker (`worker/lifemap-api.mjs`) used in both local dev and production — there is no separate Node server. `npm run dev:api` runs the real Worker locally via `wrangler dev --config worker/wrangler.jsonc` on `http://localhost:8787`, exposing:

- `GET /health`
- `POST /api/analyze`
- `POST /api/classify`
- `POST /api/brief`
- `POST /api/send` — **authenticated** (Supabase bearer token). Sends an approved draft as email and records it in `sent_messages`.
- `POST /api/google/auth-url`, `GET /api/google/callback`, `GET /api/google/status`, `POST /api/google/disconnect` — Google Calendar connect (Phase 1).

### Google Calendar connect (`/api/google/*`, Phase 1)

Lets a signed-in user connect their Google account so a later phase can write calendar events. OAuth tokens are stored **only** in the `GOOGLE_TOKENS` Cloudflare KV namespace (never in the browser, never in Supabase). The callback is tied to the initiating user by an HMAC-signed `state`. To enable in production:

- Create a **Google Cloud** project + OAuth 2.0 **Web** client; consent screen in **testing** mode with the founder account as a test user.
- Authorized redirect URI = `https://lifemap-api.m-haslim.workers.dev/api/google/callback`.
- Vars (`worker/wrangler.jsonc`): `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, `APP_ORIGIN` (the Pages app URL).
- Secrets (`wrangler secret put`): `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET` (any long random string).
- Create the KV namespace and put its id in `worker/wrangler.jsonc`: `wrangler kv namespace create GOOGLE_TOKENS` → copy the `id` into the `kv_namespaces` binding.

### Email send (`/api/send`)

`/api/send` verifies the caller's Supabase access token (via `GET <SUPABASE_URL>/auth/v1/user`), sends through the Cloudflare Email Sending binding (`From: SEND_FROM`, `Reply-To:` the signed-in user), and records the result to the `sent_messages` table (RLS). To enable it in production:

- Onboard a verified sending domain: `wrangler email sending enable <domain>` (adds DKIM/SPF). Set `SEND_FROM` (in `worker/wrangler.jsonc` `vars`) to an address on that domain.
- Confirm the `send_email` binding `{ "name": "EMAIL" }` is in `worker/wrangler.jsonc`.
- Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` (`vars`) — the anon key is public/RLS-safe.
- Apply the migration `supabase/migrations/0002_sent_messages.sql` at deploy (creates `sent_messages` + RLS). Do not apply prod DDL ahead of the PR.
- Locally, `wrangler dev` reads the same `vars`; the `send_email` binding requires the onboarded domain to actually transmit.

Secrets are managed through Cloudflare's env model (not scattered `.env` files):

- **Local:** copy `worker/.dev.vars.example` to `worker/.dev.vars` (gitignored) and set `OPENAI_API_KEY`. `wrangler dev` reads it automatically.
- **Production:** `wrangler secret put OPENAI_API_KEY --config worker/wrangler.jsonc` (or the dashboard).
- Non-secret config (`OPENAI_MODEL`, defaults to `gpt-5.5`; `ALLOWED_ORIGIN`) lives in `worker/wrangler.jsonc` `vars`.
- Never put `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` variable.

Worker deployment:

- Config: `worker/wrangler.jsonc`
- Deploy command: `npm run deploy:api`

## Supabase

Apply `supabase/migrations/0001_init.sql` to the Supabase project before using real accounts. The app stores the current MVP state in `user_memory.preferences.lifemapState` for signed-in users, protected by the migration's row-level security policy.

## Verification

Before sharing a production preview:

1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm test`.
4. Run `npm run build`.
5. Inspect the built assets and confirm no server-only secret names or values are present.
6. Run `npm run verify:production` after deploy to confirm Pages, Worker health, CORS, AI analyze, and public asset checks.
