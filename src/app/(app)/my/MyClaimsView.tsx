'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { NewClaimForm } from './new/NewClaimForm';
import { categoryEmoji } from '@/lib/category-emoji';
import type { ClaimStatus } from '@/lib/claims/status';

export type MyClaimItem = {
  id: string;
  claimNo: string;
  period: string;
  amount: number;
  status: ClaimStatus;
  returnReason: string | null;
  paidDate: string | null;
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;

function shortThaiDate(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

export function MyClaimsView({
  items,
  categories,
  monthTotal,
  pendingCount,
  paidCount,
  createAction,
  resubmitAction,
  deleteAction,
}: {
  items: MyClaimItem[];
  categories: { id: string; name: string }[];
  monthTotal: number;
  pendingCount: number;
  paidCount: number;
  createAction: (formData: FormData) => void;
  resubmitAction: (claimId: string, formData: FormData) => void;
  deleteAction: (claimId: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [editing, setEditing] = useState<MyClaimItem | null>(null);
  const [deleting, setDeleting] = useState<MyClaimItem | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  // A claim can be removed by its owner until it is paid.
  const canDelete = (s: ClaimStatus) => s === 'submitted' || s === 'returned' || s === 'rejected';

  const confirmDelete = async () => {
    if (!deleting) return;
    setDelBusy(true);
    setDelError(null);
    const res = await deleteAction(deleting.id);
    setDelBusy(false);
    if (res?.error) {
      setDelError(res.error);
      return;
    }
    setDeleting(null);
    router.refresh();
  };

  // Close the submit dialog once a new row shows up after the server round-trip.
  useEffect(() => {
    setSubmitOpen(false);
  }, [items.length]);

  // Close the edit dialog once the edited claim is no longer "returned".
  useEffect(() => {
    if (editing && !items.some((i) => i.id === editing.id && i.status === 'returned')) {
      setEditing(null);
    }
  }, [items, editing]);

  return (
    <div className="flex flex-col gap-5">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs text-[#6b7280]">เดือนนี้</div>
          <div className="mt-1 text-xl font-bold text-[#111827]">{baht(monthTotal)}</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#6b7280]">รอจ่าย</div>
          <div className="mt-1 text-xl font-bold text-[#b45309]">{pendingCount}</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#6b7280]">จ่ายแล้ว</div>
          <div className="mt-1 text-xl font-bold text-[#16a34a]">{paidCount}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#111827]">รายการของฉัน</h2>
        <button type="button" onClick={() => setSubmitOpen(true)} className="btn-primary text-sm">
          ＋ ส่งเบิกใหม่
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-[#6b7280]">
          ยังไม่มีรายการ — กด ＋ ส่งเบิกใหม่ เพื่อเริ่ม
        </div>
      ) : (
        <div className="table-card">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">บริการ</th>
                <th scope="col" className="num">ยอด</th>
                <th scope="col">วันที่</th>
                <th scope="col">สถานะ</th>
                <th scope="col" style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className="mr-1.5">{categoryEmoji(i.categoryName)}</span>
                    <span className="font-semibold">{i.categoryName ?? i.claimNo}</span>
                    {i.status === 'returned' && i.returnReason && (
                      <div className="text-[11px] text-[#ea580c]">↩ {i.returnReason}</div>
                    )}
                  </td>
                  <td className="num font-semibold">{baht(i.amount)}</td>
                  <td className="whitespace-nowrap text-[#6b7280]">{shortThaiDate(i.paidDate)}</td>
                  <td>
                    <StatusBadge status={i.status} />
                  </td>
                  <td className="whitespace-nowrap" style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-3">
                      {i.status === 'returned' && (
                        <button
                          type="button"
                          onClick={() => setEditing(i)}
                          className="text-xs font-semibold text-[#2563eb]"
                        >
                          แก้ไข
                        </button>
                      )}
                      {canDelete(i.status) && (
                        <button
                          type="button"
                          onClick={() => { setDelError(null); setDeleting(i); }}
                          className="text-xs font-semibold text-[#dc2626]"
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit dialog */}
      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="ส่งเบิกใหม่">
        <NewClaimForm categories={categories} action={createAction} inModal />
      </Modal>

      {/* Edit / resubmit dialog */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="แก้ไขและส่งใหม่">
        {editing && (
          <>
            <div className="mb-3 rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-3 py-2 text-[12px] text-[#ea580c]">
              ↩ ตีกลับให้แก้: {editing.returnReason}
            </div>
            <NewClaimForm
              categories={categories}
              action={resubmitAction.bind(null, editing.id)}
              inModal
              defaults={{
                period: editing.period,
                category_id: editing.categoryId,
                amount_thb: editing.amount,
                paid_date: editing.paidDate,
                note: editing.note,
              }}
            />
          </>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => { if (!delBusy) setDeleting(null); }} title="ลบรายการเบิก">
        {deleting && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#374151]">
              ลบรายการ <b className="text-[#111827]">{deleting.categoryName ?? deleting.claimNo}</b> · {baht(deleting.amount)} ใช่ไหม? ลบแล้วกู้คืนไม่ได้
            </p>
            {delError && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">{delError}</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleting(null)} disabled={delBusy} className="btn-ghost flex-1 text-sm">
                ยกเลิก
              </button>
              <button type="button" onClick={confirmDelete} disabled={delBusy} className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#dc2626' }}>
                {delBusy ? 'กำลังลบ...' : 'ลบรายการ'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
