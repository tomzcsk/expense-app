import { createAdminClient } from '@/lib/supabase/admin';
import { computeMissing, type Subscription } from '@/lib/subscriptions/missing';
import { sendTelegramMessage } from '@/lib/telegram';
import { currentPeriodBangkok, currentDateBangkok } from '@/lib/bangkok-time';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Days of month the cron actually sends on (else it's a no-op — avoids daily spam).
export const REMINDER_DAYS = [25, 28];

function monthLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${THAI_MONTHS[m - 1]} ${y}`;
}

// Pure — the DM body for one person's missing subscriptions.
export function buildReminderMessage(month: string, services: string[], siteUrl: string): string {
  return `⏰ เตือนส่งเบิกเดือน ${month}\nยังไม่ได้ส่ง: ${services.join(', ')}\nส่งที่ 👉 ${siteUrl}`;
}

export type ReminderResult = {
  sent: number;
  skippedNoTelegram: number;
  skippedAlreadySent: number;
  missingPeople: number;
};

// Compute the CURRENT month's ตกเบิก and DM each missing person who has linked
// Telegram. Uses the service-role client (trusted server job, no session).
// Idempotent per person per day: reminder_log claims a (person, Bangkok-date)
// slot before each DM, so cron retries / repeated button clicks don't re-send.
export async function sendMissingReminders(): Promise<ReminderResult> {
  const admin = createAdminClient();
  const period = currentPeriodBangkok();
  const today = currentDateBangkok();

  const [{ data: subsRaw }, { data: claimsRaw }] = await Promise.all([
    admin
      .from('recurring_subscriptions')
      .select('id, person_id, category_id, expected_amount, person:person_id(name, telegram_chat_id), category:category_id(name)')
      .eq('active', true),
    admin.from('expense_claims').select('submitter_id, category_id, status').eq('period', period),
  ]);

  const subs = subsRaw ?? [];
  const activeSubs: Subscription[] = subs.map((s) => ({
    id: s.id as string,
    personId: s.person_id as string,
    personName: (s.person as unknown as { name: string } | null)?.name ?? '-',
    categoryId: (s.category_id as string | null) ?? null,
    categoryName: (s.category as unknown as { name: string } | null)?.name ?? null,
    expectedAmount: s.expected_amount != null ? Number(s.expected_amount) : null,
  }));

  const chatIdByPerson = new Map<string, number | null>();
  for (const s of subs) {
    chatIdByPerson.set(
      s.person_id as string,
      (s.person as unknown as { telegram_chat_id: number | null } | null)?.telegram_chat_id ?? null,
    );
  }

  const claimKeys = (claimsRaw ?? [])
    .filter((c) => c.status !== 'rejected')
    .map((c) => ({ personId: c.submitter_id as string, categoryId: (c.category_id as string | null) ?? null }));

  const missing = computeMissing(activeSubs, claimKeys).rows.filter((r) => !r.submitted);

  const byPerson = new Map<string, string[]>();
  for (const r of missing) {
    const list = byPerson.get(r.personId) ?? [];
    list.push(r.categoryName ?? 'บริการ');
    byPerson.set(r.personId, list);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const label = monthLabel(period);
  let sent = 0;
  let skippedNoTelegram = 0;
  let skippedAlreadySent = 0;
  for (const [personId, services] of byPerson) {
    const chatId = chatIdByPerson.get(personId);
    if (!chatId) {
      skippedNoTelegram++;
      continue;
    }
    // Claim today's slot BEFORE sending. A unique-violation (23505) means this
    // person was already nudged today (cron retry / double click) → skip.
    const { error: logErr } = await admin
      .from('reminder_log')
      .insert({ person_id: personId, sent_date: today, period });
    if (logErr) {
      if (logErr.code === '23505') skippedAlreadySent++;
      else console.error('reminder_log insert failed', logErr);
      continue; // don't DM if we couldn't record it
    }
    const res = await sendTelegramMessage(chatId, buildReminderMessage(label, services, site));
    if (res.ok) {
      sent++;
    } else {
      // Send failed — release the slot so a later run can retry today. Reminders
      // favor at-least-once (a missed ตกเบิก nudge is worse than a rare repeat),
      // and day 25 vs 28 give a second natural attempt. Log if cleanup itself fails.
      const { error: delErr } = await admin
        .from('reminder_log')
        .delete()
        .eq('person_id', personId)
        .eq('sent_date', today);
      if (delErr) console.error('reminder_log cleanup failed', personId, today, delErr);
    }
  }

  return { sent, skippedNoTelegram, skippedAlreadySent, missingPeople: byPerson.size };
}
