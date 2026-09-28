import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';
import { BottomNav } from '@/components/BottomNav';
import { LogoutButton } from '@/components/LogoutButton';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนเย็น';
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  const roleLabel = me.role === 'manager' ? 'คนจัดการ' : 'พนักงาน';

  return (
    <div className="min-h-screen">
      {/* Sleek dark header */}
      <header
        className="border-b border-[#1c2029] px-4 pb-4 pt-5"
        style={{ background: 'linear-gradient(180deg,#171a21,#0f1218)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#10231b] text-xl">
              🙂
            </div>
            <div className="min-w-0">
              <div className="text-xs text-[#7d8595]">{greeting()} 👋</div>
              <div className="flex items-center gap-2 text-base font-bold text-[#f3f5f8]">
                <span className="truncate">{me.name}</span>
                <span className="rounded-full border border-[#1f3b30] bg-[#10231b] px-2 py-0.5 text-[10px] font-semibold text-[#34d399]">
                  {roleLabel}
                </span>
              </div>
            </div>
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Content, with room for the fixed bottom nav */}
      <main className="mx-auto mt-4 max-w-3xl px-4 pb-28">{children}</main>

      <BottomNav role={me.role} />
    </div>
  );
}
