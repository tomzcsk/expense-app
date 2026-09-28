'use client';
import { createClient } from '@/lib/supabase/browser';

export function LogoutButton({ variant = 'button' }: { variant?: 'button' | 'icon' }) {
  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    location.href = '/login';
  };
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={signOut}
        aria-label="ออกจากระบบ"
        title="ออกจากระบบ"
        className="shrink-0 text-lg text-[#6b7280] transition hover:text-white"
      >
        ⎋
      </button>
    );
  }
  return (
    <button type="button" onClick={signOut} className="btn-ghost text-sm">
      ออกจากระบบ
    </button>
  );
}
