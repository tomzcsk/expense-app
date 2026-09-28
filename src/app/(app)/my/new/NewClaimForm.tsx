'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function NewClaimForm({
  categories,
  action,
  people,
}: {
  categories: { id: string; name: string }[];
  action: (formData: FormData) => void;
  people?: { id: string; name: string }[]; // present only for manager on-behalf entry
}) {
  const [receiptPath, setReceiptPath] = useState('');
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user!.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file);
    if (!error) setReceiptPath(path);
    setUploading(false);
  };

  const thisMonth = new Date().toISOString().slice(0, 7);
  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <h1 className="text-xl font-bold">ส่งเบิกค่าใช้จ่าย</h1>
      {people && (
        <label>เบิกให้ (พนักงาน)
          <select name="submitter_id" required className="w-full rounded border p-2">
            <option value="">— เลือกคน —</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      <label>เดือนที่เบิก
        <input name="period" type="month" defaultValue={thisMonth} required className="w-full rounded border p-2" />
      </label>
      <label>บริการ/หมวด
        <select name="category_id" required className="w-full rounded border p-2">
          <option value="">— เลือก —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label>ยอดที่จ่ายจริง (บาท)
        <input name="amount_thb" type="number" step="0.01" required className="w-full rounded border p-2" />
      </label>
      <label>วันที่จ่าย
        <input name="paid_date" type="date" required className="w-full rounded border p-2" />
      </label>
      <label>ใบเสร็จ
        <input type="file" accept="image/*,application/pdf"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      <input type="hidden" name="receipt_path" value={receiptPath} />
      <label>หมายเหตุ<textarea name="note" className="w-full rounded border p-2" /></label>
      <button disabled={uploading} className="rounded bg-blue-600 px-4 py-2 text-white">
        {uploading ? 'กำลังอัปโหลดใบเสร็จ...' : 'ส่งเบิก'}
      </button>
    </form>
  );
}
