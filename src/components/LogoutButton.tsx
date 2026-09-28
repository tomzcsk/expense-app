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
      className="rounded-full border border-[#242833] bg-[#171a21] px-3 py-1.5 text-xs font-semibold text-[#7d8595] transition hover:text-[#f3f5f8]"
    >
      ออกจากระบบ
    </button>
  );
}
