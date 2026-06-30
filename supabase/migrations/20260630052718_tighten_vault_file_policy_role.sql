-- 20260630052718_tighten_vault_file_policy_role.sql
-- Keep vault file metadata policies explicit to authenticated users only.

drop policy if exists "own vault_item_files" on public.vault_item_files;
create policy "own vault_item_files" on public.vault_item_files
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
