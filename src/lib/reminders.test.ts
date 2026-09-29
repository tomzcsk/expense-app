import { it, expect } from 'vitest';
import { buildReminderMessage, REMINDER_DAYS } from './reminders';

it('builds a reminder DM listing the missing services + site link', () => {
  const msg = buildReminderMessage('กันยายน 2026', ['Claude', 'ChatGPT'], 'https://x.test');
  expect(msg).toContain('กันยายน 2026');
  expect(msg).toContain('Claude, ChatGPT');
  expect(msg).toContain('https://x.test');
});

it('reminder days are the 25th and 28th', () => {
  expect(REMINDER_DAYS).toEqual([25, 28]);
});
