-- LifeMap secure document storage posture verification.
--
-- Run this read-only query through Supabase SQL Editor, Supabase MCP
-- execute_sql, or a trusted database connection. Do not run this from the
-- public browser client: bucket, grant, and policy posture are project-level
-- facts and should be inspected from Postgres/catalog state.

with checks as (
  select
    'bucket_exists_private' as check_name,
    exists (
      select 1
      from storage.buckets
      where id = 'lifemap-documents'
        and name = 'lifemap-documents'
        and public = false
    ) as ok,
    coalesce((
      select jsonb_build_object(
        'id', id,
        'name', name,
        'public', public,
        'file_size_limit', file_size_limit,
        'allowed_mime_types', allowed_mime_types
      )::text
      from storage.buckets
      where id = 'lifemap-documents'
    ), 'missing bucket') as details
  union all
  select
    'bucket_limits_ciphertext_only',
    exists (
      select 1
      from storage.buckets
      where id = 'lifemap-documents'
        and file_size_limit = 6291456
        and allowed_mime_types = array['application/octet-stream']::text[]
    ),
    coalesce((
      select jsonb_build_object(
        'file_size_limit', file_size_limit,
        'allowed_mime_types', allowed_mime_types
      )::text
      from storage.buckets
      where id = 'lifemap-documents'
    ), 'missing bucket')
  union all
  select
    'vault_item_files_rls_enabled',
    exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'vault_item_files'
        and c.relrowsecurity = true
    ),
    coalesce((
      select jsonb_build_object(
        'rowsecurity', c.relrowsecurity,
        'forcerowsecurity', c.relforcerowsecurity
      )::text
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'vault_item_files'
    ), 'missing table')
  union all
  select
    'vault_item_files_policy_authenticated_owner',
    exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'vault_item_files'
        and policyname = 'own vault_item_files'
        and cmd = 'ALL'
        and roles = array['authenticated']::name[]
        and qual like '%auth.uid%'
        and qual like '%user_id%'
        and with_check like '%auth.uid%'
        and with_check like '%user_id%'
    ),
    coalesce((
      select jsonb_build_object(
        'roles', roles,
        'cmd', cmd,
        'qual', qual,
        'with_check', with_check
      )::text
      from pg_policies
      where schemaname = 'public'
        and tablename = 'vault_item_files'
        and policyname = 'own vault_item_files'
    ), 'missing policy')
  union all
  select
    'vault_item_files_no_anon_or_public_grants',
    not exists (
      select 1
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'vault_item_files'
        and grantee in ('anon', 'PUBLIC', 'public')
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'grantee', grantee,
          'privilege_type', privilege_type
        )
        order by grantee, privilege_type
      )::text
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'vault_item_files'
    ), 'no table grants')
  union all
  select
    'vault_item_files_authenticated_exact_crud_grants',
    coalesce((
      select array_agg(privilege_type::text order by privilege_type::text)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'vault_item_files'
        and grantee = 'authenticated'
    ), array[]::text[]) = array['DELETE', 'INSERT', 'SELECT', 'UPDATE']::text[],
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'grantee', grantee,
          'privilege_type', privilege_type
        )
        order by grantee, privilege_type
      )::text
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name = 'vault_item_files'
    ), 'no table grants')
  union all
  select
    'storage_select_insert_delete_own_folder_policies',
    (
      select count(*) = 3
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname in (
          'lifemap documents select own folder',
          'lifemap documents insert own folder',
          'lifemap documents delete own folder'
        )
        and roles = array['authenticated']::name[]
        and coalesce(qual, with_check) like '%lifemap-documents%'
        and coalesce(qual, with_check) like '%foldername%'
        and coalesce(qual, with_check) like '%auth.uid%'
    ),
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'policyname', policyname,
          'cmd', cmd,
          'roles', roles,
          'qual', qual,
          'with_check', with_check
        )
        order by policyname
      )::text
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'lifemap documents % own folder'
    ), 'missing storage policies')
)
select
  check_name,
  case when ok then 'pass' else 'fail' end as status,
  details
from checks
order by check_name;
