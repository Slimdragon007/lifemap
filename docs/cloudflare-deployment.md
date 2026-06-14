# LifeMap Cloudflare Deployment Notes

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

The local API currently runs with `npm run dev:api` from `scripts/api-server.mjs` and exposes:

- `POST /api/analyze`
- `POST /api/classify`
- `POST /api/brief`

Required server-side secrets:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, defaults to `gpt-5.5`)
- `SUPABASE_SERVICE_ROLE_KEY` (reserved for future server-side persistence or admin jobs; never expose to Vite)

For production, deploy the API as a Cloudflare Worker or small Node service and set `VITE_API_ORIGIN` on Pages to that deployed origin. Do not put `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` variable.

Current Worker deployment:

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
