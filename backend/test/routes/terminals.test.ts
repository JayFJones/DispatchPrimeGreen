import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

// Mock database before any imports that use it
vi.mock('../../src/db/client.js', () => {
  const sql = Object.assign(
    (..._args: unknown[]) => [] as unknown[],
    { array: (..._args: unknown[]) => [] as unknown[], json: (v: unknown) => v },
  );
  return { default: sql };
});

// Mock terminal query functions
const mockFindTerminalById = vi.fn();
const mockFindTerminalBySlug = vi.fn();
const mockListTerminals = vi.fn();
const mockListTerminalsByIds = vi.fn();
const mockCreateTerminal = vi.fn();
const mockUpdateTerminal = vi.fn();
const mockDeleteTerminal = vi.fn();

vi.mock('../../src/db/queries/terminals.js', () => ({
  findTerminalById: (...args: unknown[]) => mockFindTerminalById(...args),
  findTerminalBySlug: (...args: unknown[]) => mockFindTerminalBySlug(...args),
  listTerminals: (...args: unknown[]) => mockListTerminals(...args),
  listTerminalsByIds: (...args: unknown[]) => mockListTerminalsByIds(...args),
  createTerminal: (...args: unknown[]) => mockCreateTerminal(...args),
  updateTerminal: (...args: unknown[]) => mockUpdateTerminal(...args),
  deleteTerminal: (...args: unknown[]) => mockDeleteTerminal(...args),
}));

// Mock user queries (used by terminal listing for favorites and by terminal-scope middleware)
const mockFindUserById = vi.fn();
const mockFindUserPublicById = vi.fn();

vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  findUserPublicById: (...args: unknown[]) => mockFindUserPublicById(...args),
}));

vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

import { generateAccessToken, type JwtPayload } from '../../src/auth/jwt.js';

let server: FastifyInstance;

const terminalId = '660e8400-e29b-41d4-a716-446655440000';

const adminUser: JwtPayload = {
  sub: '770e8400-e29b-41d4-a716-446655440000',
  email: 'admin@example.com',
  roles: ['system_admin'],
  homeTerminalId: null,
};

const dispatcherUser: JwtPayload = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'dispatcher@example.com',
  roles: ['dispatcher'],
  homeTerminalId: terminalId,
};

const managerUser: JwtPayload = {
  sub: '880e8400-e29b-41d4-a716-446655440000',
  email: 'manager@example.com',
  roles: ['terminal_manager'],
  homeTerminalId: terminalId,
};

let adminToken: string;
let dispatcherToken: string;
let managerToken: string;

const sampleTerminal = {
  id: terminalId,
  name: 'Dallas Terminal',
  slug: 'dallas',
  agent: null,
  dcp: null,
  city: 'Dallas',
  state: 'TX',
  streetAddress: '123 Main St',
  streetAddress2: null,
  zip: '75001',
  country: 'US',
  latitude: 32.7767,
  longitude: -96.797,
  timezone: 'America/Chicago',
  geotabGroupId: null,
  terminalType: 'terminal',
  worklist: null,
  leaders: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeAll(async () => {
  process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-32-chars-long';
  process.env['REFRESH_TOKEN_SECRET'] = 'test-refresh-secret-at-least-32-chars';

  const { buildServer } = await import('../../src/server.js');
  server = await buildServer();
  await server.ready();

  adminToken = generateAccessToken(adminUser);
  dispatcherToken = generateAccessToken(dispatcherUser);
  managerToken = generateAccessToken(managerUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/terminals', () => {
  it('returns all terminals for system_admin', async () => {
    mockListTerminals.mockResolvedValueOnce([sampleTerminal]);

    const res = await supertest(server.server)
      .get('/api/terminals')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Dallas Terminal');
    expect(mockListTerminals).toHaveBeenCalledOnce();
  });

  it('returns only home/favorite terminals for dispatcher', async () => {
    mockFindUserById.mockResolvedValueOnce({
      id: dispatcherUser.sub,
      favoriteTerminalIds: [],
    });
    mockListTerminalsByIds.mockResolvedValueOnce([sampleTerminal]);

    const res = await supertest(server.server)
      .get('/api/terminals')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(mockListTerminalsByIds).toHaveBeenCalledWith([terminalId]);
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(server.server)
      .get('/api/terminals')
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/terminals/:id', () => {
  it('returns terminal by ID', async () => {
    mockFindTerminalById.mockResolvedValueOnce(sampleTerminal);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.slug).toBe('dallas');
  });

  it('returns 404 for non-existent terminal', async () => {
    mockFindTerminalById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('TERMINAL_NOT_FOUND');
  });
});

describe('POST /api/terminals', () => {
  it('creates a terminal for system_admin', async () => {
    mockFindTerminalBySlug.mockResolvedValueOnce(undefined);
    mockCreateTerminal.mockResolvedValueOnce(sampleTerminal);

    const res = await supertest(server.server)
      .post('/api/terminals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dallas Terminal',
        slug: 'dallas',
        timezone: 'America/Chicago',
        terminalType: 'terminal',
      })
      .expect(201);

    expect(res.body.name).toBe('Dallas Terminal');
  });

  it('returns 403 for non-admin', async () => {
    const res = await supertest(server.server)
      .post('/api/terminals')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        name: 'Dallas Terminal',
        slug: 'dallas',
        timezone: 'America/Chicago',
        terminalType: 'terminal',
      })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 409 for duplicate slug', async () => {
    mockFindTerminalBySlug.mockResolvedValueOnce(sampleTerminal);

    const res = await supertest(server.server)
      .post('/api/terminals')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Terminal',
        slug: 'dallas',
        timezone: 'America/Chicago',
        terminalType: 'terminal',
      })
      .expect(409);

    expect(res.body.error.code).toBe('SLUG_CONFLICT');
  });
});

describe('PATCH /api/terminals/:id', () => {
  it('allows terminal_manager to update own terminal', async () => {
    mockFindTerminalBySlug.mockResolvedValueOnce(undefined);
    mockUpdateTerminal.mockResolvedValueOnce({ ...sampleTerminal, name: 'Updated Terminal' });

    const res = await supertest(server.server)
      .patch(`/api/terminals/${terminalId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Updated Terminal' })
      .expect(200);

    expect(res.body.name).toBe('Updated Terminal');
  });

  it('returns 403 when terminal_manager tries to update another terminal', async () => {
    const otherTerminalId = '990e8400-e29b-41d4-a716-446655440000';

    const res = await supertest(server.server)
      .patch(`/api/terminals/${otherTerminalId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Nope' })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('DELETE /api/terminals/:id', () => {
  it('allows system_admin to delete a terminal', async () => {
    mockFindTerminalById.mockResolvedValueOnce(sampleTerminal);
    mockDeleteTerminal.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/terminals/${terminalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Terminal deleted');
  });

  it('returns 403 for non-admin delete', async () => {
    const res = await supertest(server.server)
      .delete(`/api/terminals/${terminalId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
