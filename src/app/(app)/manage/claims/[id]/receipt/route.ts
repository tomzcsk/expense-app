import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';

// Read-only: returns a freshly signed receipt URL for one claim. No writes.
// Signing happens server-side (session-scoped client + RLS); the service key
// is never exposed. Used by the queue's client detail modal to view receipts.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireManager();
  const supabase = await createClient();

  const { data: claim } = await supabase
    .from('expense_claims')
    .select('receipt_path')
    .eq('id', id)
    .single();

  if (!claim?.receipt_path) {
    return NextResponse.json({ url: null, isPdf: false });
  }

  const { data } = await supabase.storage.from('receipts').createSignedUrl(claim.receipt_path, 300);
  const isPdf = claim.receipt_path.toLowerCase().endsWith('.pdf');
  return NextResponse.json({ url: data?.signedUrl ?? null, isPdf });
}
