export type AccessDecision =
  | { allowed: false }
  | { allowed: true; role: 'manager' | 'submitter' };

export function parseList(env: string | undefined): string[] {
  return (env ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// The "@domain" suffix a company email must end with (e.g. "@like-soft.net").
// Empty when no domain is configured. Shared by resolveAccess + the login/denied
// pages so they always show exactly what's enforced.
export function domainSuffix(allowedDomain: string | undefined): string {
  const raw = (allowedDomain ?? '').trim().toLowerCase();
  if (!raw) return '';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

export function resolveAccess(
  email: string,
  opts: { adminEmails: string[]; allowedDomain: string }
): AccessDecision {
  const e = email.trim().toLowerCase();
  const admins = opts.adminEmails.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (admins.includes(e)) return { allowed: true, role: 'manager' };

  const suffix = domainSuffix(opts.allowedDomain);
  if (suffix && e.endsWith(suffix)) return { allowed: true, role: 'submitter' };
  return { allowed: false };
}
