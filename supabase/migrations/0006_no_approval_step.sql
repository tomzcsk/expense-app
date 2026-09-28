-- Remove the approval step: a submitted claim is paid directly (or returned/rejected).
-- 'approved' is kept payable only for any legacy rows. create-or-replace = safe re-apply.
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

  -- No approval: submitted -> paid | returned | rejected. (approved -> paid | returned kept for legacy)
  if not ((v_from = 'submitted' and p_to in ('paid','returned','rejected'))
       or (v_from = 'approved'  and p_to in ('paid','returned'))) then
    raise exception 'invalid transition % -> %', v_from, p_to;
  end if;

  update public.expense_claims set
    status        = p_to,
    reviewed_by   = case when p_to in ('returned','rejected') then v_uid else reviewed_by end,
    reviewed_at   = case when p_to in ('returned','rejected') then now()  else reviewed_at end,
    return_reason = case when p_to = 'returned' then p_reason else return_reason end,
    reject_reason = case when p_to = 'rejected' then p_reason else reject_reason end,
    paid_by       = case when p_to = 'paid' then v_uid        else paid_by end,
    paid_at       = case when p_to = 'paid' then now()        else paid_at end,
    payment_ref   = case when p_to = 'paid' then p_payment_ref else payment_ref end,
    updated_at    = now()
  where id = p_claim_id and status = v_from
  returning * into v_claim;
  if not found then raise exception 'claim changed concurrently, please retry'; end if;

  insert into public.status_history (claim_id, from_status, to_status, actor_id, reason)
  values (p_claim_id, v_from, p_to, v_uid, p_reason);
  return v_claim;
end $$;
