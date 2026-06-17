-- 0003_family_data.sql
-- Per-user, RLS-protected tables for the sensitive family data that V1 must
-- durably store (today these live only as demo seeds in src/familyOS.ts).
-- Mirrors the auth.uid() = user_id pattern from 0001_init.sql so every row is
-- isolated to its owner. Sensitive free-text is isolated into clearly-marked
-- columns (vault_items.detail, family_members.care_notes / details) so a later
-- migration can add app-layer field encryption without reshaping the schema.
--
-- DDL is applied at deploy / via PR — never straight to the live DB ahead of
-- the change that needs it.

-- ── Family members (people & pets) ─────────────────────────────────────────
create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  role text,
  initials text,
  profile_type text not null check (profile_type in ('adult', 'child', 'pet')),
  details jsonb not null default '[]',     -- SENSITIVE: [{label,value}] (contacts, phone, allergy)
  care_notes jsonb not null default '[]',  -- SENSITIVE: medical notes, meds, vaccine records
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Family calendar events ─────────────────────────────────────────────────
create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_date text not null,   -- kept as text to match the app's date strings
  event_time text not null default '',
  layer text not null,        -- school|health|pets|travel|meals|admin
  owner text not null default '',
  source text not null default '',
  needs_prep text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Vault records (IDs, insurance, health, school, pet, travel) ─────────────
create table if not exists public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  category text not null,      -- identity|insurance|health|school|pet|travel
  owner text not null default '',
  status text not null check (status in ('Current', 'Needs update', 'Expires soon')),
  detail text not null default '', -- SENSITIVE: policy/ID numbers, health status (encrypt fast-follow)
  renewal_date text,
  linked_event_id uuid references public.family_events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Recurring care loops (meds, vaccines, renewals) ────────────────────────
create table if not exists public.recurring_care_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  cadence text not null default '',
  owner text not null default '',
  next_due text not null default '',
  category text not null check (category in ('medication', 'vaccine', 'school', 'meal', 'document')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_members_user_id_idx on public.family_members (user_id);
create index if not exists family_events_user_id_idx on public.family_events (user_id);
create index if not exists vault_items_user_id_idx on public.vault_items (user_id);
create index if not exists recurring_care_items_user_id_idx on public.recurring_care_items (user_id);

-- ── Row-Level Security: each row visible only to its owner ──────────────────
alter table public.family_members enable row level security;
alter table public.family_events enable row level security;
alter table public.vault_items enable row level security;
alter table public.recurring_care_items enable row level security;

grant select, insert, update, delete on
  public.family_members,
  public.family_events,
  public.vault_items,
  public.recurring_care_items
to authenticated;

create policy "own family_members" on public.family_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own family_events" on public.family_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vault_items" on public.vault_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own recurring_care_items" on public.recurring_care_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
