import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { MembersView, type Member } from './MembersView';

export default async function MembersPage() {
  const me = await requireManager();
  const supabase = await createClient();
  // Note: telegram_chat_id is not a column in the people table yet (Phase 2),
  // so it is intentionally omitted here; the Telegram indicator is a placeholder.
  const { data } = await supabase
    .from('people')
    .select('id, name, email, role, active')
    .order('name');

  return <MembersView members={(data ?? []) as Member[]} meId={me.id} />;
}
