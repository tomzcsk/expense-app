'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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

// Chart single-hue (magnitude) + furniture tokens.
const BLUE = '#2563eb';
const BLUE_DARK = '#1d4ed8';
const GRID = '#eceef2';
const AXIS_TEXT = '#94a3b8';

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;
const compactBaht = (n: number) =>
  n >= 1000 ? `฿${(n / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : `฿${n}`;

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
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

// Measure a container's live width (charts render at real pixels, so text/marks
// keep a fixed size instead of scaling with a viewBox).
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
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

  const maxTotal = Math.max(1, ...people.map((p) => p.total));

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
    <div className="flex w-full flex-col gap-5">
      {/* Month navigation + export */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href={`/manage/report?period=${prevPeriod}`}
            aria-label="เดือนก่อนหน้า"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]"
          >
            ‹
          </Link>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="min-w-[150px] rounded-lg px-3 py-1.5 text-center text-base font-bold text-[#111827]"
          >
            {monthLabel(period)} ▾
          </button>
          {canGoNext ? (
            <Link
              href={`/manage/report?period=${nextPeriod}`}
              aria-label="เดือนถัดไป"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]"
            >
              ›
            </Link>
          ) : (
            <span
              aria-disabled
              className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#cbd5e1]"
            >
              ›
            </span>
          )}
        </div>
        <a href={`/manage/report/export?period=${period}`} className="btn-primary px-3 text-sm">
          ⬇ Export CSV
        </a>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon="📊" label="ยอดเบิกรวม" value={baht(summary.total)} sub={`${summary.count} รายการ`} valueColor="#111827" />
        <Kpi icon="⏳" label="รอจ่าย (ต้องจ่าย)" value={baht(summary.unpaidTotal)} sub={`${summary.unpaidCount} รายการ`} valueColor="#b45309" emphasis />
        <Kpi icon="✓" label="จ่ายแล้ว" value={baht(summary.paidTotal)} sub="เดือนนี้" valueColor="#16a34a" />
        <Kpi icon="👥" label="ผู้เบิก" value={`${people.length} คน`} sub={`${summary.count} รายการ`} valueColor="#111827" />
      </div>
      {summary.returnedCount > 0 && (
        <div className="-mt-1 text-[11px] text-[#ea580c]">↩ ตีกลับ {summary.returnedCount} รายการเดือนนี้</div>
      )}

      {/* Charts (left) + per-person (right) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <TrendCard trend={trend} />
          <CategoryCard data={summary.byCategory} />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#111827]">รายคน ({people.length})</h2>
            <div className="flex overflow-hidden rounded-lg border border-[#e7eaef] text-[11px]">
              {(['total', 'unpaid', 'name'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  className="px-2.5 py-1.5"
                  style={sort === k ? { background: BLUE, color: '#fff', fontWeight: 600 } : { color: '#6b7280' }}
                >
                  {k === 'total' ? 'ยอดรวม' : k === 'unpaid' ? 'ค้างจ่าย' : 'ชื่อ'}
                </button>
              ))}
            </div>
          </div>

          {people.length > 8 && (
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นชื่อ..." className="field" />
          )}

          {visiblePeople.length === 0 ? (
            <div className="card py-8 text-center text-sm text-[#6b7280]">
              {people.length === 0 ? 'ยังไม่มีรายการในเดือนนี้' : 'ไม่พบชื่อที่ค้นหา'}
            </div>
          ) : (
            <div className="table-card">
              <table className="tbl tbl-tap">
                <thead>
                  <tr>
                    <th scope="col">ชื่อ</th>
                    <th scope="col" className="num">จำนวน</th>
                    <th scope="col" className="num">ยอดรวม</th>
                    <th scope="col" className="num">ค้างจ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePeople.map((p) => {
                    const pct = (p.total / maxTotal) * 100;
                    return (
                      <tr key={p.id} onClick={() => setSelected(p)}>
                        <td className="font-semibold text-[#111827]">{p.name}</td>
                        <td className="num text-[#6b7280]">{p.count}</td>
                        <td
                          className="num font-bold text-[#111827]"
                          style={{ background: `linear-gradient(to right, rgba(37,99,235,0.12) ${pct}%, transparent ${pct}%)` }}
                        >
                          ฿{p.total.toLocaleString()}
                        </td>
                        <td className="num" style={{ color: p.unpaid > 0 ? '#b45309' : '#94a3b8' }}>
                          {p.unpaid > 0 ? `฿${p.unpaid.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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

function Kpi({
  icon,
  label,
  value,
  sub,
  valueColor,
  emphasis,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  valueColor: string;
  emphasis?: boolean;
}) {
  return (
    <div className={emphasis ? 'rounded-xl bg-white p-4' : 'card'} style={emphasis ? { border: '2px solid #f59e0b' } : undefined}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: emphasis ? '#b45309' : '#6b7280' }}>
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-[22px] font-bold leading-tight" style={{ color: valueColor }}>
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px]" style={{ color: emphasis ? '#d97706' : '#94a3b8' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Trend: area + line, single blue hue, hover crosshair + tooltip ──────────
function TrendCard({ trend }: { trend: { period: string; paid: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const nonzero = trend.filter((t) => t.paid > 0).length;
  const height = 176;
  const m = { top: 14, right: 14, bottom: 22, left: 46 };
  const w = Math.max(width, 240);
  const plotW = w - m.left - m.right;
  const plotH = height - m.top - m.bottom;
  const max = niceMax(Math.max(...trend.map((t) => t.paid), 0));
  const n = trend.length;
  const x = (i: number) => m.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const y = (v: number) => m.top + plotH * (1 - v / max);
  const ticks = [0, max / 2, max];

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n <= 1) return;
    const sx = ((e.clientX - rect.left) / rect.width) * w; // rect may be CSS-scaled vs viewBox width
    const i = Math.max(0, Math.min(n - 1, Math.round((sx - m.left) / (plotW / (n - 1)))));
    setHover(i);
  };

  return (
    <div ref={ref} className="card relative flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-[#111827]">จ่ายจริง ต่อเดือน</h2>
        <span className="text-[11px] text-[#94a3b8]">6 เดือนล่าสุด</span>
      </div>

      {nonzero < 2 ? (
        <div className="flex flex-col items-start gap-1 py-4">
          <div className="text-[22px] font-bold text-[#2563eb]">{baht(trend[n - 1]?.paid ?? 0)}</div>
          <div className="text-[11px] text-[#94a3b8]">
            {nonzero === 0 ? 'ยังไม่มีการจ่ายใน 6 เดือนนี้' : 'ข้อมูลยังไม่พอแสดงกราฟแนวโน้ม'}
          </div>
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label="แนวโน้มยอดจ่ายจริง 6 เดือน"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* gridlines + y ticks */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={m.left} y1={y(t)} x2={m.left + plotW} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={m.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill={AXIS_TEXT}>
                {compactBaht(t)}
              </text>
            </g>
          ))}
          {/* area wash */}
          <path
            d={`M${trend.map((t, i) => `${x(i)},${y(t.paid)}`).join(' L')} L${x(n - 1)},${m.top + plotH} L${x(0)},${m.top + plotH} Z`}
            fill={BLUE}
            fillOpacity={0.1}
          />
          {/* line */}
          <path
            d={`M${trend.map((t, i) => `${x(i)},${y(t.paid)}`).join(' L')}`}
            fill="none"
            stroke={BLUE}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* end marker */}
          <circle cx={x(n - 1)} cy={y(trend[n - 1].paid)} r={4} fill={BLUE} stroke="#fff" strokeWidth={2} />
          {/* x labels */}
          {trend.map((t, i) => (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill={AXIS_TEXT}>
              {THAI_MONTHS_SHORT[Number(t.period.split('-')[1]) - 1]}
            </text>
          ))}
          {/* hover crosshair + dot */}
          {hover != null && (
            <g>
              <line x1={x(hover)} y1={m.top} x2={x(hover)} y2={m.top + plotH} stroke={BLUE} strokeWidth={1} strokeOpacity={0.4} />
              <circle cx={x(hover)} cy={y(trend[hover].paid)} r={4} fill={BLUE} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}

      {hover != null && nonzero >= 2 && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-[#e7eaef] bg-white px-2 py-1 text-[11px] shadow-md"
          style={{ left: Math.min(Math.max(x(hover) - 40, 4), w - 90), top: 34 }}
        >
          <div className="font-semibold text-[#111827]">{baht(trend[hover].paid)}</div>
          <div className="text-[#94a3b8]">{monthLabel(trend[hover].period, true)}</div>
        </div>
      )}
    </div>
  );
}

// ── By category: horizontal bars, single blue hue, per-bar hover ────────────
function CategoryCard({ data }: { data: { name: string; total: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) return null;

  const rowH = 34;
  const labelW = 104;
  const valueW = 78;
  const gap = 8;
  const w = Math.max(width, 240);
  const barAreaW = Math.max(40, w - labelW - valueW - gap * 2);
  const height = data.length * rowH + 6;
  const max = niceMax(Math.max(...data.map((d) => d.total), 0));

  // rounded-right rect path (square at the baseline/left end)
  const bar = (bx: number, by: number, bw: number, bh: number, r: number) => {
    const rr = Math.min(r, bw, bh / 2);
    return `M${bx},${by} H${bx + bw - rr} Q${bx + bw},${by} ${bx + bw},${by + rr} V${by + bh - rr} Q${bx + bw},${by + bh} ${bx + bw - rr},${by + bh} H${bx} Z`;
  };

  return (
    <div ref={ref} className="card flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-[#111827]">ตามหมวด</h2>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label="ยอดเบิกตามหมวด">
        {data.map((d, i) => {
          const barH = 12;
          const by = i * rowH + (rowH - barH) / 2;
          const bw = Math.max(d.total > 0 ? 3 : 0, (d.total / max) * barAreaW);
          const cy = i * rowH + rowH / 2;
          return (
            <g key={d.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <title>{`${d.name}: ${baht(d.total)}`}</title>
              {/* hit target */}
              <rect x={0} y={i * rowH} width={w} height={rowH} fill="transparent" />
              <text x={0} y={cy + 4} fontSize={12} fill="#374151">
                {categoryEmoji(d.name)} {d.name.length > 12 ? d.name.slice(0, 11) + '…' : d.name}
              </text>
              <path d={bar(labelW + gap, by, bw, barH, 4)} fill={hover === i ? BLUE_DARK : BLUE} />
              <text x={w} y={cy + 4} textAnchor="end" fontSize={11} fontWeight={600} fill="#111827" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {baht(d.total)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PersonDetail({ g }: { g: PersonGroup }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[#e7eaef] bg-[#f8fafc] p-3">
        <div className="text-[11px] text-[#6b7280]">ยอดรวมเดือนนี้ ({g.count} รายการ)</div>
        <div className="text-xl font-bold text-[#111827]">{baht(g.total)}</div>
        <div className="mt-1 flex gap-4 text-[11px]">
          <span className="text-[#16a34a]">จ่ายแล้ว {baht(g.paid)}</span>
          <span className="text-[#b45309]">รอจ่าย {baht(g.unpaid)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {g.claims.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-[#e7eaef] bg-[#f8fafc] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff6ff] text-base">
              {categoryEmoji(c.categoryName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[#111827]">{c.categoryName ?? c.claimNo}</div>
              <div className="text-[11px] text-[#6b7280]">
                {c.status === 'paid' && c.paidDate ? `จ่าย ${shortThaiDate(c.paidDate)}` : c.claimNo}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm font-bold text-[#111827]">{baht(c.amount)}</div>
              <StatusBadge status={c.status} />
            </div>
            <Link href={`/manage/claims/${c.id}`} className="text-xs font-semibold text-[#2563eb]">
              ดู ›
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
