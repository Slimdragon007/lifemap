# LifeMap Release Candidate Security Gate

**Date:** 2026-06-30
**Purpose:** Define the evidence required before LifeMap is called consumer-ready for real family documents and records.

## Current Verdict

LifeMap is production-deployed and usable for controlled testing. It is not yet fully consumer-ready until the remaining live-account safety checks below are completed and recorded.

## Required Evidence Before Consumer Release

| Gate | Required result | Current status |
| --- | --- | --- |
| Production deploy verification | `npm run verify:production` passes | Pass on 2026-06-30; 6 live checks passed |
| Production dependency audit | `npm audit --omit=dev` reports 0 vulnerabilities | Pass on 2026-06-30; 0 vulnerabilities |
| Full dependency audit triage | Non-production findings are fixed or documented | Pass with documented Vite/Vitest major-upgrade follow-up |
| Storage security catalog check | `scripts/verify-storage-security.sql` passes against the live Supabase project | Pass on 2026-06-30 via Supabase MCP `execute_sql` |
| Supabase security advisors | No critical security findings | Pass per `docs/security/storage-security-verification-report.md` |
| Real account file upload/open | Account A uploads and reopens an encrypted file | Blocked: no dedicated `tests/e2e/.env.e2e` credentials or inbox access available in this run |
| Cross-account metadata denial | Account B cannot see Account A's Cabinet metadata | Blocked: needs Account A and Account B production test accounts |
| Cross-account Storage denial | Account B cannot download Account A's Storage object | Blocked: needs Account A object path and Account B session |
| Anonymous Storage denial | No-session user cannot download Account A's Storage object | Blocked: needs Account A object path from a real upload |
| Clear-map deletion | Storage objects are removed before records are cleared | Blocked: needs Account A real upload |
| Password reset | Reset email, recovery session, and password update work on production domain | Blocked: needs a test inbox that can receive the production reset email |
| Product copy safety | No zero-knowledge, HIPAA, bank-grade, or independent-audit claims | Pass in current Privacy copy |

## Blocking Rules

Do not call LifeMap fully consumer-ready if any of these are true:

- Real document upload/open has not been tested with a signed-in production test account.
- Cross-account metadata or Storage denial is not verified.
- Password reset is not verified on `https://lifemap-d33.pages.dev`.
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
- `npm run test -- --reporter=dot`: passed 298 tests.
- `npm run build`: passed with the existing chunk-size warning.
- `npm run test:e2e`: passed 16 tests, skipped 5 real-auth tests because `tests/e2e/.env.e2e` is not present.
- `scripts/verify-storage-security.sql`: passed against project `tljijkoqfnimnkpzhozy` through Supabase MCP `execute_sql`.

## Recommended Next Action

Create or provide two dedicated production test accounts and an accessible test inbox. Then run the production test-account checklist using fake data only. After each pass, update this file's `Current status` column and the evidence log in `docs/security/consumer-safety-test-plan.md`.
