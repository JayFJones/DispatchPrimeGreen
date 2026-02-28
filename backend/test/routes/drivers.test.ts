import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import type { FastifyInstance } from 'fastify';

vi.mock('../../src/db/client.js', () => {
  const sql = Object.assign(
    (..._args: unknown[]) => [] as unknown[],
    { array: (..._args: unknown[]) => [] as unknown[], json: (v: unknown) => v },
  );
  return { default: sql };
});

const mockFindDriverById = vi.fn();
const mockListDriversByTerminal = vi.fn();
const mockListBenchDriversByTerminal = vi.fn();
const mockCreateDriver = vi.fn();
const mockUpdateDriver = vi.fn();
const mockAssignDriverToTerminal = vi.fn();
const mockRemoveDriverFromTerminal = vi.fn();
const mockIsDriverInTerminal = vi.fn();
const mockAssignDriverToBench = vi.fn();
const mockRemoveDriverFromBench = vi.fn();

vi.mock('../../src/db/queries/drivers.js', () => ({
  findDriverById: (...args: unknown[]) => mockFindDriverById(...args),
  listDriversByTerminal: (...args: unknown[]) => mockListDriversByTerminal(...args),
  listBenchDriversByTerminal: (...args: unknown[]) => mockListBenchDriversByTerminal(...args),
  createDriver: (...args: unknown[]) => mockCreateDriver(...args),
  updateDriver: (...args: unknown[]) => mockUpdateDriver(...args),
  assignDriverToTerminal: (...args: unknown[]) => mockAssignDriverToTerminal(...args),
  removeDriverFromTerminal: (...args: unknown[]) => mockRemoveDriverFromTerminal(...args),
  isDriverInTerminal: (...args: unknown[]) => mockIsDriverInTerminal(...args),
  assignDriverToBench: (...args: unknown[]) => mockAssignDriverToBench(...args),
  removeDriverFromBench: (...args: unknown[]) => mockRemoveDriverFromBench(...args),
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

const mockFindUserById = vi.fn();
vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  findUserPublicById: vi.fn(),
}));

vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

import { generateAccessToken, type JwtPayload } from '../../src/auth/jwt.js';

let server: FastifyInstance;

const terminalId = '660e8400-e29b-41d4-a716-446655440000';
const driverId = 'aae84000-e29b-41d4-a716-446655440001';

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

const sampleDriver = {
  id: driverId,
  firstName: 'John',
  lastName: 'Doe',
  dob: null,
  employeeNumber: 'EMP001',
  geotabUsername: null,
  licenseNumber: null,
  licenseState: null,
  licenseType: null,
  licenseExpDate: null,
  status: null,
  workerClassification: 'W2',
  operatingAuthority: null,
  hireDate: null,
  terminationDate: null,
  rehireDate: null,
  primaryPhone: null,
  drivingExperience: null,
  cdlDrivingExperience: null,
  totalYearsExperience: null,
  worklist: null,
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
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/terminals/:terminalId/drivers', () => {
  it('returns drivers for a terminal', async () => {
    mockListDriversByTerminal.mockResolvedValueOnce([sampleDriver]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/drivers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].firstName).toBe('John');
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/drivers`)
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/drivers/:id', () => {
  it('returns a driver by ID', async () => {
    mockFindDriverById.mockResolvedValueOnce(sampleDriver);

    const res = await supertest(server.server)
      .get(`/api/drivers/${driverId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.employeeNumber).toBe('EMP001');
  });

  it('returns 404 for non-existent driver', async () => {
    mockFindDriverById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('DRIVER_NOT_FOUND');
  });
});

describe('POST /api/drivers', () => {
  it('creates a driver for admin', async () => {
    mockCreateDriver.mockResolvedValueOnce(sampleDriver);

    const res = await supertest(server.server)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'John', lastName: 'Doe' })
      .expect(201);

    expect(res.body.firstName).toBe('John');
  });

  it('returns 403 for dispatcher', async () => {
    const res = await supertest(server.server)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ firstName: 'John', lastName: 'Doe' })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/drivers/:id', () => {
  it('updates a driver', async () => {
    mockUpdateDriver.mockResolvedValueOnce({ ...sampleDriver, firstName: 'Jane' });

    const res = await supertest(server.server)
      .patch(`/api/drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Jane' })
      .expect(200);

    expect(res.body.firstName).toBe('Jane');
  });
});

describe('POST /api/terminals/:terminalId/drivers/:driverId (assign)', () => {
  it('assigns a driver to a terminal', async () => {
    mockFindDriverById.mockResolvedValueOnce(sampleDriver);
    mockAssignDriverToTerminal.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Driver assigned to terminal');
  });
});

describe('DELETE /api/terminals/:terminalId/drivers/:driverId (remove)', () => {
  it('removes a driver from a terminal', async () => {
    mockRemoveDriverFromTerminal.mockResolvedValueOnce(true);
    mockRemoveDriverFromBench.mockResolvedValueOnce(false);

    const res = await supertest(server.server)
      .delete(`/api/terminals/${terminalId}/drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Driver removed from terminal');
  });
});

describe('Bench drivers', () => {
  it('GET /api/terminals/:terminalId/bench-drivers lists bench drivers', async () => {
    mockListBenchDriversByTerminal.mockResolvedValueOnce([sampleDriver]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/bench-drivers`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('POST bench-drivers returns 400 if driver not in terminal', async () => {
    mockIsDriverInTerminal.mockResolvedValueOnce(false);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/bench-drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body.error.code).toBe('NOT_IN_TERMINAL');
  });

  it('POST bench-drivers succeeds when driver is in terminal', async () => {
    mockIsDriverInTerminal.mockResolvedValueOnce(true);
    mockAssignDriverToBench.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/bench-drivers/${driverId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Driver added to bench');
  });
});
