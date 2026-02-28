import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

// Mock database before any imports that use it
vi.mock('../../src/db/client.js', () => ({ default: {} }));

// Mock user query functions
const mockFindUserByEmail = vi.fn();
const mockFindUserById = vi.fn();
const mockFindUserPublicById = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockUpdatePassword = vi.fn();
const mockUpdateLastLoggedIn = vi.fn().mockResolvedValue(undefined);
const mockListUsers = vi.fn();

vi.mock('../../src/db/queries/users.js', () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  findUserPublicById: (...args: unknown[]) => mockFindUserPublicById(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateUser: (...args: unknown[]) => mockUpdateUser(...args),
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
  updateLastLoggedIn: (...args: unknown[]) => mockUpdateLastLoggedIn(...args),
  listUsers: (...args: unknown[]) => mockListUsers(...args),
}));

vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

import { generateAccessToken, type JwtPayload } from '../../src/auth/jwt.js';
import { hashPassword } from '../../src/auth/password.js';

let server: FastifyInstance;

const testUser: JwtPayload = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  roles: ['dispatcher'],
  homeTerminalId: '660e8400-e29b-41d4-a716-446655440000',
};

const adminUser: JwtPayload = {
  sub: '770e8400-e29b-41d4-a716-446655440000',
  email: 'admin@example.com',
  roles: ['system_admin'],
  homeTerminalId: null,
};

let userToken: string;
let adminToken: string;

beforeAll(async () => {
  process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-32-chars-long';
  process.env['REFRESH_TOKEN_SECRET'] = 'test-refresh-secret-at-least-32-chars';

  const { buildServer } = await import('../../src/server.js');
  server = await buildServer();
  await server.ready();

  userToken = generateAccessToken(testUser);
  adminToken = generateAccessToken(adminUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/users/me', () => {
  it('returns the authenticated user profile', async () => {
    mockFindUserPublicById.mockResolvedValueOnce({
      id: testUser.sub,
      email: testUser.email,
      firstName: 'Test',
      lastName: 'User',
      roles: ['dispatcher'],
      homeTerminalId: testUser.homeTerminalId,
      favoriteTerminalIds: [],
      isActive: true,
      lastLoggedIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await supertest(server.server)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.email).toBe('user@example.com');
    expect(res.body.firstName).toBe('Test');
  });

  it('returns 401 without auth token', async () => {
    const res = await supertest(server.server)
      .get('/api/users/me')
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('PATCH /api/users/me', () => {
  it('updates the authenticated user profile', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      id: testUser.sub,
      email: testUser.email,
      firstName: 'Updated',
      lastName: 'Name',
      roles: ['dispatcher'],
      homeTerminalId: testUser.homeTerminalId,
      favoriteTerminalIds: [],
      isActive: true,
      lastLoggedIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await supertest(server.server)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ firstName: 'Updated', lastName: 'Name' })
      .expect(200);

    expect(res.body.firstName).toBe('Updated');
    expect(res.body.lastName).toBe('Name');
  });
});

describe('POST /api/users/me/password', () => {
  it('changes password with correct current password', async () => {
    const hashed = await hashPassword('old-password');

    mockFindUserById.mockResolvedValueOnce({
      id: testUser.sub,
      email: testUser.email,
      passwordHash: hashed,
      isActive: true,
      roles: ['dispatcher'],
      homeTerminalId: null,
      favoriteTerminalIds: [],
    });
    mockUpdatePassword.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .post('/api/users/me/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'old-password', newPassword: 'new-password-123' })
      .expect(200);

    expect(res.body.message).toBe('Password changed successfully');
    expect(mockUpdatePassword).toHaveBeenCalledOnce();
  });

  it('returns 400 for incorrect current password', async () => {
    const hashed = await hashPassword('correct-password');

    mockFindUserById.mockResolvedValueOnce({
      id: testUser.sub,
      email: testUser.email,
      passwordHash: hashed,
      isActive: true,
      roles: ['dispatcher'],
      homeTerminalId: null,
      favoriteTerminalIds: [],
    });

    const res = await supertest(server.server)
      .post('/api/users/me/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'new-password-123' })
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_PASSWORD');
  });
});

describe('GET /api/users (admin)', () => {
  it('returns paginated user list for system_admin', async () => {
    mockListUsers.mockResolvedValueOnce({
      users: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          roles: ['dispatcher'],
          homeTerminalId: null,
          favoriteTerminalIds: [],
          isActive: true,
          lastLoggedIn: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    });

    const res = await supertest(server.server)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.users).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('returns 403 for non-admin user', async () => {
    const res = await supertest(server.server)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/users/:id (admin)', () => {
  it('returns user by ID for system_admin', async () => {
    mockFindUserPublicById.mockResolvedValueOnce({
      id: testUser.sub,
      email: 'user@example.com',
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
      .get(`/api/users/${testUser.sub}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.email).toBe('user@example.com');
  });

  it('returns 403 for non-admin user', async () => {
    const res = await supertest(server.server)
      .get(`/api/users/${testUser.sub}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/users/:id (admin)', () => {
  it('allows system_admin to update any user', async () => {
    mockUpdateUser.mockResolvedValueOnce({
      id: testUser.sub,
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['dispatcher', 'team_lead'],
      homeTerminalId: null,
      favoriteTerminalIds: [],
      isActive: true,
      lastLoggedIn: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await supertest(server.server)
      .patch(`/api/users/${testUser.sub}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roles: ['dispatcher', 'team_lead'] })
      .expect(200);

    expect(res.body.roles).toEqual(['dispatcher', 'team_lead']);
  });

  it('returns 403 for non-admin user', async () => {
    const res = await supertest(server.server)
      .patch(`/api/users/${testUser.sub}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ roles: ['system_admin'] })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
