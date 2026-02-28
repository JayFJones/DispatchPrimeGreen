import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DispatchEventCreateSchema, DispatchEventUpdateSchema } from '@dispatch/shared/types/dispatch-event';
import { DispatchEventStopUpdateSchema } from '@dispatch/shared/types/dispatch-event-stop';
import { DispatchStatusSchema } from '@dispatch/shared/constants/status';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  getDispatchEventById,
  getDispatchEventWithStops,
  listDispatchBoard,
  createDispatchEvent,
  updateDispatchEvent,
  changeDispatchStatus,
  assignDriver,
  updateStop,
  removeDispatchEvent,
  generateDailyDispatchEvents,
  DispatchServiceError,
} from '../services/dispatch-service.js';

const TerminalIdParams = z.object({ terminalId: z.string().uuid() });
const DispatchIdParams = z.object({ id: z.string().uuid() });
const DispatchStopParams = z.object({
  dispatchId: z.string().uuid(),
  stopId: z.string().uuid(),
});

const DispatchBoardQuery = z.object({
  date: z.string().optional(),
  status: z.string().optional(),
  driverId: z.string().uuid().optional(),
});

const StatusChangeBody = z.object({
  status: DispatchStatusSchema,
  cancellationReason: z.string().optional(),
  cancellationNotes: z.string().optional(),
});

const AssignDriverBody = z.object({
  driverId: z.string().uuid().nullable(),
  truckId: z.string().nullable().optional(),
});

const GenerateDailyBody = z.object({
  date: z.string(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof DispatchServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function dispatchRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals/:terminalId/dispatch — dispatch board
  server.get('/api/terminals/:terminalId/dispatch', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      querystring: DispatchBoardQuery,
    },
  }, async (request) => {
    const query = request.query as z.infer<typeof DispatchBoardQuery>;
    return listDispatchBoard(request.terminalId, {
      date: query.date,
      status: query.status,
      driverId: query.driverId,
    });
  });

  // GET /api/dispatch/:id — get dispatch event
  server.get('/api/dispatch/:id', {
    preHandler: [authenticate],
    schema: { params: DispatchIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DispatchIdParams>;
    try {
      return await getDispatchEventById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/dispatch/:id/stops — get dispatch event with stops
  server.get('/api/dispatch/:id/stops', {
    preHandler: [authenticate],
    schema: { params: DispatchIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DispatchIdParams>;
    try {
      return await getDispatchEventWithStops(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/dispatch — create dispatch event
  server.post('/api/terminals/:terminalId/dispatch', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      body: DispatchEventCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof DispatchEventCreateSchema>;
    try {
      const result = await createDispatchEvent(
        { ...data, terminalId: request.terminalId },
        request.user.sub,
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      reply.code(201);
      return result;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/dispatch/generate — generate daily events
  server.post('/api/terminals/:terminalId/dispatch/generate', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      body: GenerateDailyBody,
    },
  }, async (request, reply) => {
    const { date } = request.body as z.infer<typeof GenerateDailyBody>;
    try {
      const result = await generateDailyDispatchEvents(
        request.terminalId,
        date,
        request.user.sub,
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      reply.code(201);
      return result;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/dispatch/:id — update dispatch event
  server.patch('/api/dispatch/:id', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: DispatchIdParams,
      body: DispatchEventUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DispatchIdParams>;
    const data = request.body as z.infer<typeof DispatchEventUpdateSchema>;
    try {
      return await updateDispatchEvent(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/dispatch/:id/status — change status
  server.patch('/api/dispatch/:id/status', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: DispatchIdParams,
      body: StatusChangeBody,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DispatchIdParams>;
    const { status, cancellationReason, cancellationNotes } = request.body as z.infer<typeof StatusChangeBody>;
    try {
      return await changeDispatchStatus(
        id,
        status,
        request.user.sub,
        { cancellationReason, cancellationNotes },
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/dispatch/:id/assign — assign driver/truck
  server.post('/api/dispatch/:id/assign', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: DispatchIdParams,
      body: AssignDriverBody,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DispatchIdParams>;
    const { driverId, truckId } = request.body as z.infer<typeof AssignDriverBody>;
    try {
      return await assignDriver(id, driverId, truckId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/dispatch/:dispatchId/stops/:stopId — update stop
  server.patch('/api/dispatch/:dispatchId/stops/:stopId', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: DispatchStopParams,
      body: DispatchEventStopUpdateSchema,
    },
  }, async (request, reply) => {
    const { dispatchId, stopId } = request.params as z.infer<typeof DispatchStopParams>;
    const data = request.body as z.infer<typeof DispatchEventStopUpdateSchema>;
    try {
      return await updateStop(dispatchId, stopId, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/dispatch/:id — delete dispatch event
  server.delete('/api/dispatch/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: { params: DispatchIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DispatchIdParams>;
    try {
      await removeDispatchEvent(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Dispatch event deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
