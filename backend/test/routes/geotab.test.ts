import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

// Mock DB client before any imports that use it
vi.mock('../../src/db/client.js', () => {
  const sql = Object.assign(
    (..._args: unknown[]) => [] as unknown[],
    { array: (..._args: unknown[]) => [] as unknown[], json: (v: unknown) => v },
  );
  return { default: sql };
});

// Mock audit logs
vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

// Mock terminal queries (used by terminal-scope middleware)
vi.mock('../../src/db/queries/terminals.js', () => ({
  findTerminalById: vi.fn(),
  findTerminalBySlug: vi.fn(),
  listTerminals: vi.fn(),
  listTerminalsByIds: vi.fn(),
  createTerminal: vi.fn(),
  updateTerminal: vi.fn(),
  deleteTerminal: vi.fn(),
}));

// Mock user queries (used by terminal-scope middleware fallback)
const mockFindUserById = vi.fn();
vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  findUserPublicById: vi.fn(),
}));

// Mock geotab session queries
const mockFindSessionByUserId = vi.fn();
const mockFindSessionPublicByUserId = vi.fn();
const mockUpsertSession = vi.fn();
const mockUpdateSessionToken = vi.fn();
const mockMarkSessionUnauthenticated = vi.fn();
const mockDeleteSession = vi.fn();

vi.mock('../../src/db/queries/geotab-sessions.js', () => ({
  findSessionByUserId: (...args: unknown[]) => mockFindSessionByUserId(...args),
  findSessionPublicByUserId: (...args: unknown[]) => mockFindSessionPublicByUserId(...args),
  upsertSession: (...args: unknown[]) => mockUpsertSession(...args),
  updateSessionToken: (...args: unknown[]) => mockUpdateSessionToken(...args),
  markSessionUnauthenticated: (...args: unknown[]) => mockMarkSessionUnauthenticated(...args),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
}));

// Mock driver queries
vi.mock('../../src/db/queries/drivers.js', () => ({
  findDriverById: vi.fn(),
  listDriversByTerminal: vi.fn(),
  listBenchDriversByTerminal: vi.fn(),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
  assignDriverToTerminal: vi.fn(),
  removeDriverFromTerminal: vi.fn(),
  isDriverInTerminal: vi.fn(),
  assignDriverToBench: vi.fn(),
  removeDriverFromBench: vi.fn(),
  findDriverByGeotabUsername: vi.fn(),
}));

// Mock vehicle queries
vi.mock('../../src/db/queries/vehicles.js', () => ({
  findVehicleById: vi.fn(),
  listVehiclesByTerminal: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  assignVehicleToTerminal: vi.fn(),
  removeVehicleFromTerminal: vi.fn(),
  findVehicleByGeotabDeviceId: vi.fn(),
  findVehicleByTruckId: vi.fn(),
}));

// Mock the Geotab API client
const mockGeotabAuthenticate = vi.fn();
const mockGeotabCall = vi.fn();
const mockGeotabMultiCall = vi.fn();

vi.mock('../../src/geotab/api-client.js', () => ({
  geotabAuthenticate: (...args: unknown[]) => mockGeotabAuthenticate(...args),
  geotabCall: (...args: unknown[]) => mockGeotabCall(...args),
  geotabMultiCall: (...args: unknown[]) => mockGeotabMultiCall(...args),
  GeotabApiError: class GeotabApiError extends Error {
    code: string;
    geotabError?: string;
    constructor(message: string, code: string, geotabError?: string) {
      super(message);
      this.name = 'GeotabApiError';
      this.code = code;
      this.geotabError = geotabError;
    }
  },
}));

// Mock encryption
vi.mock('../../src/geotab/encryption.js', () => ({
  encryptPassword: vi.fn().mockReturnValue('iv:tag:ciphertext'),
  decryptPassword: vi.fn().mockReturnValue('decrypted-password'),
}));

import { generateAccessToken, type JwtPayload } from '../../src/auth/jwt.js';
import { deviceCache, driverCache, groupCache } from '../../src/geotab/cache.js';

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

let adminToken: string;
let dispatcherToken: string;

const sampleSessionPublic = {
  id: 'aae84000-e29b-41d4-a716-446655440001',
  userId: adminUser.sub,
  database: 'testdb',
  username: 'geotab_user',
  sessionId: 'geotab-session-123',
  server: 'my123.geotab.com',
  isAuthenticated: true,
  lastAuthenticated: new Date(),
  authExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleSessionFull = {
  ...sampleSessionPublic,
  encryptedPassword: 'iv:tag:ciphertext',
};

beforeAll(async () => {
  process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-32-chars-long';
  process.env['REFRESH_TOKEN_SECRET'] = 'test-refresh-secret-at-least-32-chars';
  process.env['GEOTAB_ENCRYPTION_KEY'] = 'a'.repeat(64);

  const { buildServer } = await import('../../src/server.js');
  server = await buildServer();
  await server.ready();

  adminToken = generateAccessToken(adminUser);
  dispatcherToken = generateAccessToken(dispatcherUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  deviceCache.invalidateAll();
  driverCache.invalidateAll();
  groupCache.invalidateAll();
});

describe('POST /api/geotab/auth', () => {
  it('authenticates with Geotab and returns session', async () => {
    mockGeotabAuthenticate.mockResolvedValueOnce({
      credentials: { sessionId: 'new-sess', database: 'testdb', userName: 'user' },
      path: 'my456.geotab.com',
    });
    mockUpsertSession.mockResolvedValueOnce(sampleSessionPublic);

    const res = await supertest(server.server)
      .post('/api/geotab/auth')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ database: 'testdb', username: 'user', password: 'pass' })
      .expect(201);

    expect(res.body.database).toBe('testdb');
    expect(res.body.isAuthenticated).toBe(true);
    // Should not expose encrypted password
    expect(res.body.encryptedPassword).toBeUndefined();
  });

  it('returns 401 without authentication', async () => {
    await supertest(server.server)
      .post('/api/geotab/auth')
      .send({ database: 'testdb', username: 'user', password: 'pass' })
      .expect(401);
  });

  it('returns 400 for missing required fields', async () => {
    await supertest(server.server)
      .post('/api/geotab/auth')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ database: 'testdb' })
      .expect(400);
  });

  it('returns error when Geotab auth fails', async () => {
    const { GeotabApiError } = await import('../../src/geotab/api-client.js');
    mockGeotabAuthenticate.mockRejectedValueOnce(
      new GeotabApiError('Invalid credentials', 'GEOTAB_AUTH_EXPIRED', 'InvalidUserException'),
    );

    const res = await supertest(server.server)
      .post('/api/geotab/auth')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ database: 'testdb', username: 'user', password: 'wrongpass' })
      .expect(401);

    expect(res.body.error.code).toBe('GEOTAB_AUTH_EXPIRED');
  });
});

describe('GET /api/geotab/auth/status', () => {
  it('returns session status when authenticated', async () => {
    mockFindSessionPublicByUserId.mockResolvedValueOnce(sampleSessionPublic);

    const res = await supertest(server.server)
      .get('/api/geotab/auth/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.session).toBeTruthy();
    expect(res.body.session.database).toBe('testdb');
  });

  it('returns null session when not authenticated with Geotab', async () => {
    mockFindSessionPublicByUserId.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get('/api/geotab/auth/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.session).toBeNull();
  });
});

describe('DELETE /api/geotab/auth', () => {
  it('removes Geotab credentials', async () => {
    mockDeleteSession.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete('/api/geotab/auth')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Geotab credentials removed');
  });

  it('returns 404 when no session exists', async () => {
    mockDeleteSession.mockResolvedValueOnce(false);

    const res = await supertest(server.server)
      .delete('/api/geotab/auth')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('GEOTAB_NOT_AUTHENTICATED');
  });
});

describe('GET /api/geotab/devices', () => {
  it('returns devices from Geotab', async () => {
    mockFindSessionByUserId.mockResolvedValueOnce(sampleSessionFull);
    const devices = [{ id: 'dev1', name: 'Truck 1', serialNumber: 'SN001' }];
    mockGeotabCall.mockResolvedValueOnce(devices);

    const res = await supertest(server.server)
      .get('/api/geotab/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Truck 1');
    expect(res.body.fromCache).toBe(false);
  });

  it('returns 401 when not authenticated with Geotab', async () => {
    mockFindSessionByUserId.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get('/api/geotab/devices')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(401);

    expect(res.body.error.code).toBe('GEOTAB_NOT_AUTHENTICATED');
  });
});

describe('GET /api/geotab/fleet-status', () => {
  it('returns fleet status from MultiCall', async () => {
    mockFindSessionByUserId.mockResolvedValueOnce(sampleSessionFull);
    mockGeotabMultiCall.mockResolvedValueOnce([
      [{ id: 'dev1', name: 'Truck 1', serialNumber: 'SN001' }],
      [{
        device: { id: 'dev1' },
        latitude: 40.7128,
        longitude: -74.006,
        speed: 55,
        bearing: 180,
        isDriving: true,
        isDeviceCommunicating: true,
        currentStateDuration: '00:30:00',
        dateTime: '2025-01-01T12:00:00Z',
        isHistoricLastDriver: false,
      }],
      [],
    ]);

    const res = await supertest(server.server)
      .get('/api/geotab/fleet-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].deviceName).toBe('Truck 1');
    expect(res.body[0].latitude).toBe(40.7128);
    expect(res.body[0].isDriving).toBe(true);
  });
});

describe('POST /api/terminals/:terminalId/geotab/sync', () => {
  it('requires terminal_manager or higher role', async () => {
    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/geotab/sync`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 without auth', async () => {
    await supertest(server.server)
      .post(`/api/terminals/${terminalId}/geotab/sync`)
      .expect(401);
  });
});
