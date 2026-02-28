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

// Alert query mocks
const mockFindAlertById = vi.fn();
const mockListByTerminalAlerts = vi.fn();
const mockCreateAlert = vi.fn();
const mockAcknowledgeAlert = vi.fn();
const mockResolveAlert = vi.fn();
const mockCountUnresolved = vi.fn();

vi.mock('../../src/db/queries/alerts.js', () => ({
  findAlertById: (...args: unknown[]) => mockFindAlertById(...args),
  listByTerminal: (...args: unknown[]) => mockListByTerminalAlerts(...args),
  listUnacknowledged: vi.fn().mockResolvedValue([]),
  createAlert: (...args: unknown[]) => mockCreateAlert(...args),
  acknowledgeAlert: (...args: unknown[]) => mockAcknowledgeAlert(...args),
  resolveAlert: (...args: unknown[]) => mockResolveAlert(...args),
  countUnresolved: (...args: unknown[]) => mockCountUnresolved(...args),
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
const alertId = 'aae84000-e29b-41d4-a716-446655440001';

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

const sampleAlert = {
  id: alertId,
  terminalId,
  alertType: 'hos_violation',
  severity: 'high',
  title: 'HOS Violation - Driver John',
  message: 'Driver exceeded 11 hours',
  metadata: null,
  entityType: 'driver',
  entityId: 'cce84000-e29b-41d4-a716-446655440003',
  isAcknowledged: false,
  acknowledgedBy: null,
  acknowledgedAt: null,
  isResolved: false,
  resolvedBy: null,
  resolvedAt: null,
  resolutionNotes: null,
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

describe('GET /api/terminals/:terminalId/alerts', () => {
  it('returns alerts for terminal (default: unresolved)', async () => {
    mockListByTerminalAlerts.mockResolvedValueOnce([sampleAlert]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/alerts`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].alertType).toBe('hos_violation');
  });
});

describe('GET /api/terminals/:terminalId/alerts/summary', () => {
  it('returns alert counts by severity', async () => {
    mockCountUnresolved.mockResolvedValueOnce({ total: 5, critical: 1, high: 2, medium: 1, low: 1 });

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/alerts/summary`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.total).toBe(5);
    expect(res.body.critical).toBe(1);
  });
});

describe('GET /api/alerts/:id', () => {
  it('returns an alert by ID', async () => {
    mockFindAlertById.mockResolvedValueOnce(sampleAlert);

    const res = await supertest(server.server)
      .get(`/api/alerts/${alertId}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.title).toBe('HOS Violation - Driver John');
  });

  it('returns 404 for non-existent alert', async () => {
    mockFindAlertById.mockResolvedValueOnce(undefined);

    const res = await supertest(server.server)
      .get(`/api/alerts/${alertId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.error.code).toBe('ALERT_NOT_FOUND');
  });
});

describe('POST /api/terminals/:terminalId/alerts', () => {
  it('creates an alert', async () => {
    mockCreateAlert.mockResolvedValueOnce(sampleAlert);

    const res = await supertest(server.server)
      .post(`/api/terminals/${terminalId}/alerts`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        terminalId,
        alertType: 'hos_violation',
        severity: 'high',
        title: 'HOS Violation - Driver John',
      })
      .expect(201);

    expect(res.body.alertType).toBe('hos_violation');
  });
});

describe('PATCH /api/alerts/:id/acknowledge', () => {
  it('acknowledges an alert', async () => {
    mockFindAlertById.mockResolvedValueOnce(sampleAlert);
    mockAcknowledgeAlert.mockResolvedValueOnce({
      ...sampleAlert,
      isAcknowledged: true,
      acknowledgedBy: dispatcherUser.sub,
      acknowledgedAt: new Date(),
    });

    const res = await supertest(server.server)
      .patch(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.isAcknowledged).toBe(true);
  });

  it('returns 400 for already-acknowledged alert', async () => {
    mockFindAlertById.mockResolvedValueOnce({ ...sampleAlert, isAcknowledged: true });

    const res = await supertest(server.server)
      .patch(`/api/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body.error.code).toBe('ALREADY_ACKNOWLEDGED');
  });
});

describe('PATCH /api/alerts/:id/resolve', () => {
  it('resolves an alert', async () => {
    mockFindAlertById.mockResolvedValueOnce(sampleAlert);
    mockResolveAlert.mockResolvedValueOnce({
      ...sampleAlert,
      isResolved: true,
      resolvedBy: adminUser.sub,
      resolvedAt: new Date(),
      resolutionNotes: 'Driver taken off duty',
    });

    const res = await supertest(server.server)
      .patch(`/api/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolutionNotes: 'Driver taken off duty' })
      .expect(200);

    expect(res.body.isResolved).toBe(true);
    expect(res.body.resolutionNotes).toBe('Driver taken off duty');
  });

  it('returns 400 for already-resolved alert', async () => {
    mockFindAlertById.mockResolvedValueOnce({ ...sampleAlert, isResolved: true });

    const res = await supertest(server.server)
      .patch(`/api/alerts/${alertId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe('ALREADY_RESOLVED');
  });
});
