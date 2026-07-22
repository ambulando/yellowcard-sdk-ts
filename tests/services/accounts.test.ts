import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { AccountsService } from '../../src/services/accounts.js';

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
  return { service: new AccountsService(client), fetchFn };
}

function getHeaders(fetchFn: jest.MockedFunction<typeof globalThis.fetch>): Record<string, string> {
  return jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
}

describe('AccountsService', () => {
  describe('list', () => {
    it('GETs /business/account and returns accounts array', async () => {
      const accounts = [
        { id: 'acc-1', label: 'Main', currency: 'USD', balance: 1000, status: 'active' },
        { id: 'acc-2', label: 'Secondary', currency: 'EUR', balance: 500, status: 'active' },
      ];
      const { service, fetchFn } = makeService({ accounts });

      const result = await service.list();

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/account');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(accounts);
    });
  });
});
