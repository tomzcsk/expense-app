'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// All writes go through the SECURITY DEFINER RPCs (migration 0004). The RPC
// sets submitter_id = auth.uid(), assigns the claim_no atomically, and writes
// the audit row — the action just forwards form fields.
export async function createClaim(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('create_claim', {
    p_period: String(formData.get('period')),
    p_category_id: String(formData.get('category_id')) || null,
    p_amount_thb: Number(formData.get('amount_thb')),
    p_paid_date: String(formData.get('paid_date')),
    p_receipt_path: String(formData.get('receipt_path')) || null,
    p_note: String(formData.get('note')) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/my');
  redirect('/my');
}

export async function resubmitClaim(claimId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('resubmit_claim', {
    p_claim_id: claimId,
    p_category_id: String(formData.get('category_id')) || null,
    p_amount_thb: Number(formData.get('amount_thb')),
    p_paid_date: String(formData.get('paid_date')),
    p_receipt_path: String(formData.get('receipt_path')) || null,
    p_note: String(formData.get('note')) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/my');
  redirect('/my');
}
