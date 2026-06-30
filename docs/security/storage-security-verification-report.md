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
| `vault_item_files_authenticated_exact_crud_grants` | Pass | Authenticated role is limited to `DELETE`, `INSERT`, `SELECT`, and `UPDATE`. |
| `vault_item_files_policy_authenticated_owner` | Pass | Metadata policy targets `authenticated` and checks `auth.uid()` against `user_id`. |
| `vault_item_files_rls_enabled` | Pass | RLS is enabled on `public.vault_item_files`. |
| `vault_item_files_no_anon_or_public_grants` | Pass | `anon` and `PUBLIC` have no table grants. Owner and service-role grants remain internal/admin-only. |

## Supabase Advisors

Security advisors returned no lints after the grant migration.

The previous performance advisor run reported existing non-blocking items. They are not introduced by this grant migration:

- `public.vault_items.vault_items_linked_event_id_fkey` lacks a covering index.
- Older policies on several tables still use unwrapped `auth.uid()` and should be normalized to `(select auth.uid())`.
- Some indexes are unused, including `vault_item_files_vault_item_id_idx`.
- Auth DB connection strategy is configured as an absolute value.

## Applied Fix

The approved least-privilege fixes were applied live through Supabase MCP and are tracked locally in:

- `supabase/migrations/20260630091333_revoke_vault_item_files_anon_grants.sql`
- `supabase/migrations/20260630164937_tighten_vault_item_files_authenticated_grants.sql`

Applied SQL:

```sql
revoke all privileges on table public.vault_item_files from anon;
revoke all privileges on table public.vault_item_files from authenticated;
grant select, insert, update, delete on table public.vault_item_files to authenticated;
```

After applying the migrations, `scripts/verify-storage-security.sql` passed the `vault_item_files_no_anon_or_public_grants` and `vault_item_files_authenticated_exact_crud_grants` checks.

## Risk Assessment

This was not an observed cross-user data leak. The metadata table has RLS enabled and its policy is scoped to authenticated owners. The grant layer is now aligned with the same least-privilege posture.

## Remaining Manual Test

Run the Account A / Account B cross-account test in `docs/security/consumer-safety-test-plan.md` before consumer release candidate approval.
