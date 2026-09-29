// Server-only Telegram Bot API helper. Never throws; logs failures.
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  opts?: { parseMode?: 'HTML' | 'MarkdownV2' },
): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('sendTelegramMessage: TELEGRAM_BOT_TOKEN not set');
    return { ok: false };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(opts?.parseMode ? { parse_mode: opts.parseMode } : {}),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error('sendTelegramMessage failed', res.status, await res.text().catch(() => ''));
      return { ok: false };
    }
    // Telegram can return HTTP 200 with a JSON body of {"ok": false, ...}; trust
    // that field, not just the transport status, before reporting success.
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (!body?.ok) {
      console.error('sendTelegramMessage: non-ok body', body);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error('sendTelegramMessage error', e);
    return { ok: false };
  }
}
