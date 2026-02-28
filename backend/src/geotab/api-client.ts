import type { GeotabAuthResult, GeotabCredentials } from './types.js';

const GEOTAB_API_BASE = 'https://my.geotab.com/apiv1';

export type GeotabApiErrorCode =
  | 'GEOTAB_NETWORK_ERROR'
  | 'GEOTAB_API_ERROR'
  | 'GEOTAB_THROTTLED'
  | 'GEOTAB_AUTH_EXPIRED';

export class GeotabApiError extends Error {
  constructor(
    message: string,
    public readonly code: GeotabApiErrorCode,
    public readonly geotabError?: string,
  ) {
    super(message);
    this.name = 'GeotabApiError';
  }
}

interface GeotabJsonRpcResponse {
  result?: unknown;
  error?: {
    name?: string;
    message?: string;
    errors?: Array<{ name?: string; message?: string }>;
  };
}

function classifyError(errorName: string | undefined): GeotabApiErrorCode {
  if (!errorName) return 'GEOTAB_API_ERROR';
  if (errorName === 'OverLimitException') return 'GEOTAB_THROTTLED';
  if (errorName === 'InvalidUserException' || errorName === 'AuthenticationException') {
    return 'GEOTAB_AUTH_EXPIRED';
  }
  return 'GEOTAB_API_ERROR';
}

function buildApiUrl(server?: string): string {
  if (!server) return GEOTAB_API_BASE;
  // Geotab returns server as a hostname (e.g., "my123.geotab.com")
  const base = server.startsWith('http') ? server : `https://${server}`;
  return `${base.replace(/\/$/, '')}/apiv1`;
}

/**
 * Authenticate with the Geotab API.
 * Returns session credentials and the server URL to use for subsequent calls.
 */
export async function geotabAuthenticate(
  database: string,
  userName: string,
  password: string,
): Promise<GeotabAuthResult> {
  const url = GEOTAB_API_BASE;
  const body = JSON.stringify({
    method: 'Authenticate',
    params: { database, userName, password },
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (err) {
    throw new GeotabApiError(
      `Network error connecting to Geotab: ${err instanceof Error ? err.message : String(err)}`,
      'GEOTAB_NETWORK_ERROR',
    );
  }

  const json = (await response.json()) as GeotabJsonRpcResponse;

  if (json.error) {
    const code = classifyError(json.error.name);
    throw new GeotabApiError(
      json.error.message ?? 'Geotab authentication failed',
      code,
      json.error.name,
    );
  }

  return json.result as GeotabAuthResult;
}

/**
 * Make a single Geotab API call with existing credentials.
 */
export async function geotabCall<T = unknown>(
  credentials: GeotabCredentials,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = buildApiUrl(credentials.server);
  const body = JSON.stringify({
    method,
    params: {
      ...params,
      credentials: {
        sessionId: credentials.sessionId,
        database: credentials.database,
        userName: credentials.userName,
      },
    },
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (err) {
    throw new GeotabApiError(
      `Network error calling Geotab ${method}: ${err instanceof Error ? err.message : String(err)}`,
      'GEOTAB_NETWORK_ERROR',
    );
  }

  const json = (await response.json()) as GeotabJsonRpcResponse;

  if (json.error) {
    const code = classifyError(json.error.name);
    throw new GeotabApiError(
      json.error.message ?? `Geotab API error on ${method}`,
      code,
      json.error.name,
    );
  }

  return json.result as T;
}

/**
 * Make a Geotab MultiCall — multiple API calls in a single HTTP request.
 * Returns an array of results in the same order as the calls.
 */
export async function geotabMultiCall<T extends unknown[] = unknown[]>(
  credentials: GeotabCredentials,
  calls: Array<{ method: string; params: Record<string, unknown> }>,
): Promise<T> {
  const url = buildApiUrl(credentials.server);
  const body = JSON.stringify({
    method: 'ExecuteMultiCall',
    params: {
      calls: calls.map((c) => ({ method: c.method, params: c.params })),
      credentials: {
        sessionId: credentials.sessionId,
        database: credentials.database,
        userName: credentials.userName,
      },
    },
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (err) {
    throw new GeotabApiError(
      `Network error calling Geotab ExecuteMultiCall: ${err instanceof Error ? err.message : String(err)}`,
      'GEOTAB_NETWORK_ERROR',
    );
  }

  const json = (await response.json()) as GeotabJsonRpcResponse;

  if (json.error) {
    const code = classifyError(json.error.name);
    // MultiCall can return per-call errors in the errors array
    const message = json.error.errors?.[0]?.message ?? json.error.message ?? 'Geotab MultiCall error';
    throw new GeotabApiError(message, code, json.error.name);
  }

  return json.result as T;
}
