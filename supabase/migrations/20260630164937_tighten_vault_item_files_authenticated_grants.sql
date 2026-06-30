-- 20260630164937_tighten_vault_item_files_authenticated_grants.sql
-- Keep Data API table grants for encrypted file metadata to the minimum the
-- browser app needs. RLS still enforces row ownership; this grant layer limits
-- what the authenticated role can attempt through PostgREST.

revoke all privileges on table public.vault_item_files from authenticated;
grant select, insert, update, delete on table public.vault_item_files to authenticated;
