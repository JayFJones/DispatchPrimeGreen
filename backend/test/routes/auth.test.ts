import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

// Mock database before any imports that use it
vi.mock('../../src/db/client.js', () => ({ default: {} }));

// Mock user query functions
const mockFindUserByEmail = vi.fn();
const mockFindUserById = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateLastLoggedIn = vi.fn().mockResolvedValue(undefined);

vi.mock('../../src/db/queries/users.js', () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateLastLoggedIn: (...args: unknown[]) => mockUpdateLastLoggedIn(...args),
  findUserPublicById: vi.fn(),
  updateUser: vi.fn(),
  updatePassword: vi.fn(),
  listUsers: vi.fn(),
}));

// Mock audit log
vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

import { hashPassword } from '../../src/auth/password.js';

let server: FastifyInstance;

beforeAll(async () => {
  // Set required env vars for JWT
  process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-32-chars-long';
  process.env['REFRESH_TOKEN_SECRET'] = 'test-refresh-secret-at-least-32-chars';

  const { buildServer } = await import('../../src/server.js');
  server = await buildServer();
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(undefined); // no existing user
    mockCreateUser.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      homeTerminalId: null,
      favoriteTerminalIds: [],
      isActive: true,
      lastLoggedIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await supertest(server.server)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toHaveProperty('sub', '550e8400-e29b-41d4-a716-446655440000');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 409 when email already exists', async () => {
    mockFindUserByEmail.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'existing@example.com',
    });

    const res = await supertest(server.server)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: 'password123' })
      .expect(409);

    expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
  });
});

describe('POST /api/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const hashed = await hashPassword('correct-password');

    mockFindUserByEmail.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      passwordHash: hashed,
      firstName: 'Test',
      lastName: 'User',
      roles: ['dispatcher'],
      homeTerminalId: null,
      favoriteTerminalIds: [],
      isActive: true,
      lastLoggedIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await supertest(server.server)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'correct-password' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe('user@example.com');
    expect(res.body.user.roles).toEqual(['dispatcher']);
    // Refresh cookie should be set
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const hashed = await hashPassword('correct-password');

    mockFindUserByEmail.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      passwordHash: hashed,
      isActive: true,
      roles: [],
      homeTerminalId: null,
      favoriteTerminalIds: [],
    });

    const res = await supertest(server.server)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for non-existent user', async () => {
    mockFindUserByEmail.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 403 for deactivated account', async () => {
    const hashed = await hashPassword('password123');

    mockFindUserByEmail.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'deactivated@example.com',
      passwordHash: hashed,
      isActive: false,
      roles: [],
      homeTerminalId: null,
      favoriteTerminalIds: [],
    });

    const res = await supertest(server.server)
      .post('/api/auth/login')
      .send({ email: 'deactivated@example.com', password: 'password123' })
      .expect(403);

    expect(res.body.error.code).toBe('ACCOUNT_DEACTIVATED');
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns new access token when given valid refresh cookie', async () => {
    // First login to get a refresh cookie
    const hashed = await hashPassword('password123');

    mockFindUserByEmail.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      passwordHash: hashed,
      roles: ['dispatcher'],
      homeTerminalId: null,
      favoriteTerminalIds: [],
      isActive: true,
    });

    const loginRes = await supertest(server.server)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' })
      .expect(200);

    // Extract refresh cookie
    const cookies = loginRes.headers['set-cookie'] as string[];
    const refreshCookie = cookies?.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();

    // Use the cookie to refresh
    mockFindUserByEmail.mockResolvedValueOnce({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      roles: ['dispatcher'],
      homeTerminalId: null,
      favoriteTerminalIds: [],
      isActive: true,
    });

    const refreshRes = await supertest(server.server)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie!)
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(refreshRes.body.user.email).toBe('user@example.com');
  });

  it('returns 401 when no refresh cookie is present', async () => {
    const res = await supertest(server.server)
      .post('/api/auth/refresh')
      .expect(401);

    expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the refresh cookie', async () => {
    const res = await supertest(server.server)
      .post('/api/auth/logout')
      .expect(200);

    expect(res.body.message).toBe('Logged out');
    // Cookie should be cleared (set with empty value or past expiry)
    const cookies = res.headers['set-cookie'] as string[];
    const refreshCookie = cookies?.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
  });
});
