'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { ClaimActions } from '../claims/[id]/ClaimActions';
import { categoryEmoji } from '@/lib/category-emoji';
import { canTransition } from '@/lib/claims/state-machine';
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

export function QueueList({ items, emptyText = 'ไม่มีรายการรอจ่าย — เคลียร์หมดแล้ว' }: { items: QueueItem[]; emptyText?: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<QueueItem | null>(null);
  const [paying, setPaying] = useState<QueueItem | null>(null);
  const [receipt, setReceipt] = useState<Receipt>({ url: null, isPdf: false, loading: false });

  useEffect(() => {
    if (!detail || !detail.hasReceipt) {
      setReceipt({ url: null, isPdf: false, loading: false });
      return;
    }
    let active = true;
    setReceipt({ url: null, isPdf: false, loading: true });
    fetch(`/manage/claims/${detail.id}/receipt`)
      .then((r) => r.json())
      .then((d) => { if (active) setReceipt({ url: d.url ?? null, isPdf: !!d.isPdf, loading: false }); })
      .catch(() => { if (active) setReceipt({ url: null, isPdf: false, loading: false }); });
    return () => { active = false; };
  }, [detail]);

  if (items.length === 0) {
    return (
      <div className="card py-10 text-center text-sm text-[#6b7280]">🎉 {emptyText}</div>
    );
  }

  return (
    <>
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
                <th scope="col" style={{ textAlign: 'right' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} onClick={() => setDetail(c)}>
                  <td className="whitespace-nowrap font-semibold">
                    <Link href={`/manage/claims/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-[#111827] hover:text-[#2563eb]">
                      {c.claimNo}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{c.submitterName}</td>
                  <td className="whitespace-nowrap">
                    <span className="mr-1.5">{categoryEmoji(c.categoryName)}</span>
                    {c.categoryName ?? '-'}
                  </td>
                  <td className="num font-semibold">{baht(c.amount)}</td>
                  <td className="whitespace-nowrap text-[#64748b]">{c.paidDate ?? '-'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="whitespace-nowrap" style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      {canTransition(c.status, 'paid', 'manager') && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPaying(c); }}
                          className="rounded-md bg-[#2563eb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d4ed8]"
                        >
                          จ่าย
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetail(c); }}
                        className="text-xs font-semibold text-[#2563eb]"
                      >
                        ดู
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick pay dialog */}
      <Modal open={!!paying} onClose={() => setPaying(null)} title="ทำเครื่องหมายจ่ายแล้ว">
        {paying && (
          <form
            action={async (fd) => {
              await payClaim(paying.id, String(fd.get('ref')));
              setPaying(null);
              router.refresh();
            }}
            className="flex flex-col gap-3"
          >
            <div className="text-sm text-[#374151]">
              {paying.claimNo} · {paying.submitterName} · <span className="font-semibold">{baht(paying.amount)}</span>
            </div>
            <label className="text-xs font-semibold text-[#6b7280]">เลขอ้างอิงการโอน</label>
            <input name="ref" placeholder="เลขอ้างอิงการโอน" className="field" required />
            <button className="btn-primary w-full">💸 ยืนยันจ่ายแล้ว</button>
          </form>
        )}
      </Modal>

      {/* Detail drawer */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.claimNo} variant="drawer">
        {detail && (
          <DetailBody
            item={detail}
            receipt={receipt}
            onDone={() => { setDetail(null); router.refresh(); }}
          />
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
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#eff6ff] text-xl">
          {categoryEmoji(item.categoryName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#111827]">{item.submitterName}</div>
          <div className="text-[11px] text-[#6b7280]">{item.categoryName ?? 'ไม่ระบุหมวด'}</div>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm">
        {item.enteredByOther && (
          <>
            <div className="text-[#6b7280]">กรอกโดย</div>
            <div className="text-right font-medium">{item.entererName ?? '-'}</div>
          </>
        )}
        <div className="text-[#6b7280]">เดือน</div>
        <div className="text-right font-medium">{item.period}</div>
        <div className="text-[#6b7280]">ยอด</div>
        <div className="text-right font-bold text-[#2563eb]">฿{Number(item.amount).toLocaleString()}</div>
        <div className="text-[#6b7280]">จ่ายเมื่อ</div>
        <div className="text-right font-medium">{item.paidDate ?? '-'}</div>
      </div>

      {/* Receipt */}
      <div>
        <div className="mb-1.5 text-xs font-semibold text-[#6b7280]">ใบเสร็จ</div>
        {!item.hasReceipt ? (
          <div className="rounded-lg border border-[#e7eaef] bg-[#f8fafc] py-6 text-center text-[12px] text-[#6b7280]">
            ไม่มีใบเสร็จแนบ
          </div>
        ) : receipt.loading ? (
          <div className="rounded-lg border border-[#e7eaef] bg-[#f8fafc] py-6 text-center text-[12px] text-[#6b7280]">
            กำลังโหลดใบเสร็จ...
          </div>
        ) : receipt.url && receipt.isPdf ? (
          <a href={receipt.url} target="_blank" className="block rounded-lg bg-[#eff6ff] py-2.5 text-center text-sm font-semibold text-[#2563eb]">
            📎 เปิดใบเสร็จ (PDF)
          </a>
        ) : receipt.url ? (
          <a href={receipt.url} target="_blank" className="block">
            <img src={receipt.url} alt="ใบเสร็จ" className="max-h-80 w-full rounded-lg border border-[#e7eaef] object-contain" />
            <div className="mt-1 text-center text-[11px] text-[#6b7280]">แตะเพื่อดูเต็มขนาด</div>
          </a>
        ) : (
          <div className="rounded-lg border border-[#e7eaef] bg-[#f8fafc] py-6 text-center text-[12px] text-[#6b7280]">
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
