'use client';
import { useState } from 'react';
import { linkTelegram } from './actions';

export function TelegramLink({ linked, username }: { linked: boolean; username: string | null }) {
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (linked) {
    return (
      <div className="text-sm font-semibold text-[#16a34a]">
        เชื่อมแล้ว ✓{username ? ` @${username}` : ''}
      </div>
    );
  }

  const start = async () => {
    setBusy(true);
    setError(null);
    const res = await linkTelegram();
    setBusy(false);
    if (res.error || !res.url) {
      setError(res.error ?? 'สร้างลิงก์ไม่สำเร็จ');
      return;
    }
    window.open(res.url, '_blank', 'noopener');
    setOpened(true);
  };

  return (
    <>
      <div className="text-[12px] text-[#6b7280]">ยังไม่เชื่อม Telegram — รับแจ้งเตือนกันตกเบิก</div>
      <button type="button" onClick={start} disabled={busy} className="btn-primary text-sm">
        {busy ? 'กำลังสร้างลิงก์...' : 'เชื่อม Telegram'}
      </button>
      {opened && (
        <div className="text-[11px] text-[#6b7280]">กด Start ในบอท แล้ว refresh หน้านี้เพื่อดูสถานะ</div>
      )}
      {error && <div className="text-[11px] text-[#dc2626]">{error}</div>}
    </>
  );
}
