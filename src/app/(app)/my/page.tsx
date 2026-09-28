import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { createClaim, resubmitClaim } from './actions';
import { MyClaimsView, type MyClaimItem } from './MyClaimsView';
import type { ClaimStatus } from '@/lib/claims/status';

export default async function MyClaimsPage() {
  const me = await getCurrentUser();
  const supabase = await createClient();
  const [{ data: claims }, { data: categories }] = await Promise.all([
    supabase
      .from('expense_claims')
      .select('id, claim_no, period, amount_thb, status, return_reason, paid_date, note, category_id, category:category_id(name)')
      .eq('submitter_id', me.id)
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name').eq('active', true).order('name'),
  ]);

  const items: MyClaimItem[] = (claims ?? []).map((c) => ({
    id: c.id,
    claimNo: c.claim_no,
    period: c.period,
    amount: Number(c.amount_thb),
    status: c.status as ClaimStatus,
    returnReason: c.return_reason as string | null,
    paidDate: c.paid_date as string | null,
    note: (c.note ?? null) as string | null,
    categoryId: (c.category_id ?? null) as string | null,
    categoryName: (c.category as unknown as { name: string } | null)?.name ?? null,
  }));

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = items.filter((i) => i.period === thisMonth).reduce((sum, i) => sum + i.amount, 0);
  const pendingCount = items.filter((i) => i.status === 'submitted').length;
  const paidCount = items.filter((i) => i.status === 'paid').length;

  return (
    <MyClaimsView
      items={items}
      categories={categories ?? []}
      monthTotal={monthTotal}
      pendingCount={pendingCount}
      paidCount={paidCount}
      createAction={createClaim}
      resubmitAction={resubmitClaim}
    />
  );
}
