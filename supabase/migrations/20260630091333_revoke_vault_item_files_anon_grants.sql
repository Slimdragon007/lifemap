-- 20260630091333_revoke_vault_item_files_anon_grants.sql
-- Least-privilege hardening for encrypted document metadata.
--
-- RLS already scopes vault_item_files to authenticated owners. Revoke anon
-- table grants as an additional Data API boundary so unauthenticated clients
-- cannot reach this sensitive metadata table at the grant layer.

revoke all privileges on table public.vault_item_files from anon;
