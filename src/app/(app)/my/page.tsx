import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { createClaim, resubmitClaim, deleteClaim } from './actions';
import { MyClaimsView, type MyClaimItem } from './MyClaimsView';
import type { ClaimStatus } from '@/lib/claims/status';
import { currentPeriodBangkok } from '@/lib/bangkok-time';

// Add/subtract whole months on a "YYYY-MM" string.
function addMonth(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function MyClaimsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const me = await getCurrentUser();
  const thisMonth = currentPeriodBangkok();
  const { period = thisMonth } = await searchParams;
  const supabase = await createClient();

  const [{ data: claims }, { data: categories }, { data: latestRow }] = await Promise.all([
    supabase
      .from('expense_claims')
      .select('id, claim_no, period, amount_thb, status, return_reason, paid_date, note, category_id, category:category_id(name)')
      .eq('submitter_id', me.id)
      .eq('period', period)
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name').eq('active', true).order('name'),
    supabase
      .from('expense_claims')
      .select('period')
      .eq('submitter_id', me.id)
      .order('period', { ascending: false })
      .limit(1)
      .maybeSingle(),
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

  // Everything is scoped to the selected month now.
  const monthTotal = items.filter((i) => i.status !== 'rejected').reduce((sum, i) => sum + i.amount, 0);
  const pendingCount = items.filter((i) => i.status === 'submitted').length;
  const paidCount = items.filter((i) => i.status === 'paid').length;

  // The latest month this person has any claim in — bounds the "next" arrow so
  // they can't page into empty future months (but the current month is always ok).
  const latestPeriod = latestRow?.period && latestRow.period > thisMonth ? latestRow.period : thisMonth;

  return (
    <MyClaimsView
      period={period}
      prevPeriod={addMonth(period, -1)}
      nextPeriod={addMonth(period, 1)}
      canGoNext={addMonth(period, 1) <= latestPeriod}
      latestPeriod={latestPeriod}
      items={items}
      categories={categories ?? []}
      monthTotal={monthTotal}
      pendingCount={pendingCount}
      paidCount={paidCount}
      createAction={createClaim}
      resubmitAction={resubmitClaim}
      deleteAction={deleteClaim}
    />
  );
}
