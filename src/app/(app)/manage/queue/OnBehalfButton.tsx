'use client';
import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { NewClaimForm } from '../../my/new/NewClaimForm';

// Opens the on-behalf claim form (people picker + createClaimOnBehalf) in a modal.
// The server action redirects to /manage/report on success, which unmounts the modal.
export function OnBehalfButton({
  categories,
  people,
  action,
}: {
  categories: { id: string; name: string }[];
  people: { id: string; name: string }[];
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary px-3 text-sm">
        ✍️ กรอกแทน
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="กรอกเบิกแทนพนักงาน">
        <div className="mb-3 rounded-xl border border-[#1f3b30] bg-[#10231b] px-3 py-2 text-[12px] text-[#34d399]">
          ระบบบันทึกว่าคุณเป็นผู้กรอก
        </div>
        <NewClaimForm categories={categories} people={people} action={action} inModal />
      </Modal>
    </>
  );
}
