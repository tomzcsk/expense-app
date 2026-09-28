'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = { href: string; icon: string; label: string };

const MY_TAB: Tab = { href: '/my', icon: '🧾', label: 'เบิกของฉัน' };
const MANAGER_TABS: Tab[] = [
  { href: '/manage/queue', icon: '📥', label: 'คิว' },
  { href: '/manage/new', icon: '✍️', label: 'กรอกแทน' },
  { href: '/manage/report', icon: '📊', label: 'รายงาน' },
];

export function BottomNav({ role }: { role: 'submitter' | 'manager' }) {
  const pathname = usePathname();
  const tabs = role === 'manager' ? [MY_TAB, ...MANAGER_TABS] : [MY_TAB];

  const isActive = (href: string) => {
    if (href === '/my') return pathname === '/my' || pathname.startsWith('/my/');
    // Claim detail is reached from the queue, so keep the คิว tab lit there.
    if (href === '/manage/queue')
      return pathname.startsWith('/manage/queue') || pathname.startsWith('/manage/claims');
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eef0f5] bg-white">
      <div
        className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pt-2"
        style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom))' }}
      >
        {tabs.map((t) => {
          const active = isActive(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center gap-0.5 text-center"
              style={{ color: active ? '#6366f1' : '#b6bdca' }}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
