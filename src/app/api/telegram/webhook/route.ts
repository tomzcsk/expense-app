import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendTelegramMessage } from '@/lib/telegram';

// Telegram calls this with no user session, so it uses the service-role admin
// client. It is protected by the secret header Telegram is configured to send
// (setWebhook secret_token). Always return 200 (except 401) so Telegram doesn't
// retry-storm on our errors.
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const got = req.headers.get('x-telegram-bot-api-secret-token');
    if (!secret || got !== secret) {
      return new NextResponse('unauthorized', { status: 401 });
    }

    const update = await req.json().catch(() => null);
    const msg = update?.message;
    const from = msg?.from;
    const text: unknown = msg?.text;
    if (!msg || !from?.id || typeof text !== 'string') {
      return NextResponse.json({ ok: true }); // ignore non-message updates
    }

    // Match the /start command exactly (also /start@botname) — not /startling.
    const parts = text.trim().split(/\s+/);
    const cmd = parts[0] ?? '';
    if (cmd === '/start' || cmd.startsWith('/start@')) {
      const token = parts[1];
      if (!token) {
        await sendTelegramMessage(
          from.id,
          'สวัสดีครับ 👋 กดปุ่ม "เชื่อม Telegram" ในหน้าโปรไฟล์ของระบบเบิกจ่าย เพื่อผูกบัญชี',
        );
        return NextResponse.json({ ok: true });
      }

      const admin = createAdminClient();
      const nowIso = new Date().toISOString();
      // Atomic consume: only matches an unused, unexpired token; the WHERE guard
      // means a replay (or a race) updates 0 rows → treated as invalid.
      const { data: consumed } = await admin
        .from('telegram_link_tokens')
        .update({ used_at: nowIso })
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', nowIso)
        .select('person_id')
        .maybeSingle();

      if (!consumed) {
        await sendTelegramMessage(from.id, 'ลิงก์หมดอายุหรือถูกใช้แล้ว ลองกดเชื่อมใหม่ในโปรไฟล์');
        return NextResponse.json({ ok: true });
      }

      const { error: linkErr } = await admin
        .from('people')
        .update({ telegram_chat_id: from.id, telegram_username: from.username ?? null })
        .eq('id', consumed.person_id);
      if (linkErr) {
        console.error('telegram link: people update failed', linkErr);
        await sendTelegramMessage(from.id, 'เชื่อมไม่สำเร็จ ลองกดเชื่อมใหม่ในโปรไฟล์');
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        from.id,
        '✅ เชื่อมบัญชีสำเร็จ! จะได้รับการแจ้งเตือนเรื่องการเบิกทาง Telegram',
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('telegram webhook error', e);
    return NextResponse.json({ ok: true }); // 200 so Telegram doesn't retry-storm
  }
}
