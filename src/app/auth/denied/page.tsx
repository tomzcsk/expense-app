export default function DeniedPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-bold">ไม่มีสิทธิ์เข้าใช้งาน</h1>
      <p className="text-gray-500">อีเมลนี้ไม่อยู่ในโดเมนบริษัทหรือรายชื่อที่อนุญาต<br/>ติดต่อผู้ดูแลระบบ</p>
      <a href="/login" className="text-blue-600 underline">กลับหน้าเข้าสู่ระบบ</a>
    </main>
  );
}
