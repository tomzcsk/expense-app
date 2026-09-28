'use client';
import { createClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const signIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] p-6">
      <div className="card flex w-full max-w-[360px] flex-col items-center gap-5 py-9 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#2563eb] text-2xl font-bold text-white">฿</div>
        <div>
          <h1 className="text-xl font-bold text-[#111827]">ระบบเบิกจ่ายค่าใช้จ่าย</h1>
          <p className="mt-1 text-sm text-[#6b7280]">เข้าสู่ระบบเพื่อส่งและติดตามการเบิก</p>
        </div>
        <button onClick={signIn} className="btn-primary w-full">
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </main>
  );
}
