import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { StatusBadge } from '@/components/StatusBadge';
import type { ClaimStatus } from '@/lib/claims/status';

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;

export default async function QueuePage() {
  await requireManager();
  const supabase = await createClient();
  const { data: claims } = await supabase
    .from('expense_claims')
    .select('id, claim_no, period, amount_thb, status, submitter:submitter_id(name)')
    .in('status', ['submitted', 'approved'])
    .order('created_at', { ascending: true });

  const rows = claims ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">คิวรออนุมัติ</h1>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <div className="text-4xl">🎉</div>
          <div className="text-sm text-[#94a3b8]">ไม่มีรายการรออนุมัติ — เคลียร์หมดแล้ว</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((c) => (
            <Link key={c.id} href={`/manage/claims/${c.id}`} className="card flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {(c.submitter as unknown as { name: string }).name}
                </div>
                <div className="text-[11px] text-[#94a3b8]">
                  {c.claim_no} · {c.period}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-sm font-bold">{baht(c.amount_thb)}</div>
                <StatusBadge status={c.status as ClaimStatus} />
              </div>
              <div className="text-[#6366f1]">›</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
