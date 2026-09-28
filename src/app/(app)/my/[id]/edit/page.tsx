import { createClient } from '@/lib/supabase/server';
import { NewClaimForm } from '../../new/NewClaimForm';
import { resubmitClaim } from '../../actions';
import { redirect } from 'next/navigation';

export default async function EditClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claim } = await supabase
    .from('expense_claims')
    .select('id, status, return_reason, period, amount_thb, paid_date, note, category_id')
    .eq('id', id).single();
  // Only a returned claim is editable (RLS already limits visibility to the owner).
  if (!claim || claim.status !== 'returned') redirect('/my');

  const { data: categories } = await supabase
    .from('categories').select('id, name').eq('active', true).order('name');

  return (
    <div className="flex flex-col gap-3">
      <div className="mx-auto w-full max-w-[520px] rounded-2xl border border-[#3a2a1a] px-4 py-3 text-sm" style={{ background: '#2e1c10', color: '#fb923c' }}>
        ↩ ตีกลับให้แก้: {claim.return_reason}
      </div>
      <NewClaimForm
        categories={categories ?? []}
        action={resubmitClaim.bind(null, id)}
        defaults={{
          period: claim.period,
          category_id: claim.category_id,
          amount_thb: claim.amount_thb,
          paid_date: claim.paid_date,
          note: claim.note,
        }}
      />
    </div>
  );
}
