import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geotabAuthenticate, geotabCall, geotabMultiCall, GeotabApiError } from '../../src/geotab/api-client.js';
import type { GeotabCredentials } from '../../src/geotab/types.js';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const credentials: GeotabCredentials = {
  sessionId: 'sess-123',
  database: 'testdb',
  userName: 'testuser',
  server: 'my123.geotab.com',
};

function jsonResponse(data: unknown): Response {
  return {
    json: () => Promise.resolve(data),
  } as Response;
}

describe('geotabAuthenticate', () => {
  it('sends correct request body and returns auth result', async () => {
    const authResult = {
      credentials: { sessionId: 'new-session', database: 'testdb', userName: 'user' },
      path: 'my456.geotab.com',
    };
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: authResult }));

    const result = await geotabAuthenticate('testdb', 'user', 'pass');

    expect(result).toEqual(authResult);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://my.geotab.com/apiv1',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          method: 'Authenticate',
          params: { database: 'testdb', userName: 'user', password: 'pass' },
        }),
      }),
    );
  });

  it('throws GEOTAB_AUTH_EXPIRED for InvalidUserException', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { name: 'InvalidUserException', message: 'Bad creds' } }),
    );

    try {
      await geotabAuthenticate('db', 'user', 'bad');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GeotabApiError);
      expect((err as GeotabApiError).code).toBe('GEOTAB_AUTH_EXPIRED');
    }
  });

  it('throws GEOTAB_NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    try {
      await geotabAuthenticate('db', 'user', 'pass');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GeotabApiError);
      expect((err as GeotabApiError).code).toBe('GEOTAB_NETWORK_ERROR');
    }
  });
});

describe('geotabCall', () => {
  it('sends correct request body with credentials', async () => {
    const devices = [{ id: 'dev1', name: 'Truck 1' }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: devices }));

    const result = await geotabCall(credentials, 'Get', { typeName: 'Device' });

    expect(result).toEqual(devices);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.method).toBe('Get');
    expect(callBody.params.typeName).toBe('Device');
    expect(callBody.params.credentials.sessionId).toBe('sess-123');
  });

  it('uses the server from credentials in the URL', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: [] }));

    await geotabCall(credentials, 'Get', { typeName: 'Device' });

    expect(mockFetch.mock.calls[0][0]).toBe('https://my123.geotab.com/apiv1');
  });

  it('throws GEOTAB_THROTTLED for OverLimitException', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { name: 'OverLimitException', message: 'Rate limited' } }),
    );

    try {
      await geotabCall(credentials, 'Get', { typeName: 'Device' });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GeotabApiError);
      expect((err as GeotabApiError).code).toBe('GEOTAB_THROTTLED');
    }
  });

  it('throws GEOTAB_AUTH_EXPIRED for AuthenticationException', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { name: 'AuthenticationException', message: 'Expired' } }),
    );

    try {
      await geotabCall(credentials, 'Get', {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as GeotabApiError).code).toBe('GEOTAB_AUTH_EXPIRED');
    }
  });

  it('throws GEOTAB_API_ERROR for unknown errors', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: { name: 'SomeOtherException', message: 'Unknown' } }),
    );

    try {
      await geotabCall(credentials, 'Get', {});
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as GeotabApiError).code).toBe('GEOTAB_API_ERROR');
    }
  });
});

describe('geotabMultiCall', () => {
  it('sends ExecuteMultiCall with calls array', async () => {
    const results = [
      [{ id: 'dev1' }],
      [{ id: 'status1' }],
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse({ result: results }));

    const result = await geotabMultiCall(credentials, [
      { method: 'Get', params: { typeName: 'Device' } },
      { method: 'Get', params: { typeName: 'DeviceStatusInfo' } },
    ]);

    expect(result).toEqual(results);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.method).toBe('ExecuteMultiCall');
    expect(callBody.params.calls).toHaveLength(2);
    expect(callBody.params.credentials.sessionId).toBe('sess-123');
  });

  it('throws on MultiCall error with per-call error message', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        error: {
          name: 'OverLimitException',
          errors: [{ name: 'OverLimitException', message: 'Call 1 throttled' }],
        },
      }),
    );

    try {
      await geotabMultiCall(credentials, [{ method: 'Get', params: {} }]);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GeotabApiError);
      expect((err as GeotabApiError).code).toBe('GEOTAB_THROTTLED');
      expect((err as GeotabApiError).message).toBe('Call 1 throttled');
    }
  });

  it('throws GEOTAB_NETWORK_ERROR on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'));

    try {
      await geotabMultiCall(credentials, [{ method: 'Get', params: {} }]);
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as GeotabApiError).code).toBe('GEOTAB_NETWORK_ERROR');
    }
  });
});
