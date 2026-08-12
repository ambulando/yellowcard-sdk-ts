import { jest } from '@jest/globals';
import { HttpClient, DEFAULT_BASE_URL, SANDBOX_BASE_URL } from '../src/client.js';
import { sign } from '../src/auth.js';
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
    client.get('/business/test').catch(() => {});
    expect(DEFAULT_BASE_URL).toBe('https://api.yellowcard.io');
    expect(jest.mocked(fetchFn).mock.calls[0][0]).toBe('https://api.yellowcard.io/business/test');
  });

  it('uses sandbox URL when sandbox option is set', () => {
    const fetchFn = makeFetch(200, {});
    const client = new HttpClient('k', 's', { sandbox: true, fetch: fetchFn });
    client.get('/business/test').catch(() => {});
    expect(SANDBOX_BASE_URL).toBe('https://sandbox.api.yellowcard.io');
    expect(jest.mocked(fetchFn).mock.calls[0][0]).toBe('https://sandbox.api.yellowcard.io/business/test');
  });

  it('attaches auth headers to every request', async () => {
    const fetchFn = makeFetch(200, { ok: true });
    const client = new HttpClient('my-api-key', 'my-secret', { fetch: fetchFn });
    await client.get('/business/test');
    const headers = jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toMatch(/^YcHmacV1 my-api-key:/);
    expect(headers['X-YC-Timestamp']).toBeDefined();
  });

  it('throws APIError on 4xx responses', async () => {
    const fetchFn = makeFetch(404, { code: 'NOT_FOUND', message: 'Resource not found' });
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    await expect(client.get('/business/nope')).rejects.toBeInstanceOf(APIError);
  });

  it('includes status code and message in APIError', async () => {
    const fetchFn = makeFetch(401, { code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    const err = await client.get('/business/test').catch((e) => e) as APIError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toContain('Invalid credentials');
  });

  it('signs the path without the query string but still requests it', async () => {
    // The server computes the signature over the path only; including the
    // query string yields a 401. See src/client.ts request().
    const fetchFn = makeFetch(200, { rates: [] });
    const client = new HttpClient('my-api-key', 'my-secret', { fetch: fetchFn });
    await client.get('/business/rates?currency=USD');

    const [url, init] = jest.mocked(fetchFn).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    const timestamp = headers['X-YC-Timestamp'];
    const signature = headers['Authorization'].split(':')[1];

    // The request URL keeps the query string...
    expect(url).toBe('https://api.yellowcard.io/business/rates?currency=USD');
    // ...but the signature is over the bare path.
    expect(signature).toBe(sign('my-secret', 'GET', '/business/rates', '', timestamp));
    expect(signature).not.toBe(sign('my-secret', 'GET', '/business/rates?currency=USD', '', timestamp));
  });

  it('sends JSON body for POST requests', async () => {
    const fetchFn = makeFetch(200, { id: 'pay-1' });
    const client = new HttpClient('k', 's', { fetch: fetchFn });
    await client.post('/business/send', { amount: 100 });
    const body = jest.mocked(fetchFn).mock.calls[0][1]?.body;
    expect(JSON.parse(body as string)).toEqual({ amount: 100 });
  });
});
