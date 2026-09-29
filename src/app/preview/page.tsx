import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { categoryEmoji } from '@/lib/category-emoji';
import { currentPeriodBangkok } from '@/lib/bangkok-time';
import type { ClaimStatus } from '@/lib/claims/status';
import { PreviewControls } from './PreviewControls';

// Admin-only, read-only preview of the submitter (คนเบิก) experience with REAL
// data: pick any employee + month and see their actual claims in the submitter
// top-bar shell. Lives outside the (app) group so it renders the submitter shell,
// not the manager sidebar. A manager can already read every claim (queue/reports),
// so this exposes nothing new — and it never writes.
const baht = (n: number) => `฿${Number(n).toLocaleString()}`;
function addMonth(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function shortThaiDate(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}
const canDelete = (s: ClaimStatus) => s === 'submitted' || s === 'returned' || s === 'rejected';

export default async function SubmitterPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; period?: string }>;
}) {
  const me = await getCurrentUser();
  if (me.role !== 'manager') redirect('/my'); // admins only
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: peopleRaw } = await supabase
    .from('people').select('id, name').eq('active', true).order('name');
  const people = peopleRaw ?? [];

  // Open on the person + month of the most recent claim, so it lands populated.
  const { data: recent } = await supabase
    .from('expense_claims').select('submitter_id, period').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const defaultAs = recent?.submitter_id && people.some((p) => p.id === recent.submitter_id)
    ? (recent.submitter_id as string)
    : me.id;
  const asId = sp.as && people.some((p) => p.id === sp.as) ? sp.as : defaultAs;
  const period = sp.period ?? (recent?.period as string | undefined) ?? currentPeriodBangkok();
  const person = people.find((p) => p.id === asId);

  const [{ data: claimsRaw }, { data: latestRow }] = await Promise.all([
    supabase
      .from('expense_claims')
      .select('id, claim_no, amount_thb, status, paid_date, return_reason, category:category_id(name)')
      .eq('submitter_id', asId)
      .eq('period', period)
      .order('created_at', { ascending: false }),
    supabase
      .from('expense_claims')
      .select('period').eq('submitter_id', asId).order('period', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const items = (claimsRaw ?? []).map((c) => ({
    id: c.id as string,
    amount: Number(c.amount_thb),
    status: c.status as ClaimStatus,
    paidDate: c.paid_date as string | null,
    returnReason: c.return_reason as string | null,
    categoryName: (c.category as unknown as { name: string } | null)?.name ?? null,
    claimNo: c.claim_no as string,
  }));
  const monthTotal = items.filter((i) => i.status !== 'rejected').reduce((s, i) => s + i.amount, 0);
  const pendingCount = items.filter((i) => i.status === 'submitted').length;
  const paidCount = items.filter((i) => i.status === 'paid').length;

  const thisMonth = currentPeriodBangkok();
  const latestPeriod = latestRow?.period && (latestRow.period as string) > thisMonth ? (latestRow.period as string) : thisMonth;
  const canGoNext = addMonth(period, 1) <= latestPeriod;

  return (
    <AppShell role="submitter" name={person?.name ?? '—'} roleLabel="คนเบิก" submittedCount={0}>
      <div className="flex flex-col gap-5">
        {/* Preview banner */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-2.5 text-[13px] text-[#92400e]">
          <span>🔍 ตัวอย่างมุมมอง <b>คนเบิก</b> — ข้อมูลจริง (อ่านอย่างเดียว · แอดมินเท่านั้น)</span>
          <Link href="/dashboard" className="shrink-0 font-semibold text-[#b45309] underline">← กลับแอดมิน</Link>
        </div>

        {/* View-as + month controls */}
        <PreviewControls
          people={people}
          selectedId={asId}
          period={period}
          prevPeriod={addMonth(period, -1)}
          nextPeriod={addMonth(period, 1)}
          canGoNext={canGoNext}
        />

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <div className="text-xs text-[#6b7280]">ยอดรวม</div>
            <div className="mt-1 text-xl font-bold text-[#111827]">{baht(monthTotal)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-[#6b7280]">รอจ่าย</div>
            <div className="mt-1 text-xl font-bold text-[#b45309]">{pendingCount}</div>
          </div>
          <div className="card">
            <div className="text-xs text-[#6b7280]">จ่ายแล้ว</div>
            <div className="mt-1 text-xl font-bold text-[#16a34a]">{paidCount}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827]">รายการของฉัน</h2>
          <span className="btn-primary text-sm opacity-60">＋ ส่งเบิกใหม่</span>
        </div>

        {items.length === 0 ? (
          <div className="card py-12 text-center text-sm text-[#6b7280]">เดือนนี้ยังไม่มีรายการ</div>
        ) : (
          <div className="table-card">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">บริการ</th>
                  <th scope="col" className="num">ยอด</th>
                  <th scope="col">วันที่</th>
                  <th scope="col">สถานะ</th>
                  <th scope="col" style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span className="mr-1.5">{categoryEmoji(i.categoryName)}</span>
                      <span className="font-semibold">{i.categoryName ?? i.claimNo}</span>
                      {i.status === 'returned' && i.returnReason && (
                        <div className="text-[11px] text-[#ea580c]">↩ {i.returnReason}</div>
                      )}
                    </td>
                    <td className="num font-semibold">{baht(i.amount)}</td>
                    <td className="whitespace-nowrap text-[#6b7280]">{shortThaiDate(i.paidDate)}</td>
                    <td><StatusBadge status={i.status} /></td>
                    <td className="whitespace-nowrap" style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-3 opacity-50">
                        {i.status === 'returned' && <span className="text-xs font-semibold text-[#2563eb]">แก้ไข</span>}
                        {canDelete(i.status) && <span className="text-xs font-semibold text-[#dc2626]">ลบ</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
