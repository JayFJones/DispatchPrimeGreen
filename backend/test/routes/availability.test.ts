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

// Availability query mocks
const mockFindAvailabilityById = vi.fn();
const mockListByDriver = vi.fn();
const mockListUnavailableDrivers = vi.fn();
const mockCreateAvailability = vi.fn();
const mockUpdateAvailability = vi.fn();
const mockDeleteAvailability = vi.fn();

vi.mock('../../src/db/queries/availability.js', () => ({
  findAvailabilityById: (...args: unknown[]) => mockFindAvailabilityById(...args),
  listByDriver: (...args: unknown[]) => mockListByDriver(...args),
  listUnavailableDrivers: (...args: unknown[]) => mockListUnavailableDrivers(...args),
  createAvailability: (...args: unknown[]) => mockCreateAvailability(...args),
  updateAvailability: (...args: unknown[]) => mockUpdateAvailability(...args),
  deleteAvailability: (...args: unknown[]) => mockDeleteAvailability(...args),
  isDriverAvailable: vi.fn(),
}));

// Shared mocks
vi.mock('../../src/db/queries/terminals.js', () => ({
  findTerminalById: vi.fn(),
  findTerminalBySlug: vi.fn(),
  listTerminals: vi.fn(),
  listTerminalsByIds: vi.fn(),
  createTerminal: vi.fn(),
  updateTerminal: vi.fn(),
  deleteTerminal: vi.fn(),
}));

vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: vi.fn(),
  findUserPublicById: vi.fn(),
}));

vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/db/queries/routes.js', () => ({
  findRouteById: vi.fn(),
  findRouteByTrkid: vi.fn(),
  listRoutesByTerminal: vi.fn(),
  listRoutesForDay: vi.fn(),
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
  deleteRoute: vi.fn(),
}));

vi.mock('../../src/db/queries/route-stops.js', () => ({
  findRouteStopById: vi.fn(),
  listRouteStopsByRoute: vi.fn(),
  createRouteStop: vi.fn(),
  createRouteStops: vi.fn(),
  updateRouteStop: vi.fn(),
  deleteRouteStop: vi.fn(),
  countRouteStopsByRoute: vi.fn(),
}));

vi.mock('../../src/db/queries/dispatch-events.js', () => ({
  findDispatchEventById: vi.fn(),
  findByRouteAndDate: vi.fn(),
  listByTerminal: vi.fn(),
  createDispatchEvent: vi.fn(),
  updateDispatchEvent: vi.fn(),
  deleteDispatchEvent: vi.fn(),
}));

vi.mock('../../src/db/queries/dispatch-event-stops.js', () => ({
  findDispatchEventStopById: vi.fn(),
  listByDispatchEvent: vi.fn(),
  createDispatchEventStop: vi.fn(),
  createDispatchEventStops: vi.fn(),
  updateDispatchEventStop: vi.fn(),
  countCompletedStops: vi.fn(),
}));

vi.mock('../../src/db/queries/alerts.js', () => ({
  findAlertById: vi.fn(),
  listByTerminal: vi.fn(),
  listUnacknowledged: vi.fn(),
  createAlert: vi.fn(),
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn(),
  countUnresolved: vi.fn(),
}));

vi.mock('../../src/db/queries/route-substitutions.js', () => ({
  findRouteSubstitutionById: vi.fn(),
  listByRoute: vi.fn(),
  findActiveSubstitution: vi.fn(),
  createRouteSubstitution: vi.fn(),
  updateRouteSubstitution: vi.fn(),
  deleteRouteSubstitution: vi.fn(),
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
  findVehicleByGeotabDeviceId: vi.fn(),
  findVehicleByTruckId: vi.fn(),
}));

vi.mock('../../src/db/queries/equipment.js', () => ({
  findEquipmentById: vi.fn(),
  listEquipment: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
}));

vi.mock('../../src/db/queries/geotab-sessions.js', () => ({
  findSessionByUserId: vi.fn(),
  findSessionPublicByUserId: vi.fn(),
  upsertSession: vi.fn(),
  updateSessionToken: vi.fn(),
  markSessionUnauthenticated: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock('../../src/realtime/socket-server.js', () => ({
  getSocketManager: vi.fn().mockReturnValue(null),
  initSocketManager: vi.fn(),
}));

import { generateAccessToken, type JwtPayload } from '../../src/auth/jwt.js';

let server: FastifyInstance;

const terminalId = '660e8400-e29b-41d4-a716-446655440000';
const driverId = 'aae84000-e29b-41d4-a716-446655440001';
const availabilityId = 'bbe84000-e29b-41d4-a716-446655440002';

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

const viewerUser: JwtPayload = {
  sub: '440e8400-e29b-41d4-a716-446655440000',
  email: 'viewer@example.com',
  roles: ['equipment_manager'],
  homeTerminalId: null,
};

let adminToken: string;
let dispatcherToken: string;
let viewerToken: string;

const sampleAvailability = {
  id: availabilityId,
  driverId,
  startDate: '2026-03-01',
  endDate: '2026-03-05',
  availabilityType: 'pto',
  reason: 'Vacation',
  notes: null,
  userId: dispatcherUser.sub,
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
  viewerToken = generateAccessToken(viewerUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/drivers/:driverId/availability', () => {
  it('returns availability for a driver', async () => {
    mockListByDriver.mockResolvedValueOnce([sampleAvailability]);

    const res = await supertest(server.server)
      .get(`/api/drivers/${driverId}/availability`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].availabilityType).toBe('pto');
  });
});

describe('GET /api/terminals/:terminalId/unavailable-drivers', () => {
  it('returns unavailable drivers for date', async () => {
    mockListUnavailableDrivers.mockResolvedValueOnce([sampleAvailability]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/unavailable-drivers?date=2026-03-03`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/availability', () => {
  it('creates an availability record', async () => {
    mockCreateAvailability.mockResolvedValueOnce(sampleAvailability);

    const res = await supertest(server.server)
      .post('/api/availability')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        driverId,
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        availabilityType: 'pto',
        reason: 'Vacation',
      })
      .expect(201);

    expect(res.body.availabilityType).toBe('pto');
  });

  it('returns 403 for unauthorized role', async () => {
    await supertest(server.server)
      .post('/api/availability')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        driverId,
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        availabilityType: 'pto',
      })
      .expect(403);
  });
});

describe('PATCH /api/availability/:id', () => {
  it('updates an availability record', async () => {
    mockUpdateAvailability.mockResolvedValueOnce({
      ...sampleAvailability,
      endDate: '2026-03-10',
    });

    const res = await supertest(server.server)
      .patch(`/api/availability/${availabilityId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ endDate: '2026-03-10' })
      .expect(200);

    expect(res.body.endDate).toBe('2026-03-10');
  });
});

describe('DELETE /api/availability/:id', () => {
  it('deletes an availability record', async () => {
    mockFindAvailabilityById.mockResolvedValueOnce(sampleAvailability);
    mockDeleteAvailability.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/availability/${availabilityId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.message).toBe('Availability record deleted');
  });

  it('returns 404 for non-existent record', async () => {
    mockFindAvailabilityById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .delete(`/api/availability/${availabilityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('AVAILABILITY_NOT_FOUND');
  });
});
