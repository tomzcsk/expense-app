import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { StatusBadge } from '@/components/StatusBadge';
import { categoryEmoji } from '@/lib/category-emoji';
import type { ClaimStatus } from '@/lib/claims/status';

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;

// "2026-09-03" -> "3 ก.ย." (day + short Thai month, no year to avoid BE/CE ambiguity)
function shortThaiDate(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export default async function MyClaimsPage() {
  const me = await getCurrentUser();
  const supabase = await createClient();
  const { data: claims } = await supabase
    .from('expense_claims')
    .select('id, claim_no, period, amount_thb, status, return_reason, paid_date, category:category_id(name)')
    .eq('submitter_id', me.id)
    .order('created_at', { ascending: false });

  const rows = claims ?? [];
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = rows
    .filter((c) => c.period === thisMonth)
    .reduce((sum, c) => sum + Number(c.amount_thb), 0);
  const pendingCount = rows.filter((c) => c.status === 'submitted').length;
  const paidCount = rows.filter((c) => c.status === 'paid').length;

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
      {/* Summary strip */}
      <div className="card flex items-stretch justify-between text-center">
        <div className="flex-1">
          <div className="text-[11px] text-[#94a3b8]">เดือนนี้</div>
          <div className="font-bold text-[#6366f1]">{baht(monthTotal)}</div>
        </div>
        <div className="w-px bg-[#eef0f5]" />
        <div className="flex-1">
          <div className="text-[11px] text-[#94a3b8]">รออนุมัติ</div>
          <div className="font-bold text-[#f59e0b]">{pendingCount}</div>
        </div>
        <div className="w-px bg-[#eef0f5]" />
        <div className="flex-1">
          <div className="text-[11px] text-[#94a3b8]">จ่ายแล้ว</div>
          <div className="font-bold text-[#10b981]">{paidCount}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold">รายการล่าสุด</h1>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <div className="text-4xl">🧾</div>
          <div className="text-sm text-[#94a3b8]">ยังไม่มีรายการ — กด ➕ ส่งเบิกใหม่ เพื่อเริ่ม</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((c) => {
            const name = (c.category as unknown as { name: string } | null)?.name ?? c.claim_no;
            const returned = c.status === 'returned';
            const inner = (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-lg">
                  {categoryEmoji((c.category as unknown as { name: string } | null)?.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{name}</div>
                  {returned ? (
                    <div className="text-[11px] text-[#ea580c]">
                      ↩ {c.return_reason} · แตะเพื่อแก้
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#94a3b8]">{shortThaiDate(c.paid_date)}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-sm font-bold">{baht(c.amount_thb)}</div>
                  <StatusBadge status={c.status as ClaimStatus} />
                </div>
              </>
            );
            return returned ? (
              <Link
                key={c.id}
                href={`/my/${c.id}/edit`}
                className="card flex items-center gap-3"
                style={{ border: '1.5px solid #fed7aa' }}
              >
                {inner}
              </Link>
            ) : (
              <div key={c.id} className="card flex items-center gap-3">
                {inner}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/my/new" className="btn-primary w-full">
        ➕ ส่งเบิกใหม่
      </Link>
    </div>
  );
}
