import { domainSuffix } from '@/lib/access-control';

export default function DeniedPage() {
  const suffix = domainSuffix(process.env.ALLOWED_DOMAIN);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] p-6">
      <div className="card flex w-full max-w-[360px] flex-col items-center gap-3 py-9 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fee2e2] text-3xl">🚫</div>
        <h1 className="text-lg font-bold text-[#111827]">ไม่มีสิทธิ์เข้าใช้งาน</h1>
        <p className="text-sm leading-relaxed text-[#6b7280]">
          {suffix ? (
            <>
              ต้องเข้าสู่ระบบด้วย <b className="text-[#374151]">อีเมลบริษัท {suffix}</b> เท่านั้น
              <br />
              ถ้าใช้อีเมลถูกต้องแล้วยังเข้าไม่ได้ ติดต่อผู้ดูแลระบบ
            </>
          ) : (
            <>
              อีเมลนี้ไม่อยู่ในโดเมนบริษัทหรือรายชื่อที่อนุญาต
              <br />
              ติดต่อผู้ดูแลระบบ
            </>
          )}
        </p>
        <a href="/login" className="mt-1 text-sm font-semibold text-[#2563eb] underline">
          กลับหน้าเข้าสู่ระบบ
        </a>
      </div>
    </main>
  );
}
