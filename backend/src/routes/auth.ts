import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserCreateSchema } from '@dispatch/shared/types/user';
import { login, refresh, register, AuthError } from '../services/auth-service.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default async function authRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/auth/login
  server.post('/api/auth/login', {
    schema: {
      body: LoginBodySchema,
    },
  }, async (request, reply) => {
    const { email, password } = request.body as z.infer<typeof LoginBodySchema>;

    try {
      const result = await login(email, password, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        path: '/api/auth/refresh',
        maxAge: REFRESH_COOKIE_MAX_AGE,
      });

      return { accessToken: result.accessToken, user: result.user };
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // POST /api/auth/logout
  server.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
    });

    // Best-effort audit log — user may or may not be authenticated
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyAccessToken } = await import('../auth/jwt.js');
        const payload = verifyAccessToken(authHeader.slice(7));
        createAuditLog({
          eventType: 'logout',
          entityType: 'user',
          entityId: payload.sub,
          userId: payload.sub,
          userEmail: payload.email,
          summary: `User ${payload.email} logged out`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        }).catch(() => {});
      } catch {
        // Token expired or invalid — still clear cookie
      }
    }

    return { message: 'Logged out' };
  });

  // POST /api/auth/refresh
  server.post('/api/auth/refresh', async (request, reply) => {
    const refreshTokenValue = (request.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];

    if (!refreshTokenValue) {
      return reply.code(401).send({ error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided' } });
    }

    try {
      const result = await refresh(refreshTokenValue);
      return { accessToken: result.accessToken, user: result.user };
    } catch (err) {
      if (err instanceof AuthError) {
        // Clear invalid cookie
        reply.clearCookie(REFRESH_COOKIE, {
          httpOnly: true,
          secure: process.env['NODE_ENV'] === 'production',
          sameSite: 'strict',
          path: '/api/auth/refresh',
        });
        return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // POST /api/auth/register
  // TODO: Lock behind requireRole('system_admin') for production
  server.post('/api/auth/register', {
    schema: {
      body: UserCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof UserCreateSchema>;

    try {
      const result = await register(data, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      reply.setCookie(REFRESH_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        path: '/api/auth/refresh',
        maxAge: REFRESH_COOKIE_MAX_AGE,
      });

      return reply.code(201).send({ accessToken: result.accessToken, user: result.user });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });
}
