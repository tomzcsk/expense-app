import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { toCsv } from '@/lib/reports/csv';
import { statusLabelTh, type ClaimStatus } from '@/lib/claims/status';
import { currentPeriodBangkok } from '@/lib/bangkok-time';

export async function GET(req: NextRequest) {
  await requireManager();
  const period = req.nextUrl.searchParams.get('period') ?? currentPeriodBangkok();
  const supabase = await createClient();

  const { data } = await supabase
    .from('expense_claims')
    .select('claim_no, period, amount_thb, status, paid_date, payment_ref, submitter:submitter_id(name), category:category_id(name)')
    .eq('period', period)
    .order('claim_no');

  const rows = (data ?? []).map((r) => ({
    claim_no: r.claim_no,
    name: (r.submitter as unknown as { name: string }).name,
    category: (r.category as unknown as { name: string } | null)?.name ?? '',
    amount: Number(r.amount_thb),
    status: statusLabelTh(r.status as ClaimStatus),
    paid_date: r.paid_date,
    payment_ref: r.payment_ref ?? '',
  }));

  const csv = toCsv(rows, [
    { key: 'claim_no', label: 'เลขที่' },
    { key: 'name', label: 'คน' },
    { key: 'category', label: 'หมวด' },
    { key: 'amount', label: 'ยอด(บาท)' },
    { key: 'status', label: 'สถานะ' },
    { key: 'paid_date', label: 'วันที่จ่าย' },
    { key: 'payment_ref', label: 'อ้างอิงการโอน' },
  ]);

  return new Response('﻿' + csv, {   // BOM so Excel reads Thai UTF-8
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="expense-${period}.csv"`,
    },
  });
}
