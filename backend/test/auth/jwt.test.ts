import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../src/auth/jwt.js';

const TEST_JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
const TEST_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

const samplePayload: JwtPayload = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@example.com',
  roles: ['dispatcher'],
  homeTerminalId: '660e8400-e29b-41d4-a716-446655440000',
};

let originalJwtSecret: string | undefined;
let originalRefreshSecret: string | undefined;

beforeAll(() => {
  originalJwtSecret = process.env['JWT_SECRET'];
  originalRefreshSecret = process.env['REFRESH_TOKEN_SECRET'];
  process.env['JWT_SECRET'] = TEST_JWT_SECRET;
  process.env['REFRESH_TOKEN_SECRET'] = TEST_REFRESH_SECRET;
});

afterAll(() => {
  if (originalJwtSecret !== undefined) process.env['JWT_SECRET'] = originalJwtSecret;
  else delete process.env['JWT_SECRET'];
  if (originalRefreshSecret !== undefined) process.env['REFRESH_TOKEN_SECRET'] = originalRefreshSecret;
  else delete process.env['REFRESH_TOKEN_SECRET'];
});

describe('generateAccessToken', () => {
  it('returns a string', async () => {
    const { generateAccessToken } = await import('../../src/auth/jwt.js');
    const token = generateAccessToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyAccessToken', () => {
  it('round-trips correctly with generateAccessToken', async () => {
    const { generateAccessToken, verifyAccessToken } = await import('../../src/auth/jwt.js');
    const token = generateAccessToken(samplePayload);
    const decoded = verifyAccessToken(token);

    expect(decoded.sub).toBe(samplePayload.sub);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.roles).toEqual(samplePayload.roles);
    expect(decoded.homeTerminalId).toBe(samplePayload.homeTerminalId);
  });

  it('rejects token signed with wrong secret', async () => {
    const { verifyAccessToken } = await import('../../src/auth/jwt.js');
    const badToken = jwt.sign(samplePayload, 'wrong-secret-that-is-32-chars-long!!', { expiresIn: '15m' });

    expect(() => verifyAccessToken(badToken)).toThrow();
  });

  it('rejects expired token', async () => {
    const { verifyAccessToken } = await import('../../src/auth/jwt.js');
    const expiredToken = jwt.sign(samplePayload, TEST_JWT_SECRET, { expiresIn: '0s' });

    expect(() => verifyAccessToken(expiredToken)).toThrow();
  });
});

describe('generateRefreshToken', () => {
  it('returns a string', async () => {
    const { generateRefreshToken } = await import('../../src/auth/jwt.js');
    const token = generateRefreshToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyRefreshToken', () => {
  it('round-trips correctly with generateRefreshToken', async () => {
    const { generateRefreshToken, verifyRefreshToken } = await import('../../src/auth/jwt.js');
    const token = generateRefreshToken(samplePayload);
    const decoded = verifyRefreshToken(token);

    expect(decoded.sub).toBe(samplePayload.sub);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.roles).toEqual(samplePayload.roles);
    expect(decoded.homeTerminalId).toBe(samplePayload.homeTerminalId);
  });

  it('rejects access token (wrong secret)', async () => {
    const { generateAccessToken, verifyRefreshToken } = await import('../../src/auth/jwt.js');
    const accessToken = generateAccessToken(samplePayload);

    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});

describe('getSecret', () => {
  it('throws when JWT_SECRET env var is missing', async () => {
    const saved = process.env['JWT_SECRET'];
    delete process.env['JWT_SECRET'];

    try {
      const { generateAccessToken } = await import('../../src/auth/jwt.js');
      expect(() => generateAccessToken(samplePayload)).toThrow('JWT_SECRET environment variable is required');
    } finally {
      process.env['JWT_SECRET'] = saved;
    }
  });

  it('throws when REFRESH_TOKEN_SECRET env var is missing', async () => {
    const saved = process.env['REFRESH_TOKEN_SECRET'];
    delete process.env['REFRESH_TOKEN_SECRET'];

    try {
      const { generateRefreshToken } = await import('../../src/auth/jwt.js');
      expect(() => generateRefreshToken(samplePayload)).toThrow('REFRESH_TOKEN_SECRET environment variable is required');
    } finally {
      process.env['REFRESH_TOKEN_SECRET'] = saved;
    }
  });
});
