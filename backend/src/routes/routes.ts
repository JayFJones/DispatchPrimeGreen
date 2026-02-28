import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RouteCreateSchema, RouteUpdateSchema } from '@dispatch/shared/types/route';
import { RouteStopCreateSchema, RouteStopUpdateSchema } from '@dispatch/shared/types/route-stop';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  getRouteById,
  listRoutesByTerminal,
  listRoutesForDay,
  createRoute,
  updateRoute,
  removeRoute,
  getRouteStops,
  createRouteStop,
  updateRouteStop,
  removeRouteStop,
  RouteServiceError,
} from '../services/route-service.js';

const TerminalIdParams = z.object({ terminalId: z.string().uuid() });
const RouteIdParams = z.object({ id: z.string().uuid() });
const RouteIdForStopsParams = z.object({ routeId: z.string().uuid() });
const StopIdParams = z.object({ id: z.string().uuid() });

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof RouteServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function routeRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals/:terminalId/routes — list routes for terminal
  server.get('/api/terminals/:terminalId/routes', {
    preHandler: [authenticate, requireTerminalScope],
    schema: { params: TerminalIdParams },
  }, async (request) => {
    return listRoutesByTerminal(request.terminalId);
  });

  // GET /api/terminals/:terminalId/routes/today — routes scheduled for today
  server.get('/api/terminals/:terminalId/routes/today', {
    preHandler: [authenticate, requireTerminalScope],
    schema: { params: TerminalIdParams },
  }, async (request) => {
    const dayOfWeek = new Date().getDay();
    const dayColumns: Array<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = [
      'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
    ];
    return listRoutesForDay(request.terminalId, dayColumns[dayOfWeek]);
  });

  // GET /api/routes/:id — get route by ID
  server.get('/api/routes/:id', {
    preHandler: [authenticate],
    schema: { params: RouteIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof RouteIdParams>;
    try {
      return await getRouteById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/routes — create route
  server.post('/api/terminals/:terminalId/routes', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalIdParams,
      body: RouteCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof RouteCreateSchema>;
    try {
      const route = await createRoute(
        { ...data, terminalId: request.terminalId },
        request.user.sub,
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      reply.code(201);
      return route;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/routes/:id — update route
  server.patch('/api/routes/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: RouteIdParams,
      body: RouteUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof RouteIdParams>;
    const data = request.body as z.infer<typeof RouteUpdateSchema>;
    try {
      return await updateRoute(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/routes/:id — delete route
  server.delete('/api/routes/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: { params: RouteIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof RouteIdParams>;
    try {
      await removeRoute(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Route deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/routes/:routeId/stops — list stops for route
  server.get('/api/routes/:routeId/stops', {
    preHandler: [authenticate],
    schema: { params: RouteIdForStopsParams },
  }, async (request, reply) => {
    const { routeId } = request.params as z.infer<typeof RouteIdForStopsParams>;
    try {
      return await getRouteStops(routeId);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/routes/:routeId/stops — create stop
  server.post('/api/routes/:routeId/stops', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: RouteIdForStopsParams,
      body: RouteStopCreateSchema,
    },
  }, async (request, reply) => {
    const { routeId } = request.params as z.infer<typeof RouteIdForStopsParams>;
    const data = request.body as z.infer<typeof RouteStopCreateSchema>;
    try {
      const stop = await createRouteStop(
        { ...data, routeId },
        request.user.sub,
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      reply.code(201);
      return stop;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/route-stops/:id — update stop
  server.patch('/api/route-stops/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: StopIdParams,
      body: RouteStopUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof StopIdParams>;
    const data = request.body as z.infer<typeof RouteStopUpdateSchema>;
    try {
      return await updateRouteStop(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/route-stops/:id — delete stop
  server.delete('/api/route-stops/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'operations_management', 'system_admin')],
    schema: { params: StopIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof StopIdParams>;
    try {
      await removeRouteStop(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Route stop deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
