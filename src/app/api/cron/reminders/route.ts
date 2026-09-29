import { NextResponse, type NextRequest } from 'next/server';
import { sendMissingReminders, REMINDER_DAYS } from '@/lib/reminders';
import { currentDayBangkok } from '@/lib/bangkok-time';

// Vercel Cron hits this daily; it only actually sends on REMINDER_DAYS.
// Vercel sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET is set.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const day = currentDayBangkok(); // Thai calendar day, not UTC
  if (!REMINDER_DAYS.includes(day)) {
    return NextResponse.json({ skipped: 'not a reminder day', day });
  }

  const result = await sendMissingReminders();
  return NextResponse.json(result);
}
