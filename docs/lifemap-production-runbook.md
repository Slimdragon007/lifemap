# LifeMap Production Runbook

## Current Live State

- Production app: https://lifemap-d33.pages.dev/
- Worker health: https://lifemap-api.m-haslim.workers.dev/health
- Frontend host: Cloudflare Pages project `lifemap`
- API host: Cloudflare Worker `lifemap-api`
- GitHub repo: `Slimdragon007/lifemap`
- Default branch: `feat/mvp-now-auth-persistence`

## Founder Smoke Test

1. Open the production app on desktop and iPhone.
2. Sign in with the known founder test account. Keep the password out of git and docs.
3. Confirm bottom navigation appears: Today, Calendar, Capture, Vault, Review, More.
4. Open Capture and paste a fresh messy family-admin note.
5. Run Analyze intake and confirm LifeMap returns due items, missing info, waiting-on, and next actions.
6. Open Review and confirm reminders/drafts are approval-gated.
7. Open Calendar and Vault and confirm extracted items are projected into both views.
8. Refresh the page, sign back in if needed, and confirm the app is still usable.

## Deploy Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run deploy:pages
npm run verify:production
```

Deploy the Worker only when API code or Worker config changes:

```bash
npm run deploy:api
```

Validate Worker config without deploying:

```bash
npm run deploy:api -- --dry-run
```

## Security Checks

- Never put `OPENAI_API_KEY` in a `VITE_*` variable.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code or Pages public env vars.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are public by design.
- Run `npm run verify:production` after every deploy.
- Keep demo passwords out of committed docs, screenshots, and terminal transcripts.

## Next Hardening Work

- Add a CI gate after approving CI/CD workflow changes.
- Verify Supabase logout/login restore on production with the founder test account.
- Add a guided setup flow for family members, pets, travel, school, health, and home buckets.
- Expand Vault records for passports, insurance, IDs, medication, vaccines, travel rewards, TSA/Known Traveler numbers, and recurring care loops.
