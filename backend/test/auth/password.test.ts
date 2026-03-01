import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/auth/password.js';

describe('hashPassword', () => {
  it('returns a bcrypt hash', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it('produces different hashes for same input (random salt)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });

  it('uses cost factor 12', async () => {
    const hash = await hashPassword('test-password');
    // bcrypt hash format: $2a$12$... where 12 is the cost factor
    const rounds = hash.split('$')[2];
    expect(rounds).toBe('12');
  });
});

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('correct-password', hash);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });
});
