import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';

// Generate a valid 32-byte key as 64 hex chars
const TEST_KEY = randomBytes(32).toString('hex');
const ALT_KEY = randomBytes(32).toString('hex');

describe('encryption', () => {
  let encryptPassword: typeof import('../../src/geotab/encryption.js').encryptPassword;
  let decryptPassword: typeof import('../../src/geotab/encryption.js').decryptPassword;

  beforeEach(async () => {
    process.env['GEOTAB_ENCRYPTION_KEY'] = TEST_KEY;
    // Re-import to pick up env change (module caches the import, but key is read at call time)
    const mod = await import('../../src/geotab/encryption.js');
    encryptPassword = mod.encryptPassword;
    decryptPassword = mod.decryptPassword;
  });

  afterEach(() => {
    delete process.env['GEOTAB_ENCRYPTION_KEY'];
  });

  it('round-trips a password through encrypt and decrypt', () => {
    const password = 'my-secret-geotab-password!@#$%';
    const encrypted = encryptPassword(password);
    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe(password);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const password = 'same-password';
    const a = encryptPassword(password);
    const b = encryptPassword(password);
    expect(a).not.toBe(b);
    // But both decrypt to the same value
    expect(decryptPassword(a)).toBe(password);
    expect(decryptPassword(b)).toBe(password);
  });

  it('produces output in iv:authTag:ciphertext format', () => {
    const encrypted = encryptPassword('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty
    expect(parts[2]!.length).toBeGreaterThan(0);
  });

  it('throws when decrypting with a wrong key', () => {
    const encrypted = encryptPassword('secret');
    process.env['GEOTAB_ENCRYPTION_KEY'] = ALT_KEY;
    expect(() => decryptPassword(encrypted)).toThrow();
  });

  it('throws when GEOTAB_ENCRYPTION_KEY is not set', () => {
    delete process.env['GEOTAB_ENCRYPTION_KEY'];
    expect(() => encryptPassword('test')).toThrow('GEOTAB_ENCRYPTION_KEY environment variable is not set');
  });

  it('throws when GEOTAB_ENCRYPTION_KEY is wrong length', () => {
    process.env['GEOTAB_ENCRYPTION_KEY'] = 'tooshort';
    expect(() => encryptPassword('test')).toThrow('GEOTAB_ENCRYPTION_KEY must be 64 hex characters');
  });

  it('throws when ciphertext is tampered with', () => {
    const encrypted = encryptPassword('secret');
    const parts = encrypted.split(':');
    // Flip a character in the ciphertext
    const tampered = parts[2]!.replace(/[0-9a-f]/, (c) => c === '0' ? '1' : '0');
    const tamperedStr = `${parts[0]}:${parts[1]}:${tampered}`;
    expect(() => decryptPassword(tamperedStr)).toThrow();
  });

  it('throws on invalid format', () => {
    expect(() => decryptPassword('not-valid-format')).toThrow('Invalid encrypted password format');
  });

  it('handles empty string password', () => {
    const encrypted = encryptPassword('');
    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe('');
  });

  it('handles unicode passwords', () => {
    const password = 'pässwörd-日本語-🔐';
    const encrypted = encryptPassword(password);
    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe(password);
  });
});
