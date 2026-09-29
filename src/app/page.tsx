import { redirect } from 'next/navigation';

// Root: send people into the app. Middleware already sends unauthenticated
// visitors to /login; authenticated ones land on the dashboard (which routes
// submitters onward to /my).
export default function Home() {
  redirect('/dashboard');
}
