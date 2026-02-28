import type { Terminal, TerminalCreate, TerminalUpdate } from '@dispatch/shared/types/terminal';
import { CORPORATE_ROLES, SYSTEM_ROLES } from '@dispatch/shared/constants/roles';
import {
  findTerminalById,
  findTerminalBySlug,
  listTerminals as listTerminalsDb,
  listTerminalsByIds,
  createTerminal as createTerminalDb,
  updateTerminal as updateTerminalDb,
  deleteTerminal as deleteTerminalDb,
} from '../db/queries/terminals.js';
import { createAuditLog } from '../db/queries/audit-logs.js';

export class TerminalServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'TerminalServiceError';
  }
}

/**
 * List terminals filtered by the user's access level.
 * - system_admin and corporate roles see all terminals.
 * - Terminal-level roles see only their home + favorite terminals.
 */
export async function listTerminalsForUser(userRoles: string[], homeTerminalId: string | null, favoriteTerminalIds: string[]): Promise<Terminal[]> {
  const hasBroadAccess = userRoles.some(
    (r) =>
      (CORPORATE_ROLES as readonly string[]).includes(r) ||
      (SYSTEM_ROLES as readonly string[]).includes(r),
  );

  if (hasBroadAccess) {
    return listTerminalsDb();
  }

  // Terminal-scoped users see their home + favorites
  const terminalIds = new Set<string>();
  if (homeTerminalId) terminalIds.add(homeTerminalId);
  for (const id of favoriteTerminalIds) terminalIds.add(id);

  if (terminalIds.size === 0) return [];
  return listTerminalsByIds([...terminalIds]);
}

export async function getTerminalById(id: string): Promise<Terminal> {
  const terminal = await findTerminalById(id);
  if (!terminal) {
    throw new TerminalServiceError('Terminal not found', 'TERMINAL_NOT_FOUND', 404);
  }
  return terminal;
}

export async function createTerminal(
  data: TerminalCreate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Terminal> {
  // Check slug uniqueness
  const existing = await findTerminalBySlug(data.slug);
  if (existing) {
    throw new TerminalServiceError('A terminal with this slug already exists', 'SLUG_CONFLICT', 409);
  }

  const terminal = await createTerminalDb(data);

  createAuditLog({
    eventType: 'system_change',
    entityType: 'terminal',
    entityId: terminal.id,
    userId,
    summary: `Terminal "${terminal.name}" (${terminal.slug}) created`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return terminal;
}

export async function updateTerminal(
  id: string,
  data: TerminalUpdate,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<Terminal> {
  // If slug is being changed, check uniqueness
  if (data.slug !== undefined) {
    const existing = await findTerminalBySlug(data.slug);
    if (existing && existing.id !== id) {
      throw new TerminalServiceError('A terminal with this slug already exists', 'SLUG_CONFLICT', 409);
    }
  }

  const terminal = await updateTerminalDb(id, data);
  if (!terminal) {
    throw new TerminalServiceError('Terminal not found', 'TERMINAL_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'terminal',
    entityId: id,
    userId,
    summary: `Terminal "${terminal.name}" updated`,
    metadata: { changes: data },
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});

  return terminal;
}

export async function removeTerminal(
  id: string,
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<void> {
  const terminal = await findTerminalById(id);
  if (!terminal) {
    throw new TerminalServiceError('Terminal not found', 'TERMINAL_NOT_FOUND', 404);
  }

  const deleted = await deleteTerminalDb(id);
  if (!deleted) {
    throw new TerminalServiceError('Terminal not found', 'TERMINAL_NOT_FOUND', 404);
  }

  createAuditLog({
    eventType: 'system_change',
    entityType: 'terminal',
    entityId: id,
    userId,
    summary: `Terminal "${terminal.name}" (${terminal.slug}) deleted`,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  }).catch(() => {});
}
