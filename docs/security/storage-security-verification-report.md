# LifeMap Storage Security Verification Report

**Date:** 2026-06-30
**Project:** `tljijkoqfnimnkpzhozy`
**Status:** Passed after least-privilege migration

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
| `vault_item_files_no_anon_grants` | Pass | `anon` grants were removed; only `authenticated` grants remain. |

## Supabase Advisors

Security advisors returned no lints after the grant migration.

The previous performance advisor run reported existing non-blocking items. They are not introduced by this grant migration:

- `public.vault_items.vault_items_linked_event_id_fkey` lacks a covering index.
- Older policies on several tables still use unwrapped `auth.uid()` and should be normalized to `(select auth.uid())`.
- Some indexes are unused, including `vault_item_files_vault_item_id_idx`.
- Auth DB connection strategy is configured as an absolute value.

## Applied Fix

The approved least-privilege fix was applied live through Supabase MCP as migration `revoke_vault_item_files_anon_grants` and is tracked locally in:

- `supabase/migrations/20260630091333_revoke_vault_item_files_anon_grants.sql`

Applied SQL:

```sql
revoke all privileges on table public.vault_item_files from anon;
```

After applying the migration, `scripts/verify-storage-security.sql` passed the `vault_item_files_no_anon_grants` check.

## Risk Assessment

This was not an observed cross-user data leak. The metadata table has RLS enabled and its policy is scoped to authenticated owners. The grant layer is now aligned with the same least-privilege posture.

## Remaining Manual Test

Run the Account A / Account B cross-account test in `docs/security/consumer-safety-test-plan.md` before consumer release candidate approval.
