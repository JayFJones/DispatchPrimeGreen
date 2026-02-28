import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserUpdateSchema, PasswordChangeSchema } from '@dispatch/shared/types/user';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  listAllUsers,
  getUserById,
  adminUpdateUser,
  UserServiceError,
} from '../services/user-service.js';

const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const UserIdParamsSchema = z.object({
  id: z.string().uuid(),
});

// Self-service update — restricted fields only
const SelfUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  favoriteTerminalIds: z.array(z.string().uuid()).optional(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof UserServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function userRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/users/me
  server.get('/api/users/me', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    try {
      const user = await getProfile(request.user.sub);
      return user;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/users/me
  server.patch('/api/users/me', {
    preHandler: [authenticate],
    schema: {
      body: SelfUpdateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof SelfUpdateSchema>;

    try {
      const user = await updateProfile(request.user.sub, data, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return user;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/users/me/password
  server.post('/api/users/me/password', {
    preHandler: [authenticate],
    schema: {
      body: PasswordChangeSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof PasswordChangeSchema>;

    try {
      await changePassword(request.user.sub, data, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Password changed successfully' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // GET /api/users (admin only)
  server.get('/api/users', {
    preHandler: [authenticate, requireRole('system_admin')],
    schema: {
      querystring: PaginationQuerySchema,
    },
  }, async (request) => {
    const { limit, offset } = request.query as z.infer<typeof PaginationQuerySchema>;
    return listAllUsers({ limit, offset });
  });

  // GET /api/users/:id (admin only)
  server.get('/api/users/:id', {
    preHandler: [authenticate, requireRole('system_admin')],
    schema: {
      params: UserIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof UserIdParamsSchema>;

    try {
      const user = await getUserById(id);
      return user;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/users/:id (admin only)
  server.patch('/api/users/:id', {
    preHandler: [authenticate, requireRole('system_admin')],
    schema: {
      params: UserIdParamsSchema,
      body: UserUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof UserIdParamsSchema>;
    const data = request.body as z.infer<typeof UserUpdateSchema>;

    try {
      const user = await adminUpdateUser(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return user;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
