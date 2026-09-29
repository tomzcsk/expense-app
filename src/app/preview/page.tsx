import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { categoryEmoji } from '@/lib/category-emoji';
import type { ClaimStatus } from '@/lib/claims/status';

// Admin-only preview of the submitter (คนเบิก) experience. Lives OUTSIDE the
// (app) group so it renders its own submitter top-bar shell (not the manager
// sidebar). Static demo data — it exists so a manager can see what employees
// see without needing a second login. Reached from the sidebar "ดูมุมมองคนเบิก".
const baht = (n: number) => `฿${n.toLocaleString()}`;
const demo: { name: string; amount: number; date: string; status: ClaimStatus; reason?: string }[] = [
  { name: 'ChatGPT Pro', amount: 3400, date: '28 ก.ย.', status: 'submitted' },
  { name: 'Claude Max', amount: 3600, date: '25 ก.ย.', status: 'paid' },
  { name: 'Cursor', amount: 700, date: '20 ก.ย.', status: 'returned', reason: 'แนบใบเสร็จไม่ชัด' },
];

export default async function SubmitterPreviewPage() {
  const me = await getCurrentUser();
  if (me.role !== 'manager') redirect('/my'); // admins only

  const canDelete = (s: ClaimStatus) => s === 'submitted' || s === 'returned' || s === 'rejected';

  return (
    <AppShell role="submitter" name="พนักงาน (ตัวอย่าง)" roleLabel="คนเบิก" submittedCount={0}>
      <div className="flex flex-col gap-5">
        {/* Preview banner */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-2.5 text-[13px] text-[#92400e]">
          <span>🔍 ตัวอย่างมุมมอง <b>คนเบิก</b> — ข้อมูลสมมติ (แอดมินดูได้เท่านั้น)</span>
          <Link href="/dashboard" className="shrink-0 font-semibold text-[#b45309] underline">← กลับแอดมิน</Link>
        </div>

        {/* Month navigator (visual) */}
        <div className="flex items-center gap-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]">‹</span>
          <span className="min-w-[150px] rounded-lg px-3 py-1.5 text-center text-base font-bold text-[#111827]">กันยายน 2026 ▾</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#cbd5e1]">›</span>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <div className="text-xs text-[#6b7280]">ยอดรวม</div>
            <div className="mt-1 text-xl font-bold text-[#111827]">{baht(7700)}</div>
          </div>
          <div className="card">
            <div className="text-xs text-[#6b7280]">รอจ่าย</div>
            <div className="mt-1 text-xl font-bold text-[#b45309]">1</div>
          </div>
          <div className="card">
            <div className="text-xs text-[#6b7280]">จ่ายแล้ว</div>
            <div className="mt-1 text-xl font-bold text-[#16a34a]">1</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827]">รายการของฉัน</h2>
          <span className="btn-primary text-sm">＋ ส่งเบิกใหม่</span>
        </div>

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
              {demo.map((r) => (
                <tr key={r.name}>
                  <td>
                    <span className="mr-1.5">{categoryEmoji(r.name)}</span>
                    <span className="font-semibold">{r.name}</span>
                    {r.reason && <div className="text-[11px] text-[#ea580c]">↩ {r.reason}</div>}
                  </td>
                  <td className="num font-semibold">{baht(r.amount)}</td>
                  <td className="whitespace-nowrap text-[#6b7280]">{r.date}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="whitespace-nowrap" style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-3">
                      {r.status === 'returned' && <span className="text-xs font-semibold text-[#2563eb]">แก้ไข</span>}
                      {canDelete(r.status) && <span className="text-xs font-semibold text-[#dc2626]">ลบ</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
