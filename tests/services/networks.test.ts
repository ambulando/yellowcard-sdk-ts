import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { NetworksService } from '../../src/services/networks.js';

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
  return { service: new NetworksService(client), fetchFn };
}

function getHeaders(fetchFn: jest.MockedFunction<typeof globalThis.fetch>): Record<string, string> {
  return jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
}

describe('NetworksService', () => {
  describe('list', () => {
    it('GETs /business/networks and returns networks array', async () => {
      const networks = [{ id: 'net-1', code: 'NG', name: 'Nigeria', country: 'NG', channelIds: [], accountNumberType: 'NUBAN', countryAccountNumberType: 'NUBAN', updatedAt: '2024-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' }];
      const { service, fetchFn } = makeService({ networks });

      const result = await service.list();

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/networks');
      expect(url).not.toContain('country=');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(networks);
    });

    it('appends country query param when provided', async () => {
      const { service, fetchFn } = makeService({ networks: [] });

      await service.list('NG');

      const [url] = jest.mocked(fetchFn).mock.calls[0];
      expect(url).toContain('country=NG');
    });
  });

  describe('channels', () => {
    it('GETs /business/channels and returns channels array', async () => {
      const channels = [{ id: 'ch-1', currency: 'NGN', country: 'NG', status: 'active' }];
      const { service, fetchFn } = makeService({ channels });

      const result = await service.channels();

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/channels');
      expect(url).not.toContain('country=');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(channels);
    });

    it('appends country query param when provided', async () => {
      const { service, fetchFn } = makeService({ channels: [] });

      await service.channels('GH');

      const [url] = jest.mocked(fetchFn).mock.calls[0];
      expect(url).toContain('country=GH');
    });
  });
});
