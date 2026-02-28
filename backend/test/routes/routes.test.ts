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

// Route query mocks
const mockFindRouteById = vi.fn();
const mockListRoutesByTerminal = vi.fn();
const mockListRoutesForDay = vi.fn();
const mockCreateRoute = vi.fn();
const mockUpdateRoute = vi.fn();
const mockDeleteRoute = vi.fn();
const mockFindRouteByTrkid = vi.fn();

vi.mock('../../src/db/queries/routes.js', () => ({
  findRouteById: (...args: unknown[]) => mockFindRouteById(...args),
  findRouteByTrkid: (...args: unknown[]) => mockFindRouteByTrkid(...args),
  listRoutesByTerminal: (...args: unknown[]) => mockListRoutesByTerminal(...args),
  listRoutesForDay: (...args: unknown[]) => mockListRoutesForDay(...args),
  createRoute: (...args: unknown[]) => mockCreateRoute(...args),
  updateRoute: (...args: unknown[]) => mockUpdateRoute(...args),
  deleteRoute: (...args: unknown[]) => mockDeleteRoute(...args),
}));

// Route stop query mocks
const mockFindRouteStopById = vi.fn();
const mockListRouteStopsByRoute = vi.fn();
const mockCreateRouteStop = vi.fn();
const mockCreateRouteStops = vi.fn();
const mockUpdateRouteStop = vi.fn();
const mockDeleteRouteStop = vi.fn();
const mockCountRouteStopsByRoute = vi.fn();

vi.mock('../../src/db/queries/route-stops.js', () => ({
  findRouteStopById: (...args: unknown[]) => mockFindRouteStopById(...args),
  listRouteStopsByRoute: (...args: unknown[]) => mockListRouteStopsByRoute(...args),
  createRouteStop: (...args: unknown[]) => mockCreateRouteStop(...args),
  createRouteStops: (...args: unknown[]) => mockCreateRouteStops(...args),
  updateRouteStop: (...args: unknown[]) => mockUpdateRouteStop(...args),
  deleteRouteStop: (...args: unknown[]) => mockDeleteRouteStop(...args),
  countRouteStopsByRoute: (...args: unknown[]) => mockCountRouteStopsByRoute(...args),
}));

// Shared mocks used by middleware
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

// Mock dispatch-related queries that get pulled in through server imports
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

vi.mock('../../src/db/queries/availability.js', () => ({
  findAvailabilityById: vi.fn(),
  listByDriver: vi.fn(),
  listUnavailableDrivers: vi.fn(),
  createAvailability: vi.fn(),
  updateAvailability: vi.fn(),
  deleteAvailability: vi.fn(),
  isDriverAvailable: vi.fn(),
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
const routeId = 'aae84000-e29b-41d4-a716-446655440001';
const stopId = 'bbe84000-e29b-41d4-a716-446655440002';

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

const sampleRoute = {
  id: routeId,
  trkid: 'RT-001',
  terminalId,
  legNumber: null,
  truckNumber: 'T100',
  subUnitNumber: null,
  defaultDriverId: null,
  fuelCard: null,
  scanner: null,
  departureTime: '08:00',
  sun: false, mon: true, tue: true, wed: true, thu: true, fri: true, sat: false,
  totalStops: 3,
  estimatedDuration: null,
  estimatedDistance: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleRouteStop = {
  id: stopId,
  routeId,
  customerId: null,
  sequence: 0,
  cid: 'C001',
  custName: 'Test Customer',
  address: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zipCode: '62701',
  latitude: 39.7817,
  longitude: -89.6501,
  eta: '09:00',
  etd: '09:30',
  commitTime: null,
  fixedTime: null,
  cube: null,
  timezone: null,
  openTime: null,
  closeTime: null,
  lanterId: null,
  customerPdc: null,
  geoResult: null,
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

describe('GET /api/terminals/:terminalId/routes', () => {
  it('returns routes for a terminal', async () => {
    mockListRoutesByTerminal.mockResolvedValueOnce([sampleRoute]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/routes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].trkid).toBe('RT-001');
  });

  it('returns 401 without auth', async () => {
    await supertest(server.server)
      .get(`/api/terminals/${terminalId}/routes`)
      .expect(401);
  });
});

describe('GET /api/routes/:id', () => {
  it('returns a route by ID', async () => {
    mockFindRouteById.mockResolvedValueOnce(sampleRoute);

    const res = await supertest(server.server)
      .get(`/api/routes/${routeId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.trkid).toBe('RT-001');
  });

  it('returns 404 for non-existent route', async () => {
    mockFindRouteById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/routes/${routeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('POST /api/terminals/:terminalId/routes', () => {
  it('creates a route for admin', async () => {
    mockCreateRoute.mockResolvedValueOnce(sampleRoute);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/routes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trkid: 'RT-001', terminalId })
      .expect(201);

    expect(res.body.trkid).toBe('RT-001');
  });

  it('returns 403 for dispatcher', async () => {
    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/routes`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ trkid: 'RT-001', terminalId })
      .expect(403);

    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

describe('PATCH /api/routes/:id', () => {
  it('updates a route', async () => {
    mockUpdateRoute.mockResolvedValueOnce({ ...sampleRoute, truckNumber: 'T200' });

    const res = await supertest(server.server)
      .patch(`/api/routes/${routeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ truckNumber: 'T200' })
      .expect(200);

    expect(res.body.truckNumber).toBe('T200');
  });
});

describe('DELETE /api/routes/:id', () => {
  it('deletes a route', async () => {
    mockFindRouteById.mockResolvedValueOnce(sampleRoute);
    mockDeleteRoute.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/routes/${routeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Route deleted');
  });
});

describe('GET /api/routes/:routeId/stops', () => {
  it('returns stops for a route', async () => {
    mockFindRouteById.mockResolvedValueOnce(sampleRoute);
    mockListRouteStopsByRoute.mockResolvedValueOnce([sampleRouteStop]);

    const res = await supertest(server.server)
      .get(`/api/routes/${routeId}/stops`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].custName).toBe('Test Customer');
  });
});

describe('POST /api/routes/:routeId/stops', () => {
  it('creates a route stop', async () => {
    mockFindRouteById.mockResolvedValueOnce(sampleRoute);
    mockCreateRouteStop.mockResolvedValueOnce(sampleRouteStop);
    mockCountRouteStopsByRoute.mockResolvedValueOnce(4);
    mockUpdateRoute.mockResolvedValueOnce({ ...sampleRoute, totalStops: 4 });

    const res = await supertest(server.server)
      .post(`/api/routes/${routeId}/stops`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ routeId, sequence: 3 })
      .expect(201);

    expect(res.body.custName).toBe('Test Customer');
  });
});

describe('PATCH /api/route-stops/:id', () => {
  it('updates a route stop', async () => {
    mockUpdateRouteStop.mockResolvedValueOnce({ ...sampleRouteStop, custName: 'Updated' });

    const res = await supertest(server.server)
      .patch(`/api/route-stops/${stopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ custName: 'Updated' })
      .expect(200);

    expect(res.body.custName).toBe('Updated');
  });
});

describe('DELETE /api/route-stops/:id', () => {
  it('deletes a route stop', async () => {
    mockFindRouteStopById.mockResolvedValueOnce(sampleRouteStop);
    mockDeleteRouteStop.mockResolvedValueOnce(true);
    mockCountRouteStopsByRoute.mockResolvedValueOnce(2);
    mockUpdateRoute.mockResolvedValueOnce({ ...sampleRoute, totalStops: 2 });

    const res = await supertest(server.server)
      .delete(`/api/route-stops/${stopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Route stop deleted');
  });
});
