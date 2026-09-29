-- Let a submitter delete their OWN claim — but only while it has NOT been paid.
-- A paid claim is a settled financial record (it feeds the report the team bills
-- to the company), so 'paid' and legacy 'approved' are never deletable. Like the
-- other claim writes this is a SECURITY DEFINER RPC (claims are SELECT-only under
-- RLS, so a direct client DELETE is denied). status_history rows cascade via their
-- FK (0001: on delete cascade). Returns receipt_path so the caller can remove the
-- orphaned Storage object.
create or replace function public.delete_claim(p_claim_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_receipt text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  delete from public.expense_claims
  where id = p_claim_id
    and submitter_id = v_uid
    and status in ('submitted', 'returned', 'rejected')
  returning receipt_path into v_receipt;

  if not found then
    raise exception 'claim not found, not yours, or already paid';
  end if;
  return v_receipt;
end $$;

revoke execute on function public.delete_claim(uuid) from public, anon;
grant execute on function public.delete_claim(uuid) to authenticated;
