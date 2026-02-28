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

const mockFindEquipmentById = vi.fn();
const mockListEquipment = vi.fn();
const mockCreateEquipment = vi.fn();
const mockUpdateEquipment = vi.fn();
const mockDeleteEquipment = vi.fn();

vi.mock('../../src/db/queries/equipment.js', () => ({
  findEquipmentById: (...args: unknown[]) => mockFindEquipmentById(...args),
  listEquipment: (...args: unknown[]) => mockListEquipment(...args),
  createEquipment: (...args: unknown[]) => mockCreateEquipment(...args),
  updateEquipment: (...args: unknown[]) => mockUpdateEquipment(...args),
  deleteEquipment: (...args: unknown[]) => mockDeleteEquipment(...args),
}));

// Mock other query modules used transitively by registered route plugins
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

vi.mock('../../src/db/queries/vehicles.js', () => ({
  findVehicleById: vi.fn(),
  listVehiclesByTerminal: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  assignVehicleToTerminal: vi.fn(),
  removeVehicleFromTerminal: vi.fn(),
}));

vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: vi.fn(),
  findUserPublicById: vi.fn(),
}));

vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

import { generateAccessToken, type JwtPayload } from '../../src/auth/jwt.js';

let server: FastifyInstance;

const equipmentId = 'cce84000-e29b-41d4-a716-446655440003';

const adminUser: JwtPayload = {
  sub: '770e8400-e29b-41d4-a716-446655440000',
  email: 'admin@example.com',
  roles: ['system_admin'],
  homeTerminalId: null,
};

const equipmentManagerUser: JwtPayload = {
  sub: '990e8400-e29b-41d4-a716-446655440000',
  email: 'equip@example.com',
  roles: ['equipment_manager'],
  homeTerminalId: null,
};

const opsManagementUser: JwtPayload = {
  sub: 'aae84000-e29b-41d4-a716-446655440010',
  email: 'ops@example.com',
  roles: ['operations_management'],
  homeTerminalId: null,
};

const dispatcherUser: JwtPayload = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'dispatcher@example.com',
  roles: ['dispatcher'],
  homeTerminalId: '660e8400-e29b-41d4-a716-446655440000',
};

let adminToken: string;
let equipmentManagerToken: string;
let opsManagementToken: string;
let dispatcherToken: string;

const sampleEquipment = {
  id: equipmentId,
  equipmentNumber: 'EQ-001',
  equipmentType: 'truck',
  status: 'active',
  operationalStatus: null,
  truckType: null,
  make: 'Freightliner',
  model: 'Cascadia',
  year: '2023',
  vin: null,
  licensePlate: null,
  registrationState: null,
  registrationExpiry: null,
  insurancePolicy: null,
  insuranceExpiry: null,
  lastMaintenanceDate: null,
  nextMaintenanceDate: null,
  mileage: null,
  fuelType: 'diesel',
  capacity: null,
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
  equipmentManagerToken = generateAccessToken(equipmentManagerUser);
  opsManagementToken = generateAccessToken(opsManagementUser);
  dispatcherToken = generateAccessToken(dispatcherUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/equipment', () => {
  it('returns all equipment for equipment_manager', async () => {
    mockListEquipment.mockResolvedValueOnce([sampleEquipment]);

    const res = await supertest(server.server)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${equipmentManagerToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].equipmentNumber).toBe('EQ-001');
  });

  it('returns all equipment for operations_management', async () => {
    mockListEquipment.mockResolvedValueOnce([sampleEquipment]);

    const res = await supertest(server.server)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${opsManagementToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
  });

  it('returns 403 for dispatcher', async () => {
    const res = await supertest(server.server)
      .get('/api/equipment')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 without auth', async () => {
    const res = await supertest(server.server)
      .get('/api/equipment')
      .expect(401);

    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/equipment/:id', () => {
  it('returns equipment by ID', async () => {
    mockFindEquipmentById.mockResolvedValueOnce(sampleEquipment);

    const res = await supertest(server.server)
      .get(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.make).toBe('Freightliner');
  });

  it('returns 404 for non-existent equipment', async () => {
    mockFindEquipmentById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('EQUIPMENT_NOT_FOUND');
  });
});

describe('POST /api/equipment', () => {
  it('creates equipment for equipment_manager', async () => {
    mockCreateEquipment.mockResolvedValueOnce(sampleEquipment);

    const res = await supertest(server.server)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${equipmentManagerToken}`)
      .send({
        equipmentNumber: 'EQ-001',
        equipmentType: 'truck',
        status: 'active',
      })
      .expect(201);

    expect(res.body.equipmentNumber).toBe('EQ-001');
  });

  it('returns 403 for operations_management (read-only for creation)', async () => {
    const res = await supertest(server.server)
      .post('/api/equipment')
      .set('Authorization', `Bearer ${opsManagementToken}`)
      .send({
        equipmentNumber: 'EQ-002',
        equipmentType: 'trailer',
        status: 'active',
      })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/equipment/:id', () => {
  it('updates equipment', async () => {
    mockUpdateEquipment.mockResolvedValueOnce({ ...sampleEquipment, status: 'maintenance' });

    const res = await supertest(server.server)
      .patch(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'maintenance' })
      .expect(200);

    expect(res.body.status).toBe('maintenance');
  });
});

describe('DELETE /api/equipment/:id', () => {
  it('deletes equipment for system_admin', async () => {
    mockFindEquipmentById.mockResolvedValueOnce(sampleEquipment);
    mockDeleteEquipment.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Equipment deleted');
  });

  it('returns 403 for dispatcher', async () => {
    const res = await supertest(server.server)
      .delete(`/api/equipment/${equipmentId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
