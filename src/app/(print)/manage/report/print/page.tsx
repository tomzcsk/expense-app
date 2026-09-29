import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';
import { summarize, type ClaimRow } from '@/lib/reports/aggregate';
import { statusLabelTh, type ClaimStatus } from '@/lib/claims/status';
import { categoryEmoji } from '@/lib/category-emoji';
import { PrintButton } from './PrintButton';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const baht = (n: number) => `฿${Number(n).toLocaleString()}`;
function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y}`;
}
function dayLabel(d?: string | null): string {
  if (!d) return '-';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

export default async function ReportPrintPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const me = await getCurrentUser();
  if (me.role !== 'manager') redirect('/my');

  const thisMonth = new Date().toISOString().slice(0, 7);
  const { period = thisMonth } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from('expense_claims')
    .select('id, claim_no, amount_thb, status, paid_date, receipt_path, submitter:submitter_id(name), category:category_id(name)')
    .eq('period', period)
    .order('paid_date', { ascending: true });

  const claims = data ?? [];

  const rows: ClaimRow[] = claims.map((r) => ({
    submitterName: (r.submitter as unknown as { name: string }).name,
    categoryName: (r.category as unknown as { name: string } | null)?.name ?? 'ไม่ระบุ',
    amountThb: Number(r.amount_thb),
    status: r.status as ClaimStatus,
  }));
  const s = summarize(rows);

  const items = claims.map((r) => ({
    id: r.id as string,
    claimNo: r.claim_no as string,
    paidDate: r.paid_date as string | null,
    submitterName: (r.submitter as unknown as { name: string }).name,
    categoryName: (r.category as unknown as { name: string } | null)?.name ?? null,
    amount: Number(r.amount_thb),
    status: r.status as ClaimStatus,
    receiptPath: (r.receipt_path as string | null) ?? null,
  }));

  // Sign receipt URLs server-side (longer expiry — printing takes a moment).
  const signed = await Promise.all(
    items.map(async (it) => {
      if (!it.receiptPath) return null;
      const { data: sig } = await supabase.storage.from('receipts').createSignedUrl(it.receiptPath, 3600);
      return sig?.signedUrl ?? null;
    }),
  );
  const appendix = items
    .map((it, i) => ({ ...it, url: signed[i], isPdf: !!it.receiptPath && it.receiptPath.toLowerCase().endsWith('.pdf') }))
    .filter((it) => it.status !== 'rejected'); // the claimed bills

  const printedOn = dayLabel(new Date().toISOString().slice(0, 10));

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      {/* Screen-only toolbar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#e7eaef] bg-[#f8fafc] px-4 py-2">
        <a href={`/manage/report?period=${period}`} className="text-sm font-semibold text-[#2563eb]">
          ‹ กลับรายงาน
        </a>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[820px] px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#111827] pb-3">
          <div>
            <div className="text-xl font-bold">ใบสรุปเบิกจ่ายค่าใช้จ่าย</div>
            <div className="text-sm text-[#374151]">เดือน {monthLabel(period)}</div>
          </div>
          <div className="text-right text-[12px] text-[#6b7280]">
            <div>จัดทำโดย {me.name}</div>
            <div>วันที่พิมพ์ {printedOn}</div>
          </div>
        </div>

        {/* Grand total */}
        <div className="mt-5">
          <div className="text-sm text-[#6b7280]">ยอดรวมที่ต้องเบิก</div>
          <div className="text-[32px] font-extrabold leading-tight">{baht(s.total)}</div>
          <div className="text-[12px] text-[#6b7280]">{s.count} รายการ (ไม่รวมปฏิเสธ)</div>
        </div>

        {/* Summaries */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-1.5 text-sm font-semibold">สรุปรายคน</div>
            <table className="print-tbl">
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th className="num">จำนวน</th>
                  <th className="num">ยอด</th>
                </tr>
              </thead>
              <tbody>
                {s.byPerson.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="num">{p.count}</td>
                    <td className="num">{baht(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="mb-1.5 text-sm font-semibold">สรุปตามหมวด</div>
            <table className="print-tbl">
              <thead>
                <tr>
                  <th>หมวด</th>
                  <th className="num">ยอด</th>
                </tr>
              </thead>
              <tbody>
                {s.byCategory.map((c) => (
                  <tr key={c.name}>
                    <td>
                      {categoryEmoji(c.name)} {c.name}
                    </td>
                    <td className="num">{baht(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Itemized */}
        <div className="mt-6">
          <div className="mb-1.5 text-sm font-semibold">รายการทั้งหมด</div>
          <table className="print-tbl">
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>วันที่</th>
                <th>ชื่อ</th>
                <th>บริการ</th>
                <th className="num">ยอด</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="whitespace-nowrap font-medium">{it.claimNo}</td>
                  <td className="whitespace-nowrap">{dayLabel(it.paidDate)}</td>
                  <td className="whitespace-nowrap">{it.submitterName}</td>
                  <td>
                    {categoryEmoji(it.categoryName)} {it.categoryName ?? '-'}
                  </td>
                  <td className="num">{baht(it.amount)}</td>
                  <td className="whitespace-nowrap">{statusLabelTh(it.status)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="num" style={{ fontWeight: 700, borderTop: '2px solid #111827' }}>
                  รวมที่ต้องเบิก (ไม่รวมปฏิเสธ)
                </td>
                <td className="num" style={{ fontWeight: 700, borderTop: '2px solid #111827' }}>
                  {baht(s.total)}
                </td>
                <td style={{ borderTop: '2px solid #111827' }} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Appendix — receipts */}
        <div className="mt-7">
          <div className="mb-2 text-sm font-semibold">ภาคผนวก — ใบเสร็จแนบ</div>
          {appendix.length === 0 ? (
            <div className="text-[12px] text-[#6b7280]">ไม่มีรายการ</div>
          ) : (
            <div className="flex flex-col gap-4">
              {appendix.map((it) => (
                <div key={it.id} className="avoid-break rounded border border-[#e5e7eb] p-3">
                  <div className="flex items-baseline justify-between text-[12px]">
                    <div className="font-semibold">
                      {it.claimNo} · {it.submitterName} · {it.categoryName ?? '-'}
                    </div>
                    <div className="font-semibold">{baht(it.amount)}</div>
                  </div>
                  <div className="mt-2">
                    {!it.receiptPath ? (
                      <div className="text-[12px] text-[#6b7280]">ไม่มีใบเสร็จแนบ</div>
                    ) : it.isPdf ? (
                      <div className="text-[12px] text-[#374151]">
                        ใบเสร็จเป็นไฟล์ PDF —{' '}
                        {it.url ? (
                          <a href={it.url} target="_blank" className="text-[#2563eb] underline">
                            เปิดดู
                          </a>
                        ) : (
                          'เปิดจากระบบ'
                        )}
                      </div>
                    ) : it.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.url} alt={`ใบเสร็จ ${it.claimNo}`} className="max-h-[440px] w-auto rounded border border-[#e5e7eb]" />
                    ) : (
                      <div className="text-[12px] text-[#6b7280]">โหลดใบเสร็จไม่สำเร็จ</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
