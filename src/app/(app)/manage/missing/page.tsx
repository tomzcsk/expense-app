import { requireManager } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';
import { computeMissing, type Subscription } from '@/lib/subscriptions/missing';
import { currentPeriodBangkok } from '@/lib/bangkok-time';
import { MissingView, type SubRow } from './MissingView';

function addMonth(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function MissingPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireManager();
  const thisMonth = currentPeriodBangkok();
  const { period = thisMonth } = await searchParams;
  const supabase = await createClient();

  const [{ data: subsRaw }, { data: claimsRaw }, { data: people }, { data: categories }, { data: latestRow }] =
    await Promise.all([
      supabase
        .from('recurring_subscriptions')
        .select('id, person_id, category_id, expected_amount, active, note, person:person_id(name), category:category_id(name)')
        .order('created_at', { ascending: true }),
      supabase.from('expense_claims').select('submitter_id, category_id, status').eq('period', period),
      supabase.from('people').select('id, name').eq('active', true).order('name'),
      supabase.from('categories').select('id, name').eq('active', true).order('name'),
      supabase.from('expense_claims').select('period').order('period', { ascending: false }).limit(1).maybeSingle(),
    ]);

  const subs: SubRow[] = (subsRaw ?? []).map((s) => ({
    id: s.id as string,
    personId: s.person_id as string,
    personName: (s.person as unknown as { name: string } | null)?.name ?? '-',
    categoryId: (s.category_id as string | null) ?? null,
    categoryName: (s.category as unknown as { name: string } | null)?.name ?? null,
    expectedAmount: s.expected_amount != null ? Number(s.expected_amount) : null,
    active: s.active as boolean,
    note: (s.note as string | null) ?? null,
  }));

  const activeSubs: Subscription[] = subs
    .filter((s) => s.active)
    .map(({ id, personId, personName, categoryId, categoryName, expectedAmount }) => ({
      id,
      personId,
      personName,
      categoryId,
      categoryName,
      expectedAmount,
    }));

  const claimKeys = (claimsRaw ?? [])
    .filter((c) => c.status !== 'rejected')
    .map((c) => ({ personId: c.submitter_id as string, categoryId: (c.category_id as string | null) ?? null }));

  const missing = computeMissing(activeSubs, claimKeys);

  const latestPeriod = latestRow?.period ?? thisMonth;
  const nextPeriod = addMonth(period, 1);

  return (
    <MissingView
      period={period}
      prevPeriod={addMonth(period, -1)}
      nextPeriod={nextPeriod}
      canGoNext={nextPeriod <= latestPeriod}
      latestPeriod={latestPeriod}
      missingRows={missing.rows}
      missingCount={missing.missingCount}
      missingPeople={missing.missingPeople}
      hasActiveSubs={activeSubs.length > 0}
      subs={subs}
      people={people ?? []}
      categories={categories ?? []}
    />
  );
}
