import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AlertCreateSchema } from '@dispatch/shared/types/alert';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  getAlertById,
  listAlertsByTerminal,
  getAlertSummary,
  createDispatchAlert,
  acknowledgeAlert,
  resolveAlert,
  AlertServiceError,
} from '../services/alert-service.js';

const TerminalIdParams = z.object({ terminalId: z.string().uuid() });
const AlertIdParams = z.object({ id: z.string().uuid() });

const AlertListQuery = z.object({
  resolved: z.enum(['true', 'false']).optional(),
  alertType: z.string().optional(),
  severity: z.string().optional(),
});

const ResolveBody = z.object({
  resolutionNotes: z.string().nullable().optional(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof AlertServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function alertRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals/:terminalId/alerts — list alerts (default: unresolved)
  server.get('/api/terminals/:terminalId/alerts', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      querystring: AlertListQuery,
    },
  }, async (request) => {
    const query = request.query as z.infer<typeof AlertListQuery>;
    return listAlertsByTerminal(request.terminalId, {
      resolved: query.resolved !== undefined ? query.resolved === 'true' : false,
      alertType: query.alertType,
      severity: query.severity,
    });
  });

  // GET /api/terminals/:terminalId/alerts/summary — alert counts by severity
  server.get('/api/terminals/:terminalId/alerts/summary', {
    preHandler: [authenticate, requireTerminalScope],
    schema: { params: TerminalIdParams },
  }, async (request) => {
    return getAlertSummary(request.terminalId);
  });

  // GET /api/alerts/:id — get alert
  server.get('/api/alerts/:id', {
    preHandler: [authenticate],
    schema: { params: AlertIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof AlertIdParams>;
    try {
      return await getAlertById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/alerts — create alert
  server.post('/api/terminals/:terminalId/alerts', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      body: AlertCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof AlertCreateSchema>;
    try {
      const alert = await createDispatchAlert(
        { ...data, terminalId: request.terminalId },
        request.user.sub,
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      reply.code(201);
      return alert;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/alerts/:id/acknowledge — acknowledge alert
  server.patch('/api/alerts/:id/acknowledge', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: { params: AlertIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof AlertIdParams>;
    try {
      return await acknowledgeAlert(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/alerts/:id/resolve — resolve alert
  server.patch('/api/alerts/:id/resolve', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: AlertIdParams,
      body: ResolveBody,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof AlertIdParams>;
    const { resolutionNotes } = request.body as z.infer<typeof ResolveBody>;
    try {
      return await resolveAlert(id, request.user.sub, resolutionNotes, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
