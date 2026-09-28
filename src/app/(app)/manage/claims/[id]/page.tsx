import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { StatusBadge } from '@/components/StatusBadge';
import { categoryEmoji } from '@/lib/category-emoji';
import { approveClaim, returnClaim, rejectClaim, payClaim } from '../../actions';
import { ClaimActions } from './ClaimActions';
import type { ClaimStatus } from '@/lib/claims/status';

export default async function ClaimDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireManager();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from('expense_claims')
    .select('*, submitter:submitter_id(name), enterer:created_by(name), category:category_id(name)')
    .eq('id', id).single();
  if (!c) return <p className="card text-sm">ไม่พบรายการ</p>;
  const enteredByOther = c.created_by !== c.submitter_id;

  let receiptUrl: string | null = null;
  if (c.receipt_path) {
    const { data } = await supabase.storage.from('receipts').createSignedUrl(c.receipt_path, 300);
    receiptUrl = data?.signedUrl ?? null;
  }
  const status = c.status as ClaimStatus;
  const categoryName = (c.category as { name: string } | null)?.name ?? null;

  // Same server actions + field names as before, defined here (Server Component)
  // and passed to the client confirm-modals. The RPC re-enforces authorization.
  const approveAction = approveClaim.bind(null, id);
  const returnAction = async (fd: FormData) => { 'use server'; await returnClaim(id, String(fd.get('reason'))); };
  const rejectAction = async (fd: FormData) => { 'use server'; await rejectClaim(id, String(fd.get('reason'))); };
  const payAction = async (fd: FormData) => { 'use server'; await payClaim(id, String(fd.get('ref'))); };

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
      {/* Summary card */}
      <div className="card flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b2b26] text-xl">
            {categoryEmoji(categoryName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{c.claim_no}</div>
            <div className="text-[11px] text-[#7d8595]">{categoryName ?? 'ไม่ระบุหมวด'}</div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="text-[#7d8595]">คน</div>
          <div className="text-right font-medium">
            {(c.submitter as { name: string }).name}
            {enteredByOther && (
              <div className="text-[11px] font-normal text-[#7d8595]">
                กรอกโดย {(c.enterer as { name: string }).name}
              </div>
            )}
          </div>
          <div className="text-[#7d8595]">เดือน</div>
          <div className="text-right font-medium">{c.period}</div>
          <div className="text-[#7d8595]">ยอด</div>
          <div className="text-right font-bold text-[#34d399]">฿{Number(c.amount_thb).toLocaleString()}</div>
          <div className="text-[#7d8595]">จ่ายเมื่อ</div>
          <div className="text-right font-medium">{c.paid_date}</div>
        </div>

        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            className="rounded-xl bg-[#10231b] py-2.5 text-center text-sm font-semibold text-[#34d399]"
          >
            📎 เปิดใบเสร็จ
          </a>
        )}
      </div>

      {/* Actions — visibility derives from the shared state machine; the RPC re-enforces it. */}
      <ClaimActions
        status={status}
        approveAction={approveAction}
        returnAction={returnAction}
        rejectAction={rejectAction}
        payAction={payAction}
      />
    </div>
  );
}
