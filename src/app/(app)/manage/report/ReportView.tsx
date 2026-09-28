'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { categoryEmoji } from '@/lib/category-emoji';
import type { MonthlySummary } from '@/lib/reports/aggregate';
import type { ClaimStatus } from '@/lib/claims/status';

export type PersonClaim = {
  id: string;
  claimNo: string;
  categoryName: string | null;
  amount: number;
  status: ClaimStatus;
  paidDate: string | null;
};
export type PersonGroup = {
  id: string;
  name: string;
  count: number;
  total: number;
  paid: number;
  unpaid: number;
  claims: PersonClaim[];
};

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;
// Gregorian year, per spec (not Buddhist era).
function monthLabel(period: string, short = false): string {
  const [y, m] = period.split('-').map(Number);
  return `${(short ? THAI_MONTHS_SHORT : THAI_MONTHS)[m - 1]} ${y}`;
}
function shortThaiDate(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

type SortKey = 'total' | 'unpaid' | 'name';

export function ReportView({
  period,
  prevPeriod,
  nextPeriod,
  canGoNext,
  latestPeriod,
  summary,
  people,
  trend,
}: {
  period: string;
  prevPeriod: string;
  nextPeriod: string;
  canGoNext: boolean;
  latestPeriod: string;
  summary: MonthlySummary;
  people: PersonGroup[];
  trend: { period: string; paid: number }[];
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<PersonGroup | null>(null);
  const [sort, setSort] = useState<SortKey>('total');
  const [query, setQuery] = useState('');
  const [trendSel, setTrendSel] = useState<number | null>(null);

  const maxTotal = Math.max(1, ...people.map((p) => p.total));
  const maxPaid = Math.max(1, ...trend.map((t) => t.paid));

  const visiblePeople = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
    const sorted = [...filtered];
    if (sort === 'total') sorted.sort((a, b) => b.total - a.total);
    else if (sort === 'unpaid') sorted.sort((a, b) => b.unpaid - a.unpaid || b.total - a.total);
    else sorted.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    return sorted;
  }, [people, sort, query]);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={`/manage/report?period=${prevPeriod}`}
            aria-label="เดือนก่อนหน้า"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#242833] bg-[#171a21] text-lg text-[#f3f5f8]"
          >
            ‹
          </Link>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="min-w-[150px] rounded-lg px-3 py-1.5 text-center text-base font-bold"
          >
            {monthLabel(period)} ▾
          </button>
          {canGoNext ? (
            <Link
              href={`/manage/report?period=${nextPeriod}`}
              aria-label="เดือนถัดไป"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#242833] bg-[#171a21] text-lg text-[#f3f5f8]"
            >
              ›
            </Link>
          ) : (
            <span
              aria-disabled
              className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#242833] bg-[#171a21] text-lg text-[#3a4150]"
            >
              ›
            </span>
          )}
        </div>
        <a href={`/manage/report/export?period=${period}`} className="btn-primary px-3 text-sm">
          ⬇ CSV
        </a>
      </div>

      {/* STRONGEST: money still to pay out */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: 'linear-gradient(135deg,#10231b,#0f1a16)', borderColor: '#1f3b30' }}
      >
        <div className="text-xs text-[#7d8595]">รอจ่าย · ต้องจ่ายให้พนักงาน</div>
        <div className="text-[30px] font-extrabold leading-tight text-[#34d399]">
          {baht(summary.approvedUnpaidTotal)}
        </div>
        <div className="text-[11px] text-[#7d8595]">อนุมัติแล้ว {summary.approvedUnpaidCount} รายการ</div>
      </div>

      {/* Supporting numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card" style={{ borderColor: '#34506e' }}>
          <div className="text-[11px] text-[#9aa3b2]">ยอดเบิกรวม</div>
          <div className="text-lg font-bold text-[#f3f5f8]">{baht(summary.total)}</div>
          <div className="text-[11px] text-[#7d8595]">{summary.count} รายการ · รวมรอตรวจ</div>
        </div>
        <div className="card">
          <div className="text-[11px] text-[#9aa3b2]">จ่ายแล้ว</div>
          <div className="text-lg font-bold text-[#34d399]">{baht(summary.paidTotal)}</div>
        </div>
        <div className="card">
          <div className="text-[11px] text-[#9aa3b2]">รอตรวจ</div>
          <div className="text-lg font-bold text-[#fbbf24]">{baht(summary.submittedTotal)}</div>
          <div className="text-[11px] text-[#7d8595]">{summary.submittedCount} รายการ</div>
        </div>
      </div>
      {summary.returnedCount > 0 && (
        <div className="-mt-2 text-[11px] text-[#fb923c]">↩ ตีกลับ {summary.returnedCount} รายการ</div>
      )}

      {/* Per-person */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">รายคน ({people.length})</h2>
          <div className="flex overflow-hidden rounded-lg border border-[#242833] text-[11px]">
            {(['total', 'unpaid', 'name'] as SortKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className="px-2.5 py-1.5"
                style={sort === k ? { background: '#34d399', color: '#08130e', fontWeight: 600 } : { color: '#9aa3b2' }}
              >
                {k === 'total' ? 'ยอดรวม' : k === 'unpaid' ? 'ค้างจ่าย' : 'ชื่อ'}
              </button>
            ))}
          </div>
        </div>

        {people.length > 8 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นชื่อ..."
            className="field"
          />
        )}

        {visiblePeople.length === 0 ? (
          <div className="card py-8 text-center text-sm text-[#7d8595]">
            {people.length === 0 ? 'ยังไม่มีรายการในเดือนนี้' : 'ไม่พบชื่อที่ค้นหา'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visiblePeople.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p)}
                className="card flex w-full flex-col gap-2 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-[11px] text-[#7d8595]">{p.count} รายการ</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-sm font-bold text-[#34d399]">฿{p.total.toLocaleString()}</div>
                    {p.unpaid > 0 && (
                      <span className="pill" style={{ background: '#2a2410', color: '#fbbf24' }}>
                        ค้างจ่าย ฿{p.unpaid.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#242833]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(p.total / maxTotal) * 100}%`, background: '#34d399' }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trend (secondary) */}
      {trend.some((t) => t.paid > 0) && (
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">จ่ายจริง ต่อเดือน</h2>
            <span className="text-[11px] text-[#7d8595]">
              {trendSel != null ? `${monthLabel(trend[trendSel].period, true)}: ${baht(trend[trendSel].paid)}` : '6 เดือนล่าสุด'}
            </span>
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: 88 }}>
            {trend.map((t, i) => {
              const active = trendSel === i;
              return (
                <button
                  key={t.period}
                  type="button"
                  onClick={() => setTrendSel(active ? null : i)}
                  title={`${monthLabel(t.period, true)}: ${baht(t.paid)}`}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  style={{ height: '100%' }}
                >
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(3, (t.paid / maxPaid) * 70)}px`,
                      background: active ? '#34d399' : '#1f3b30',
                    }}
                  />
                  <div className="text-[9px] text-[#7d8595]">{THAI_MONTHS_SHORT[Number(t.period.split('-')[1]) - 1]}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Month picker */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="เลือกเดือน">
        <input
          type="month"
          defaultValue={period}
          max={latestPeriod}
          className="field"
          onChange={(e) => {
            if (e.target.value) {
              setPickerOpen(false);
              router.push(`/manage/report?period=${e.target.value}`);
            }
          }}
        />
      </Modal>

      {/* Per-person drill-down */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && <PersonDetail g={selected} />}
      </Modal>
    </div>
  );
}

function PersonDetail({ g }: { g: PersonGroup }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#242833] bg-[#171a21] p-3">
        <div className="text-[11px] text-[#7d8595]">ยอดรวมเดือนนี้ ({g.count} รายการ)</div>
        <div className="text-xl font-bold text-[#f3f5f8]">{baht(g.total)}</div>
        <div className="mt-1 flex gap-4 text-[11px]">
          <span className="text-[#34d399]">จ่ายแล้ว {baht(g.paid)}</span>
          <span className="text-[#fbbf24]">รอจ่าย {baht(g.unpaid)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {g.claims.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-[#242833] bg-[#171a21] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b2b26] text-base">
              {categoryEmoji(c.categoryName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{c.categoryName ?? c.claimNo}</div>
              <div className="text-[11px] text-[#7d8595]">
                {c.status === 'paid' && c.paidDate ? `จ่าย ${shortThaiDate(c.paidDate)}` : c.claimNo}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm font-bold">{baht(c.amount)}</div>
              <StatusBadge status={c.status} />
            </div>
            <Link href={`/manage/claims/${c.id}`} className="text-xs font-semibold text-[#34d399]">
              ดู ›
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
