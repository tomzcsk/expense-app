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
      <div className="mx-auto w-full max-w-[520px] rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-xs text-[#2563eb]">
        ✍️ กรอกเบิกแทนพนักงาน — ระบบบันทึกว่าคุณเป็นผู้กรอก
      </div>
      <NewClaimForm categories={categories ?? []} people={people ?? []} action={createClaimOnBehalf} />
    </div>
  );
}
