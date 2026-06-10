import { jest } from '@jest/globals';
import { HttpClient, DEFAULT_BASE_URL, SANDBOX_BASE_URL } from '../src/client.js';
import { APIError } from '../src';

function makeFetch(status: number, body: unknown): jest.MockedFunction<typeof globalThis.fetch> {
  const mock = jest.fn() as unknown as jest.MockedFunction<typeof globalThis.fetch>;
  mock.mockResolvedValue({
    ok: status < 400,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
  return mock;
}

describe('HttpClient', () => {
  it('uses production URL by default', () => {
    const fetchFn = makeFetch(200, {});
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    client.get('/v2/test').catch(() => {});
    expect(jest.mocked(fetchFn).mock.calls[0][0]).toMatch(DEFAULT_BASE_URL);
  });

  it('uses sandbox URL when sandbox option is set', () => {
    const fetchFn = makeFetch(200, {});
    const client = new HttpClient('k', 's', { sandbox: true, fetch: fetchFn });
    client.get('/v2/test').catch(() => {});
    expect(jest.mocked(fetchFn).mock.calls[0][0]).toMatch(SANDBOX_BASE_URL);
  });

  it('attaches auth headers to every request', async () => {
    const fetchFn = makeFetch(200, { ok: true });
    const client = new HttpClient('my-api-key', 'my-secret', { fetch: fetchFn });
    await client.get('/v2/test');
    const headers = jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toMatch(/^YcHmacV1 my-api-key:/);
    expect(headers['X-YC-Timestamp']).toBeDefined();
  });

  it('throws APIError on 4xx responses', async () => {
    const fetchFn = makeFetch(404, { code: 'NOT_FOUND', message: 'Resource not found' });
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    await expect(client.get('/v2/missing')).rejects.toBeInstanceOf(APIError);
  });

  it('includes status code and message in APIError', async () => {
    const fetchFn = makeFetch(401, { code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    const err = await client.get('/v2/test').catch((e) => e) as APIError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toContain('Invalid credentials');
  });

  it('sends JSON body for POST requests', async () => {
    const fetchFn = makeFetch(200, { id: 'pay-1' });
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    await client.post('/v2/payments', { amount: 100 });
    const body = jest.mocked(fetchFn).mock.calls[0][1]?.body;
    expect(JSON.parse(body as string)).toEqual({ amount: 100 });
  });
});
