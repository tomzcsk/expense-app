import { createClient } from '@/lib/supabase/server';
import { NewClaimForm } from '../../new/NewClaimForm';
import { resubmitClaim } from '../../actions';
import { redirect } from 'next/navigation';

export default async function EditClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from('expense_claims').select('id, status, return_reason').eq('id', id).single();
  // Only a returned claim is editable (RLS already limits visibility to the owner).
  if (!claim || claim.status !== 'returned') redirect('/my');

  const { data: categories } = await supabase
    .from('categories').select('id, name').eq('active', true).order('name');

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded bg-orange-50 p-2 text-sm text-orange-700">↩ ตีกลับ: {claim.return_reason}</p>
      <NewClaimForm categories={categories ?? []} action={resubmitClaim.bind(null, id)} />
    </div>
  );
}
