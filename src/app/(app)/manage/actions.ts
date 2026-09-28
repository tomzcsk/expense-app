'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import type { ClaimStatus } from '@/lib/claims/status';

// Authorization + state machine + atomic update + audit all live in the
// transition_claim RPC (migration 0004). requireManager() here is a fast UI
// guard; the RPC re-checks is_manager() server-side, so a non-manager who
// calls it directly is still rejected.
async function transition(
  claimId: string,
  to: ClaimStatus,
  reason: string | null,
  paymentRef: string | null
) {
  await requireManager();
  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_claim', {
    p_claim_id: claimId,
    p_to: to,
    p_reason: reason,
    p_payment_ref: paymentRef,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/manage/queue');
  revalidatePath(`/manage/claims/${claimId}`);
}

export async function approveClaim(id: string) { await transition(id, 'approved', null, null); }
export async function returnClaim(id: string, reason: string) { await transition(id, 'returned', reason, null); }
export async function rejectClaim(id: string, reason: string) { await transition(id, 'rejected', reason, null); }
export async function payClaim(id: string, paymentRef: string) { await transition(id, 'paid', null, paymentRef); }

// Manager files a claim on behalf of another person (p_submitter_id). The RPC
// re-checks is_manager(), so this is safe even though it's a plain action.
export async function createClaimOnBehalf(formData: FormData) {
  await requireManager();
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_claim', {
    p_period: String(formData.get('period')),
    p_category_id: String(formData.get('category_id')) || null,
    p_amount_thb: Number(formData.get('amount_thb')),
    p_paid_date: String(formData.get('paid_date')),
    p_receipt_path: String(formData.get('receipt_path')) || null,
    p_note: String(formData.get('note')) || null,
    p_submitter_id: String(formData.get('submitter_id')),
  });
  if (error) throw new Error(error.message);
  redirect('/manage/report');
}
