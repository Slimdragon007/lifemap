# LifeMap — agent & pickup-session guide

AI family-admin app that reduces mental load. Core loop: record the day (paste messy
emails/forms/notes) → AI sorts it → hands back your next three things.

**Latest pickup log:** `docs/2026-06-30-lifemap-controlled-beta-session-log.md`.
Read it before changing product flow, auth, storage, deployment, or release status.

## Where things live (source of truth)

- **Production:** https://app.getlifemap.com (Cloudflare Pages project `lifemap`, also at
  `lifemap-d33.pages.dev`). API Worker: `lifemap-api.m-haslim.workers.dev`.
- **Repo:** github.com/Slimdragon007/lifemap. **Default + production branch = `main`.**
- **Supabase:** project ref `tljijkoqfnimnkpzhozy` (auth + Postgres). Email confirmation is
  OFF (instant signup); password reset shipped. Sensitive columns are AES-256-GCM encrypted
  at rest; per-user RLS on all family tables.
- **Canonical build log / decisions:** Obsidian `10_WIKI/LifeMap.md` and Notion session notes
  under "LifeMap — Accounts & Access". Read the latest build-log entry before starting.

## Branch & deploy workflow

- Work off `main`. For non-trivial changes: branch → PR → merge to `main`.
- **Frontend (Pages) AUTO-DEPLOYS from `main`** (git-connected, set up 2026-06-18). A push/merge
  to `main` triggers a Cloudflare Pages build (`npm run build`, output `dist`) and deploys to
  production. Build-time `VITE_*` env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_API_ORIGIN`) live in the Pages project's Production env (NOT `.env.local` for prod).
  So: **every merge to `main` ships to real users — keep `main` gated behind PR + green CI.**
  Manual `npm run deploy:pages` still works as a fallback.
- **The WORKER (`lifemap-api`) ALSO AUTO-DEPLOYS from `main`** (Cloudflare Workers Builds,
  git-connected 2026-06-18). A push to `main` runs `npx wrangler deploy --config
worker/wrangler.jsonc` and deploys the Worker. So Pages **and** Worker both ship from the
  same commit on every push — no manual step. Worker secrets (`OPENAI_API_KEY`,
  `FIELD_ENCRYPTION_KEY`, `NOTION_TOKEN`) persist across builds. Manual `npm run deploy:api`
  still works as a fallback. (Build watch paths = `*`, so the Worker rebuilds on any push; can
  be narrowed to `worker/*` later if desired.)
- After any deploy: `npm run verify:production` (6 checks: Pages HTML, Worker origin baked in
  bundle, Worker /health, CORS, AI analyze, asset secret markers), and grep the live bundle for
  the Supabase ref to confirm it's a real-auth build, not a demo bundle.

## Gate (run before claiming done)

- `npm test` — **use Node 22, NOT 26.** Node 26 ships a built-in `localStorage` global that
  shadows jsdom's and breaks the suite.
- `npm run typecheck` · `npm run lint` · `npm run build`
- App/UI features: also exercise the Playwright e2e suite in `tests/e2e/` — unit + lint + tsc
  alone is not "done" for app behavior.

## Demo vs live (build-time split — important)

- **Demo:** the dev server reads `tests/e2e/env-demo/.env`, which omits `VITE_SUPABASE_*`, so
  `isSupabaseConfigured` is false → `demoMode` true → "Alex Kim" sample seed, localStorage only.
  The demo bundle has NO Supabase credentials compiled in and cannot touch prod data.
- **Live:** `.env.local` (gitignored) has real `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  → `demoMode` false, real per-user Supabase. Build live ONLY with `.env.local` present, or it
  silently ships a demo bundle.
- The `mobile-pwa` preview deploy is built from `.env.local` and shares the PROD Supabase
  project — signing into it touches real data. No isolated staging DB yet.

## Stack

Vite + React 18 + TypeScript · Vitest (jsdom) · Cloudflare Pages (frontend) + single Worker
(`worker/lifemap-api.mjs`) · Supabase auth/Postgres · OpenAI `gpt-5.5` for extraction
(server-side only; key is a Worker secret).

## Cloudflare & infra inventory (verified 2026-06-18, all green)

- **Pages** project `lifemap` → `app.getlifemap.com` (custom domain, 200) + `lifemap-d33.pages.dev`.
  Config: root `wrangler.jsonc` (`pages_build_output_dir: dist`).
- **Worker** `lifemap-api` → `lifemap-api.m-haslim.workers.dev` (`/health` 200). Config:
  `worker/wrangler.jsonc`. Runs the AI routes (`/api/analyze|classify|brief`), authed
  `/api/send`, Google connect (`/api/google/*`), feedback, and a `*/15 * * * *` cron uptime watch.
- **KV** namespace `lifemap-google-tokens` (`5a0a54b67b004ed89ac150c81f6df8bf`), bound as
  `GOOGLE_TOKENS` — stores Google OAuth tokens only (never browser/Supabase).
- **Email** Cloudflare Email Sending, `send_email` binding `EMAIL`, from `notify@getlifemap.com`.
- **Rate limit** `AI_RATE_LIMITER` 20 req/60s/IP on the open AI routes.
- **Worker secrets** (set via `wrangler secret put`): `OPENAI_API_KEY`, `FIELD_ENCRYPTION_KEY`,
  `NOTION_TOKEN`.
- **Not configured yet (known):**
  - **Google Calendar OAuth** — `GOOGLE_CLIENT_ID` in `worker/wrangler.jsonc` is still the
    `REPLACE_WITH_…` placeholder; `GOOGLE_CLIENT_SECRET` / `GOOGLE_OAUTH_STATE_SECRET` unset.
    The in-app Connect button errors until these are set (see `docs/cloudflare-deployment.md`).
  - **Marketing apex** `getlifemap.com` does not resolve — no landing page; app lives on `app.`.

## Gotchas

- **Set Worker secrets with `wrangler secret put`, not the dashboard.** Dashboard-set secrets
  only stage and silently drop on the next CLI `wrangler deploy`.
- New TypeScript files must be **kebab-case** (a naming-lint hook enforces it). Older modules
  (`familyOS.ts`, `remoteState.ts`) are camelCase — match the lint for NEW files only.
- Apply Supabase DDL/migrations **at deploy**, not ahead of it.
- Config (`wrangler.jsonc`, env): see `docs/cloudflare-deployment.md`.
