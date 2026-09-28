'use client';
import { useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { setRole, setActive } from './actions';

type Role = 'submitter' | 'manager';
export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

type Pending =
  | { kind: 'role'; member: Member; nextRole: Role }
  | { kind: 'deactivate'; member: Member };

const roleLabel = (r: Role) => (r === 'manager' ? 'คนจัดการ' : 'คนเบิก');

export function MembersView({ members, meId }: { members: Member[]; meId: string }) {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }, [members, query]);

  const run = async (fn: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return false;
    }
    return true;
  };

  const requestRole = (member: Member, nextRole: Role) => {
    setError(null);
    setPending({ kind: 'role', member, nextRole });
  };
  const toggleActive = async (member: Member) => {
    if (member.active) {
      setError(null);
      setPending({ kind: 'deactivate', member }); // confirm destructive
    } else {
      await run(() => setActive(member.id, true)); // activate is safe → direct
    }
  };
  const confirmPending = async () => {
    if (!pending) return;
    const ok =
      pending.kind === 'role'
        ? await run(() => setRole(pending.member.id, pending.nextRole))
        : await run(() => setActive(pending.member.id, false));
    if (ok) setPending(null);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="text-[13px] text-[#6b7280]">ทั้งหมด {members.length} คน</div>

      {error && !pending && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">
          {error}
        </div>
      )}

      {members.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นชื่อ / อีเมล..."
          className="field max-w-[320px]"
        />
      )}

      <div className="table-card">
        <div className="tbl-scroll">
          <table className="tbl tbl-sticky">
            <thead>
              <tr>
                <th scope="col">ชื่อ</th>
                <th scope="col">อีเมล</th>
                <th scope="col">role</th>
                <th scope="col">สถานะ</th>
                <th scope="col">Telegram</th>
                <th scope="col">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => {
                const isSelf = m.id === meId;
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#111827]">{m.name}</span>
                        {isSelf && (
                          <span className="pill" style={{ background: '#eff6ff', color: '#2563eb' }}>
                            คุณ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[#6b7280]">{m.email}</td>
                    <td className="whitespace-nowrap">
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                        style={
                          m.role === 'manager'
                            ? { borderColor: '#bfdbfe', background: '#dbeafe', color: '#2563eb' }
                            : { borderColor: '#e7eaef', color: '#6b7280' }
                        }
                      >
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[11px]" style={{ color: m.active ? '#16a34a' : '#94a3b8' }}>
                      {m.active ? '● ใช้งาน' : '○ ปิดใช้งาน'}
                    </td>
                    {/* Telegram link status — placeholder (no column in schema yet, Phase 2) */}
                    <td className="whitespace-nowrap text-[11px] text-[#94a3b8]">📱 ยังไม่เชื่อม</td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex overflow-hidden rounded-lg border border-[#e7eaef] text-[11px]">
                          {(['submitter', 'manager'] as Role[]).map((r) => {
                            const current = m.role === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                disabled={isSelf || busy || current}
                                onClick={() => requestRole(m, r)}
                                className="px-2.5 py-1.5 disabled:cursor-not-allowed"
                                style={
                                  current
                                    ? { background: '#2563eb', color: '#fff', fontWeight: 600 }
                                    : { color: isSelf ? '#cbd5e1' : '#6b7280' }
                                }
                              >
                                {roleLabel(r)}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          disabled={isSelf || busy}
                          onClick={() => toggleActive(m)}
                          className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                          style={
                            m.active
                              ? { borderColor: '#fecaca', background: '#fef2f2', color: '#dc2626' }
                              : { borderColor: '#bbf7d0', background: '#f0fdf4', color: '#16a34a' }
                          }
                        >
                          {m.active ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm (role change / deactivate) */}
      <Modal
        open={!!pending}
        onClose={() => { if (!busy) { setPending(null); setError(null); } }}
        title={pending?.kind === 'role' ? 'เปลี่ยนสิทธิ์' : 'ปิดการใช้งาน'}
      >
        {pending && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[#374151]">
              {pending.kind === 'role' ? (
                <>เปลี่ยนสิทธิ์ของ <b className="text-[#111827]">{pending.member.name}</b> เป็น{' '}
                  <b className="text-[#111827]">{roleLabel(pending.nextRole)}</b> ใช่ไหม?</>
              ) : (
                <>ปิดการใช้งาน <b className="text-[#111827]">{pending.member.name}</b>? ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะเปิดใหม่</>
              )}
            </p>
            {error && (
              <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#dc2626]">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPending(null); setError(null); }}
                disabled={busy}
                className="btn-ghost flex-1"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmPending}
                disabled={busy}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                style={pending.kind === 'deactivate' ? { background: '#dc2626' } : { background: '#2563eb' }}
              >
                {busy ? 'กำลังบันทึก...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
