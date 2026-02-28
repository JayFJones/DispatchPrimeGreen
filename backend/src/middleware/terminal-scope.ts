import type { FastifyRequest, FastifyReply } from 'fastify';
import { CORPORATE_ROLES, SYSTEM_ROLES } from '@dispatch/shared/constants/roles';
import { findUserById } from '../db/queries/users.js';

/**
 * Extracts terminal context from X-Terminal-Id header or terminalId query param.
 * Corporate and system_admin roles may access any terminal.
 * Terminal-level roles are checked against homeTerminalId (from JWT) and
 * favoriteTerminalIds (DB lookup only if homeTerminalId doesn't match).
 */
export async function requireTerminalScope(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const terminalId =
    (request.headers['x-terminal-id'] as string | undefined) ??
    (request.query as Record<string, string | undefined>)['terminalId'] ??
    (request.params as Record<string, string | undefined>)['terminalId'];

  if (!terminalId) {
    reply.code(400).send({ error: { code: 'MISSING_TERMINAL', message: 'X-Terminal-Id header or terminalId query parameter is required' } });
    return;
  }

  const userRoles = request.user?.roles ?? [];

  // Corporate and system roles can access any terminal
  const hasBroadAccess = userRoles.some(
    (r) =>
      (CORPORATE_ROLES as readonly string[]).includes(r) ||
      (SYSTEM_ROLES as readonly string[]).includes(r),
  );

  if (hasBroadAccess) {
    request.terminalId = terminalId;
    return;
  }

  // Check homeTerminalId from JWT first (no DB hit)
  if (request.user.homeTerminalId === terminalId) {
    request.terminalId = terminalId;
    return;
  }

  // Fall back to DB lookup for favoriteTerminalIds
  const user = await findUserById(request.user.sub);
  if (user && user.favoriteTerminalIds.includes(terminalId)) {
    request.terminalId = terminalId;
    return;
  }

  reply.code(403).send({ error: { code: 'TERMINAL_ACCESS_DENIED', message: 'You do not have access to this terminal' } });
}
