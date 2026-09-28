import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { LogoutButton } from '@/components/LogoutButton';

export default async function ProfilePage() {
  const me = await getCurrentUser();
  const roleLabel = me.role === 'manager' ? 'คนจัดการ' : 'พนักงาน';
  // Placeholder: telegram_chat_id is not in the schema yet (Phase 2). No bot flow.
  const telegramChatId: string | null = null;

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
      <h1 className="text-lg font-bold">โปรไฟล์</h1>

      {/* Profile card */}
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10231b] text-3xl">
          🙂
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold">{me.name}</div>
          <div className="truncate text-[12px] text-[#7d8595]">{me.email}</div>
          <span className="mt-1 inline-block rounded-full border border-[#1f3b30] bg-[#10231b] px-2 py-0.5 text-[10px] font-semibold text-[#34d399]">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Telegram (placeholder) */}
      <div className="card flex flex-col gap-2">
        <div className="text-sm font-semibold">การแจ้งเตือน Telegram</div>
        {telegramChatId ? (
          <div className="text-sm font-semibold text-[#34d399]">เชื่อมแล้ว ✓</div>
        ) : (
          <>
            <div className="text-[12px] text-[#7d8595]">ยังไม่เชื่อม Telegram</div>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-[#242833] bg-[#171a21] py-2.5 text-sm font-semibold text-[#7d8595] opacity-60"
            >
              เชื่อม Telegram
            </button>
            <div className="text-[11px] text-[#7d8595]">จะเปิดใช้งานหลัง deploy (Phase 2)</div>
          </>
        )}
      </div>

      {/* Manager-only: members management */}
      {me.role === 'manager' && (
        <Link href="/manage/members" className="btn-primary w-full">
          👥 จัดการสมาชิก
        </Link>
      )}

      {/* Logout */}
      <div className="card flex items-center justify-between gap-3">
        <div className="text-sm text-[#7d8595]">ออกจากระบบบัญชีนี้</div>
        <LogoutButton />
      </div>
    </div>
  );
}
