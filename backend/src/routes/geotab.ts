import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GeotabAuthRequestSchema } from '@dispatch/shared/types/geotab-session';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  authenticateGeotab,
  getAuthStatus,
  removeGeotabAuth,
  getDevices,
  getDrivers,
  getGroups,
  getFleetStatus,
  syncGeotabData,
  GeotabServiceError,
} from '../services/geotab-service.js';

const TerminalIdParamsSchema = z.object({
  terminalId: z.string().uuid(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof GeotabServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function geotabRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/geotab/auth — authenticate with Geotab and store credentials
  server.post('/api/geotab/auth', {
    preHandler: [authenticate],
    schema: {
      body: GeotabAuthRequestSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof GeotabAuthRequestSchema>;
    try {
      const session = await authenticateGeotab(request.user.sub, data, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      reply.code(201);
      return session;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/geotab/auth/status — get current Geotab session status
  server.get('/api/geotab/auth/status', {
    preHandler: [authenticate],
  }, async (request) => {
    const session = await getAuthStatus(request.user.sub);
    return { session };
  });

  // DELETE /api/geotab/auth — remove stored Geotab credentials
  server.delete('/api/geotab/auth', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      await removeGeotabAuth(request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Geotab credentials removed' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/geotab/devices — fetch Geotab devices (24h cached)
  server.get('/api/geotab/devices', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      return await getDevices(request.user.sub);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/geotab/drivers — fetch Geotab drivers (24h cached)
  server.get('/api/geotab/drivers', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      return await getDrivers(request.user.sub);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/geotab/groups — fetch Geotab groups (24h cached)
  server.get('/api/geotab/groups', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      return await getGroups(request.user.sub);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/geotab/fleet-status — real-time fleet GPS/status (never cached)
  server.get('/api/geotab/fleet-status', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      return await getFleetStatus(request.user.sub);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/geotab/sync — sync Geotab data into local DB
  server.post('/api/terminals/:terminalId/geotab/sync', {
    preHandler: [
      authenticate,
      requireRole('terminal_manager', 'operations_management', 'system_admin'),
      requireTerminalScope,
    ],
    schema: {
      params: TerminalIdParamsSchema,
    },
  }, async (request, reply) => {
    try {
      const result = await syncGeotabData(request.user.sub, request.terminalId, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return result;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
