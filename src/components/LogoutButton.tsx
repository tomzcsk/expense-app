'use client';
import { createClient } from '@/lib/supabase/browser';

export function LogoutButton() {
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.href = '/login';
  };
  return (
    <button
      onClick={signOut}
      className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30"
    >
      ออกจากระบบ
    </button>
  );
}
