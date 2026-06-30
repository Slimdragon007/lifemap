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

## Evidence Log

| Check | Result | Date | Notes |
| --- | --- | --- | --- |
| Account A upload and reopen | Not run | 2026-06-30 |  |
| Account B metadata denial | Not run | 2026-06-30 |  |
| Account B Storage denial | Not run | 2026-06-30 |  |
| Clear-map removes Storage objects | Not run | 2026-06-30 |  |
| Plaintext exposure check | Not run | 2026-06-30 |  |
