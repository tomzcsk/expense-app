import { getCurrentUser } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  const roleLabel = me.role === 'manager' ? 'คนจัดการ' : 'พนักงาน';

  // Sidebar badge: number of claims awaiting payment (managers only).
  let submittedCount = 0;
  if (me.role === 'manager') {
    const supabase = await createClient();
    const { count } = await supabase
      .from('expense_claims')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted');
    submittedCount = count ?? 0;
  }

  return (
    <AppShell role={me.role} name={me.name} roleLabel={roleLabel} submittedCount={submittedCount}>
      {children}
    </AppShell>
  );
}
