'use client';
import { useEffect, useState } from 'react';
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
}: {
  items: MyClaimItem[];
  categories: { id: string; name: string }[];
  monthTotal: number;
  pendingCount: number;
  paidCount: number;
  createAction: (formData: FormData) => void;
  resubmitAction: (claimId: string, formData: FormData) => void;
}) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [editing, setEditing] = useState<MyClaimItem | null>(null);

  const returned = items.filter((i) => i.status === 'returned');
  const normal = items.filter((i) => i.status !== 'returned');

  // Close the submit modal once a new row shows up after the server round-trip.
  useEffect(() => {
    setSubmitOpen(false);
  }, [items.length]);

  // Close the edit modal once the edited claim is no longer "returned"
  // (i.e. the resubmit succeeded and the list revalidated).
  useEffect(() => {
    if (editing && !items.some((i) => i.id === editing.id && i.status === 'returned')) {
      setEditing(null);
    }
  }, [items, editing]);

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
      {/* HERO summary */}
      <div
        className="rounded-2xl border p-4"
        style={{ background: 'linear-gradient(135deg,#10231b,#0f1a16)', borderColor: '#1f3b30' }}
      >
        <div className="text-[11px] text-[#7d8595]">รวมเดือนนี้</div>
        <div className="text-[26px] font-extrabold text-[#34d399]">{baht(monthTotal)}</div>
        <div className="mt-1 flex gap-4 text-[11px]">
          <span className="text-[#fbbf24]">● รอจ่าย {pendingCount}</span>
          <span className="text-[#34d399]">● จ่ายแล้ว {paidCount}</span>
        </div>
      </div>

      {/* ATTENTION — returned claims */}
      {returned.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#fb923c]">
            ⚠️ ต้องแก้ไข
          </div>
          {returned.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setEditing(i)}
              className="flex items-center gap-3 rounded-xl border p-3 text-left"
              style={{ background: '#1c130c', borderColor: '#3a2415' }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2e1c10] text-base">
                {categoryEmoji(i.categoryName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{i.categoryName ?? i.claimNo}</div>
                <div className="text-[11px] text-[#fb923c]">↩ {i.returnReason} · แตะเพื่อแก้</div>
              </div>
              <span className="text-[#fb923c]">›</span>
            </button>
          ))}
        </div>
      )}

      {/* NORMAL list */}
      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-10 text-center">
          <div className="text-4xl">🧾</div>
          <div className="text-sm text-[#7d8595]">ยังไม่มีรายการ — กด ➕ ส่งเบิกใหม่ เพื่อเริ่ม</div>
          <button type="button" onClick={() => setSubmitOpen(true)} className="btn-primary">
            ➕ ส่งเบิกใหม่
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold text-[#7d8595]">รายการเดือนนี้</h2>
          {normal.length === 0 ? (
            <div className="text-[12px] text-[#7d8595]">— ไม่มีรายการอื่น —</div>
          ) : (
            <div className="table-card">
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">บริการ</th>
                    <th scope="col" className="num">ยอด</th>
                    <th scope="col">วันที่</th>
                    <th scope="col">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {normal.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <span className="mr-1.5">{categoryEmoji(i.categoryName)}</span>
                        <span className="font-semibold">{i.categoryName ?? i.claimNo}</span>
                      </td>
                      <td className="num font-bold">{baht(i.amount)}</td>
                      <td className="whitespace-nowrap text-[#7d8595]">{shortThaiDate(i.paidDate)}</td>
                      <td>
                        <StatusBadge status={i.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FAB — primary "send new claim" entry */}
      <button
        type="button"
        onClick={() => setSubmitOpen(true)}
        aria-label="ส่งเบิกใหม่"
        className="fixed bottom-[76px] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-3xl font-bold"
        style={{ background: '#34d399', color: '#08130e', boxShadow: '0 6px 20px rgba(52,211,153,0.45)' }}
      >
        ＋
      </button>

      {/* SUBMIT modal */}
      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="ส่งเบิกใหม่">
        <NewClaimForm categories={categories} action={createAction} inModal />
      </Modal>

      {/* EDIT / resubmit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="แก้ไขและส่งใหม่">
        {editing && (
          <>
            <div
              className="mb-3 rounded-xl border px-3 py-2 text-[12px]"
              style={{ background: '#2e1c10', color: '#fb923c', borderColor: '#3a2415' }}
            >
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
    </div>
  );
}
