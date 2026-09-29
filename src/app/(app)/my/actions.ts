'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

// Owner deletes their own not-yet-paid claim. The RPC authorizes (own + unpaid)
// and returns the receipt path; we then best-effort remove the Storage object.
// Errors are RETURNED (not thrown) so the confirm modal can show them inline.
export async function deleteClaim(claimId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: receiptPath, error } = await supabase.rpc('delete_claim', { p_claim_id: claimId });
  if (error) {
    console.error('deleteClaim failed', error);
    return { error: 'ลบไม่สำเร็จ — รายการนี้อาจถูกจ่ายไปแล้ว หรือไม่มีสิทธิ์ลบ' };
  }
  // Receipt cleanup runs only after the RPC confirmed an authorized delete, and
  // only if no OTHER claim still points at the same file (create_claim checks the
  // path prefix, not uniqueness, so a path can be shared). Receipt paths are
  // uid-prefixed, so the caller's own claims — all RLS lets them see — are the
  // complete set that could reference it.
  if (receiptPath) {
    const { data: stillUsed } = await supabase
      .from('expense_claims')
      .select('id')
      .eq('receipt_path', receiptPath as string)
      .limit(1);
    if (!stillUsed || stillUsed.length === 0) {
      const admin = createAdminClient();
      const { error: rmErr } = await admin.storage.from('receipts').remove([receiptPath as string]);
      if (rmErr) console.error('receipt cleanup failed', receiptPath, rmErr);
    }
  }
  revalidatePath('/my');
  return {};
}
