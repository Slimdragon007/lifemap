-- LifeMap initial schema (strategy doc §5)
-- Postgres / Supabase. RLS keyed on auth.uid() for every user-scoped table.
-- Item arrays from the built LifeMapAnalysis are promoted into durable life_items;
-- the raw analysis blob is preserved in intake_analyses for evidence/audit.

-- ---------------------------------------------------------------------------
-- Enumerated domains: text + CHECK (easier to extend than pg enums).
-- ---------------------------------------------------------------------------

-- profiles: the strategy's `User`. References Supabase auth.users.
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text,
  household_context jsonb       not null default '{}'::jsonb,
  preferences       jsonb       not null default '{}'::jsonb,
  timezone          text        not null default 'UTC',
  created_at        timestamptz not null default now()
);

-- domains: the 10 life domains, seeded per user on signup.
create table if not exists public.domains (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  name              text        not null,
  description       text,
  status            text        not null default 'active'
                      check (status in ('active','paused','delegated','ignored')),
  mental_load_score int         not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists domains_user_id_idx on public.domains (user_id);

-- life_items: the durable atom. Generalizes the built dueItems/reminders/etc.
create table if not exists public.life_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  domain_id       uuid        references public.domains (id) on delete set null,
  title           text        not null,
  description     text,
  type            text        not null default 'task'
                    check (type in (
                      'task','decision','reminder','worry','goal','project',
                      'relationship','finance','health','household','idea',
                      'someday','emotional-weight')),
  status          text        not null default 'active'
                    check (status in (
                      'active','stuck','scheduled','delegated','done','dropped','parked')),
  priority        int         not null default 0,
  emotional_weight int        not null default 0,
  due_date        date,
  source          text        not null default 'manual'
                    check (source in ('manual','brain-dump','email-import','calendar-import')),
  source_quote    text,
  next_action     text,
  recommendation  text
                    check (recommendation is null or recommendation in (
                      'do-now','schedule','delegate','automate','clarify','drop','park')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists life_items_user_id_idx on public.life_items (user_id);
create index if not exists life_items_domain_id_idx on public.life_items (domain_id);
create index if not exists life_items_status_idx on public.life_items (user_id, status);

-- intake_analyses: audit/event record of one extraction run (keeps the raw blob).
create table if not exists public.intake_analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  raw_intake        text        not null,
  result            jsonb       not null,   -- the LifeMapAnalysis blob
  produced_item_ids jsonb       not null default '[]'::jsonb,
  model             text,
  created_at        timestamptz not null default now()
);
create index if not exists intake_analyses_user_id_idx on public.intake_analyses (user_id);

-- briefings: daily / weekly generated summaries.
create table if not exists public.briefings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  type            text        not null check (type in ('daily','weekly')),
  summary         text        not null,
  recommendations jsonb       not null default '[]'::jsonb,
  date            date        not null,
  generated_at    timestamptz not null default now(),
  unique (user_id, type, date)
);
create index if not exists briefings_user_id_idx on public.briefings (user_id);

-- user_memory: durable context layer (Stage 2; one row per user).
create table if not exists public.user_memory (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid        not null unique references auth.users (id) on delete cascade,
  durable_context       jsonb       not null default '{}'::jsonb,
  preferences           jsonb       not null default '{}'::jsonb,
  recurring_patterns    jsonb       not null default '[]'::jsonb,
  important_people       jsonb       not null default '[]'::jsonb,
  recurring_obligations jsonb       not null default '[]'::jsonb,
  updated_at            timestamptz not null default now()
);

-- mental_models: global seeded library (no user_id; readable by all authenticated).
create table if not exists public.mental_models (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  description       text not null,
  use_case          text,
  prompt_instruction text not null
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.domains         enable row level security;
alter table public.life_items      enable row level security;
alter table public.intake_analyses enable row level security;
alter table public.briefings       enable row level security;
alter table public.user_memory     enable row level security;
alter table public.mental_models   enable row level security;

-- Owner-only policies for user-scoped tables.
create policy "own profile"        on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own domains"        on public.domains
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own life_items"     on public.life_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own intake_analyses" on public.intake_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own briefings"      on public.briefings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own user_memory"    on public.user_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mental_models: read-only to any authenticated user.
create policy "read mental_models" on public.mental_models
  for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- New-user bootstrap: create a profile and seed the 10 domains on signup.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));

  insert into public.domains (user_id, name) values
    (new.id, 'Family / Home'),
    (new.id, 'Work / Career'),
    (new.id, 'Health / Fitness'),
    (new.id, 'Money / Finance'),
    (new.id, 'Personal Growth'),
    (new.id, 'Relationships'),
    (new.id, 'Projects / Ideas'),
    (new.id, 'Logistics / Admin'),
    (new.id, 'Creative Work'),
    (new.id, 'Learning');

  insert into public.user_memory (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed the global mental-model library (strategy §2 / brief mental-model layer).
-- ---------------------------------------------------------------------------
insert into public.mental_models (name, description, use_case, prompt_instruction) values
  ('Capture first, organize later',
   'Get everything out of your head before sorting it.',
   'Overwhelm / brain dump',
   'Encourage a complete unfiltered dump; defer all categorization.'),
  ('Convert anxiety into inventory',
   'A vague worry becomes manageable once written as a concrete item.',
   'Worries mixed with tasks',
   'Turn each worry into a named item with a next action or an explicit park.'),
  ('Convert inventory into decisions',
   'Items waiting on a decision are stuck until the decision is named.',
   'Stuck items',
   'Surface the specific decision blocking each stuck item.'),
  ('Use maps not lists when complexity grows',
   'Structure beats linear lists once load is high.',
   'High cognitive load',
   'Group items by domain and state instead of one flat list.'),
  ('Reduce working-memory load',
   'The assistant holds context so the user does not have to.',
   'Daily briefing',
   'Surface only the few things that need attention now; hold the rest.')
on conflict (name) do nothing;
