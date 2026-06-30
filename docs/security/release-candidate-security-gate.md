# LifeMap Release Candidate Security Gate

**Date:** 2026-06-30
**Purpose:** Define the evidence required before LifeMap is called consumer-ready for real family documents and records.

## Current Verdict

LifeMap is production-deployed and the core live-account safety gates below are recorded. It is ready for controlled consumer-beta testing with fake or low-risk documents. Before a broader public launch, finish the remaining hardening follow-ups: custom auth email/Site URL policy, browser-observed upload console/log inspection, and the documented dev-only Vite/Vitest major-upgrade audit.

## Required Evidence Before Consumer Release

| Gate | Required result | Current status |
| --- | --- | --- |
| Production deploy verification | `npm run verify:production` passes | Pass on 2026-06-30; 6 live checks passed |
| Production dependency audit | `npm audit --omit=dev` reports 0 vulnerabilities | Pass on 2026-06-30; 0 vulnerabilities |
| Full dependency audit triage | Non-production findings are fixed or documented | Pass with documented Vite/Vitest major-upgrade follow-up |
| Storage security catalog check | `scripts/verify-storage-security.sql` passes against the live Supabase project | Pass on 2026-06-30 via Supabase MCP `execute_sql` |
| Supabase security advisors | No critical security findings | Pass per `docs/security/storage-security-verification-report.md` |
| Real account file upload/open | Account A uploads and reopens an encrypted file | Pass on 2026-06-30 via synthetic production account and fake PDF bytes |
| Cross-account metadata denial | Account B cannot see Account A's Cabinet metadata | Pass on 2026-06-30 via synthetic Account A/B test |
| Cross-account Storage denial | Account B cannot download Account A's Storage object | Pass on 2026-06-30; Storage returned object-not-found to Account B |
| Anonymous Storage denial | No-session user cannot download Account A's Storage object | Pass on 2026-06-30; Storage returned object-not-found to anonymous client |
| Clear-map deletion | Storage objects are removed before records are cleared | Pass with caveat on 2026-06-30; Storage catalog row is deleted before metadata, and app now fails closed unless `remove()` confirms deleted paths |
| Password reset | Reset email, recovery session, and password update work on the configured production auth domain | Pass on 2026-06-30; Gmail reset email opened `app.getlifemap.com`, password update completed, and direct sign-in with the new password succeeded |
| Product copy safety | No zero-knowledge, HIPAA, bank-grade, or independent-audit claims | Pass in current Privacy copy |

## Blocking Rules

Do not call LifeMap fully consumer-ready if any of these are true:

- Real document upload/open has not been tested with a signed-in production test account.
- Cross-account metadata or Storage denial is not verified.
- Password reset is not verified on the configured production Auth redirect domain and the current production app deployment.
- Product copy claims zero-knowledge, HIPAA, bank-grade, bank-level, or independent security audit without actual evidence.
- `npm audit --omit=dev` reports production dependency vulnerabilities.
- `npm run verify:production` fails.

## Manual Proof Links

- Cross-account storage test: `docs/security/consumer-safety-test-plan.md`
- Storage posture report: `docs/security/storage-security-verification-report.md`
- Dependency audit notes: `docs/security/dependency-audit-notes.md`

## Automated Evidence Recorded

Commands run on 2026-06-30:

```bash
npm run verify:production
npm audit --omit=dev
npm audit
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
npm run test:e2e
```

Results:

- `npm run verify:production`: passed 6 live production checks.
- `npm audit --omit=dev`: passed with 0 vulnerabilities.
- `npm audit`: failed on development-only Vite/Vitest/esbuild advisories that require a breaking Vite major upgrade; tracked in `docs/security/dependency-audit-notes.md`.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test -- --reporter=dot`: passed 299 tests.
- `npm run build`: passed with the existing chunk-size warning.
- `npm run test:e2e`: passed 16 tests, skipped 5 real-auth tests because `tests/e2e/.env.e2e` is not present.
- `scripts/verify-storage-security.sql`: passed against project `tljijkoqfnimnkpzhozy` through Supabase MCP `execute_sql`.
- Synthetic production-account storage harness:
  - Account A and Account B signup returned active sessions.
  - Account A uploaded encrypted fake PDF bytes and decrypted the original bytes after download.
  - Account B could not read Account A Cabinet metadata.
  - Account B and an anonymous client could not download Account A's Storage object.
  - Supabase `storage.remove()` deleted the Storage catalog row before metadata cleanup.
  - Important caveat: an owner download immediately after deletion can still return cached bytes from Supabase Storage. LifeMap now validates that `remove()` returned the deleted object paths before deleting metadata, so the app does not leave an in-app path to the file.
  - Synthetic Cabinet rows and Storage objects were cleaned up.
- Production password reset recovery:
  - Supabase reset email was delivered to the connected Gmail inbox for a synthetic plus-address account.
  - The reset link redirected to `https://app.getlifemap.com/#`, matching the configured Supabase Site URL rather than the requested `lifemap-d33.pages.dev` redirect.
  - The production reset screen rendered, password update completed, and a direct Supabase sign-in with the new password succeeded.
  - The synthetic `m.haslim+lifemap-rc-*` Auth user was removed after verification, and follow-up SQL confirmed no matching auth user, profile, domain, user-memory, vault item, or vault file rows remained.

## Recommended Next Action

Decide whether `app.getlifemap.com` is the permanent auth-link domain. If yes, keep the current Site URL behavior and set up branded/custom SMTP next. If not, update Supabase Auth URL configuration and email templates so recovery links use the intended production domain.
