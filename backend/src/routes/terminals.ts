import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { TerminalCreateSchema, TerminalUpdateSchema } from '@dispatch/shared/types/terminal';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { findUserById } from '../db/queries/users.js';
import {
  listTerminalsForUser,
  getTerminalById,
  createTerminal,
  updateTerminal,
  removeTerminal,
  TerminalServiceError,
} from '../services/terminal-service.js';

const TerminalIdParamsSchema = z.object({
  id: z.string().uuid(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof TerminalServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function terminalRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals — list terminals (filtered by user access)
  server.get('/api/terminals', {
    preHandler: [authenticate],
  }, async (request) => {
    const user = await findUserById(request.user.sub);
    const favoriteTerminalIds = user?.favoriteTerminalIds ?? [];
    return listTerminalsForUser(
      request.user.roles,
      request.user.homeTerminalId,
      favoriteTerminalIds,
    );
  });

  // GET /api/terminals/:id
  server.get('/api/terminals/:id', {
    preHandler: [authenticate],
    schema: {
      params: TerminalIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof TerminalIdParamsSchema>;
    try {
      return await getTerminalById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals
  server.post('/api/terminals', {
    preHandler: [authenticate, requireRole('system_admin')],
    schema: {
      body: TerminalCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof TerminalCreateSchema>;
    try {
      const terminal = await createTerminal(data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      reply.code(201);
      return terminal;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/terminals/:id
  server.patch('/api/terminals/:id', {
    preHandler: [authenticate, requireRole('system_admin', 'terminal_manager')],
    schema: {
      params: TerminalIdParamsSchema,
      body: TerminalUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof TerminalIdParamsSchema>;
    const data = request.body as z.infer<typeof TerminalUpdateSchema>;

    // terminal_manager can only update their own terminal
    const roles = request.user.roles;
    if (!roles.includes('system_admin') && roles.includes('terminal_manager')) {
      if (request.user.homeTerminalId !== id) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Terminal managers can only update their own terminal' } });
      }
    }

    try {
      return await updateTerminal(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/terminals/:id
  server.delete('/api/terminals/:id', {
    preHandler: [authenticate, requireRole('system_admin')],
    schema: {
      params: TerminalIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof TerminalIdParamsSchema>;
    try {
      await removeTerminal(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Terminal deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
