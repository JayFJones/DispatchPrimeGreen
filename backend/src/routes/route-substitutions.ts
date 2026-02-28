import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RouteSubstitutionCreateSchema, RouteSubstitutionUpdateSchema } from '@dispatch/shared/types/route-substitution';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import {
  getSubstitutionById,
  listByRoute,
  createSubstitution,
  updateSubstitution,
  removeSubstitution,
  RouteSubstitutionServiceError,
} from '../services/route-substitution-service.js';

const RouteIdParams = z.object({ routeId: z.string().uuid() });
const SubstitutionIdParams = z.object({ id: z.string().uuid() });

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof RouteSubstitutionServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function routeSubstitutionRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/routes/:routeId/substitutions — list substitutions
  server.get('/api/routes/:routeId/substitutions', {
    preHandler: [authenticate],
    schema: { params: RouteIdParams },
  }, async (request) => {
    const { routeId } = request.params as z.infer<typeof RouteIdParams>;
    return listByRoute(routeId);
  });

  // GET /api/route-substitutions/:id — get substitution
  server.get('/api/route-substitutions/:id', {
    preHandler: [authenticate],
    schema: { params: SubstitutionIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof SubstitutionIdParams>;
    try {
      return await getSubstitutionById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/routes/:routeId/substitutions — create substitution
  server.post('/api/routes/:routeId/substitutions', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: RouteIdParams,
      body: RouteSubstitutionCreateSchema,
    },
  }, async (request, reply) => {
    const { routeId } = request.params as z.infer<typeof RouteIdParams>;
    const data = request.body as z.infer<typeof RouteSubstitutionCreateSchema>;
    try {
      const sub = await createSubstitution(
        { ...data, routeId },
        request.user.sub,
        { ipAddress: request.ip, userAgent: request.headers['user-agent'] },
      );
      reply.code(201);
      return sub;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/route-substitutions/:id — update substitution
  server.patch('/api/route-substitutions/:id', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: {
      params: SubstitutionIdParams,
      body: RouteSubstitutionUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof SubstitutionIdParams>;
    const data = request.body as z.infer<typeof RouteSubstitutionUpdateSchema>;
    try {
      return await updateSubstitution(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/route-substitutions/:id — delete substitution
  server.delete('/api/route-substitutions/:id', {
    preHandler: [authenticate, requireRole('dispatcher', 'team_lead', 'terminal_manager', 'operations_management', 'system_admin')],
    schema: { params: SubstitutionIdParams },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof SubstitutionIdParams>;
    try {
      await removeSubstitution(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Route substitution deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
