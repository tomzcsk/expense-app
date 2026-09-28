'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { ClaimActions } from '../claims/[id]/ClaimActions';
import { categoryEmoji } from '@/lib/category-emoji';
import { approveClaim, returnClaim, rejectClaim, payClaim } from '../actions';
import type { ClaimStatus } from '@/lib/claims/status';

export type QueueItem = {
  id: string;
  claimNo: string;
  period: string;
  amount: number;
  status: ClaimStatus;
  paidDate: string | null;
  submitterName: string;
  enteredByOther: boolean;
  entererName: string | null;
  categoryName: string | null;
  hasReceipt: boolean;
};

const baht = (n: number) => `฿${Number(n).toLocaleString()}`;

type Receipt = { url: string | null; isPdf: boolean; loading: boolean };

export function QueueList({ items }: { items: QueueItem[] }) {
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [receipt, setReceipt] = useState<Receipt>({ url: null, isPdf: false, loading: false });

  // Fetch a fresh signed receipt URL (server-side) whenever a claim opens.
  useEffect(() => {
    if (!selected || !selected.hasReceipt) {
      setReceipt({ url: null, isPdf: false, loading: false });
      return;
    }
    let active = true;
    setReceipt({ url: null, isPdf: false, loading: true });
    fetch(`/manage/claims/${selected.id}/receipt`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setReceipt({ url: d.url ?? null, isPdf: !!d.isPdf, loading: false });
      })
      .catch(() => {
        if (active) setReceipt({ url: null, isPdf: false, loading: false });
      });
    return () => {
      active = false;
    };
  }, [selected]);

  // Tapping a row opens the modal (with JS); the real <Link> in the เลขที่ cell
  // is the fallback for no-JS / new-tab / direct links. On a plain click the row
  // handler cancels that navigation and opens the modal instead.
  const openRow = (item: QueueItem) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setSelected(item);
  };

  return (
    <>
      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center">
          <div className="text-4xl">🎉</div>
          <div className="text-sm text-[#7d8595]">ไม่มีรายการรออนุมัติ — เคลียร์หมดแล้ว</div>
        </div>
      ) : (
        <div className="table-card">
          <div className="tbl-scroll">
            <table className="tbl tbl-tap tbl-sticky">
              <thead>
                <tr>
                  <th scope="col">เลขที่</th>
                  <th scope="col">คน</th>
                  <th scope="col">บริการ</th>
                  <th scope="col" className="num">ยอด</th>
                  <th scope="col">วันที่จ่าย</th>
                  <th scope="col">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} onClick={openRow(c)}>
                    <td className="whitespace-nowrap">
                      <Link href={`/manage/claims/${c.id}`} className="font-medium text-[#f3f5f8]">
                        {c.claimNo}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap font-medium">{c.submitterName}</td>
                    <td className="whitespace-nowrap">
                      <span className="mr-1.5">{categoryEmoji(c.categoryName)}</span>
                      {c.categoryName ?? '-'}
                    </td>
                    <td className="num font-bold">{baht(c.amount)}</td>
                    <td className="whitespace-nowrap text-[#7d8595]">{c.paidDate ?? '-'}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.claimNo}>
        {selected && (
          <DetailBody item={selected} receipt={receipt} onDone={() => setSelected(null)} />
        )}
      </Modal>
    </>
  );
}

function DetailBody({
  item,
  receipt,
  onDone,
}: {
  item: QueueItem;
  receipt: Receipt;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b2b26] text-xl">
          {categoryEmoji(item.categoryName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{item.submitterName}</div>
          <div className="text-[11px] text-[#7d8595]">{item.categoryName ?? 'ไม่ระบุหมวด'}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        {item.enteredByOther && (
          <>
            <div className="text-[#7d8595]">กรอกโดย</div>
            <div className="text-right font-medium">{item.entererName ?? '-'}</div>
          </>
        )}
        <div className="text-[#7d8595]">เดือน</div>
        <div className="text-right font-medium">{item.period}</div>
        <div className="text-[#7d8595]">ยอด</div>
        <div className="text-right font-bold text-[#34d399]">฿{Number(item.amount).toLocaleString()}</div>
        <div className="text-[#7d8595]">จ่ายเมื่อ</div>
        <div className="text-right font-medium">{item.paidDate ?? '-'}</div>
      </div>

      {/* Receipt — inline */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#9aa1ab]">ใบเสร็จ</div>
        {!item.hasReceipt ? (
          <div className="rounded-xl border border-[#242833] bg-[#171a21] py-6 text-center text-[12px] text-[#7d8595]">
            ไม่มีใบเสร็จแนบ
          </div>
        ) : receipt.loading ? (
          <div className="rounded-xl border border-[#242833] bg-[#171a21] py-6 text-center text-[12px] text-[#7d8595]">
            กำลังโหลดใบเสร็จ...
          </div>
        ) : receipt.url && receipt.isPdf ? (
          <a
            href={receipt.url}
            target="_blank"
            className="block rounded-xl bg-[#10231b] py-2.5 text-center text-sm font-semibold text-[#34d399]"
          >
            📎 เปิดใบเสร็จ (PDF)
          </a>
        ) : receipt.url ? (
          <a href={receipt.url} target="_blank" className="block">
            <img
              src={receipt.url}
              alt="ใบเสร็จ"
              className="max-h-72 w-full rounded-xl border border-[#242833] object-contain"
            />
            <div className="mt-1 text-center text-[11px] text-[#7d8595]">แตะเพื่อดูเต็มขนาด</div>
          </a>
        ) : (
          <div className="rounded-xl border border-[#242833] bg-[#171a21] py-6 text-center text-[12px] text-[#7d8595]">
            เปิดใบเสร็จไม่สำเร็จ
          </div>
        )}
      </div>

      {/* Actions — same server actions + field names, gated by canTransition */}
      <ClaimActions
        status={item.status}
        approveAction={async () => { await approveClaim(item.id); }}
        returnAction={async (fd) => { await returnClaim(item.id, String(fd.get('reason'))); }}
        rejectAction={async (fd) => { await rejectClaim(item.id, String(fd.get('reason'))); }}
        payAction={async (fd) => { await payClaim(item.id, String(fd.get('ref'))); }}
        onDone={onDone}
      />
    </div>
  );
}
