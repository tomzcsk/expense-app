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
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <h1 className="text-lg font-bold">จัดการสมาชิก ({members.length})</h1>

      {error && !pending && (
        <div className="rounded-xl border border-[#3a2415] bg-[#2a1416] px-3 py-2 text-[12px] text-[#f87171]">
          {error}
        </div>
      )}

      {members.length > 8 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นชื่อ / อีเมล..."
          className="field"
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
                        <span className="font-semibold">{m.name}</span>
                        {isSelf && (
                          <span className="pill" style={{ background: '#10231b', color: '#34d399' }}>
                            คุณ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[#7d8595]">{m.email}</td>
                    <td className="whitespace-nowrap">
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                        style={
                          m.role === 'manager'
                            ? { borderColor: '#1f3b30', background: '#10231b', color: '#34d399' }
                            : { borderColor: '#242833', color: '#9aa3b2' }
                        }
                      >
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[11px]" style={{ color: m.active ? '#34d399' : '#7d8595' }}>
                      {m.active ? '● ใช้งาน' : '○ ปิดใช้งาน'}
                    </td>
                    {/* Telegram link status — placeholder (no column in schema yet, Phase 2) */}
                    <td className="whitespace-nowrap text-[11px] text-[#7d8595]">📱 ยังไม่เชื่อม</td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex overflow-hidden rounded-lg border border-[#242833] text-[11px]">
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
                                    ? { background: '#34d399', color: '#08130e', fontWeight: 600 }
                                    : { color: isSelf ? '#3a4150' : '#9aa3b2' }
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
                              ? { borderColor: '#3a2415', background: '#1c130c', color: '#fb923c' }
                              : { borderColor: '#1f3b30', background: '#10231b', color: '#34d399' }
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
            <p className="text-sm text-[#c9ced8]">
              {pending.kind === 'role' ? (
                <>เปลี่ยนสิทธิ์ของ <b className="text-[#f3f5f8]">{pending.member.name}</b> เป็น{' '}
                  <b className="text-[#f3f5f8]">{roleLabel(pending.nextRole)}</b> ใช่ไหม?</>
              ) : (
                <>ปิดการใช้งาน <b className="text-[#f3f5f8]">{pending.member.name}</b>? ผู้ใช้จะเข้าระบบไม่ได้จนกว่าจะเปิดใหม่</>
              )}
            </p>
            {error && (
              <div className="rounded-xl border border-[#3a2415] bg-[#2a1416] px-3 py-2 text-[12px] text-[#f87171]">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPending(null); setError(null); }}
                disabled={busy}
                className="flex-1 rounded-xl border border-[#242833] py-3 text-sm font-semibold text-[#9aa3b2]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmPending}
                disabled={busy}
                className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
                style={
                  pending.kind === 'deactivate'
                    ? { background: '#dc2626', color: '#fff' }
                    : { background: '#34d399', color: '#08130e' }
                }
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
