import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { PaymentsService } from '../../src/services/receive.js';

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

const PAYMENT = { id: 'pay-1', status: 'pending', amount: 100, currency: 'NGN' };

describe('PaymentsService (receive)', () => {
  describe('create', () => {
    it('POSTs to /business/receive with request body', async () => {
      const req = { amount: 100, currency: 'NGN', channelId: 'ch-1' };
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.create(req);

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(req);
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('accept', () => {
    it('POSTs to /business/receive/:id/accept', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.accept('pay-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive/pay-1/accept');
      expect(init?.method).toBe('POST');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('deny', () => {
    it('POSTs to /business/receive/:id/deny', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.deny('pay-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive/pay-1/deny');
      expect(init?.method).toBe('POST');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('cancel', () => {
    it('POSTs to /business/receive/:id/cancel', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.cancel('pay-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive/pay-1/cancel');
      expect(init?.method).toBe('POST');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('refund', () => {
    it('POSTs to /business/receive/:id/refund', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.refund('pay-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive/pay-1/refund');
      expect(init?.method).toBe('POST');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('get', () => {
    it('GETs /business/receive/:id', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.get('pay-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive/pay-1');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('getBySequenceId', () => {
    it('GETs /business/receive/sequence-id/:id', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      const result = await service.getBySequenceId('seq-1');

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receive/sequence-id/seq-1');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(PAYMENT);
    });
  });

  describe('getAll', () => {
    it('GETs /business/receives with no query when data is empty', async () => {
      const collection = { collections: [PAYMENT] };
      const { service, fetchFn } = makeService(collection);

      const result = await service.getAll({});

      const [url, init] = jest.mocked(fetchFn).mock.calls[0];
      const headers = getHeaders(fetchFn);
      expect(url).toContain('/business/receives');
      expect(url).not.toContain('?');
      expect(init?.method).toBe('GET');
      expect(headers['Authorization']).toMatch(/^YcHmacV1 my-key:/);
      expect(headers['X-YC-Timestamp']).toBeDefined();
      expect(result).toEqual(collection.collections);
    });

    it('appends query params from SearchData', async () => {
      const { service, fetchFn } = makeService({ collections: [] });

      await service.getAll({ startDate: '2024-01-01', perPage: 10, orderBy: 'desc' });

      const [url] = jest.mocked(fetchFn).mock.calls[0];
      expect(url).toContain('startDate=2024-01-01');
      expect(url).toContain('perPage=10');
      expect(url).toContain('orderBy=desc');
    });
  });
});
