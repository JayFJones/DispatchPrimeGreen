import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  getRouteHistoryReport,
  getHosComplianceReport,
  getBillingReport,
  getAuditLogReport,
} from '../services/reporting-service.js';

const TerminalIdParams = z.object({ terminalId: z.string().uuid() });

const ReportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const AuditLogQuerySchema = ReportQuerySchema.extend({
  eventType: z.string().optional(),
  entityType: z.string().optional(),
  userId: z.string().uuid().optional(),
});

export default async function reportingRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals/:terminalId/reports/route-history
  server.get('/api/terminals/:terminalId/reports/route-history', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      querystring: ReportQuerySchema,
    },
  }, async (request) => {
    const query = request.query as z.infer<typeof ReportQuerySchema>;
    return getRouteHistoryReport(request.terminalId, {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    });
  });

  // GET /api/terminals/:terminalId/reports/hos
  server.get('/api/terminals/:terminalId/reports/hos', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      querystring: ReportQuerySchema,
    },
  }, async (request) => {
    const query = request.query as z.infer<typeof ReportQuerySchema>;
    return getHosComplianceReport(request.terminalId, {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    });
  });

  // GET /api/terminals/:terminalId/reports/billing
  server.get('/api/terminals/:terminalId/reports/billing', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      querystring: ReportQuerySchema,
    },
  }, async (request) => {
    const query = request.query as z.infer<typeof ReportQuerySchema>;
    return getBillingReport(request.terminalId, {
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
    });
  });

  // GET /api/reports/audit-logs — system_admin or operations_management only
  server.get('/api/reports/audit-logs', {
    preHandler: [authenticate, requireRole('system_admin', 'operations_management')],
    schema: {
      querystring: AuditLogQuerySchema,
    },
  }, async (request) => {
    const query = request.query as z.infer<typeof AuditLogQuerySchema>;
    return getAuditLogReport({
      startDate: query.startDate,
      endDate: query.endDate,
      limit: query.limit,
      offset: query.offset,
      eventType: query.eventType,
      entityType: query.entityType,
      userId: query.userId,
    });
  });
}
