# LifeMap Production Runbook

## Current Live State

- Production app: https://lifemap-d33.pages.dev/
- Permanent Auth link domain: https://app.getlifemap.com/
- Worker health: https://lifemap-api.m-haslim.workers.dev/health
- Frontend host: Cloudflare Pages project `lifemap`
- API host: Cloudflare Worker `lifemap-api`
- GitHub repo: `Slimdragon007/lifemap`
- Default branch: `main`

Before calling a build consumer-ready, complete `docs/security/release-candidate-security-gate.md`.

## Founder Smoke Test

1. Open the production app on desktop and iPhone.
2. Sign in with the known founder test account. Keep the password out of git and docs.
3. Confirm bottom navigation appears: Home, Cabinet, Family, Settings.
4. Open Home and confirm the page shows one priority, one drop/add action, quick Family access, and Review only when approval is relevant.
5. Open Family and confirm people/pets are separate from stored documents.
6. Open a profile and add a fake custom section or field.
7. Open Cabinet and confirm stored records are grouped as person/pet or household records.
8. Add a fake PDF or image document, then reopen it from the Cabinet detail view.
9. Open Settings and confirm privacy/security, account, onboarding replay, and clear-map controls are reachable.
10. Refresh the page, sign back in if needed, and confirm the app is still usable.

## Consumer Safety Smoke Test

Use fake records and synthetic files only.

1. Complete the founder smoke test above.
2. Complete the cross-account storage test in `docs/security/consumer-safety-test-plan.md`.
3. Verify password reset on the production domain:
   - open the production login screen
   - use Forgot password with a test account
   - open the email link
   - confirm the app shows the set-new-password screen
   - update the password
   - sign out and sign back in with the new password
4. Confirm Privacy & security copy does not claim zero-knowledge, HIPAA, bank-grade, or independent audit status.
5. Before broader consumer launch, complete branded Supabase Auth SMTP setup using `docs/security/auth-email-deliverability-runbook.md`, then repeat signup-confirmation and password-reset checks with a synthetic account.

## Deploy Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
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
- Run `npm audit --omit=dev` before release candidate approval.
- Keep `docs/security/release-candidate-security-gate.md` current.
- Keep demo passwords out of committed docs, screenshots, and terminal transcripts.

## Next Hardening Work

- Add a CI gate after approving CI/CD workflow changes.
- Complete branded Supabase Auth SMTP using `docs/security/auth-email-deliverability-runbook.md`.
- Repeat signup-confirmation and password-reset checks after Auth SMTP is enabled.
- Complete a browser-observed file upload session and confirm plaintext file content does not appear in console or logs.
- Plan a Vite/Vitest major upgrade to close the remaining development-tooling audit findings.
