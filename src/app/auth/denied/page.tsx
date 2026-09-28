export default function DeniedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="card flex w-full max-w-[360px] flex-col items-center gap-3 py-9 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2a1416] text-3xl">🚫</div>
        <h1 className="text-lg font-bold">ไม่มีสิทธิ์เข้าใช้งาน</h1>
        <p className="text-sm text-[#7d8595]">
          อีเมลนี้ไม่อยู่ในโดเมนบริษัทหรือรายชื่อที่อนุญาต
          <br />ติดต่อผู้ดูแลระบบ
        </p>
        <a href="/login" className="text-sm font-semibold text-[#34d399] underline">
          กลับหน้าเข้าสู่ระบบ
        </a>
      </div>
    </main>
  );
}
