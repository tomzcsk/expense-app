-- Phase 2 (step 2): Telegram — link accounts + reminders.
alter table public.people add column if not exists telegram_chat_id bigint;
alter table public.people add column if not exists telegram_username text;

-- One-time deep-link tokens for account linking (profile → t.me/bot?start=<token>).
create table public.telegram_link_tokens (
  token      text primary key,
  person_id  uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  used_at    timestamptz
);
alter table public.telegram_link_tokens enable row level security;

-- A logged-in user creates a token for themselves and may read their own; managers may read all.
-- The Telegram webhook consumes tokens + sets people.telegram_chat_id via the service-role
-- client (bypasses RLS), because Telegram calls it with no user session.
create policy tlt_insert_self on public.telegram_link_tokens for insert
  with check (person_id = auth.uid());
create policy tlt_select_own on public.telegram_link_tokens for select
  using (person_id = auth.uid() or public.is_manager());
