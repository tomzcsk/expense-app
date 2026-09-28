import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { StatusBadge } from '@/components/StatusBadge';
import type { ClaimStatus } from '@/lib/claims/status';

export default async function QueuePage() {
  await requireManager();
  const supabase = await createClient();
  const { data: claims } = await supabase
    .from('expense_claims')
    .select('id, claim_no, period, amount_thb, status, submitter:submitter_id(name)')
    .in('status', ['submitted', 'approved'])
    .order('created_at', { ascending: true });

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">คิวรออนุมัติ</h1>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500">
          <th>เลขที่</th><th>คน</th><th>เดือน</th><th className="text-right">ยอด</th><th>สถานะ</th><th></th>
        </tr></thead>
        <tbody>
          {claims?.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="py-2">{c.claim_no}</td>
              <td>{(c.submitter as unknown as { name: string }).name}</td>
              <td>{c.period}</td>
              <td className="text-right">฿{Number(c.amount_thb).toLocaleString()}</td>
              <td><StatusBadge status={c.status as ClaimStatus} /></td>
              <td><Link href={`/manage/claims/${c.id}`} className="text-blue-600">ดู →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
