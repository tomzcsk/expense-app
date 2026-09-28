import { createClient as createRawClient } from '@supabase/supabase-js';

// Bypasses RLS. Use ONLY in trusted server code (e.g. first-login upsert).
export function createAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
