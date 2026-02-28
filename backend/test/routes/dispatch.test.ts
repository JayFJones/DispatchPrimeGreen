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

// Dispatch event query mocks
const mockFindDispatchEventById = vi.fn();
const mockFindByRouteAndDate = vi.fn();
const mockListByTerminal = vi.fn();
const mockCreateDispatchEvent = vi.fn();
const mockUpdateDispatchEvent = vi.fn();
const mockDeleteDispatchEvent = vi.fn();

vi.mock('../../src/db/queries/dispatch-events.js', () => ({
  findDispatchEventById: (...args: unknown[]) => mockFindDispatchEventById(...args),
  findByRouteAndDate: (...args: unknown[]) => mockFindByRouteAndDate(...args),
  listByTerminal: (...args: unknown[]) => mockListByTerminal(...args),
  createDispatchEvent: (...args: unknown[]) => mockCreateDispatchEvent(...args),
  updateDispatchEvent: (...args: unknown[]) => mockUpdateDispatchEvent(...args),
  deleteDispatchEvent: (...args: unknown[]) => mockDeleteDispatchEvent(...args),
}));

// Dispatch event stop mocks
const mockFindDispatchEventStopById = vi.fn();
const mockListByDispatchEvent = vi.fn();
const mockCreateDispatchEventStops = vi.fn();
const mockUpdateDispatchEventStop = vi.fn();
const mockCountCompletedStops = vi.fn();

vi.mock('../../src/db/queries/dispatch-event-stops.js', () => ({
  findDispatchEventStopById: (...args: unknown[]) => mockFindDispatchEventStopById(...args),
  listByDispatchEvent: (...args: unknown[]) => mockListByDispatchEvent(...args),
  createDispatchEventStop: vi.fn(),
  createDispatchEventStops: (...args: unknown[]) => mockCreateDispatchEventStops(...args),
  updateDispatchEventStop: (...args: unknown[]) => mockUpdateDispatchEventStop(...args),
  countCompletedStops: (...args: unknown[]) => mockCountCompletedStops(...args),
}));

// Route query mocks
const mockFindRouteById = vi.fn();
const mockListRoutesForDay = vi.fn();

vi.mock('../../src/db/queries/routes.js', () => ({
  findRouteById: (...args: unknown[]) => mockFindRouteById(...args),
  findRouteByTrkid: vi.fn(),
  listRoutesByTerminal: vi.fn(),
  listRoutesForDay: (...args: unknown[]) => mockListRoutesForDay(...args),
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
  deleteRoute: vi.fn(),
}));

vi.mock('../../src/db/queries/route-stops.js', () => ({
  findRouteStopById: vi.fn(),
  listRouteStopsByRoute: vi.fn().mockResolvedValue([]),
  createRouteStop: vi.fn(),
  createRouteStops: vi.fn(),
  updateRouteStop: vi.fn(),
  deleteRouteStop: vi.fn(),
  countRouteStopsByRoute: vi.fn(),
}));

// Availability mock
const mockIsDriverAvailable = vi.fn();

vi.mock('../../src/db/queries/availability.js', () => ({
  findAvailabilityById: vi.fn(),
  listByDriver: vi.fn(),
  listUnavailableDrivers: vi.fn(),
  createAvailability: vi.fn(),
  updateAvailability: vi.fn(),
  deleteAvailability: vi.fn(),
  isDriverAvailable: (...args: unknown[]) => mockIsDriverAvailable(...args),
}));

// Route substitutions mock
const mockFindActiveSubstitution = vi.fn();

vi.mock('../../src/db/queries/route-substitutions.js', () => ({
  findRouteSubstitutionById: vi.fn(),
  listByRoute: vi.fn(),
  findActiveSubstitution: (...args: unknown[]) => mockFindActiveSubstitution(...args),
  createRouteSubstitution: vi.fn(),
  updateRouteSubstitution: vi.fn(),
  deleteRouteSubstitution: vi.fn(),
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

vi.mock('../../src/db/queries/alerts.js', () => ({
  findAlertById: vi.fn(),
  listByTerminal: vi.fn(),
  listUnacknowledged: vi.fn(),
  createAlert: vi.fn(),
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn(),
  countUnresolved: vi.fn(),
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
const dispatchId = 'bbe84000-e29b-41d4-a716-446655440002';
const driverId = 'cce84000-e29b-41d4-a716-446655440003';
const stopId = 'dde84000-e29b-41d4-a716-446655440004';

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
  truckNumber: 'T100',
  defaultDriverId: driverId,
  departureTime: '08:00',
  totalStops: 2,
};

const sampleDispatch = {
  id: dispatchId,
  routeId,
  terminalId,
  executionDate: '2026-03-01',
  assignedDriverId: driverId,
  assignedTruckId: 'T100',
  assignedSubUnitId: null,
  status: 'planned',
  priority: 'normal',
  plannedDepartureTime: '08:00',
  actualDepartureTime: null,
  estimatedReturnTime: null,
  actualReturnTime: null,
  estimatedCompletionTime: null,
  actualCompletionTime: null,
  estimatedDelayMinutes: null,
  cancellationReason: null,
  cancellationNotes: null,
  dispatchNotes: null,
  operationalNotes: null,
  totalMiles: null,
  totalServiceTime: null,
  fuelUsed: null,
  onTimePerformance: null,
  lastLocationUpdate: null,
  lastGeotabSync: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleStop = {
  id: stopId,
  dispatchEventId: dispatchId,
  routeStopId: 'ff000000-0000-0000-0000-000000000001',
  sequence: 0,
  plannedEta: '09:00',
  plannedEtd: '09:30',
  actualArrivalTime: null,
  actualDepartureTime: null,
  serviceTime: null,
  status: 'pending',
  onTimeStatus: null,
  latitude: null,
  longitude: null,
  odometer: null,
  fuelUsed: null,
  notes: null,
  exceptionReason: null,
  skipReason: null,
  requiresAttention: false,
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

describe('GET /api/terminals/:terminalId/dispatch', () => {
  it('returns dispatch board for terminal', async () => {
    mockListByTerminal.mockResolvedValueOnce([sampleDispatch]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].routeId).toBe(routeId);
  });

  it('supports date filter', async () => {
    mockListByTerminal.mockResolvedValueOnce([]);

    await supertest(server.server)
      .get(`/api/terminals/${terminalId}/dispatch?date=2026-03-01`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(mockListByTerminal).toHaveBeenCalledWith(terminalId, {
      date: '2026-03-01',
      status: undefined,
      driverId: undefined,
    });
  });
});

describe('POST /api/terminals/:terminalId/dispatch', () => {
  it('creates a dispatch event with auto-populated stops', async () => {
    mockFindRouteById.mockResolvedValueOnce(sampleRoute);
    mockFindByRouteAndDate.mockResolvedValueOnce(undefined);
    mockFindActiveSubstitution.mockResolvedValueOnce(undefined);
    mockCreateDispatchEvent.mockResolvedValueOnce({ ...sampleDispatch, status: 'assigned' });
    const { listRouteStopsByRoute } = await import('../../src/db/queries/route-stops.js');
    (listRouteStopsByRoute as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'stop1', sequence: 0, eta: '09:00', etd: '09:30' },
      { id: 'stop2', sequence: 1, eta: '10:00', etd: '10:30' },
    ]);
    mockCreateDispatchEventStops.mockResolvedValueOnce([sampleStop, { ...sampleStop, id: 'stop2', sequence: 1 }]);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/dispatch`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ routeId, terminalId, executionDate: '2026-03-01' })
      .expect(201);

    expect(res.body.event).toBeDefined();
    expect(res.body.stops).toHaveLength(2);
  });

  it('returns 409 for duplicate dispatch', async () => {
    mockFindRouteById.mockResolvedValueOnce(sampleRoute);
    mockFindByRouteAndDate.mockResolvedValueOnce(sampleDispatch);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ routeId, terminalId, executionDate: '2026-03-01' })
      .expect(409);

    expect(res.body.error.code).toBe('DUPLICATE_DISPATCH');
  });
});

describe('GET /api/dispatch/:id', () => {
  it('returns a dispatch event', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce(sampleDispatch);

    const res = await supertest(server.server)
      .get(`/api/dispatch/${dispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.executionDate).toBe('2026-03-01');
  });

  it('returns 404 for non-existent', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/dispatch/${dispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('DISPATCH_NOT_FOUND');
  });
});

describe('GET /api/dispatch/:id/stops', () => {
  it('returns dispatch event with stops', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce(sampleDispatch);
    mockListByDispatchEvent.mockResolvedValueOnce([sampleStop]);

    const res = await supertest(server.server)
      .get(`/api/dispatch/${dispatchId}/stops`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.event).toBeDefined();
    expect(res.body.stops).toHaveLength(1);
  });
});

describe('PATCH /api/dispatch/:id/status', () => {
  it('transitions status from planned to assigned', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce({ ...sampleDispatch, status: 'planned' });
    mockUpdateDispatchEvent.mockResolvedValueOnce({ ...sampleDispatch, status: 'assigned' });

    const res = await supertest(server.server)
      .patch(`/api/dispatch/${dispatchId}/status`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ status: 'assigned' })
      .expect(200);

    expect(res.body.status).toBe('assigned');
  });

  it('rejects invalid transition', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce({ ...sampleDispatch, status: 'planned' });

    const res = await supertest(server.server)
      .patch(`/api/dispatch/${dispatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' })
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects transition from terminal state', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce({ ...sampleDispatch, status: 'completed' });

    const res = await supertest(server.server)
      .patch(`/api/dispatch/${dispatchId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'planned' })
      .expect(400);

    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

describe('POST /api/dispatch/:id/assign', () => {
  it('assigns driver and auto-transitions to assigned', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce({ ...sampleDispatch, status: 'planned', assignedDriverId: null });
    mockIsDriverAvailable.mockResolvedValueOnce(true);
    mockUpdateDispatchEvent.mockResolvedValueOnce({ ...sampleDispatch, status: 'assigned', assignedDriverId: driverId });

    const res = await supertest(server.server)
      .post(`/api/dispatch/${dispatchId}/assign`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({ driverId })
      .expect(200);

    expect(res.body.assignedDriverId).toBe(driverId);
    expect(res.body.status).toBe('assigned');
  });

  it('rejects unavailable driver', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce(sampleDispatch);
    mockIsDriverAvailable.mockResolvedValueOnce(false);

    const res = await supertest(server.server)
      .post(`/api/dispatch/${dispatchId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ driverId })
      .expect(400);

    expect(res.body.error.code).toBe('DRIVER_UNAVAILABLE');
  });
});

describe('PATCH /api/dispatch/:dispatchId/stops/:stopId', () => {
  it('updates a stop with on-time calculation', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce({ ...sampleDispatch, status: 'dispatched' });
    mockFindDispatchEventStopById.mockResolvedValueOnce(sampleStop);
    mockUpdateDispatchEventStop.mockResolvedValueOnce({
      ...sampleStop,
      status: 'arrived',
      actualArrivalTime: new Date('2026-03-01T09:10:00Z'),
      onTimeStatus: 'on_time',
    });
    // First stop arriving triggers in_transit cascade
    mockUpdateDispatchEvent.mockResolvedValueOnce({ ...sampleDispatch, status: 'in_transit' });
    mockFindDispatchEventById.mockResolvedValueOnce({ ...sampleDispatch, status: 'in_transit' });

    const res = await supertest(server.server)
      .patch(`/api/dispatch/${dispatchId}/stops/${stopId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        status: 'arrived',
        actualArrivalTime: '2026-03-01T09:10:00Z',
      })
      .expect(200);

    expect(res.body.status).toBe('arrived');
  });

  it('returns 404 for stop not in dispatch', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce(sampleDispatch);
    mockFindDispatchEventStopById.mockResolvedValueOnce({ ...sampleStop, dispatchEventId: 'other-dispatch-id' });

    const res = await supertest(server.server)
      .patch(`/api/dispatch/${dispatchId}/stops/${stopId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'arrived' })
      .expect(404);

    expect(res.body.error.code).toBe('STOP_NOT_FOUND');
  });
});

describe('DELETE /api/dispatch/:id', () => {
  it('deletes a dispatch event (manager only)', async () => {
    mockFindDispatchEventById.mockResolvedValueOnce(sampleDispatch);
    mockDeleteDispatchEvent.mockResolvedValueOnce(true);

    const res = await supertest(server.server)
      .delete(`/api/dispatch/${dispatchId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBe('Dispatch event deleted');
  });

  it('returns 403 for dispatcher trying to delete', async () => {
    await supertest(server.server)
      .delete(`/api/dispatch/${dispatchId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);
  });
});
