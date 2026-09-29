'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { categoryEmoji } from '@/lib/category-emoji';
import type { MissingRow } from '@/lib/subscriptions/missing';
import { addSubscription, updateSubscription, setSubscriptionActive, deleteSubscription, sendRemindersNow } from './actions';

export type SubRow = {
  id: string;
  personId: string;
  personName: string;
  categoryId: string | null;
  categoryName: string | null;
  expectedAmount: number | null;
  active: boolean;
  note: string | null;
};

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const BLUE = '#2563eb';
const baht = (n: number | null) => (n == null ? '—' : `฿${Number(n).toLocaleString()}`);
function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y}`;
}

type Dialog = { mode: 'add' } | { mode: 'edit'; sub: SubRow } | null;

export function MissingView({
  period,
  prevPeriod,
  nextPeriod,
  canGoNext,
  latestPeriod,
  missingRows,
  missingCount,
  missingPeople,
  hasActiveSubs,
  subs,
  people,
  categories,
}: {
  period: string;
  prevPeriod: string;
  nextPeriod: string;
  canGoNext: boolean;
  latestPeriod: string;
  missingRows: MissingRow[];
  missingCount: number;
  missingPeople: number;
  hasActiveSubs: boolean;
  subs: SubRow[];
  people: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'missing' | 'subs'>('missing');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Tab B state
  const [dialog, setDialog] = useState<Dialog>(null);
  const [personId, setPersonId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [deleting, setDeleting] = useState<SubRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState<string | null>(null);

  const fireReminders = async () => {
    setReminding(true);
    setRemindMsg(null);
    const r = await sendRemindersNow();
    setReminding(false);
    setRemindMsg(
      r.error ??
        `ส่งเตือน ${r.sent} คน · ข้าม ${r.skippedNoTelegram} คน (ยังไม่เชื่อม Telegram)` +
          (r.skippedAlreadySent ? ` · เตือนไปแล้ววันนี้ ${r.skippedAlreadySent} คน` : ''),
    );
  };

  const visibleSubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) => s.personName.toLowerCase().includes(q) || (s.categoryName ?? '').toLowerCase().includes(q),
    );
  }, [subs, query]);

  const openAdd = () => {
    setError(null);
    setPersonId('');
    setCategoryId('');
    setAmount('');
    setNote('');
    setDialog({ mode: 'add' });
  };
  const openEdit = (s: SubRow) => {
    setError(null);
    setPersonId(s.personId);
    setCategoryId(s.categoryId ?? '');
    setAmount(s.expectedAmount != null ? String(s.expectedAmount) : '');
    setNote(s.note ?? '');
    setDialog({ mode: 'edit', sub: s });
  };

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  };

  const submitDialog = async () => {
    if (!dialog) return;
    const amt = amount.trim() === '' ? null : Number(amount);
    const ok = await run(() =>
      dialog.mode === 'add'
        ? addSubscription(personId, categoryId, amt, note)
        : updateSubscription(dialog.sub.id, categoryId, amt, note),
    );
    if (ok) setDialog(null);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await run(() => deleteSubscription(deleting.id));
    if (ok) setDeleting(null);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Tabs */}
      <div role="tablist" aria-label="กันตกเบิก" className="flex gap-6 border-b border-[#e7eaef]">
        {([
          { key: 'missing', label: 'ตกเบิกเดือนนี้' },
          { key: 'subs', label: `Subscription ประจำ (${subs.length})` },
        ] as const).map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className="relative -mb-px border-b-2 px-1 py-2.5 text-sm font-semibold transition"
              style={on ? { borderColor: BLUE, color: BLUE } : { borderColor: 'transparent', color: '#6b7280' }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab A — ตกเบิกเดือนนี้ */}
      {tab === 'missing' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1">
            <Link
              href={`/manage/missing?period=${prevPeriod}`}
              aria-label="เดือนก่อนหน้า"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]"
            >
              ‹
            </Link>
            <button type="button" onClick={() => setPickerOpen(true)} className="min-w-[150px] rounded-lg px-3 py-1.5 text-center text-base font-bold text-[#111827]">
              {monthLabel(period)} ▾
            </button>
            {canGoNext ? (
              <Link
                href={`/manage/missing?period=${nextPeriod}`}
                aria-label="เดือนถัดไป"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#111827]"
              >
                ›
              </Link>
            ) : (
              <span aria-disabled className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-[#e7eaef] bg-white text-lg text-[#cbd5e1]">
                ›
              </span>
            )}
          </div>

          {!hasActiveSubs ? (
            <div className="card flex flex-col items-center gap-2 py-10 text-center">
              <div className="text-3xl">🔔</div>
              <div className="text-sm text-[#6b7280]">ยังไม่ได้ตั้ง subscription ประจำ — ไปแท็บถัดไปเพื่อเพิ่ม</div>
              <button type="button" onClick={() => setTab('subs')} className="btn-primary text-sm">
                ＋ ตั้ง subscription ประจำ
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold" style={{ color: missingCount > 0 ? '#dc2626' : '#16a34a' }}>
                  {missingCount > 0
                    ? `⚠️ ตกเบิก ${missingCount} รายการ · ${missingPeople} คน`
                    : '✅ ส่งครบทุกรายการแล้ว'}
                </div>
                <button type="button" onClick={fireReminders} disabled={reminding} className="btn-ghost text-sm">
                  {reminding ? 'กำลังส่ง...' : '🔔 ยิงเตือน Telegram'}
                </button>
              </div>
              {remindMsg && <div className="text-[12px] text-[#6b7280]">{remindMsg}</div>}
              <div className="table-card">
                <div className="tbl-scroll">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th scope="col">คน</th>
                        <th scope="col">บริการ</th>
                        <th scope="col" className="num">ยอดคาดหมาย</th>
                        <th scope="col">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingRows.map((r) => (
                        <tr key={r.id} style={r.submitted ? undefined : { background: '#fff7ed' }}>
                          <td className="whitespace-nowrap font-medium text-[#111827]">{r.personName}</td>
                          <td className="whitespace-nowrap">
                            <span className="mr-1.5">{categoryEmoji(r.categoryName)}</span>
                            {r.categoryName ?? '-'}
                          </td>
                          <td className="num">{baht(r.expectedAmount)}</td>
                          <td className="whitespace-nowrap">
                            {r.submitted ? (
                              <span className="font-semibold text-[#16a34a]">✅ ส่งแล้ว</span>
                            ) : (
                              <span className="font-semibold text-[#ea580c]">⚠️ ยังไม่ส่ง</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab B — Subscription ประจำ */}
      {tab === 'subs' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            {subs.length > 8 ? (
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นชื่อ / บริการ..." className="field max-w-[260px]" />
            ) : (
              <span className="text-sm text-[#6b7280]">ทั้งหมด {subs.length} รายการ</span>
            )}
            <button type="button" onClick={openAdd} className="btn-primary text-sm">
              ＋ เพิ่ม subscription ประจำ
            </button>
          </div>

          {error && !dialog && !deleting && (
            <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">{error}</div>
          )}

          {subs.length === 0 ? (
            <div className="card py-10 text-center text-sm text-[#6b7280]">ยังไม่มี subscription ประจำ — กด ＋ เพื่อเพิ่ม</div>
          ) : (
            <div className="table-card">
              <div className="tbl-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">คน</th>
                      <th scope="col">บริการ</th>
                      <th scope="col" className="num">ยอดคาดหมาย</th>
                      <th scope="col">สถานะ</th>
                      <th scope="col" style={{ textAlign: 'right' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSubs.map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap font-medium text-[#111827]">{s.personName}</td>
                        <td className="whitespace-nowrap">
                          <span className="mr-1.5">{categoryEmoji(s.categoryName)}</span>
                          {s.categoryName ?? '-'}
                        </td>
                        <td className="num">{baht(s.expectedAmount)}</td>
                        <td className="whitespace-nowrap">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => setSubscriptionActive(s.id, !s.active))}
                            className="rounded-md border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                            style={
                              s.active
                                ? { borderColor: '#bbf7d0', background: '#f0fdf4', color: '#16a34a' }
                                : { borderColor: '#e7eaef', background: '#f8fafc', color: '#6b7280' }
                            }
                          >
                            {s.active ? 'ใช้งาน' : 'ปิด'}
                          </button>
                        </td>
                        <td className="whitespace-nowrap" style={{ textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={() => openEdit(s)} className="text-xs font-semibold text-[#2563eb]">
                              แก้
                            </button>
                            <button type="button" onClick={() => { setError(null); setDeleting(s); }} className="text-xs font-semibold text-[#dc2626]">
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Month picker */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="เลือกเดือน">
        <input
          type="month"
          defaultValue={period}
          max={latestPeriod}
          className="field"
          onChange={(e) => {
            if (e.target.value) {
              setPickerOpen(false);
              router.push(`/manage/missing?period=${e.target.value}`);
            }
          }}
        />
      </Modal>

      {/* Add / edit dialog */}
      <Modal open={!!dialog} onClose={() => { if (!busy) setDialog(null); }} title={dialog?.mode === 'edit' ? 'แก้ไข subscription' : 'เพิ่ม subscription ประจำ'}>
        {dialog && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-[#6b7280]">พนักงาน</div>
              {dialog.mode === 'edit' ? (
                <div className="rounded-lg border border-[#e7eaef] bg-[#f8fafc] px-3 py-2 text-sm text-[#111827]">{dialog.sub.personName}</div>
              ) : (
                <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="field" required>
                  <option value="" disabled>— เลือกคน —</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-[#6b7280]">บริการ / หมวด</div>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field" required>
                <option value="" disabled>— เลือกบริการ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-[#6b7280]">ยอดคาดหมาย (บาท, ถ้ามี)</div>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" min="0" placeholder="เช่น 1000" className="field" />
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold text-[#6b7280]">หมายเหตุ (ถ้ามี)</div>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="field" />
            </div>
            {error && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">{error}</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDialog(null)} disabled={busy} className="btn-ghost flex-1 text-sm">
                ยกเลิก
              </button>
              <button type="button" onClick={submitDialog} disabled={busy || !categoryId || (dialog.mode === 'add' && !personId)} className="btn-primary flex-1 text-sm">
                {busy ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleting} onClose={() => { if (!busy) setDeleting(null); }} title="ลบ subscription">
        {deleting && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#374151]">
              ลบ subscription ประจำของ <b className="text-[#111827]">{deleting.personName}</b> · {deleting.categoryName ?? '-'} ใช่ไหม?
            </p>
            {error && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">{error}</div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setDeleting(null)} disabled={busy} className="btn-ghost flex-1 text-sm">
                ยกเลิก
              </button>
              <button type="button" onClick={confirmDelete} disabled={busy} className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#dc2626' }}>
                {busy ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
