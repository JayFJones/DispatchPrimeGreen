import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Role } from '@dispatch/shared/constants/roles';

/**
 * Factory that returns a preHandler checking whether the authenticated user
 * holds at least one of the specified roles.
 */
export function requireRole(...allowedRoles: Role[]) {
  return async function authorizeRole(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const userRoles = request.user?.roles;
    if (!userRoles) {
      reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const hasRole = userRoles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }
  };
}
