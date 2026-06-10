import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { PaymentsService } from '../../src/services/webhook.js';

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
  return { service: new PaymentsService(client), fetchFn };
}

function getHeaders(fetchFn: jest.MockedFunction<typeof globalThis.fetch>): Record<string, string> {
  return jest.mocked(fetchFn).mock.calls[0][1]?.headers as Record<string, string>;
}

const WEBHOOK = { id: 'wh-1', url: 'https://example.com/hook', active: true, state: 'active' };

describe('WebhookService', () => {
  describe('create', () => {
    it('POSTs to /business/webhooks with request body', async () => {
      const req = { url: 'https://example.com/hook', active: true };
      const { service, fetchFn } = makeService(WEBHOOK);

      const result = await service.create(req);

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/webhooks');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(req);
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(WEBHOOK);
    });
  });

  describe('update', () => {
    it('PUTs to /business/webhooks with request body', async () => {
      const req = { id: 'wh-1', active: false };
      const { service, fetchFn } = makeService(WEBHOOK);

      const result = await service.update(req);

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/webhooks');
      expect(init?.method).toBe('PUT');
      expect(JSON.parse(init?.body as string)).toEqual(req);
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(WEBHOOK);
    });
  });

  describe('remove', () => {
    it('DELETEs /business/webhooks/:id', async () => {
      const { service, fetchFn } = makeService(null, 204);

      await service.remove('wh-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/webhooks/wh-1');
      expect(init?.method).toBe('DELETE');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
    });
  });

  describe('list', () => {
    it('GETs /business/webhooks and returns webhooks array', async () => {
      const webhooks = [WEBHOOK, { id: 'wh-2', url: 'https://example.com/hook2', active: false }];
      const { service, fetchFn } = makeService({ webhooks });

      const result = await service.list();

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/webhooks');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(webhooks);
    });
  });
});
