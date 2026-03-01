import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

vi.mock('../../src/db/client.js', () => {
  const sql = Object.assign(
    (..._args: unknown[]) => [] as unknown[],
    { array: (..._args: unknown[]) => [] as unknown[], json: (v: unknown) => v },
  );
  return { default: sql };
});

const mockFindUserById = vi.fn();

vi.mock('../../src/db/queries/users.js', () => ({
  findUserById: (...args: unknown[]) => mockFindUserById(...args),
  findUserPublicById: vi.fn(),
}));

import type { JwtPayload } from '../../src/auth/jwt.js';

const TEST_JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
const TEST_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';

let originalJwtSecret: string | undefined;
let originalRefreshSecret: string | undefined;

beforeAll(() => {
  originalJwtSecret = process.env['JWT_SECRET'];
  originalRefreshSecret = process.env['REFRESH_TOKEN_SECRET'];
  process.env['JWT_SECRET'] = TEST_JWT_SECRET;
  process.env['REFRESH_TOKEN_SECRET'] = TEST_REFRESH_SECRET;
});

afterAll(() => {
  if (originalJwtSecret !== undefined) process.env['JWT_SECRET'] = originalJwtSecret;
  else delete process.env['JWT_SECRET'];
  if (originalRefreshSecret !== undefined) process.env['REFRESH_TOKEN_SECRET'] = originalRefreshSecret;
  else delete process.env['REFRESH_TOKEN_SECRET'];
});

beforeEach(() => {
  vi.clearAllMocks();
});

const terminalId = '660e8400-e29b-41d4-a716-446655440000';
const otherTerminalId = '770e8400-e29b-41d4-a716-446655440000';

function createMockReply() {
  const reply = {
    statusCode: 200,
    body: null as unknown,
    code(n: number) {
      reply.statusCode = n;
      return reply;
    },
    send(body: unknown) {
      reply.body = body;
      return reply;
    },
  };
  return reply;
}

// -- authenticate --

describe('authenticate', () => {
  it('sets request.user when valid Bearer token provided', async () => {
    const { generateAccessToken } = await import('../../src/auth/jwt.js');
    const { authenticate } = await import('../../src/middleware/authenticate.js');

    const payload: JwtPayload = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      roles: ['dispatcher'],
      homeTerminalId: terminalId,
    };
    const token = generateAccessToken(payload);

    const request = { headers: { authorization: `Bearer ${token}` } } as Record<string, unknown>;
    const reply = createMockReply();

    await authenticate(request as never, reply as never);

    expect((request as Record<string, unknown>).user).toBeDefined();
    expect(((request as Record<string, unknown>).user as JwtPayload).sub).toBe(payload.sub);
    expect(reply.statusCode).toBe(200);
  });

  it('returns 401 when no Authorization header', async () => {
    const { authenticate } = await import('../../src/middleware/authenticate.js');

    const request = { headers: {} } as Record<string, unknown>;
    const reply = createMockReply();

    await authenticate(request as never, reply as never);

    expect(reply.statusCode).toBe(401);
    expect((reply.body as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 when token is invalid', async () => {
    const { authenticate } = await import('../../src/middleware/authenticate.js');

    const request = { headers: { authorization: 'Bearer invalid-token-value' } } as Record<string, unknown>;
    const reply = createMockReply();

    await authenticate(request as never, reply as never);

    expect(reply.statusCode).toBe(401);
    expect((reply.body as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });
});

// -- requireRole --

describe('requireRole', () => {
  it('passes when user has an allowed role', async () => {
    const { requireRole } = await import('../../src/middleware/authorize.js');

    const handler = requireRole('dispatcher', 'team_lead');
    const request = {
      user: { roles: ['dispatcher'] },
    } as Record<string, unknown>;
    const reply = createMockReply();

    await handler(request as never, reply as never);

    // No error response sent
    expect(reply.statusCode).toBe(200);
    expect(reply.body).toBeNull();
  });

  it('returns 403 when user lacks all allowed roles', async () => {
    const { requireRole } = await import('../../src/middleware/authorize.js');

    const handler = requireRole('terminal_manager', 'system_admin');
    const request = {
      user: { roles: ['dispatcher'] },
    } as Record<string, unknown>;
    const reply = createMockReply();

    await handler(request as never, reply as never);

    expect(reply.statusCode).toBe(403);
    expect((reply.body as { error: { code: string } }).error.code).toBe('FORBIDDEN');
  });

  it('returns 401 when user object is missing', async () => {
    const { requireRole } = await import('../../src/middleware/authorize.js');

    const handler = requireRole('dispatcher');
    const request = {} as Record<string, unknown>;
    const reply = createMockReply();

    await handler(request as never, reply as never);

    expect(reply.statusCode).toBe(401);
    expect((reply.body as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });
});

// -- requireTerminalScope --

describe('requireTerminalScope', () => {
  it('sets request.terminalId when homeTerminalId matches param', async () => {
    const { requireTerminalScope } = await import('../../src/middleware/terminal-scope.js');

    const request = {
      headers: { 'x-terminal-id': terminalId },
      query: {},
      params: {},
      user: {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        roles: ['dispatcher'],
        homeTerminalId: terminalId,
      },
    } as Record<string, unknown>;
    const reply = createMockReply();

    await requireTerminalScope(request as never, reply as never);

    expect((request as Record<string, unknown>).terminalId).toBe(terminalId);
    expect(reply.statusCode).toBe(200);
  });

  it('returns 403 when terminal access denied', async () => {
    const { requireTerminalScope } = await import('../../src/middleware/terminal-scope.js');

    mockFindUserById.mockResolvedValueOnce({ favoriteTerminalIds: [] });

    const request = {
      headers: { 'x-terminal-id': otherTerminalId },
      query: {},
      params: {},
      user: {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        roles: ['dispatcher'],
        homeTerminalId: terminalId,
      },
    } as Record<string, unknown>;
    const reply = createMockReply();

    await requireTerminalScope(request as never, reply as never);

    expect(reply.statusCode).toBe(403);
    expect((reply.body as { error: { code: string } }).error.code).toBe('TERMINAL_ACCESS_DENIED');
  });
});
