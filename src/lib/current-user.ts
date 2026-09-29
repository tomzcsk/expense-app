import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'submitter' | 'manager';
  telegram_chat_id: number | null;
  telegram_username: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // active:false locks the account out of the whole app (deactivated staff).
  const { data } = await supabase
    .from('people').select('id, name, email, role, active, telegram_chat_id, telegram_username').eq('id', user.id).single();
  if (!data || !data.active) redirect('/auth/denied');
  const { active: _active, ...me } = data;
  return me as CurrentUser;
}

export async function requireManager(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (me.role !== 'manager') redirect('/my');
  return me;
}
