'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';

type Role = 'submitter' | 'manager';
const ROLES: Role[] = ['submitter', 'manager'];

// Both actions use the request-scoped (session) Supabase client, so RLS
// (people_update USING is_manager()) enforces manager-only at the DB — belt.
// requireManager() + the self-guard below are the suspenders. Errors are
// returned (not thrown) so the client can surface a message even in a
// production build, where thrown Server Action errors are redacted. Raw DB
// errors are logged server-side and replaced with a generic message to the
// user to avoid leaking schema/policy detail.

export async function setRole(personId: string, role: Role): Promise<{ error?: string }> {
  const me = await requireManager();
  if (personId === me.id) return { error: 'เปลี่ยนสิทธิ์ของตัวเองไม่ได้' };
  if (!ROLES.includes(role)) return { error: 'สิทธิ์ไม่ถูกต้อง' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .update({ role })
    .eq('id', personId)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('setRole failed', error);
    return { error: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  if (!data) return { error: 'ไม่พบสมาชิก หรือไม่มีสิทธิ์แก้ไข' };

  revalidatePath('/manage/members');
  return {};
}

export async function setActive(personId: string, active: boolean): Promise<{ error?: string }> {
  const me = await requireManager();
  if (personId === me.id) return { error: 'ปิดการใช้งานตัวเองไม่ได้' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people')
    .update({ active })
    .eq('id', personId)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('setActive failed', error);
    return { error: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  if (!data) return { error: 'ไม่พบสมาชิก หรือไม่มีสิทธิ์แก้ไข' };

  revalidatePath('/manage/members');
  return {};
}
