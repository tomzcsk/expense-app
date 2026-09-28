import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { summarize, type ClaimRow } from '@/lib/reports/aggregate';
import type { ClaimStatus } from '@/lib/claims/status';

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireManager();
  const { period = new Date().toISOString().slice(0, 7) } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from('expense_claims')
    .select('amount_thb, status, submitter:submitter_id(name), category:category_id(name)')
    .eq('period', period);

  const rows: ClaimRow[] = (data ?? []).map((r) => ({
    submitterName: (r.submitter as unknown as { name: string }).name,
    categoryName: (r.category as unknown as { name: string } | null)?.name ?? 'ไม่ระบุ',
    amountThb: Number(r.amount_thb),
    status: r.status as ClaimStatus,
  }));
  const s = summarize(rows);
  const baht = (n: number) => `฿${n.toLocaleString()}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">รายงานเดือน {period}</h1>
        <a href={`/manage/report/export?period=${period}`} className="btn-primary text-sm">
          ⬇ Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="รวมทั้งเดือน" value={baht(s.total)} sub={`${s.count} รายการ`} accent="#34d399" tint="#10231b" />
        <Tile label="จ่ายแล้ว" value={baht(s.paidTotal)} accent="#34d399" tint="#10231b" />
        <Tile label="อนุมัติแล้ว·รอจ่าย" value={baht(s.approvedUnpaidTotal)} accent="#60a5fa" tint="#10233a" />
        <Tile label="ยังไม่จบ" value={baht(s.total - s.paidTotal - s.approvedUnpaidTotal)} accent="#fbbf24" tint="#2a2410" />
      </div>

      <Section title="สรุปรายคน">
        {s.byPerson.map((p) => (
          <Row key={p.name} left={`${p.name} (${p.count})`} right={baht(p.total)} />
        ))}
      </Section>
      <Section title="ตามหมวด">
        {s.byCategory.map((c) => <Row key={c.name} left={c.name} right={baht(c.total)} />)}
      </Section>
    </div>
  );
}

function Tile({ label, value, sub, accent, tint }: { label: string; value: string; sub?: string; accent: string; tint: string }) {
  return (
    <div className="card" style={{ background: tint }}>
      <div className="text-xs text-[#9aa3b2]">{label}</div>
      <div className="text-lg font-bold" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[11px] text-[#7d8595]">{sub}</div>}
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between border-t border-[#242833] py-2 text-sm first:border-t-0">
      <span>{left}</span>
      <span className="font-medium">{right}</span>
    </div>
  );
}
