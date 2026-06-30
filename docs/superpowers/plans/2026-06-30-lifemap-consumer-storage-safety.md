# LifeMap Consumer Storage Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise LifeMap's storage, privacy, and user-trust posture from strong MVP baseline to a consumer safety release candidate.

**Architecture:** Keep the existing React/Vite frontend, Cloudflare Worker, Supabase Auth, Supabase RLS tables, private Supabase Storage bucket, and browser-side file encryption path. This plan adds security evidence, clearer user-facing trust surfaces, cross-account verification, dependency hardening, and policy cleanup without changing the product flow or adding a new backend service.

**Tech Stack:** React 18, Vite 5, TypeScript, npm, Cloudflare Workers/Pages, Supabase Auth/Postgres/Storage/RLS, Web Crypto AES-GCM, Vitest, Playwright.

---

## Security Positioning Rule

LifeMap may say:

```txt
LifeMap encrypts sensitive files before upload, stores them in a private bucket, and uses account-scoped access controls so each user can only access their own records.
```

LifeMap must not say:

```txt
Only you can decrypt your files.
LifeMap is zero-knowledge.
LifeMap is independently audited.
LifeMap is HIPAA compliant.
LifeMap is bank-grade.
```

Those claims require separate key architecture, legal review, third-party audit evidence, and compliance work.

## Product Safety Principles

1. **Protect by default:** private records, files, IDs, medical notes, and child information stay hidden until the user chooses to reveal or open them.
2. **Minimize exposure:** home, notifications, previews, logs, and AI prompts should avoid raw sensitive details.
3. **Require consent before action:** emails, calendar writes, sharing, AI extraction, and file opening require explicit user action.
4. **Make storage understandable:** users should know what is stored, where it is stored, and how to delete it.
5. **Fail closed:** if encryption, upload, deletion, auth, or RLS verification fails, LifeMap should stop and explain the problem rather than pretending the action worked.
6. **Avoid overclaiming:** trust copy must be technically accurate.

## Current Baseline

- Supabase public tables have RLS enabled.
- `lifemap-documents` is a private Supabase Storage bucket.
- Real document uploads are encrypted in the browser before upload.
- Storage object paths are scoped under the authenticated user's id.
- File content is hidden until opened.
- Clear-map flow removes stored file objects before deleting records.
- Worker secrets are server-side; the browser uses Supabase anon key only.
- Production verification currently checks Pages, Worker health, CORS, API response shape, and public bundles for obvious server-only secret markers.

## Main Gaps

- The current encryption model is app-layer encryption, not zero-knowledge.
- User-facing privacy copy is present but too light for trust-critical family records.
- Cross-account Storage/RLS proof needs to be repeatable.
- Older RLS policies need consistency cleanup for role targeting and performance.
- Dev dependency audit has known tooling vulnerabilities that should be cleaned before release candidate.
- Password reset, email confirmation, leaked-password protection, and account recovery need a documented launch posture.
- Security evidence needs to live in the repo so future agents do not guess.

## File Structure

### Security Documentation

- Create: `docs/security/consumer-storage-safety-review.md`
  - Owns the user-facing security posture, non-claims, storage architecture summary, and launch blockers.
- Create: `docs/security/consumer-safety-test-plan.md`
  - Owns manual and automated verification for encryption, RLS, storage, deletion, password reset, and cross-account access.
- Modify: `docs/security/smart-cabinet-threat-model.md`
  - Update the previous threat model with the now-real secure document upload flow and current non-zero-knowledge limitation.

### Verification Scripts

- Create: `scripts/verify-storage-security.mjs`
  - Performs non-destructive verification that the private Storage bucket and relevant public tables have expected policy posture.
- Modify: `scripts/verify-production.mjs`
  - Add a read-only check that the production bundle and Worker still expose no server-only secret markers and point at the expected API origin.

### Frontend Trust Surfaces

- Modify: `src/PrivacyView.tsx`
  - Add plain-language storage safety, encryption, AI processing, approval, deletion, and limits.
- Modify: `src/VaultView.tsx`
  - Add upload copy that says files are encrypted before upload and that secure upload requires sign-in.
- Modify: `src/App.tsx`
  - Ensure Settings points to the updated privacy language and that dangerous actions retain explicit confirmation.

### Tests

- Create or modify: `src/document-storage.test.ts`
  - Cover accepted file types, rejected file types, size limit, encryption metadata, and download/decrypt behavior.
- Create or modify: `src/PrivacyView.test.tsx`
  - Cover accurate trust copy and prohibited claim absence.
- Create or modify: `tests/e2e/security-storage.spec.ts`
  - Cover signed-in upload path, attached-file display, explicit open/download, and clear-map failure behavior where mockable.

## Task 1: Document The Consumer Safety Posture

**Files:**
- Create: `docs/security/consumer-storage-safety-review.md`
- Modify: `docs/security/smart-cabinet-threat-model.md`

- [ ] **Step 1: Create the security review document**

Create `docs/security/consumer-storage-safety-review.md` with:

```markdown
# LifeMap Consumer Storage Safety Review

**Date:** 2026-06-30
**Status:** Release-candidate security planning baseline

## User Safety Promise

LifeMap stores family records so they are findable without exposing private details by default. Sensitive files are encrypted before upload, stored in a private Supabase Storage bucket, and linked to records protected by Supabase Auth and Row Level Security.

## Accurate Claims

- Files are encrypted in the browser before upload.
- Stored document blobs are uploaded as encrypted binary data.
- File metadata is linked to the signed-in user's records.
- Supabase RLS is required for every user-owned table.
- The document bucket is private.
- Sensitive actions require explicit user approval.
- Clearing the map attempts to delete owned file objects before records are cleared.

## Claims We Do Not Make

- LifeMap is not zero-knowledge.
- LifeMap is not independently audited.
- LifeMap is not HIPAA compliant.
- LifeMap is not a medical record system.
- LifeMap is not a replacement for Apple Wallet, Google Wallet, or official identity storage.

## Key Limitation

LifeMap uses app-layer encryption. The Cloudflare Worker can derive the data key from server-side secrets and the signed-in user's session. This is a strong MVP protection against database/storage exposure, but it is not a zero-knowledge architecture.

## Protected Data Classes

- child names and school context
- vaccine records
- medical and camp forms
- insurance cards and member IDs
- passport and ID details
- pet vaccine records
- family schedules
- travel documents
- emergency contacts

## Launch Blockers

- Cross-account RLS and Storage denial must be manually verified.
- Password reset and account recovery must be verified on the production domain.
- Dev dependency audit must be triaged and documented.
- Privacy copy must avoid zero-knowledge or compliance claims.
- Clear-map deletion must fail closed if Storage object deletion fails.

## Release Evidence Required

| Evidence | Required Result |
| --- | --- |
| Supabase security advisors | No critical security findings |
| Public table RLS check | Every user-owned public table has RLS enabled |
| Storage bucket check | `lifemap-documents` is private |
| Storage policy check | Authenticated users can only access own user-id folder |
| Real upload test | Signed-in user can upload and reopen encrypted file |
| Cross-account test | Different signed-in user cannot read metadata or object |
| Clear-map test | Stored objects are removed before records are cleared |
| Secret scan | No service role, OpenAI key, Worker secret, or private token in public bundle |
```

- [ ] **Step 2: Update the threat model**

Append this section to `docs/security/smart-cabinet-threat-model.md`:

```markdown
## Current Secure Upload Architecture

Real document uploads now require a signed-in Supabase session. The browser validates file type and size, encrypts file bytes with Web Crypto AES-GCM, uploads the encrypted blob to the private `lifemap-documents` bucket, and stores metadata in `vault_item_files`.

Storage object paths use this shape:

```txt
{userId}/{vaultItemId}/{fileId}.bin
```

The design protects against accidental plaintext storage and cross-user reads when RLS and Storage policies are correct.

## Current Non-Zero-Knowledge Limitation

The Worker can derive the user's data key. This means LifeMap has app-layer encryption but not end-user-only key custody. Product copy must not claim zero-knowledge or end-user-only decryption.
```

- [ ] **Step 3: Scan for placeholders and forbidden claims**

Run:

```bash
rg -n "TBD|TODO|implement later|zero-knowledge|HIPAA|bank-grade|only you can decrypt|independently audited" docs/security
```

Expected:

- No placeholder matches.
- Any prohibited claim appears only in a "must not claim" or limitation context.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/security/consumer-storage-safety-review.md docs/security/smart-cabinet-threat-model.md
git commit -m "docs: define LifeMap consumer storage safety posture"
```

Expected: commit succeeds.

## Task 2: Add Repeatable Storage Security Verification

**Files:**
- Create: `scripts/verify-storage-security.sql`
- Create: `docs/security/storage-security-verification-report.md`

- [ ] **Step 1: Write the verification SQL**

Create `scripts/verify-storage-security.sql`. The query must be read-only and must inspect `storage.buckets`, `pg_policies`, `pg_class`, and `information_schema.role_table_grants`.

The query must verify:

- `lifemap-documents` exists and is private.
- Bucket size and MIME type limits match encrypted file upload.
- `public.vault_item_files` has RLS enabled.
- `public.vault_item_files` owner policy targets `authenticated`.
- `public.vault_item_files` has no `anon` grants.
- `authenticated` has required CRUD grants.
- `storage.objects` has select, insert, and delete policies scoped to the authenticated user's own folder.

- [ ] **Step 2: Run the SQL through Supabase MCP or SQL Editor**

Run:

```bash
Supabase MCP execute_sql using scripts/verify-storage-security.sql
```

Expected:

```txt
Every check returns status = pass.
```

- [ ] **Step 3: Record evidence**

Create `docs/security/storage-security-verification-report.md` with the exact pass/fail results, advisor status, and any required hardening follow-up.

- [ ] **Step 4: Run advisors**

Run:

```bash
Supabase MCP get_advisors security
Supabase MCP get_advisors performance
```

Expected: no security lints. Performance lints may remain if unrelated to the secure upload posture.

- [ ] **Step 5: Commit**

Run:

```bash
git add scripts/verify-storage-security.sql docs/security/storage-security-verification-report.md
git commit -m "chore: add storage security verification"
```

Expected: commit succeeds.

## Task 3: Strengthen User-Facing Trust Copy

**Files:**
- Modify: `src/PrivacyView.tsx`
- Modify: `src/VaultView.tsx`
- Test: `src/PrivacyView.test.tsx`

- [ ] **Step 1: Add privacy copy tests**

Create or update `src/PrivacyView.test.tsx` with assertions that the rendered page includes:

```txt
Files are encrypted before upload.
Nothing sends without your approval.
LifeMap is not zero-knowledge.
Clear my map removes stored files before records are cleared.
```

Also assert the page does not include:

```txt
HIPAA compliant
bank-grade
only you can decrypt
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```bash
npm run test -- src/PrivacyView.test.tsx --reporter=dot
```

Expected: fails until the copy exists.

- [ ] **Step 3: Update `src/PrivacyView.tsx`**

Replace the privacy sections with direct consumer copy:

```ts
const sections = [
  {
    title: "Files are encrypted before upload",
    body: "When you attach a PDF or photo in a signed-in account, LifeMap encrypts the file in your browser before storing it in a private document bucket.",
  },
  {
    title: "Your records are account-scoped",
    body: "LifeMap uses Supabase Auth and Row Level Security so each signed-in user can only read and change their own household records.",
  },
  {
    title: "Nothing sends without your approval",
    body: "Drafts, reminders, calendar suggestions, and other sensitive actions wait for your explicit OK before LifeMap acts.",
  },
  {
    title: "Private details stay tucked away",
    body: "Sensitive details stay hidden in normal views until you choose to reveal or open them.",
  },
  {
    title: "Clear my map removes stored files first",
    body: "When you clear a real account, LifeMap attempts to remove stored file objects before clearing the related records. If file deletion fails, clearing stops.",
  },
  {
    title: "Current limitation",
    body: "LifeMap is not zero-knowledge today. Its server can derive the encryption key, so we do not claim end-user-only decryption.",
  },
];
```

- [ ] **Step 4: Update upload copy in `src/VaultView.tsx`**

In the document upload modal, show this sentence near the file input in signed-in mode:

```txt
Files are encrypted in this browser before upload.
```

In demo mode, keep:

```txt
Secure file upload requires a signed-in account.
```

- [ ] **Step 5: Run focused tests**

Run:

```bash
npm run test -- src/PrivacyView.test.tsx --reporter=dot
```

Expected: pass.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/PrivacyView.tsx src/VaultView.tsx src/PrivacyView.test.tsx
git commit -m "copy: clarify LifeMap privacy and storage safety"
```

Expected: commit succeeds.

## Task 4: Prove Cross-Account Storage Isolation

**Files:**
- Create: `docs/security/consumer-safety-test-plan.md`
- Test later: `tests/e2e/security-storage.spec.ts`

- [ ] **Step 1: Write the manual test plan**

Create `docs/security/consumer-safety-test-plan.md` with:

```markdown
# LifeMap Consumer Safety Test Plan

**Date:** 2026-06-30
**Purpose:** Prove real-account safety before stronger consumer claims.

## Manual Cross-Account Storage Test

### Accounts

- Account A: test user controlled by the developer.
- Account B: separate test user controlled by the developer.

Do not use real child, medical, passport, insurance, or school data.

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
11. Sign back into Account A.
12. Clear my map.
13. Confirm owned Storage objects are removed before records disappear.

## Pass Criteria

- Account A can upload and reopen its own encrypted file.
- Account B cannot see Account A's metadata.
- Account B cannot download Account A's encrypted object.
- Clear-map removes Account A's owned file objects.
- No plaintext file contents appear in browser console, Worker logs, public bundle, or database metadata.

## Fail Criteria

- Any cross-account file or metadata read succeeds.
- File content is uploaded as plaintext.
- Clear-map reports success while Storage deletion fails.
- Product copy claims zero-knowledge, HIPAA, bank-grade, or independent audit.
```

- [ ] **Step 2: Run placeholder scan**

Run:

```bash
rg -n "TBD|TODO|implement later|fill in details|real child|real medical|real passport|real insurance" docs/security/consumer-safety-test-plan.md
```

Expected: no output except the intentional "Do not use real..." line if matched by wording. Adjust wording if needed.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/security/consumer-safety-test-plan.md
git commit -m "docs: add consumer safety storage test plan"
```

Expected: commit succeeds.

## Task 5: Clean Up RLS Policy Consistency

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_normalize_rls_policy_roles.sql`
- Modify or create: `scripts/verify-supabase-rls-live.mjs` if this repo already uses that verifier

- [ ] **Step 1: Inspect current policies**

Run a read-only policy query in Supabase:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Expected: output is saved in the PR notes.

- [ ] **Step 2: Write migration for older public-role policies**

Create a migration that changes older user-owned table policies from broad public role targeting to authenticated role targeting, while keeping the same ownership rule:

```sql
-- Example shape. Use exact existing policy names from Step 1.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);
```

Apply this pattern only to policies already scoped by `auth.uid() = user_id`. Do not alter service/admin policies in this task.

- [ ] **Step 3: Run Supabase advisors**

Run the Supabase security and performance advisors after migration.

Expected:

- No new security findings.
- Reduced `auth_rls_initplan` warnings where policies were normalized.

- [ ] **Step 4: Run app checks**

Run:

```bash
npm run typecheck
npm run test -- --reporter=dot
```

Expected: pass.

- [ ] **Step 5: Commit**

Run:

```bash
git add supabase/migrations scripts
git commit -m "chore: normalize LifeMap RLS policy roles"
```

Expected: commit succeeds.

## Task 6: Harden Dependency And Build Tool Posture

**Files:**
- Modify: `package-lock.json`
- Modify: `package.json` only if required by non-breaking package updates
- Create: `docs/security/dependency-audit-notes.md`

- [ ] **Step 1: Capture current audit**

Run:

```bash
npm audit --omit=dev
npm audit
```

Expected:

- Production audit is clean.
- Dev audit findings are captured in notes.

- [ ] **Step 2: Try non-breaking audit fix**

Run:

```bash
npm audit fix
```

Expected:

- Does not force a major Vite upgrade.
- Updates only lockfile/package versions npm can safely resolve.

- [ ] **Step 3: Do not run forced major upgrades**

Do not run:

```bash
npm audit fix --force
```

unless a separate major-upgrade plan is written and approved.

- [ ] **Step 4: Run checks**

Run:

```bash
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
```

Expected: pass.

- [ ] **Step 5: Document remaining dev-only risk**

Create `docs/security/dependency-audit-notes.md` with:

```markdown
# LifeMap Dependency Audit Notes

**Date:** 2026-06-30

## Production Dependencies

Run `npm audit --omit=dev` during this task. The expected release-candidate result is `found 0 vulnerabilities`. If the command returns anything else, this task fails until production dependency risk is resolved or explicitly accepted in the release gate.

## Development Tooling

Run `npm audit` during this task. If findings remain in development tooling, list each affected package family, severity, whether it can affect production runtime, and whether a non-breaking update is available.

## Decision

Production runtime dependencies must be clean before release candidate. Dev tooling vulnerabilities are still tracked because they affect local development and CI trust, but major upgrades require a separate compatibility plan.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json package-lock.json docs/security/dependency-audit-notes.md
git commit -m "chore: document and reduce dependency audit risk"
```

Expected: commit succeeds.

## Task 7: Verify Account Recovery And Domain Trust

**Files:**
- Create: `docs/security/account-recovery-checklist.md`
- Modify: no auth code unless a verified misconfiguration is found

- [ ] **Step 1: Write the checklist**

Create `docs/security/account-recovery-checklist.md` with:

```markdown
# LifeMap Account Recovery Checklist

**Date:** 2026-06-30

## Required Before Release Candidate

- Supabase Site URL points to the production domain.
- Supabase redirect URLs include the production domain and approved preview domains.
- Password reset email opens the correct LifeMap domain.
- Password reset token lets the user set a new password.
- User can sign in after password reset.
- Session survives normal reload.
- Sign out clears app-layer crypto cache.
- Email confirmation is either enabled or intentionally deferred with a written reason.
- Leaked-password protection is enabled or intentionally deferred with a written reason.
- MFA is documented as post-MVP unless enabled.

## Evidence

| Check | Result | Date | Notes |
| --- | --- | --- | --- |
| Site URL | Not run | 2026-06-30 |  |
| Redirect URLs | Not run | 2026-06-30 |  |
| Password reset | Not run | 2026-06-30 |  |
| Sign out clears crypto cache | Not run | 2026-06-30 |  |
```

- [ ] **Step 2: Run the checklist manually**

Use a test account only. Do not use a personal production account that contains real sensitive records.

- [ ] **Step 3: Commit evidence**

Update the checklist's evidence table with exact results.

Run:

```bash
git add docs/security/account-recovery-checklist.md
git commit -m "docs: record account recovery security checks"
```

Expected: commit succeeds.

## Task 8: Release Candidate Security Gate

**Files:**
- Modify: `docs/lifemap-production-runbook.md`
- Create: `docs/security/release-candidate-security-gate.md`

- [ ] **Step 1: Create gate document**

Create `docs/security/release-candidate-security-gate.md` with:

```markdown
# LifeMap Release Candidate Security Gate

**Date:** 2026-06-30

## Must Pass

- `npm run lint`
- `npm run typecheck`
- `npm run test -- --reporter=dot`
- `npm run build`
- `npm run test:e2e`
- `npm run verify:production`
- `npm run verify:storage-security`
- Supabase security advisors have no critical findings.
- Production dependency audit is clean.
- Cross-account Storage/RLS manual test passes.
- Password reset on production domain passes.
- Privacy copy contains no forbidden claims.

## Must Not Ship If

- Any user can read another user's metadata or file object.
- Any file uploads as plaintext.
- Clear-map can leave files behind while reporting success.
- Worker logs contain raw document text or file contents.
- Product copy claims zero-knowledge, HIPAA, bank-grade, or independent audit without evidence.
```

- [ ] **Step 2: Add gate reference to production runbook**

Add this line to `docs/lifemap-production-runbook.md`:

```markdown
Before release candidate deploy, complete `docs/security/release-candidate-security-gate.md`.
```

- [ ] **Step 3: Run final checks**

Run:

```bash
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
```

Expected: pass.

- [ ] **Step 4: Commit**

Run:

```bash
git add docs/security/release-candidate-security-gate.md docs/lifemap-production-runbook.md
git commit -m "docs: add release candidate security gate"
```

Expected: commit succeeds.

## Recommended Execution Order

1. Task 1: document accurate safety posture.
2. Task 3: improve user-facing trust copy.
3. Task 4: prove cross-account isolation manually.
4. Task 2: add repeatable verification script.
5. Task 7: verify password reset and account recovery.
6. Task 6: clean dependency posture.
7. Task 5: normalize older RLS policies.
8. Task 8: add release candidate gate.

This order makes users safer immediately, then improves the evidence and maintenance posture.

## Release Decision

LifeMap can be considered a consumer storage safety release candidate only when:

- the cross-account test passes,
- the privacy copy is accurate,
- production dependencies are clean,
- storage and RLS verification are repeatable,
- password reset works on the production domain,
- no product copy overclaims the encryption model.
