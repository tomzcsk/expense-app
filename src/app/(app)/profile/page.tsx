import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { LogoutButton } from '@/components/LogoutButton';
import { TelegramLink } from './TelegramLink';

export default async function ProfilePage() {
  const me = await getCurrentUser();
  const roleLabel = me.role === 'manager' ? 'คนจัดการ' : 'พนักงาน';

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
      {/* Profile card */}
      <div className="card flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eff6ff] text-3xl">
          🙂
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-[#111827]">{me.name}</div>
          <div className="truncate text-[12px] text-[#6b7280]">{me.email}</div>
          <span className="mt-1 inline-block rounded-full border border-[#bfdbfe] bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#2563eb]">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Telegram */}
      <div className="card flex flex-col gap-2">
        <div className="text-sm font-semibold text-[#111827]">การแจ้งเตือน Telegram</div>
        <TelegramLink linked={!!me.telegram_chat_id} username={me.telegram_username} />
      </div>

      {/* Manager-only: members management */}
      {me.role === 'manager' && (
        <Link href="/manage/members" className="btn-primary w-full">
          👥 จัดการสมาชิก
        </Link>
      )}

      {/* Logout */}
      <div className="card flex items-center justify-between gap-3">
        <div className="text-sm text-[#6b7280]">ออกจากระบบบัญชีนี้</div>
        <LogoutButton />
      </div>
    </div>
  );
}
