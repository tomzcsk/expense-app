'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Admin test aid: flip the whole app into the submitter view, then switch back.
// The cookie is only honoured for a real manager (see getCurrentUser), so it can
// never raise a submitter's privileges — it only downgrades a manager's view.
export async function enterSubmitterView() {
  (await cookies()).set('view_as', 'submitter', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in prod; plain http in local dev
  });
  redirect('/my');
}

export async function exitSubmitterView() {
  (await cookies()).delete('view_as');
  redirect('/dashboard');
}
