import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { RatesService } from '../../src/services/rates.js';

function makeFetch(body: unknown, status = 200): jest.MockedFunction<typeof globalThis.fetch> {
  const mock = jest.fn() as unknown as jest.MockedFunction<typeof globalThis.fetch>;
  mock.mockResolvedValue({
    ok: status < 400,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
  return mock;
}

function makeService(body: unknown, status = 200) {
  const fetchFn = makeFetch(body, status);
  const client = new HttpClient('my-key', 'my-secret', { fetch: fetchFn });
  return { service: new RatesService(client), fetchFn };
}

function getHeaders(fetchFn: jest.MockedFunction<typeof globalThis.fetch>): Record<string, string> {
  return jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
}

describe('RatesService', () => {
  describe('list', () => {
    it('GETs /business/rates with currency param and returns rates array', async () => {
      const rates = [{ code: 'NGN', buy: 1500, sell: 1480, rateId: 'r-1' }];
      const { service, fetchFn } = makeService({ rates });

      const result = await service.list('USD');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/rates');
      expect(url).toContain('currency=USD');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(rates);
    });

    it('omits currency param when empty string is provided', async () => {
      const { service, fetchFn } = makeService({ rates: [] });

      await service.list('');

      const [url] = jest.mocked(fetchFn).mock.calls[0];
      expect(url).not.toContain('currency=');
    });
  });
});
