'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';
import { enterSubmitterView, exitSubmitterView } from '@/app/view-actions';

type Role = 'submitter' | 'manager';
type NavItem = { href: string; icon: string; label: string; badge?: number };

const TITLES: Record<string, string> = {
  '/dashboard': 'ภาพรวม',
  '/my': 'เบิกของฉัน',
  '/manage/queue': 'คิวรอจ่าย',
  '/manage/new': 'กรอกแทน',
  '/manage/report': 'รายงาน',
  '/manage/missing': 'กันตกเบิก',
  '/manage/members': 'สมาชิก',
  '/profile': 'โปรไฟล์',
};
function titleFor(path: string): string {
  if (path.startsWith('/manage/claims')) return 'รายละเอียดคำเบิก';
  if (path.startsWith('/my/')) return 'เบิกของฉัน';
  return TITLES[path] ?? 'เบิกจ่าย';
}

export function AppShell({
  role,
  name,
  roleLabel,
  submittedCount,
  viewingAsSubmitter = false,
  children,
}: {
  role: Role;
  name: string;
  roleLabel: string;
  submittedCount: number;
  viewingAsSubmitter?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Submitters have a single destination (their claims), so the full admin
  // sidebar is overkill. Give them a clean, mobile-friendly top-bar layout;
  // managers keep the sidebar below.
  if (role === 'submitter') {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <header className="sticky top-0 z-20 border-b border-[#e7eaef] bg-white">
          <div className="mx-auto flex h-14 max-w-[760px] items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/my" className="flex items-center gap-2.5">
              <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#2563eb] font-bold text-white">฿</div>
              <div className="font-bold text-[#111827]">ระบบเบิกจ่าย</div>
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-[#f3f4f6] sm:pr-2.5"
                title="โปรไฟล์ · เชื่อม Telegram"
              >
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">🙂</div>
                <div className="hidden min-w-0 leading-tight sm:block">
                  <div className="truncate text-[12.5px] font-semibold text-[#111827]">{name}</div>
                  <div className="text-[10.5px] text-[#6b7280]">{roleLabel}</div>
                </div>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </header>
        {viewingAsSubmitter && (
          <div className="border-b border-[#fde68a] bg-[#fffbeb]">
            <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3 px-4 py-2 text-[12.5px] text-[#92400e] sm:px-6">
              <span>🔄 กำลังดูเป็น <b>คนเบิก</b> (โหมดทดสอบ)</span>
              <form action={exitSubmitterView}>
                <button type="submit" className="shrink-0 font-semibold text-[#b45309] underline">กลับเป็นแอดมิน</button>
              </form>
            </div>
          </div>
        )}
        <main className="mx-auto max-w-[760px] px-4 py-5 sm:px-6">{children}</main>
      </div>
    );
  }

  const nav: NavItem[] = [
    { href: '/dashboard', icon: '▦', label: 'ภาพรวม' },
    { href: '/my', icon: '🧾', label: 'เบิกของฉัน' },
    ...(role === 'manager'
      ? ([
          { href: '/manage/queue', icon: '💸', label: 'คิวรอจ่าย', badge: submittedCount },
          { href: '/manage/new', icon: '✍️', label: 'กรอกแทน' },
          { href: '/manage/report', icon: '📊', label: 'รายงาน' },
          { href: '/manage/missing', icon: '⚠️', label: 'กันตกเบิก' },
          { href: '/manage/members', icon: '👥', label: 'สมาชิก' },
        ] as NavItem[])
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/my') return pathname === '/my' || pathname.startsWith('/my/');
    if (href === '/manage/queue')
      return pathname.startsWith('/manage/queue') || pathname.startsWith('/manage/claims');
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sidebar = (
    <div className="flex h-full flex-col px-3 py-3.5">
      <Link
        href="/dashboard"
        onClick={() => setDrawerOpen(false)}
        className="flex items-center gap-2.5 px-2 pb-4 pt-1.5"
      >
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-[#2563eb] font-bold text-white">฿</div>
        <div className="font-bold text-white">เบิกจ่าย</div>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {nav.map((n) => {
          const on = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13.5px] transition hover:bg-[#1a2130]"
              style={on ? { background: '#1d283a', color: '#fff' } : { color: '#9aa3b2' }}
            >
              <span className="w-[18px] text-center text-[15px]" style={on ? { color: '#3b82f6' } : undefined}>
                {n.icon}
              </span>
              <span>{n.label}</span>
              {n.badge ? (
                <span className="ml-auto rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-semibold text-white">
                  {n.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        {/* Admin test aid: flip the whole app into the submitter view. */}
        <form action={enterSubmitterView}>
          <button
            type="submit"
            className="mb-1 flex w-full items-center gap-3 rounded-lg px-3.5 py-2 text-[12.5px] text-[#9aa3b2] transition hover:bg-[#1a2130]"
          >
            <span className="w-[18px] text-center text-[15px]">🔄</span>
            <span>ทดสอบมุมมองคนเบิก</span>
          </button>
        </form>
        <div className="flex items-center gap-2.5 border-t border-[#1f2937] pt-3">
          <Link
            href="/profile"
            onClick={() => setDrawerOpen(false)}
            className="flex min-w-0 flex-1 items-center gap-2.5"
          >
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#374151] text-white">🙂</div>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold text-[#e5e7eb]">{name}</div>
              <div className="text-[10.5px] text-[#6b7280]">{roleLabel}</div>
            </div>
          </Link>
          <LogoutButton variant="icon" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[212px] bg-[#111827] lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[240px] bg-[#111827]">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-[212px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#e7eaef] bg-white px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="เมนู"
            className="text-xl text-[#6b7280] lg:hidden"
          >
            ☰
          </button>
          <div className="text-[16px] font-bold text-[#111827]">{titleFor(pathname)}</div>
        </header>
        <main className="px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
