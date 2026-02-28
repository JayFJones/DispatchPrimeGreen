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

const mockFindVehicleById = vi.fn();
const mockListVehiclesByTerminal = vi.fn();
const mockCreateVehicle = vi.fn();
const mockUpdateVehicle = vi.fn();
const mockAssignVehicleToTerminal = vi.fn();
const mockRemoveVehicleFromTerminal = vi.fn();

vi.mock('../../src/db/queries/vehicles.js', () => ({
  findVehicleById: (...args: unknown[]) => mockFindVehicleById(...args),
  listVehiclesByTerminal: (...args: unknown[]) => mockListVehiclesByTerminal(...args),
  createVehicle: (...args: unknown[]) => mockCreateVehicle(...args),
  updateVehicle: (...args: unknown[]) => mockUpdateVehicle(...args),
  assignVehicleToTerminal: (...args: unknown[]) => mockAssignVehicleToTerminal(...args),
  removeVehicleFromTerminal: (...args: unknown[]) => mockRemoveVehicleFromTerminal(...args),
}));

// Mock other query modules used transitively
vi.mock('../../src/db/queries/terminals.js', () => ({
  findTerminalById: vi.fn(),
  findTerminalBySlug: vi.fn(),
  listTerminals: vi.fn(),
  listTerminalsByIds: vi.fn(),
  createTerminal: vi.fn(),
  updateTerminal: vi.fn(),
  deleteTerminal: vi.fn(),
}));

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
const vehicleId = 'bbe84000-e29b-41d4-a716-446655440002';

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

const equipmentManagerUser: JwtPayload = {
  sub: '990e8400-e29b-41d4-a716-446655440000',
  email: 'equip@example.com',
  roles: ['equipment_manager'],
  homeTerminalId: null,
};

let adminToken: string;
let dispatcherToken: string;
let equipmentManagerToken: string;

const sampleVehicle = {
  id: vehicleId,
  truckId: 'TRK-001',
  vin: null,
  licensePlate: null,
  licenseState: null,
  odometer: null,
  vehicleType: 'ST',
  status: 'active',
  geotabDeviceId: null,
  lastLocationLatitude: null,
  lastLocationLongitude: null,
  lastLocationUpdated: null,
  notes: null,
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
  equipmentManagerToken = generateAccessToken(equipmentManagerUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/terminals/:terminalId/vehicles', () => {
  it('returns vehicles for a terminal', async () => {
    mockListVehiclesByTerminal.mockResolvedValueOnce([sampleVehicle]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/vehicles`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].truckId).toBe('TRK-001');
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/vehicles`)
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/vehicles/:id', () => {
  it('returns a vehicle by ID', async () => {
    mockFindVehicleById.mockResolvedValueOnce(sampleVehicle);

    const res = await supertest(server.server)
      .get(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.truckId).toBe('TRK-001');
  });

  it('returns 404 for non-existent vehicle', async () => {
    mockFindVehicleById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('VEHICLE_NOT_FOUND');
  });
});

describe('POST /api/vehicles', () => {
  it('creates a vehicle for admin', async () => {
    mockCreateVehicle.mockResolvedValueOnce(sampleVehicle);

    const res = await supertest(server.server)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ truckId: 'TRK-001' })
      .expect(201);

    expect(res.body.truckId).toBe('TRK-001');
  });

  it('allows equipment_manager to create vehicles', async () => {
    mockCreateVehicle.mockResolvedValueOnce(sampleVehicle);

    const res = await supertest(server.server)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${equipmentManagerToken}`)
      .send({ truckId: 'TRK-001' })
      .expect(201);

    expect(res.body.truckId).toBe('TRK-001');
  });

  it('returns 403 for dispatcher', async () => {
    const res = await supertest(server.server)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ truckId: 'TRK-001' })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/vehicles/:id', () => {
  it('updates a vehicle', async () => {
    mockUpdateVehicle.mockResolvedValueOnce({ ...sampleVehicle, status: 'maintenance' });

    const res = await supertest(server.server)
      .patch(`/api/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'maintenance' })
      .expect(200);

    expect(res.body.status).toBe('maintenance');
  });
});

describe('POST /api/terminals/:terminalId/vehicles/:vehicleId (assign)', () => {
  it('assigns a vehicle to a terminal', async () => {
    mockFindVehicleById.mockResolvedValueOnce(sampleVehicle);
    mockAssignVehicleToTerminal.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Vehicle assigned to terminal');
  });
});

describe('DELETE /api/terminals/:terminalId/vehicles/:vehicleId (remove)', () => {
  it('removes a vehicle from a terminal', async () => {
    mockRemoveVehicleFromTerminal.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/terminals/${terminalId}/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Vehicle removed from terminal');
  });

  it('returns 403 for dispatcher', async () => {
    const res = await supertest(server.server)
      .delete(`/api/terminals/${terminalId}/vehicles/${vehicleId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
