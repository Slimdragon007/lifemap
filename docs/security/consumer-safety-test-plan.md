# LifeMap Consumer Safety Test Plan

**Date:** 2026-06-30
**Purpose:** Prove real-account safety before stronger consumer claims.

## Manual Cross-Account Storage Test

### Accounts

- Account A: test user controlled by the developer.
- Account B: separate test user controlled by the developer.

Use only fake records and synthetic files. Do not use genuine child, medical, passport, insurance, school, or family data.

### Steps

1. Sign in as Account A.
2. Add one fake PDF or image document.
3. Confirm Cabinet shows the attached file.
4. Open the file and confirm decrypted content matches the original test file.
5. Capture the `vault_item_files.object_path` from Supabase for Account A.
6. Sign out.
7. Sign in as Account B.
8. Confirm Account B cannot see Account A's record in Cabinet.
9. Attempt to download Account A's object path through Supabase Storage as Account B.
10. Confirm the request is denied.
11. Sign out completely.
12. Attempt to download Account A's object path through Supabase Storage with no authenticated session.
13. Confirm the anonymous request is denied.
14. Sign back into Account A.
15. Clear my map.
16. Confirm owned Storage objects are removed before records disappear.

## Pass Criteria

- Account A can upload and reopen its own encrypted file.
- Account B cannot see Account A's metadata.
- Account B cannot download Account A's encrypted object.
- Anonymous/no-session users cannot download Account A's encrypted object.
- Clear-map removes Account A's owned file objects.
- No plaintext file contents appear in browser console, Worker logs, public bundle, or database metadata.

## Fail Criteria

- Any cross-account file or metadata read succeeds.
- File content is uploaded as plaintext.
- Clear-map reports success while Storage deletion fails.
- Product copy claims zero-knowledge, HIPAA, bank-grade, or independent audit.

## Evidence Log

| Check | Result | Date | Notes |
| --- | --- | --- | --- |
| Account A upload and reopen | Pass | 2026-06-30 | Synthetic production Account A uploaded encrypted fake PDF bytes, downloaded them, decrypted them, and matched the original bytes. |
| Account B metadata denial | Pass | 2026-06-30 | Synthetic Account B received no rows for Account A's `vault_items` or `vault_item_files` records. |
| Account B Storage denial | Pass | 2026-06-30 | Synthetic Account B download returned object-not-found for Account A's object path. |
| Anonymous Storage denial | Pass | 2026-06-30 | No-session client download returned object-not-found for Account A's object path. |
| Clear-map removes Storage objects | Pass with caveat | 2026-06-30 | Storage API removed the object catalog row before metadata cleanup. Owner downloads immediately after deletion can still return cached bytes, so LifeMap now fails closed unless `remove()` confirms deleted paths before metadata is cleared. |
| Password reset recovery | Pass | 2026-06-30 | Gmail reset email opened `app.getlifemap.com`, the production reset screen updated the password, and direct sign-in with the new password succeeded. |
| Synthetic auth cleanup | Pass | 2026-06-30 | The synthetic `m.haslim+lifemap-rc-*` user was removed after verification; follow-up SQL confirmed no matching auth user, profile, domain, user-memory, vault item, or vault file rows remained. |
| Plaintext exposure check | Partial pass | 2026-06-30 | Fake file bytes were encrypted before upload and decrypted only after download. Production bundle secret scan passed through `npm run verify:production`; console/log inspection still needs a browser-observed upload session. |

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
- `npm audit`: failed on development-only Vite/Vitest/esbuild advisories requiring a breaking Vite major upgrade.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test -- --reporter=dot`: passed 299 tests.
- `npm run build`: passed with the existing chunk-size warning.
- `npm run test:e2e`: passed 16 tests and skipped 5 real-auth tests because `tests/e2e/.env.e2e` is not present.
- Live Supabase storage catalog verification passed against project `tljijkoqfnimnkpzhozy` using `scripts/verify-storage-security.sql`.
- Synthetic production-account storage harness passed upload/open, Account B metadata denial, Account B Storage denial, anonymous Storage denial, and Storage catalog deletion before metadata cleanup.
- Production password reset proof passed with a Gmail-delivered recovery link, production reset UI update, and direct sign-in confirmation.

## Remaining Setup Needed

Use fake data only for continued testing. Before broader consumer launch, complete a browser-observed upload session to confirm no plaintext file content appears in console or logs, decide the permanent auth-link domain, and set up branded/custom SMTP if LifeMap is going beyond controlled beta.
