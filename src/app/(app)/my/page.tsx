import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { StatusBadge } from '@/components/StatusBadge';
import type { ClaimStatus } from '@/lib/claims/status';

export default async function MyClaimsPage() {
  const me = await getCurrentUser();
  const supabase = await createClient();
  const { data: claims } = await supabase
    .from('expense_claims')
    .select('id, claim_no, period, amount_thb, status, return_reason')
    .eq('submitter_id', me.id)
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">เบิกของฉัน</h1>
        <Link href="/my/new" className="rounded bg-blue-600 px-4 py-2 text-white">➕ ส่งเบิกใหม่</Link>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500">
          <th>เลขที่</th><th>เดือน</th><th className="text-right">ยอด</th><th className="text-right">สถานะ</th>
        </tr></thead>
        <tbody>
          {claims?.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="py-2">{c.claim_no}</td>
              <td>{c.period}</td>
              <td className="text-right">฿{Number(c.amount_thb).toLocaleString()}</td>
              <td className="text-right">
                <StatusBadge status={c.status as ClaimStatus} />
                {c.status === 'returned' &&
                  <div className="text-xs text-orange-600">
                    ↩ {c.return_reason} · <Link href={`/my/${c.id}/edit`} className="underline">แก้ไข/ส่งใหม่</Link>
                  </div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
