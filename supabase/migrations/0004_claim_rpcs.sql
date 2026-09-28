-- Atomic per-period counter (no RLS policy: only SECURITY DEFINER fns touch it)
create table public.claim_counters (
  period   text primary key,
  last_seq integer not null default 0
);
alter table public.claim_counters enable row level security;

-- Shared input validation for a submitter-entered claim (DRY: create + resubmit).
create or replace function public.assert_claim_input(
  p_uid uuid, p_amount_thb numeric, p_paid_date date,
  p_category_id uuid, p_receipt_path text
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.people where id = p_uid and active) then
    raise exception 'inactive or unknown user';
  end if;
  if p_amount_thb is null or p_amount_thb <= 0 then raise exception 'invalid amount'; end if;
  if p_paid_date is null then raise exception 'paid_date required'; end if;
  if p_category_id is not null and not exists (
       select 1 from public.categories where id = p_category_id and active) then
    raise exception 'invalid category';
  end if;
  if p_receipt_path is not null and p_receipt_path not like (p_uid::text || '/%') then
    raise exception 'receipt path not owned by caller';
  end if;
end $$;

-- CREATE: normally files for the caller. A MANAGER may pass p_submitter_id to
-- file on behalf of another person; created_by always records who entered it.
create or replace function public.create_claim(
  p_period text, p_category_id uuid, p_amount_thb numeric,
  p_paid_date date, p_receipt_path text, p_note text,
  p_submitter_id uuid default null
) returns public.expense_claims
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_submitter uuid := coalesce(p_submitter_id, v_uid);
  v_seq integer;
  v_no  text;
  v_claim public.expense_claims;
begin
  perform public.assert_claim_input(v_uid, p_amount_thb, p_paid_date, p_category_id, p_receipt_path);
  if p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'bad period %', p_period; end if;

  -- On-behalf: only a manager may file for someone else, who must be active.
  if v_submitter <> v_uid then
    if not public.is_manager() then raise exception 'not authorized to file for others'; end if;
    if not exists (select 1 from public.people where id = v_submitter and active) then
      raise exception 'target user inactive or unknown';
    end if;
  end if;

  insert into public.claim_counters (period, last_seq) values (p_period, 1)
    on conflict (period) do update set last_seq = public.claim_counters.last_seq + 1
    returning last_seq into v_seq;

  -- YYMM-NNN, matches lib/claims/claim-number.ts formatClaimNo()
  v_no := substr(split_part(p_period, '-', 1), 3, 2) || split_part(p_period, '-', 2)
          || '-' || lpad(v_seq::text, 3, '0');

  insert into public.expense_claims (claim_no, submitter_id, created_by, period, category_id,
                                     amount_thb, paid_date, receipt_path, note, status)
  values (v_no, v_submitter, v_uid, p_period, p_category_id,
          p_amount_thb, p_paid_date, p_receipt_path, p_note, 'submitted')
  returning * into v_claim;

  insert into public.status_history (claim_id, from_status, to_status, actor_id)
  values (v_claim.id, null, 'submitted', v_uid);
  return v_claim;
end $$;

-- TRANSITION: MANAGER ONLY (approve/return/reject/pay). Atomic + audited.
create or replace function public.transition_claim(
  p_claim_id uuid, p_to public.claim_status, p_reason text, p_payment_ref text
) returns public.expense_claims
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := auth.uid();
  v_from public.claim_status;
  v_claim public.expense_claims;
begin
  if not public.is_manager() then raise exception 'not authorized'; end if;

  select status into v_from
  from public.expense_claims where id = p_claim_id for update;
  if not found then raise exception 'claim not found'; end if;

  if not ((v_from = 'submitted' and p_to in ('approved','returned','rejected'))
       or (v_from = 'approved'  and p_to in ('paid','returned'))) then
    raise exception 'invalid transition % -> %', v_from, p_to;
  end if;

  update public.expense_claims set
    status        = p_to,
    reviewed_by   = case when p_to in ('approved','returned','rejected') then v_uid else reviewed_by end,
    reviewed_at   = case when p_to in ('approved','returned','rejected') then now()  else reviewed_at end,
    return_reason = case when p_to = 'returned' then p_reason else return_reason end,
    reject_reason = case when p_to = 'rejected' then p_reason else reject_reason end,
    paid_by       = case when p_to = 'paid' then v_uid        else paid_by end,
    paid_at       = case when p_to = 'paid' then now()        else paid_at end,
    payment_ref   = case when p_to = 'paid' then p_payment_ref else payment_ref end,
    updated_at    = now()
  where id = p_claim_id and status = v_from   -- conditional: fails on concurrent change
  returning * into v_claim;
  if not found then raise exception 'claim changed concurrently, please retry'; end if;

  insert into public.status_history (claim_id, from_status, to_status, actor_id, reason)
  values (p_claim_id, v_from, p_to, v_uid, p_reason);
  return v_claim;
end $$;

-- RESUBMIT: OWNER edits editable fields of their returned claim, back to 'submitted'
create or replace function public.resubmit_claim(
  p_claim_id uuid, p_category_id uuid, p_amount_thb numeric,
  p_paid_date date, p_receipt_path text, p_note text
) returns public.expense_claims
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_claim public.expense_claims;
begin
  perform public.assert_claim_input(v_uid, p_amount_thb, p_paid_date, p_category_id, p_receipt_path);

  update public.expense_claims set
    category_id = p_category_id, amount_thb = p_amount_thb, paid_date = p_paid_date,
    receipt_path = coalesce(p_receipt_path, receipt_path), note = p_note,
    status = 'submitted', return_reason = null, updated_at = now()
  where id = p_claim_id and submitter_id = v_uid and status = 'returned'
  returning * into v_claim;
  if not found then raise exception 'not your returned claim'; end if;

  insert into public.status_history (claim_id, from_status, to_status, actor_id)
  values (p_claim_id, 'returned', 'submitted', v_uid);
  return v_claim;
end $$;

-- Lock down execute: only authenticated users, never anon/public.
-- assert_claim_input is internal-only (called by the definer fns as owner).
revoke execute on function public.assert_claim_input(uuid,numeric,date,uuid,text) from public, anon;
revoke execute on function public.create_claim(text,uuid,numeric,date,text,text,uuid) from public, anon;
revoke execute on function public.transition_claim(uuid,public.claim_status,text,text) from public, anon;
revoke execute on function public.resubmit_claim(uuid,uuid,numeric,date,text,text) from public, anon;
grant execute on function public.create_claim(text,uuid,numeric,date,text,text,uuid) to authenticated;
grant execute on function public.transition_claim(uuid,public.claim_status,text,text) to authenticated;
grant execute on function public.resubmit_claim(uuid,uuid,numeric,date,text,text) to authenticated;
