import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'submitter' | 'manager'; // EFFECTIVE role (may be downgraded by view-as)
  telegram_chat_id: number | null;
  telegram_username: string | null;
  viewingAsSubmitter: boolean; // a manager currently testing the submitter view
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  // active:false locks the account out of the whole app (deactivated staff).
  const { data } = await supabase
    .from('people').select('id, name, email, role, active, telegram_chat_id, telegram_username').eq('id', user.id).single();
  if (!data || !data.active) redirect('/auth/denied');

  // View-as: a manager can flip the whole app into the submitter experience to
  // test it with one account. This ONLY downgrades (manager→submitter); the cookie
  // is ignored for real submitters, so it can never escalate. DB security (RLS +
  // RPCs) always uses the real role — this override is purely UI/routing.
  const viewAs = (await cookies()).get('view_as')?.value;
  const viewingAsSubmitter = data.role === 'manager' && viewAs === 'submitter';
  const role: 'submitter' | 'manager' = viewingAsSubmitter ? 'submitter' : data.role;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role,
    telegram_chat_id: data.telegram_chat_id,
    telegram_username: data.telegram_username,
    viewingAsSubmitter,
  };
}

export async function requireManager(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (me.role !== 'manager') redirect('/my');
  return me;
}
