create table if not exists public.sent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  draft_id text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body text not null,
  reply_to text,
  provider_id text,
  status text not null check (status in ('sent', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

alter table public.sent_messages enable row level security;

create policy "sent_messages_select_own"
  on public.sent_messages for select
  using (user_id = auth.uid());

create policy "sent_messages_insert_own"
  on public.sent_messages for insert
  with check (user_id = auth.uid());

create index if not exists sent_messages_user_created_idx
  on public.sent_messages (user_id, created_at desc);
