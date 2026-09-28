import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { OnBehalfButton } from './OnBehalfButton';
import { QueueList, type QueueItem } from './QueueList';
import { createClaimOnBehalf } from '../actions';
import type { ClaimStatus } from '@/lib/claims/status';

export default async function QueuePage() {
  await requireManager();
  const supabase = await createClient();
  const [{ data: claims }, { data: categories }, { data: people }] = await Promise.all([
    supabase
      .from('expense_claims')
      .select('id, claim_no, period, amount_thb, status, paid_date, created_by, submitter_id, submitter:submitter_id(name), enterer:created_by(name), category:category_id(name), receipt_path')
      .in('status', ['submitted', 'approved'])
      .order('created_at', { ascending: true }),
    supabase.from('categories').select('id, name').eq('active', true).order('name'),
    supabase.from('people').select('id, name').eq('active', true).order('name'),
  ]);

  const items: QueueItem[] = (claims ?? []).map((c) => ({
    id: c.id,
    claimNo: c.claim_no,
    period: c.period,
    amount: Number(c.amount_thb),
    status: c.status as ClaimStatus,
    paidDate: c.paid_date as string | null,
    submitterName: (c.submitter as unknown as { name: string }).name,
    enteredByOther: c.created_by !== c.submitter_id,
    entererName: (c.enterer as unknown as { name: string } | null)?.name ?? null,
    categoryName: (c.category as unknown as { name: string } | null)?.name ?? null,
    hasReceipt: !!c.receipt_path,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">คิวรอจ่าย</h1>
        <OnBehalfButton categories={categories ?? []} people={people ?? []} action={createClaimOnBehalf} />
      </div>
      <QueueList items={items} />
    </div>
  );
}
