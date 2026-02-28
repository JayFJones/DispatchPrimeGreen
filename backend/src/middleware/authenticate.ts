import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../auth/jwt.js';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    return;
  }

  const token = header.slice(7);
  try {
    request.user = verifyAccessToken(token);
  } catch {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } });
  }
}
