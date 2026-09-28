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
    <main
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at 50% 0%, #171a21, #0f1218)' }}
    >
      <div className="card flex w-full max-w-[360px] flex-col items-center gap-5 py-9 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#10231b] text-3xl">🧾</div>
        <div>
          <h1 className="text-xl font-bold">ระบบเบิกจ่ายค่าใช้จ่าย</h1>
          <p className="mt-1 text-sm text-[#7d8595]">เข้าสู่ระบบเพื่อส่งและติดตามการเบิก</p>
        </div>
        <button onClick={signIn} className="btn-primary w-full">
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </main>
  );
}
