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

// Route substitution query mocks
const mockFindRouteSubstitutionById = vi.fn();
const mockListByRoute = vi.fn();
const mockCreateRouteSubstitution = vi.fn();
const mockUpdateRouteSubstitution = vi.fn();
const mockDeleteRouteSubstitution = vi.fn();

vi.mock('../../src/db/queries/route-substitutions.js', () => ({
  findRouteSubstitutionById: (...args: unknown[]) => mockFindRouteSubstitutionById(...args),
  listByRoute: (...args: unknown[]) => mockListByRoute(...args),
  findActiveSubstitution: vi.fn(),
  createRouteSubstitution: (...args: unknown[]) => mockCreateRouteSubstitution(...args),
  updateRouteSubstitution: (...args: unknown[]) => mockUpdateRouteSubstitution(...args),
  deleteRouteSubstitution: (...args: unknown[]) => mockDeleteRouteSubstitution(...args),
}));

// Route query mock (used by createSubstitution to verify route exists)
const mockFindRouteById = vi.fn();

vi.mock('../../src/db/queries/routes.js', () => ({
  findRouteById: (...args: unknown[]) => mockFindRouteById(...args),
  findRouteByTrkid: vi.fn(),
  listRoutesByTerminal: vi.fn(),
  listRoutesForDay: vi.fn(),
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
  deleteRoute: vi.fn(),
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
  listUnacknowledged: vi.fn().mockResolvedValue([]),
  createAlert: vi.fn(),
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn(),
  countUnresolved: vi.fn(),
}));

vi.mock('../../src/db/queries/availability.js', () => ({
  findAvailabilityById: vi.fn(),
  listByDriver: vi.fn(),
  listUnavailableDrivers: vi.fn(),
  createAvailability: vi.fn(),
  updateAvailability: vi.fn(),
  deleteAvailability: vi.fn(),
  isDriverAvailable: vi.fn(),
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
const routeId = 'aae84000-e29b-41d4-a716-446655440001';
const substitutionId = 'bbe84000-e29b-41d4-a716-446655440002';

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
  roles: ['compliance_manager'],
  homeTerminalId: null,
};

let adminToken: string;
let dispatcherToken: string;
let viewerToken: string;

const sampleSubstitution = {
  id: substitutionId,
  routeId,
  startDate: '2026-03-01',
  endDate: '2026-03-07',
  driverId: null,
  truckNumber: 'T-999',
  subUnitNumber: null,
  scanner: null,
  fuelCard: null,
  routeStopsModifications: null,
  reason: 'Driver on vacation',
  createdBy: dispatcherUser.sub,
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
  viewerToken = generateAccessToken(viewerUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

// -- GET /api/routes/:routeId/substitutions --

describe('GET /api/routes/:routeId/substitutions', () => {
  it('returns list of substitutions', async () => {
    mockListByRoute.mockResolvedValueOnce([sampleSubstitution]);

    const res = await supertest(server.server)
      .get(`/api/routes/${routeId}/substitutions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].truckNumber).toBe('T-999');
  });

  it('returns 401 without auth', async () => {
    await supertest(server.server)
      .get(`/api/routes/${routeId}/substitutions`)
      .expect(401);
  });
});

// -- GET /api/route-substitutions/:id --

describe('GET /api/route-substitutions/:id', () => {
  it('returns a substitution by ID', async () => {
    mockFindRouteSubstitutionById.mockResolvedValueOnce(sampleSubstitution);

    const res = await supertest(server.server)
      .get(`/api/route-substitutions/${substitutionId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.reason).toBe('Driver on vacation');
  });

  it('returns 404 for non-existent substitution', async () => {
    mockFindRouteSubstitutionById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/route-substitutions/${substitutionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('SUBSTITUTION_NOT_FOUND');
  });
});

// -- POST /api/routes/:routeId/substitutions --

describe('POST /api/routes/:routeId/substitutions', () => {
  const createBody = {
    routeId,
    startDate: '2026-03-01',
    endDate: '2026-03-07',
    reason: 'Driver on vacation',
    truckNumber: 'T-999',
  };

  it('creates and returns 201', async () => {
    mockFindRouteById.mockResolvedValueOnce({ id: routeId, terminalId });
    mockCreateRouteSubstitution.mockResolvedValueOnce(sampleSubstitution);

    const res = await supertest(server.server)
      .post(`/api/routes/${routeId}/substitutions`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send(createBody)
      .expect(201);

    expect(res.body.startDate).toBe('2026-03-01');
    expect(res.body.reason).toBe('Driver on vacation');
  });

  it('returns 404 when route not found', async () => {
    mockFindRouteById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .post(`/api/routes/${routeId}/substitutions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createBody)
      .expect(404);

    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns 403 for unauthorized role', async () => {
    await supertest(server.server)
      .post(`/api/routes/${routeId}/substitutions`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(createBody)
      .expect(403);
  });
});

// -- PATCH /api/route-substitutions/:id --

describe('PATCH /api/route-substitutions/:id', () => {
  it('updates and returns 200', async () => {
    const updated = { ...sampleSubstitution, reason: 'Updated reason' };
    mockUpdateRouteSubstitution.mockResolvedValueOnce(updated);

    const res = await supertest(server.server)
      .patch(`/api/route-substitutions/${substitutionId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ reason: 'Updated reason' })
      .expect(200);

    expect(res.body.reason).toBe('Updated reason');
  });

  it('returns 404 for non-existent substitution', async () => {
    mockUpdateRouteSubstitution.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .patch(`/api/route-substitutions/${substitutionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Updated reason' })
      .expect(404);

    expect(res.body.error.code).toBe('SUBSTITUTION_NOT_FOUND');
  });
});

// -- DELETE /api/route-substitutions/:id --

describe('DELETE /api/route-substitutions/:id', () => {
  it('deletes and returns message', async () => {
    mockFindRouteSubstitutionById.mockResolvedValueOnce(sampleSubstitution);
    mockDeleteRouteSubstitution.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/route-substitutions/${substitutionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Route substitution deleted');
  });
});
