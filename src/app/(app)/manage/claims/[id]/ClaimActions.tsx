'use client';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { canTransition } from '@/lib/claims/state-machine';
import type { ClaimStatus } from '@/lib/claims/status';

type FormAction = (formData: FormData) => void | Promise<void>;

// Manager actions as confirm modals. The server actions (and the field names
// `reason` / `ref`) are unchanged — the page passes them in as props; here we
// only wrap them so the modal closes after the mutation revalidates.
export function ClaimActions({
  status,
  approveAction,
  returnAction,
  rejectAction,
  payAction,
  onDone,
}: {
  status: ClaimStatus;
  approveAction: FormAction;
  returnAction: FormAction;
  rejectAction: FormAction;
  payAction: FormAction;
  onDone?: () => void; // e.g. close an outer detail modal after the action resolves
}) {
  const [open, setOpen] = useState<null | 'approve' | 'return' | 'reject' | 'pay'>(null);
  const close = () => setOpen(null);
  const done = () => { close(); onDone?.(); };

  return (
    <div className="flex flex-col gap-3">
      {canTransition(status, 'approved', 'manager') && (
        <button
          type="button"
          onClick={() => setOpen('approve')}
          className="w-full rounded-xl px-4 py-3 font-semibold"
          style={{ background: '#34d399', color: '#08130e' }}
        >
          ✓ อนุมัติ
        </button>
      )}
      {canTransition(status, 'returned', 'manager') && (
        <button
          type="button"
          onClick={() => setOpen('return')}
          className="w-full rounded-xl px-4 py-3 font-semibold text-white"
          style={{ background: '#ea580c' }}
        >
          ↩ ตีกลับให้แก้
        </button>
      )}
      {canTransition(status, 'rejected', 'manager') && (
        <button
          type="button"
          onClick={() => setOpen('reject')}
          className="w-full rounded-xl px-4 py-3 font-semibold text-white"
          style={{ background: '#dc2626' }}
        >
          ✕ ปฏิเสธ
        </button>
      )}
      {canTransition(status, 'paid', 'manager') && (
        <button type="button" onClick={() => setOpen('pay')} className="btn-primary w-full">
          💸 ทำเครื่องหมายจ่ายแล้ว
        </button>
      )}

      <Modal open={open === 'approve'} onClose={close} title="ยืนยันการอนุมัติ">
        <form action={async (fd) => { await approveAction(fd); done(); }} className="flex flex-col gap-4">
          <p className="text-sm text-[#c9ced8]">อนุมัติรายการนี้ใช่ไหม? รายการจะเข้าคิวรอจ่าย</p>
          <button className="btn-primary w-full">✓ ยืนยันอนุมัติ</button>
        </form>
      </Modal>

      <Modal open={open === 'return'} onClose={close} title="ตีกลับให้แก้">
        <form action={async (fd) => { await returnAction(fd); done(); }} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-[#9aa1ab]">เหตุผลที่ตีกลับ</label>
          <input name="reason" placeholder="เช่น ใบเสร็จเบลอ" className="field" required />
          <button className="w-full rounded-xl px-4 py-3 font-semibold text-white" style={{ background: '#ea580c' }}>
            ↩ ยืนยันตีกลับ
          </button>
        </form>
      </Modal>

      <Modal open={open === 'reject'} onClose={close} title="ปฏิเสธรายการ">
        <form action={async (fd) => { await rejectAction(fd); done(); }} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-[#9aa1ab]">เหตุผลที่ปฏิเสธ</label>
          <input name="reason" placeholder="เหตุผลปฏิเสธ" className="field" required />
          <button className="w-full rounded-xl px-4 py-3 font-semibold text-white" style={{ background: '#dc2626' }}>
            ✕ ยืนยันปฏิเสธ
          </button>
        </form>
      </Modal>

      <Modal open={open === 'pay'} onClose={close} title="ทำเครื่องหมายจ่ายแล้ว">
        <form action={async (fd) => { await payAction(fd); done(); }} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-[#9aa1ab]">เลขอ้างอิงการโอน</label>
          <input name="ref" placeholder="เลขอ้างอิงการโอน" className="field" required />
          <button className="btn-primary w-full">💸 ยืนยันจ่ายแล้ว</button>
        </form>
      </Modal>
    </div>
  );
}
