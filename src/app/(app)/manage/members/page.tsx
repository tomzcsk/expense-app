import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { MembersView, type Member } from './MembersView';

export default async function MembersPage() {
  const me = await requireManager();
  const supabase = await createClient();
  const { data } = await supabase
    .from('people')
    .select('id, name, email, role, active, telegram_chat_id, telegram_username')
    .order('name');

  const members: Member[] = (data ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    email: p.email as string,
    role: p.role as 'submitter' | 'manager',
    active: p.active as boolean,
    telegramChatId: (p.telegram_chat_id as number | null) ?? null,
    telegramUsername: (p.telegram_username as string | null) ?? null,
  }));

  return <MembersView members={members} meId={me.id} />;
}
