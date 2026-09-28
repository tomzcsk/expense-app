-- Helper: is the current user an active manager?
-- search_path='' + schema-qualified refs = shadowing-proof (SECURITY DEFINER).
create or replace function public.is_manager() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.people
    where id = auth.uid() and role = 'manager' and active
  );
$$;

alter table people enable row level security;
alter table categories enable row level security;
alter table expense_claims enable row level security;
alter table status_history enable row level security;

-- people: self can read own row; manager reads all; only manager updates
create policy people_select on people for select
  using (id = auth.uid() or is_manager());
create policy people_update on people for update
  using (is_manager()) with check (is_manager());

-- Block anyone from changing their OWN role (defense in depth beyond RLS)
create or replace function prevent_self_role_change() returns trigger
  language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.role <> old.role and auth.uid() = new.id then
    raise exception 'cannot change own role';
  end if;
  return new;
end $$;
create trigger trg_prevent_self_role
  before update on people for each row
  execute function prevent_self_role_change();

-- categories: any authed user reads; manager writes
create policy cat_select on categories for select
  using (auth.uid() is not null);
create policy cat_write on categories for all
  using (is_manager()) with check (is_manager());

-- claims: SELECT only. Submitter sees own, manager sees all.
-- NO insert/update policy on purpose: with RLS enabled and no write policy,
-- RLS denies every direct client write. All writes go through the
-- SECURITY DEFINER RPCs in migration 0004 (create/transition/resubmit),
-- which enforce the state machine and set server-controlled fields.
create policy claim_select on expense_claims for select
  using (submitter_id = auth.uid() or is_manager());

-- status_history: SELECT only (readable if you can see the claim).
-- NO insert policy: only the RPCs write history, so clients cannot forge
-- audit rows by choosing their own actor_id.
create policy hist_select on status_history for select
  using (exists (
    select 1 from expense_claims c
    where c.id = claim_id and (c.submitter_id = auth.uid() or is_manager())
  ));
