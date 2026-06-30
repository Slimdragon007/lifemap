# LifeMap Storage Security Verification Report

**Date:** 2026-06-30
**Project:** `tljijkoqfnimnkpzhozy`
**Status:** One least-privilege hardening issue found

## Verification Method

The check used `scripts/verify-storage-security.sql` through Supabase MCP `execute_sql`. This is the correct verification boundary for bucket, grant, and RLS policy posture because these are project-level catalog facts.

Supabase references used:

- Storage access is controlled by RLS policies on `storage.objects`: https://supabase.com/docs/guides/storage/security/access-control
- Data API access depends on grants plus RLS: https://supabase.com/docs/guides/api/securing-your-api

## Live Results

| Check | Result | Notes |
| --- | --- | --- |
| `bucket_exists_private` | Pass | `lifemap-documents` exists and `public = false`. |
| `bucket_limits_ciphertext_only` | Pass | 6 MB limit and `application/octet-stream` only. |
| `storage_select_insert_delete_own_folder_policies` | Pass | Select, insert, and delete policies target `authenticated` and own user-id folder. |
| `vault_item_files_authenticated_crud_grants` | Pass | Authenticated role can perform required CRUD operations. |
| `vault_item_files_policy_authenticated_owner` | Pass | Metadata policy targets `authenticated` and checks `auth.uid()` against `user_id`. |
| `vault_item_files_rls_enabled` | Pass | RLS is enabled on `public.vault_item_files`. |
| `vault_item_files_no_anon_grants` | Fail | `anon` has table grants on `public.vault_item_files`. RLS should still block row access, but least privilege requires revoking anon grants. |

## Supabase Advisors

Security advisors returned no lints.

Performance advisors still report existing non-blocking items:

- `public.vault_items.vault_items_linked_event_id_fkey` lacks a covering index.
- Older policies on several tables still use unwrapped `auth.uid()` and should be normalized to `(select auth.uid())`.
- Some indexes are unused, including `vault_item_files_vault_item_id_idx`.
- Auth DB connection strategy is configured as an absolute value.

## Required Fix

Before a consumer safety release candidate, revoke `anon` privileges from `public.vault_item_files`.

Recommended SQL:

```sql
revoke all privileges on table public.vault_item_files from anon;
```

Do this through a migration and then rerun `scripts/verify-storage-security.sql`.

## Risk Assessment

This is not an observed cross-user data leak. The metadata table has RLS enabled and its policy is scoped to authenticated owners. The issue is still worth fixing because consumer safety should use least-privilege grants in addition to RLS.

## Remaining Manual Test

Run the Account A / Account B cross-account test in `docs/security/consumer-safety-test-plan.md` after the anon grant fix is applied.
