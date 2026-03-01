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

// Reporting query mocks
const mockGetRouteHistory = vi.fn();
const mockGetRouteHistorySummary = vi.fn();
const mockGetHosReport = vi.fn();
const mockGetBillingSummary = vi.fn();

vi.mock('../../src/db/queries/reporting.js', () => ({
  getRouteHistory: (...args: unknown[]) => mockGetRouteHistory(...args),
  getRouteHistorySummary: (...args: unknown[]) => mockGetRouteHistorySummary(...args),
  getHosReport: (...args: unknown[]) => mockGetHosReport(...args),
  getBillingSummary: (...args: unknown[]) => mockGetBillingSummary(...args),
}));

// Audit log query mocks
const mockListAuditLogs = vi.fn();
const mockCountAuditLogs = vi.fn();

vi.mock('../../src/db/queries/audit-logs.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue({}),
  listAuditLogs: (...args: unknown[]) => mockListAuditLogs(...args),
  countAuditLogs: (...args: unknown[]) => mockCountAuditLogs(...args),
}));

// All other query mocks required by server route imports
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

const adminUser: JwtPayload = {
  sub: '770e8400-e29b-41d4-a716-446655440000',
  email: 'admin@example.com',
  roles: ['system_admin'],
  homeTerminalId: null,
};

const opsUser: JwtPayload = {
  sub: '880e8400-e29b-41d4-a716-446655440000',
  email: 'ops@example.com',
  roles: ['operations_management'],
  homeTerminalId: null,
};

const dispatcherUser: JwtPayload = {
  sub: '550e8400-e29b-41d4-a716-446655440000',
  email: 'dispatcher@example.com',
  roles: ['dispatcher'],
  homeTerminalId: terminalId,
};

let adminToken: string;
let opsToken: string;
let dispatcherToken: string;

const dateParams = 'startDate=2025-01-01&endDate=2025-01-31';

beforeAll(async () => {
  process.env['JWT_SECRET'] = 'test-jwt-secret-at-least-32-chars-long';
  process.env['REFRESH_TOKEN_SECRET'] = 'test-refresh-secret-at-least-32-chars';

  const { buildServer } = await import('../../src/server.js');
  server = await buildServer();
  await server.ready();

  adminToken = generateAccessToken(adminUser);
  opsToken = generateAccessToken(opsUser);
  dispatcherToken = generateAccessToken(dispatcherUser);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

// --- Route History ---

describe('GET /api/terminals/:terminalId/reports/route-history', () => {
  it('returns paginated results with summary', async () => {
    const sampleRow = {
      id: 'aae84000-e29b-41d4-a716-446655440001',
      executionDate: '2025-01-15',
      status: 'completed',
      actualDepartureTime: '2025-01-15T08:00:00Z',
      actualCompletionTime: '2025-01-15T16:00:00Z',
      totalMiles: 120.5,
      onTimePerformance: 0.95,
      trkid: 'TRK-001',
      truckNumber: 'T100',
      firstName: 'John',
      lastName: 'Doe',
      completedStops: 8,
      totalStops: 10,
    };

    const summary = {
      totalRecords: 1,
      completedCount: 1,
      cancelledCount: 0,
      avgOnTimePerformance: 0.95,
      totalMilesSum: 120.5,
    };

    mockGetRouteHistory.mockResolvedValueOnce([sampleRow]);
    mockGetRouteHistorySummary.mockResolvedValueOnce(summary);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/reports/route-history?${dateParams}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].trkid).toBe('TRK-001');
    expect(res.body.summary.totalRecords).toBe(1);
    expect(res.body.pagination.total).toBe(1);
  });

  it('returns 401 without auth', async () => {
    await supertest(server.server)
      .get(`/api/terminals/${terminalId}/reports/route-history?${dateParams}`)
      .expect(401);
  });
});

// --- HOS Report ---

describe('GET /api/terminals/:terminalId/reports/hos', () => {
  it('returns driver violations grouped', async () => {
    const hosRow = {
      driverId: 'cce84000-e29b-41d4-a716-446655440003',
      firstName: 'Jane',
      lastName: 'Smith',
      violationCount: 3,
      criticalCount: 1,
      highCount: 2,
      resolvedCount: 2,
      firstViolation: '2025-01-05T10:00:00Z',
      lastViolation: '2025-01-25T14:00:00Z',
    };

    mockGetHosReport.mockResolvedValueOnce([hosRow]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/reports/hos?${dateParams}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].violationCount).toBe(3);
    expect(res.body.data[0].criticalCount).toBe(1);
  });

  it('returns empty array for no violations', async () => {
    mockGetHosReport.mockResolvedValueOnce([]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/reports/hos?${dateParams}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
  });
});

// --- Billing Summary ---

describe('GET /api/terminals/:terminalId/reports/billing', () => {
  it('returns route-level aggregations', async () => {
    const billingRow = {
      routeId: 'bbe84000-e29b-41d4-a716-446655440002',
      trkid: 'TRK-001',
      truckNumber: 'T100',
      totalDispatches: 10,
      completedDispatches: 8,
      totalMiles: 1200.0,
      totalServiceTime: 80.5,
      totalFuelUsed: 150.0,
      totalStopsCompleted: 75,
    };

    mockGetBillingSummary.mockResolvedValueOnce([billingRow]);

    const res = await supertest(server.server)
      .get(`/api/terminals/${terminalId}/reports/billing?${dateParams}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].totalDispatches).toBe(10);
    expect(res.body.data[0].completedDispatches).toBe(8);
  });

  it('returns 400 when date range params are missing', async () => {
    await supertest(server.server)
      .get(`/api/terminals/${terminalId}/reports/billing`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});

// --- Audit Logs ---

describe('GET /api/reports/audit-logs', () => {
  const sampleAuditLog = {
    id: 'dde84000-e29b-41d4-a716-446655440004',
    eventType: 'user_login',
    entityType: 'user',
    entityId: adminUser.sub,
    userId: adminUser.sub,
    userEmail: 'admin@example.com',
    summary: 'User logged in',
    metadata: null,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: '2025-01-15T12:00:00Z',
  };

  it('returns paginated results for system_admin', async () => {
    mockListAuditLogs.mockResolvedValueOnce([sampleAuditLog]);
    mockCountAuditLogs.mockResolvedValueOnce(1);

    const res = await supertest(server.server)
      .get(`/api/reports/audit-logs?${dateParams}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].eventType).toBe('user_login');
    expect(res.body.pagination.total).toBe(1);
  });

  it('returns 403 for dispatcher role', async () => {
    await supertest(server.server)
      .get(`/api/reports/audit-logs?${dateParams}`)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .expect(403);
  });

  it('allows operations_management role', async () => {
    mockListAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    const res = await supertest(server.server)
      .get(`/api/reports/audit-logs?${dateParams}`)
      .set('Authorization', `Bearer ${opsToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('supports eventType filter', async () => {
    mockListAuditLogs.mockResolvedValueOnce([sampleAuditLog]);
    mockCountAuditLogs.mockResolvedValueOnce(1);

    await supertest(server.server)
      .get(`/api/reports/audit-logs?${dateParams}&eventType=user_login`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(mockListAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user_login' }),
    );
  });

  it('supports entityType filter', async () => {
    mockListAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await supertest(server.server)
      .get(`/api/reports/audit-logs?${dateParams}&entityType=driver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(mockListAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'driver' }),
    );
  });
});
