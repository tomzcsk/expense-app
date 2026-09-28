import Link from 'next/link';
import { getCurrentUser } from '@/lib/current-user';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b px-4 py-3">
        <Link href="/my" className="font-semibold">เบิกของฉัน</Link>
        {me.role === 'manager' && (
          <>
            <Link href="/manage/queue">คิวอนุมัติ</Link>
            <Link href="/manage/new">กรอกแทน</Link>
            <Link href="/manage/report">รายงาน</Link>
          </>
        )}
        <span className="ml-auto text-sm text-gray-500">{me.name}</span>
      </nav>
      <main className="mx-auto max-w-4xl p-4">{children}</main>
    </div>
  );
}
