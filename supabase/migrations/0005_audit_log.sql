-- 0005_audit_log.sql
-- Append-only audit trail for every mutation to the four family-data tables
-- (family_members, family_events, vault_items, recurring_care_items).
--
-- Family writes go browser-direct to Supabase (anon key + RLS), so a DB trigger
-- is the only capture point that sees every change regardless of the client.
-- The trail is owner-readable but NOT user-writable: only the SECURITY DEFINER
-- trigger inserts rows, so users can neither forge nor erase history.
--
-- Note on field encryption (0005 ships alongside app-layer AES-GCM on the
-- sensitive columns): encryption happens before the row reaches Postgres, so
-- old_values / new_values here capture CIPHERTEXT for vault_items.detail,
-- family_members.care_notes and family_members.details — the audit trail
-- inherits encryption for free and never holds plaintext. Each write re-encrypts
-- with a fresh IV, so those columns always show up in changed_columns even when
-- the plaintext is unchanged. That is acceptable for an audit trail.
--
-- DDL is applied at deploy / via PR — never straight to the live DB ahead of the change.

create table if not exists public.family_data_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  table_name text not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  record_id uuid not null,
  old_values jsonb,                       -- null on insert
  new_values jsonb,                       -- null on delete
  changed_columns text[],                 -- populated on update only
  created_at timestamptz not null default now()
);

create index if not exists family_data_audit_user_created_idx
  on public.family_data_audit (user_id, created_at desc);
create index if not exists family_data_audit_record_idx
  on public.family_data_audit (record_id);

-- ── RLS: owner can read their own trail; nobody writes it directly ──────────
alter table public.family_data_audit enable row level security;

grant select on public.family_data_audit to authenticated;

create policy "own family_data_audit" on public.family_data_audit
  for select using (auth.uid() = user_id);

-- ── Trigger function: records each mutation (runs as definer so it can insert
--    into a table the caller has no INSERT grant on) ─────────────────────────
create or replace function public.audit_family_data_mutation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  old_j jsonb := null;
  new_j jsonb := null;
  changed text[] := null;
begin
  if tg_op = 'DELETE' then
    old_j := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    new_j := to_jsonb(new);
  else -- UPDATE
    old_j := to_jsonb(old);
    new_j := to_jsonb(new);
    select coalesce(array_agg(k.key order by k.key), array[]::text[])
      into changed
      from jsonb_object_keys(new_j) as k(key)
      where (new_j -> k.key) is distinct from (old_j -> k.key);
  end if;

  insert into public.family_data_audit
    (user_id, table_name, operation, record_id, old_values, new_values, changed_columns)
  values (
    coalesce(new.user_id, old.user_id),
    tg_table_name,
    lower(tg_op),
    coalesce(new.id, old.id),
    old_j,
    new_j,
    changed
  );

  return coalesce(new, old);
end;
$$;

-- Only the trigger should ever call this — never via PostgREST RPC (keeps the
-- anon/authenticated SECURITY DEFINER advisors clean, mirroring 0004).
revoke execute on function public.audit_family_data_mutation() from public, anon, authenticated;

-- ── Attach to all four family tables ───────────────────────────────────────
drop trigger if exists audit_family_members on public.family_members;
create trigger audit_family_members
  after insert or update or delete on public.family_members
  for each row execute function public.audit_family_data_mutation();

drop trigger if exists audit_family_events on public.family_events;
create trigger audit_family_events
  after insert or update or delete on public.family_events
  for each row execute function public.audit_family_data_mutation();

drop trigger if exists audit_vault_items on public.vault_items;
create trigger audit_vault_items
  after insert or update or delete on public.vault_items
  for each row execute function public.audit_family_data_mutation();

drop trigger if exists audit_recurring_care_items on public.recurring_care_items;
create trigger audit_recurring_care_items
  after insert or update or delete on public.recurring_care_items
  for each row execute function public.audit_family_data_mutation();
