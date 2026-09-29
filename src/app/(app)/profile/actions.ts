'use server';
import { getCurrentUser } from '@/lib/current-user';
import { createClient } from '@/lib/supabase/server';

// Create a one-time deep-link token for the current user (session client →
// RLS tlt_insert_self: person_id = auth.uid()) and return the t.me start link.
export async function linkTelegram(): Promise<{ url?: string; error?: string }> {
  const me = await getCurrentUser();
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (!bot) return { error: 'ยังไม่ได้ตั้งค่าบอท Telegram' };

  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
  const supabase = await createClient();
  const { error } = await supabase.from('telegram_link_tokens').insert({ token, person_id: me.id });
  if (error) {
    console.error('linkTelegram failed', error);
    return { error: 'สร้างลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง' };
  }
  return { url: `https://t.me/${bot}?start=${token}` };
}
