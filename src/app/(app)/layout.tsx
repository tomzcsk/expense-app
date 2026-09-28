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
      {/* Friendly gradient header */}
      <header
        className="px-4 pb-8 pt-5 text-white"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25 text-xl">
            🙂
          </div>
          <div className="min-w-0">
            <div className="text-xs opacity-85">{greeting()} 👋</div>
            <div className="flex items-center gap-2 text-base font-bold">
              <span className="truncate">{me.name}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content — pulled up over the header, with room for the fixed bottom nav */}
      <main className="mx-auto -mt-4 max-w-3xl px-4 pb-28">{children}</main>

      <BottomNav role={me.role} />
    </div>
  );
}
