import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAccess, parseList } from '@/lib/access-control';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const origin = process.env.NEXT_PUBLIC_SITE_URL!;
  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/auth/denied`);

  const decision = resolveAccess(user.email, {
    adminEmails: parseList(process.env.ADMIN_EMAILS),
    allowedDomain: process.env.ALLOWED_DOMAIN ?? '',
  });

  if (!decision.allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/denied`);
  }

  // Provision the person via service role (bypasses RLS) on first login only.
  // Role is SET once here and thereafter changed only by a manager in the UI —
  // a returning user is never re-inserted, so their assigned role is preserved.
  // (Intended: an admin-allowlist change does NOT retroactively promote an
  // already-provisioned user; a manager assigns the role in the UI instead.)
  const admin = createAdminClient();
  const { data: existing, error: lookupErr } =
    await admin.from('people').select('id').eq('id', user.id).maybeSingle();
  if (lookupErr) return NextResponse.redirect(`${origin}/login?e=lookup`);

  if (!existing) {
    const { error: insertErr } = await admin.from('people').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name ?? user.email,
      role: decision.role,
    });
    if (insertErr) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?e=provision`);
    }
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
