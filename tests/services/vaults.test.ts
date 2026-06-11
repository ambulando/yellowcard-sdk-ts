import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { VaultService } from '../../src/services/vaults.js';

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
  return { service: new VaultService(client), fetchFn };
}

function getHeaders(fetchFn: jest.MockedFunction<typeof globalThis.fetch>): Record<string, string> {
  return jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
}

describe('Vaults', () => {
  describe('create', () => {
    it('POSTs to /custody/vaults with name', async () => {
      const vault = { id: 'v-1', vaultLabel: 'my-vault' };
      const { service, fetchFn } = makeService(vault);

      const result = await service.create('my-vault');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/custody/vaults');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({ name: 'my-vault' });
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(vault);
    });
  });

  describe('getAll', () => {
    it('GETs /custody/vaults and returns the vaults array', async () => {
      const vaults = [{ id: 'v-1' }, { id: 'v-2' }];
      const { service, fetchFn } = makeService({ vaults });

      const result = await service.getAll();

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/custody/vaults');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(vaults);
    });
  });

  describe('get', () => {
    it('GETs /custody/vaults/:id', async () => {
      const vault = { id: 'v-1', vaultLabel: 'my-vault' };
      const { service, fetchFn } = makeService(vault);

      const result = await service.get('v-1');

      const [url] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/custody/vaults/v-1');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(vault);
    });
  });

  describe('getConfig', () => {
    it('GETs /custody/vaults/config', async () => {
      const configs = [{ id: 'cfg-1', code: 'BTC' }];
      const { service, fetchFn } = makeService(configs);

      const result = await service.getConfig('v-1');

      const [url] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/custody/vaults/config');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(configs);
    });
  });

  describe('createAddress', () => {
    it('POSTs to /custody/addresses with token and vaultId', async () => {
      const address = { address: '0xabc', token: 'ETH', vaultId: 'v-1' };
      const { service, fetchFn } = makeService(address);

      const result = await service.createAddress({ token: 'ETH', vaultId: 'v-1' });

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/custody/addresses');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({ token: 'ETH', vaultId: 'v-1' });
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(address);
    });
  });
});
