import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DriverCreateSchema, DriverUpdateSchema } from '@dispatch/shared/types/driver';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  getDriverById,
  listDriversByTerminal,
  listBenchDriversByTerminal,
  createDriver,
  updateDriver,
  assignDriverToTerminal,
  removeDriverFromTerminal,
  assignDriverToBench,
  removeDriverFromBench,
  DriverServiceError,
} from '../services/driver-service.js';

const DriverIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const TerminalIdParamsSchema = z.object({
  terminalId: z.string().uuid(),
});

const TerminalDriverParamsSchema = z.object({
  terminalId: z.string().uuid(),
  driverId: z.string().uuid(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof DriverServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function driverRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals/:terminalId/drivers — list drivers for a terminal
  server.get('/api/terminals/:terminalId/drivers', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParamsSchema,
    },
  }, async (request) => {
    return listDriversByTerminal(request.terminalId);
  });

  // GET /api/drivers/:id — get driver by ID
  server.get('/api/drivers/:id', {
    preHandler: [authenticate],
    schema: {
      params: DriverIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DriverIdParamsSchema>;
    try {
      return await getDriverById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/drivers — create a driver (global, not terminal-scoped)
  server.post('/api/drivers', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      body: DriverCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof DriverCreateSchema>;
    try {
      const driver = await createDriver(data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      reply.code(201);
      return driver;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/drivers/:id — update a driver
  server.patch('/api/drivers/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: DriverIdParamsSchema,
      body: DriverUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof DriverIdParamsSchema>;
    const data = request.body as z.infer<typeof DriverUpdateSchema>;
    try {
      return await updateDriver(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/drivers/:driverId — assign driver to terminal
  server.post('/api/terminals/:terminalId/drivers/:driverId', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalDriverParamsSchema,
    },
  }, async (request, reply) => {
    const { terminalId, driverId } = request.params as z.infer<typeof TerminalDriverParamsSchema>;
    try {
      await assignDriverToTerminal(terminalId, driverId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Driver assigned to terminal' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/terminals/:terminalId/drivers/:driverId — remove driver from terminal
  server.delete('/api/terminals/:terminalId/drivers/:driverId', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalDriverParamsSchema,
    },
  }, async (request, reply) => {
    const { terminalId, driverId } = request.params as z.infer<typeof TerminalDriverParamsSchema>;
    try {
      await removeDriverFromTerminal(terminalId, driverId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Driver removed from terminal' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/terminals/:terminalId/bench-drivers — list bench drivers
  server.get('/api/terminals/:terminalId/bench-drivers', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParamsSchema,
    },
  }, async (request) => {
    return listBenchDriversByTerminal(request.terminalId);
  });

  // POST /api/terminals/:terminalId/bench-drivers/:driverId — assign to bench
  server.post('/api/terminals/:terminalId/bench-drivers/:driverId', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalDriverParamsSchema,
    },
  }, async (request, reply) => {
    const { terminalId, driverId } = request.params as z.infer<typeof TerminalDriverParamsSchema>;
    try {
      await assignDriverToBench(terminalId, driverId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Driver added to bench' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/terminals/:terminalId/bench-drivers/:driverId — remove from bench
  server.delete('/api/terminals/:terminalId/bench-drivers/:driverId', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalDriverParamsSchema,
    },
  }, async (request, reply) => {
    const { terminalId, driverId } = request.params as z.infer<typeof TerminalDriverParamsSchema>;
    try {
      await removeDriverFromBench(terminalId, driverId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Driver removed from bench' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
