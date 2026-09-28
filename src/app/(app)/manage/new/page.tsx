import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { NewClaimForm } from '../../my/new/NewClaimForm';
import { createClaimOnBehalf } from '../actions';

export default async function ManagerNewClaimPage() {
  await requireManager();
  const supabase = await createClient();
  const [{ data: categories }, { data: people }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('active', true).order('name'),
    supabase.from('people').select('id, name').eq('active', true).order('name'),
  ]);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">กรอกเบิกแทนพนักงาน — ระบบบันทึกว่าคุณเป็นผู้กรอก</p>
      <NewClaimForm categories={categories ?? []} people={people ?? []} action={createClaimOnBehalf} />
    </div>
  );
}
