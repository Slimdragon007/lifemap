# LifeMap Release Candidate Security Gate

**Date:** 2026-06-30
**Purpose:** Define the evidence required before LifeMap is called consumer-ready for real family documents and records.

## Current Verdict

LifeMap is production-deployed and usable for controlled testing. It is not yet fully consumer-ready until the remaining live-account safety checks below are completed and recorded.

## Required Evidence Before Consumer Release

| Gate | Required result | Current status |
| --- | --- | --- |
| Production deploy verification | `npm run verify:production` passes | Pass on 2026-06-30 |
| Production dependency audit | `npm audit --omit=dev` reports 0 vulnerabilities | Pass on 2026-06-30 |
| Full dependency audit triage | Non-production findings are fixed or documented | Pass with documented Vite/Vitest major-upgrade follow-up |
| Storage security catalog check | `scripts/verify-storage-security.sql` passes against the live Supabase project | Pass per `docs/security/storage-security-verification-report.md` |
| Supabase security advisors | No critical security findings | Pass per `docs/security/storage-security-verification-report.md` |
| Real account file upload/open | Account A uploads and reopens an encrypted file | Not recorded |
| Cross-account metadata denial | Account B cannot see Account A's Cabinet metadata | Not recorded |
| Cross-account Storage denial | Account B cannot download Account A's Storage object | Not recorded |
| Anonymous Storage denial | No-session user cannot download Account A's Storage object | Not recorded |
| Clear-map deletion | Storage objects are removed before records are cleared | Not recorded |
| Password reset | Reset email, recovery session, and password update work on production domain | Not recorded |
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

## Recommended Next Action

Run the production test-account checklist using fake data only. After each pass, update this file's `Current status` column and the evidence log in `docs/security/consumer-safety-test-plan.md`.
