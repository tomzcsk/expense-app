create type user_role as enum ('submitter', 'manager');
create type claim_status as enum ('submitted', 'approved', 'returned', 'rejected', 'paid');

create table people (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null unique,
  role       user_role not null default 'submitter',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  group_name text not null default 'AI/Software',
  active     boolean not null default true
);

create table expense_claims (
  id            uuid primary key default gen_random_uuid(),
  claim_no      text not null unique,
  submitter_id  uuid not null references people(id),  -- owner of the expense
  created_by    uuid not null references people(id),  -- who entered it (manager if on-behalf)
  period        text not null,                       -- 'YYYY-MM'
  category_id   uuid references categories(id),
  description   text,
  amount_thb    numeric(12,2) not null check (amount_thb >= 0),
  vat_amount    numeric(12,2),
  amount_ex_vat numeric(12,2),
  paid_date     date not null,
  receipt_path  text,
  receipt_no    text,
  status        claim_status not null default 'submitted',
  reviewed_by   uuid references people(id),
  reviewed_at   timestamptz,
  return_reason text,
  reject_reason text,
  paid_by       uuid references people(id),
  paid_at       timestamptz,
  payment_ref   text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table status_history (
  id          uuid primary key default gen_random_uuid(),
  claim_id    uuid not null references expense_claims(id) on delete cascade,
  from_status claim_status,
  to_status   claim_status not null,
  actor_id    uuid not null references people(id),
  reason      text,
  created_at  timestamptz not null default now()
);

create index idx_claims_period on expense_claims (period);
create index idx_claims_submitter on expense_claims (submitter_id);
create index idx_claims_status on expense_claims (status);
