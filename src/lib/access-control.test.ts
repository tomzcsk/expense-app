import { describe, it, expect } from 'vitest';
import { resolveAccess, parseList } from './access-control';

const opts = { adminEmails: ['Boss@Gmail.com'], allowedDomain: '@company.com' };

describe('resolveAccess', () => {
  it('admin email -> manager, bypasses domain, case-insensitive', () => {
    expect(resolveAccess('boss@gmail.com', opts)).toEqual({ allowed: true, role: 'manager' });
  });
  it('company domain -> submitter', () => {
    expect(resolveAccess('staff@company.com', opts)).toEqual({ allowed: true, role: 'submitter' });
  });
  it('domain match is case-insensitive', () => {
    expect(resolveAccess('Staff@Company.com', opts)).toEqual({ allowed: true, role: 'submitter' });
  });
  it('outsider -> denied', () => {
    expect(resolveAccess('random@other.com', opts)).toEqual({ allowed: false });
  });
  it('domain given without @ still works', () => {
    expect(resolveAccess('a@company.com', { adminEmails: [], allowedDomain: 'company.com' }))
      .toEqual({ allowed: true, role: 'submitter' });
  });
  it('empty domain denies non-admins', () => {
    expect(resolveAccess('a@company.com', { adminEmails: [], allowedDomain: '' }))
      .toEqual({ allowed: false });
  });
});

describe('parseList', () => {
  it('splits, trims, drops blanks', () => {
    expect(parseList(' a@x.com, b@y.com ,')).toEqual(['a@x.com', 'b@y.com']);
  });
  it('undefined -> []', () => {
    expect(parseList(undefined)).toEqual([]);
  });
});
