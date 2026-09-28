import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { StatusBadge } from '@/components/StatusBadge';
import { approveClaim, returnClaim, rejectClaim, payClaim } from '../../actions';
import type { ClaimStatus } from '@/lib/claims/status';
import { canTransition } from '@/lib/claims/state-machine';

export default async function ClaimDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireManager();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from('expense_claims')
    .select('*, submitter:submitter_id(name), enterer:created_by(name), category:category_id(name)')
    .eq('id', id).single();
  if (!c) return <p>ไม่พบรายการ</p>;
  const enteredByOther = c.created_by !== c.submitter_id;

  let receiptUrl: string | null = null;
  if (c.receipt_path) {
    const { data } = await supabase.storage.from('receipts').createSignedUrl(c.receipt_path, 300);
    receiptUrl = data?.signedUrl ?? null;
  }
  const status = c.status as ClaimStatus;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">{c.claim_no}</h1><StatusBadge status={status} />
      </div>
      <div className="text-sm">
        <div>คน: {(c.submitter as { name: string }).name}
          {enteredByOther && <span className="text-gray-500"> · กรอกโดย {(c.enterer as { name: string }).name}</span>}
        </div>
        <div>เดือน: {c.period} · หมวด: {(c.category as { name: string } | null)?.name ?? '-'}</div>
        <div>ยอด: ฿{Number(c.amount_thb).toLocaleString()} · จ่ายเมื่อ {c.paid_date}</div>
      </div>
      {receiptUrl && <a href={receiptUrl} target="_blank" className="text-blue-600 underline">เปิดใบเสร็จ</a>}

      {/* Button visibility derives from the shared state machine; the RPC re-enforces it. */}
      <div className="flex flex-wrap gap-2">
        {canTransition(status, 'approved', 'manager') && (
          <form action={approveClaim.bind(null, id)}><button className="rounded bg-green-600 px-4 py-2 text-white">อนุมัติ</button></form>
        )}
        {canTransition(status, 'returned', 'manager') && (
          <form action={async (fd: FormData) => { 'use server'; await returnClaim(id, String(fd.get('reason'))); }} className="flex gap-2">
            <input name="reason" placeholder="เหตุผลตีกลับ" className="rounded border p-2" required />
            <button className="rounded bg-orange-500 px-4 py-2 text-white">ตีกลับ</button>
          </form>
        )}
        {canTransition(status, 'rejected', 'manager') && (
          <form action={async (fd: FormData) => { 'use server'; await rejectClaim(id, String(fd.get('reason'))); }} className="flex gap-2">
            <input name="reason" placeholder="เหตุผลปฏิเสธ" className="rounded border p-2" required />
            <button className="rounded bg-red-600 px-4 py-2 text-white">ปฏิเสธ</button>
          </form>
        )}
        {canTransition(status, 'paid', 'manager') && (
          <form action={async (fd: FormData) => { 'use server'; await payClaim(id, String(fd.get('ref'))); }} className="flex gap-2">
            <input name="ref" placeholder="เลขอ้างอิงการโอน" className="rounded border p-2" required />
            <button className="rounded bg-blue-600 px-4 py-2 text-white">ทำเครื่องหมายจ่ายแล้ว</button>
          </form>
        )}
      </div>
    </div>
  );
}
