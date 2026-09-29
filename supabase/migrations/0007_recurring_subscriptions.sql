-- Phase 2 (step 1): recurring subscriptions — the "expected" list for ตกเบิก tracking.
-- A manager records who has which monthly subscription; the missing-claims report
-- compares these against the month's actual claims. No Telegram/Cron yet.
create table public.recurring_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.people(id) on delete cascade,
  category_id     uuid references public.categories(id),
  expected_amount numeric(12,2),
  active          boolean not null default true,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_recsub_person on public.recurring_subscriptions(person_id);

alter table public.recurring_subscriptions enable row level security;

-- Managers manage everyone's; a person may read their own.
create policy recsub_select on public.recurring_subscriptions for select
  using (public.is_manager() or person_id = auth.uid());
create policy recsub_write on public.recurring_subscriptions for all
  using (public.is_manager()) with check (public.is_manager());
