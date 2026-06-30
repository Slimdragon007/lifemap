-- 20260630052541_secure_document_uploads.sql
-- Private, client-side encrypted document upload support.
--
-- Files are encrypted in the browser before upload. Supabase Storage only sees
-- application/octet-stream ciphertext under a per-user path:
--   {auth.uid()}/{vault_item_id}/{file_id}.bin

-- ── Private Storage bucket ─────────────────────────────────────────────────
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'lifemap-documents',
  'lifemap-documents',
  false,
  6291456,
  array['application/octet-stream']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Encrypted file metadata ────────────────────────────────────────────────
create table if not exists public.vault_item_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vault_item_id uuid not null references public.vault_items (id) on delete cascade,
  bucket_id text not null default 'lifemap-documents',
  object_path text not null,
  encryption_version text not null default 'file-v1',
  encryption_iv text not null,
  original_name text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 6291456),
  encrypted_byte_size integer not null check (encrypted_byte_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_item_files_bucket_check check (bucket_id = 'lifemap-documents'),
  constraint vault_item_files_encryption_check check (encryption_version = 'file-v1'),
  constraint vault_item_files_unique_object unique (user_id, object_path)
);

create index if not exists vault_item_files_user_id_idx
  on public.vault_item_files (user_id);
create index if not exists vault_item_files_vault_item_id_idx
  on public.vault_item_files (vault_item_id);

alter table public.vault_item_files enable row level security;

grant select, insert, update, delete on public.vault_item_files to authenticated;

drop policy if exists "own vault_item_files" on public.vault_item_files;
create policy "own vault_item_files" on public.vault_item_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage RLS: only auth users can operate inside their own user-id folder ─
drop policy if exists "lifemap documents select own folder" on storage.objects;
create policy "lifemap documents select own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lifemap-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "lifemap documents insert own folder" on storage.objects;
create policy "lifemap documents insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lifemap-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "lifemap documents delete own folder" on storage.objects;
create policy "lifemap documents delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lifemap-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
