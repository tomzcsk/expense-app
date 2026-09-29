-- Hardening (R-07): make ตกเบิก reminders idempotent per person per day.
-- The cron can fire more than once on a reminder day (retries) and the manual
-- "ยิงเตือน" button can be clicked repeatedly — without a record of what was
-- already sent, a person gets duplicate DMs. sendMissingReminders() claims a row
-- here before each DM; a same-day duplicate hits the primary key and is skipped.
--
-- Keyed on (person_id, sent_date) — NOT (person_id, period) — on purpose: the two
-- reminder days (25 & 28) are meant to nudge twice, so only same-DAY repeats are
-- suppressed. `sent_date` is the Bangkok calendar date the sender computes.
create table public.reminder_log (
  person_id uuid not null references public.people(id) on delete cascade,
  sent_date date not null,
  period    text not null,
  sent_at   timestamptz not null default now(),
  primary key (person_id, sent_date)
);

-- Only the service-role sender (admin client) touches this table. RLS on with no
-- policy → every PostgREST/anon/authenticated client is denied; the admin client
-- bypasses RLS. Same lock-down pattern as claim_counters.
alter table public.reminder_log enable row level security;
