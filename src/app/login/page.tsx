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
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">ระบบเบิกจ่ายค่าใช้จ่าย</h1>
      <button onClick={signIn} className="rounded-lg bg-blue-600 px-6 py-3 text-white">
        เข้าสู่ระบบด้วย Google
      </button>
    </main>
  );
}
