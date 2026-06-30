-- 20260630074245_optimize_vault_item_files_rls.sql
-- Wrap auth.uid() in a select so Postgres can evaluate it once per statement.

drop policy if exists "own vault_item_files" on public.vault_item_files;
create policy "own vault_item_files" on public.vault_item_files
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
