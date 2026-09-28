import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';
import { summarize, type ClaimRow } from '@/lib/reports/aggregate';
import { QueueList, type QueueItem } from '../manage/queue/QueueList';
import type { ClaimStatus } from '@/lib/claims/status';

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;

export default async function DashboardPage() {
  const me = await getCurrentUser();
  if (me.role !== 'manager') redirect('/my'); // submitters don't get the manager overview

  const period = new Date().toISOString().slice(0, 7);
  const supabase = await createClient();

  const [{ data: claims }, { count: memberCount }] = await Promise.all([
    supabase
      .from('expense_claims')
      .select('id, claim_no, period, amount_thb, status, paid_date, created_by, submitter_id, submitter:submitter_id(name), enterer:created_by(name), category:category_id(name), receipt_path')
      .eq('period', period)
      .order('created_at', { ascending: true }),
    supabase.from('people').select('id', { count: 'exact', head: true }).eq('active', true),
  ]);

  const all = claims ?? [];
  const rows: ClaimRow[] = all.map((c) => ({
    submitterName: (c.submitter as unknown as { name: string }).name,
    categoryName: (c.category as unknown as { name: string } | null)?.name ?? 'ไม่ระบุ',
    amountThb: Number(c.amount_thb),
    status: c.status as ClaimStatus,
  }));
  const s = summarize(rows);
  const paidCount = all.filter((c) => c.status === 'paid').length;
  const submitters = new Set(all.map((c) => c.submitter_id as string)).size;

  const submittedItems: QueueItem[] = all
    .filter((c) => c.status === 'submitted')
    .map((c) => ({
      id: c.id as string,
      claimNo: c.claim_no as string,
      period: c.period as string,
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
    <div className="flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card">
          <div className="text-xs text-[#6b7280]">ยอดเบิกรวมเดือนนี้</div>
          <div className="mt-1 text-[23px] font-bold text-[#111827]">{baht(s.total)}</div>
          <div className="mt-0.5 text-[11px] text-[#94a3b8]">{s.count} รายการ</div>
        </div>
        <div className="rounded-xl bg-white p-4" style={{ border: '2px solid #f59e0b' }}>
          <div className="text-xs font-semibold text-[#b45309]">⏳ รอจ่าย (ต้องจ่าย)</div>
          <div className="mt-1 text-[23px] font-bold text-[#b45309]">{baht(s.unpaidTotal)}</div>
          <div className="mt-0.5 text-[11px] text-[#d97706]">{s.unpaidCount} รายการ</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#6b7280]">จ่ายแล้ว</div>
          <div className="mt-1 text-[23px] font-bold text-[#16a34a]">{baht(s.paidTotal)}</div>
          <div className="mt-0.5 text-[11px] text-[#94a3b8]">{paidCount} รายการ</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#6b7280]">สมาชิก</div>
          <div className="mt-1 text-[23px] font-bold text-[#111827]">{memberCount ?? 0} คน</div>
          <div className="mt-0.5 text-[11px] text-[#94a3b8]">ส่งเบิกแล้ว {submitters}</div>
        </div>
      </div>

      {/* Queue preview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827]">คิวรอจ่าย (เดือนนี้)</h2>
          <Link href="/manage/queue" className="text-[13px] font-semibold text-[#2563eb]">
            ดูทั้งหมด ›
          </Link>
        </div>
        <QueueList items={submittedItems} emptyText="ไม่มีรายการรอจ่ายเดือนนี้" />
      </div>
    </div>
  );
}
