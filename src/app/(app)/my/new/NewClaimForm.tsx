'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { categoryEmoji } from '@/lib/category-emoji';

export type ClaimDefaults = {
  period?: string;
  category_id?: string | null;
  amount_thb?: number | string;
  paid_date?: string | null;
  note?: string | null;
};

export function NewClaimForm({
  categories,
  action,
  people,
  defaults,
  inModal = false,
}: {
  categories: { id: string; name: string }[];
  action: (formData: FormData) => void;
  people?: { id: string; name: string }[]; // present only for manager on-behalf entry
  defaults?: ClaimDefaults; // present when editing/resubmitting — pre-fills the fields
  inModal?: boolean; // drops the page chrome (title / sticky / bottom padding) inside a modal
}) {
  const [receiptPath, setReceiptPath] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [categoryId, setCategoryId] = useState(defaults?.category_id ?? '');

  const upload = async (file: File) => {
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file);
    if (!error) {
      setReceiptPath(path);
      setReceiptName(file.name);
    }
    setUploading(false);
  };

  const thisMonth = new Date().toISOString().slice(0, 7);
  const editing = !!defaults;

  return (
    <form
      action={action}
      className={inModal ? 'flex w-full flex-col gap-4' : 'mx-auto flex w-full max-w-[520px] flex-col gap-4 pb-28'}
    >
      {!inModal && <h1 className="text-lg font-bold">ส่งเบิกค่าใช้จ่าย</h1>}

      {people && (
        <div>
          <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">เบิกให้ (พนักงาน)</div>
          <select name="submitter_id" required className="field" defaultValue="">
            <option value="" disabled>— เลือกคน —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 1. Receipt dropzone — keeps the upload-to-Storage logic + hidden receipt_path */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">1. ใบเสร็จ</div>
        <label
          className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed bg-[#f8fafc] px-4 py-6 text-center"
          style={{ borderColor: receiptPath ? '#2563eb' : '#cbd5e1' }}
        >
          <div className="text-3xl">{uploading ? '⏳' : receiptPath ? '✅' : '📷'}</div>
          <div className="text-sm font-semibold text-[#2563eb]">
            {uploading ? 'กำลังอัปโหลด...' : receiptPath ? 'อัปโหลดแล้ว · แตะเพื่อเปลี่ยน' : 'ถ่าย / แนบใบเสร็จ'}
          </div>
          <div className="text-[11px] text-[#6b7280]">
            {receiptName || (editing ? 'ใบเสร็จเดิม — แนบใหม่ถ้าต้องการเปลี่ยน' : 'รองรับรูป หรือ PDF')}
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
        <input type="hidden" name="receipt_path" value={receiptPath} />
      </div>

      {/* 2. Category chips — a styled radio group that submits `category_id` */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">2. บริการอะไร</div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const selected = categoryId === c.id;
            return (
              <label
                key={c.id}
                className="pill cursor-pointer select-none px-3.5 py-2 text-xs"
                style={
                  selected
                    ? { background: '#2563eb', color: '#fff' }
                    : { background: '#fff', color: '#374151', border: '1px solid #e7eaef' }
                }
              >
                <input
                  type="radio"
                  name="category_id"
                  value={c.id}
                  required
                  checked={selected}
                  onChange={() => setCategoryId(c.id)}
                  className="sr-only"
                />
                <span>{categoryEmoji(c.name)} {c.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 3. Amount */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">3. ยอดที่จ่าย</div>
        <div
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-3"
          style={{ border: '1.5px solid #2563eb' }}
        >
          <span className="text-2xl font-bold text-[#2563eb]">฿</span>
          <input
            name="amount_thb"
            type="number"
            step="0.01"
            required
            defaultValue={defaults?.amount_thb}
            placeholder="0.00"
            className="w-full bg-transparent text-2xl font-bold text-[#111827] outline-none placeholder:text-[#94a3b8]"
          />
        </div>
      </div>

      {/* Month + paid date */}
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">เดือน</div>
          <input name="period" type="month" defaultValue={defaults?.period ?? thisMonth} required className="field" />
        </div>
        <div className="flex-1">
          <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">วันที่จ่าย</div>
          <input name="paid_date" type="date" defaultValue={defaults?.paid_date ?? undefined} required className="field" />
        </div>
      </div>

      {/* Optional note */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">หมายเหตุ (ถ้ามี)</div>
        <textarea name="note" rows={2} defaultValue={defaults?.note ?? undefined} className="field" />
      </div>

      {/* Submit — sticky above the bottom nav on the full page, plain inside a modal */}
      <div className={inModal ? 'mt-1' : 'mt-2'}>
        <button disabled={uploading} className="btn-primary w-full">
          {uploading ? 'กำลังอัปโหลดใบเสร็จ...' : editing ? 'บันทึกและส่งใหม่ →' : 'ส่งเบิก →'}
        </button>
        <div className="mt-2 text-center text-[11px] text-[#6b7280]">
          VAT/ก่อน VAT บัญชีจะตรวจให้ ไม่ต้องคิดเอง
        </div>
      </div>
    </form>
  );
}
