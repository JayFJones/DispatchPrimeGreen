import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AvailabilityCreateSchema, AvailabilityUpdateSchema } from '@dispatch/shared/types/availability';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  listByDriver,
  listUnavailableDriversForDate,
  createAvailability,
  updateAvailability,
  removeAvailability,
  AvailabilityServiceError,
} from '../services/availability-service.js';

const DriverIdParams = z.object({ driverId: z.string().uuid() });
const TerminalIdParams = z.object({ terminalId: z.string().uuid() });
const AvailabilityIdParams = z.object({ id: z.string().uuid() });

const UnavailableQuery = z.object({
  date: z.string(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof AvailabilityServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function availabilityRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/drivers/:driverId/availability — list driver availability
  server.get('/api/drivers/:driverId/availability', {
    preHandler: [authenticate],
    schema: { params: DriverIdParams },
  }, async (request) => {
    const { driverId } = request.params as z.infer<typeof DriverIdParams>;
    return listByDriver(driverId);
  });

  // GET /api/terminals/:terminalId/unavailable-drivers — unavailable drivers for date
  server.get('/api/terminals/:terminalId/unavailable-drivers', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      querystring: UnavailableQuery,
    },
  }, async (request) => {
    const { date } = request.query as z.infer<typeof UnavailableQuery>;
    return listUnavailableDriversForDate(request.terminalId, date);
  });

  // POST /api/availability — create availability record
  server.post('/api/availability', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: { body: AvailabilityCreateSchema },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof AvailabilityCreateSchema>;
    try {
      const record = await createAvailability(data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      reply.code(201);
      return record;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/availability/:id — update availability
  server.patch('/api/availability/:id', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: AvailabilityIdParams,
      body: AvailabilityUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof AvailabilityIdParams>;
    const data = request.body as z.infer<typeof AvailabilityUpdateSchema>;
    try {
      return await updateAvailability(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/availability/:id — delete availability
  server.delete('/api/availability/:id', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: { params: AvailabilityIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof AvailabilityIdParams>;
    try {
      await removeAvailability(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Availability record deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
