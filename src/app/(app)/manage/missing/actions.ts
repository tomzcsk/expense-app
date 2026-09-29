'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireManager } from '@/lib/current-user';
import { sendMissingReminders, type ReminderResult } from '@/lib/reminders';

// Manager fires the ตกเบิก reminder DMs for the current month on demand.
export async function sendRemindersNow(): Promise<ReminderResult & { error?: string }> {
  await requireManager();
  try {
    return await sendMissingReminders();
  } catch (e) {
    console.error('sendRemindersNow failed', e);
    return { sent: 0, skippedNoTelegram: 0, skippedAlreadySent: 0, missingPeople: 0, error: 'ยิงเตือนไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
}

// Recurring-subscription writes. Session client → RLS (recsub_write USING
// is_manager()) enforces manager-only; requireManager() is the fast guard.
// Errors are returned (not thrown) so the UI surfaces them inline. A category
// is required so the person+category matching stays clean.

export async function addSubscription(
  personId: string,
  categoryId: string,
  expectedAmount: number | null,
  note: string | null,
): Promise<{ error?: string }> {
  await requireManager();
  if (!personId) return { error: 'เลือกพนักงาน' };
  if (!categoryId) return { error: 'เลือกบริการ/หมวด' };
  const supabase = await createClient();
  const { error } = await supabase.from('recurring_subscriptions').insert({
    person_id: personId,
    category_id: categoryId,
    expected_amount: expectedAmount,
    note: note || null,
  });
  if (error) {
    console.error('addSubscription failed', error);
    return { error: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  revalidatePath('/manage/missing');
  return {};
}

export async function updateSubscription(
  id: string,
  categoryId: string,
  expectedAmount: number | null,
  note: string | null,
): Promise<{ error?: string }> {
  await requireManager();
  if (!categoryId) return { error: 'เลือกบริการ/หมวด' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_subscriptions')
    .update({ category_id: categoryId, expected_amount: expectedAmount, note: note || null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('updateSubscription failed', error);
    return { error: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  if (!data) return { error: 'ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข' };
  revalidatePath('/manage/missing');
  return {};
}

export async function setSubscriptionActive(id: string, active: boolean): Promise<{ error?: string }> {
  await requireManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_subscriptions')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('setSubscriptionActive failed', error);
    return { error: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  if (!data) return { error: 'ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข' };
  revalidatePath('/manage/missing');
  return {};
}

export async function deleteSubscription(id: string): Promise<{ error?: string }> {
  await requireManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('recurring_subscriptions')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('deleteSubscription failed', error);
    return { error: 'ลบไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  if (!data) return { error: 'ไม่พบรายการ หรือไม่มีสิทธิ์ลบ' };
  revalidatePath('/manage/missing');
  return {};
}
