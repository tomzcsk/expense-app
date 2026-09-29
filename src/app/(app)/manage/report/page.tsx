import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { summarize, type ClaimRow } from '@/lib/reports/aggregate';
import type { ClaimStatus } from '@/lib/claims/status';
import { ReportView, type PersonGroup, type ClaimLine } from './ReportView';

// Add/subtract whole months on a "YYYY-MM" string.
function addMonth(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireManager();
  const thisMonth = new Date().toISOString().slice(0, 7);
  const { period = thisMonth } = await searchParams;
  const supabase = await createClient();

  // 6-month window ending at the selected month (oldest → selected) for the trend.
  const trendPeriods = Array.from({ length: 6 }, (_, i) => addMonth(period, i - 5));

  const [{ data }, { data: latestRow }, { data: trendRows }] = await Promise.all([
    supabase
      .from('expense_claims')
      .select('id, claim_no, amount_thb, status, paid_date, submitter_id, submitter:submitter_id(name), category:category_id(name)')
      .eq('period', period),
    supabase.from('expense_claims').select('period').order('period', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('expense_claims').select('period, amount_thb').eq('status', 'paid').in('period', trendPeriods),
  ]);

  const claims = data ?? [];

  const rows: ClaimRow[] = claims.map((r) => ({
    submitterName: (r.submitter as unknown as { name: string }).name,
    categoryName: (r.category as unknown as { name: string } | null)?.name ?? 'ไม่ระบุ',
    amountThb: Number(r.amount_thb),
    status: r.status as ClaimStatus,
  }));
  const summary = summarize(rows);

  // Per-person grouping (by submitter_id) for the drill-down modal.
  const personMap = new Map<string, PersonGroup>();
  for (const r of claims) {
    const id = r.submitter_id as string;
    const status = r.status as ClaimStatus;
    const amount = Number(r.amount_thb);
    const g =
      personMap.get(id) ??
      { id, name: (r.submitter as unknown as { name: string }).name, count: 0, total: 0, paid: 0, unpaid: 0, claims: [] };
    g.claims.push({
      id: r.id as string,
      claimNo: r.claim_no as string,
      categoryName: (r.category as unknown as { name: string } | null)?.name ?? null,
      amount,
      status,
      paidDate: r.paid_date as string | null,
    });
    if (status !== 'rejected') {
      g.count += 1;
      g.total += amount;
      if (status === 'paid') g.paid += amount;
      if (status === 'approved') g.unpaid += amount;
    }
    personMap.set(id, g);
  }
  const people = [...personMap.values()].sort((a, b) => b.total - a.total);

  // Flat itemized list (every bill) for the claim table, sorted by pay date.
  const items: ClaimLine[] = claims
    .map((r) => ({
      id: r.id as string,
      claimNo: r.claim_no as string,
      paidDate: r.paid_date as string | null,
      submitterName: (r.submitter as unknown as { name: string }).name,
      categoryName: (r.category as unknown as { name: string } | null)?.name ?? null,
      amount: Number(r.amount_thb),
      status: r.status as ClaimStatus,
    }))
    .sort((a, b) => (a.paidDate ?? '').localeCompare(b.paidDate ?? '') || a.claimNo.localeCompare(b.claimNo));

  const latestPeriod = latestRow?.period ?? thisMonth;
  const nextPeriod = addMonth(period, 1);
  const canGoNext = nextPeriod <= latestPeriod;

  const paidByPeriod = new Map<string, number>();
  for (const t of trendRows ?? []) {
    const p = t.period as string;
    paidByPeriod.set(p, (paidByPeriod.get(p) ?? 0) + Number(t.amount_thb));
  }
  const trend = trendPeriods.map((p) => ({ period: p, paid: paidByPeriod.get(p) ?? 0 }));

  return (
    <ReportView
      period={period}
      prevPeriod={addMonth(period, -1)}
      nextPeriod={nextPeriod}
      canGoNext={canGoNext}
      latestPeriod={latestPeriod}
      summary={summary}
      people={people}
      items={items}
      trend={trend}
    />
  );
}
