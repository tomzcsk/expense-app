export type AccessDecision =
  | { allowed: false }
  | { allowed: true; role: 'manager' | 'submitter' };

export function parseList(env: string | undefined): string[] {
  return (env ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveAccess(
  email: string,
  opts: { adminEmails: string[]; allowedDomain: string }
): AccessDecision {
  const e = email.trim().toLowerCase();
  const admins = opts.adminEmails.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (admins.includes(e)) return { allowed: true, role: 'manager' };

  const raw = opts.allowedDomain.trim().toLowerCase();
  if (raw) {
    const suffix = raw.startsWith('@') ? raw : `@${raw}`;
    if (e.endsWith(suffix)) return { allowed: true, role: 'submitter' };
  }
  return { allowed: false };
}
