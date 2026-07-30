import { jest } from '@jest/globals';
import { HttpClient } from '../../src/client.js';
import { PaymentsService, validateReceivePaymentRequest } from '../../src/services/receive.js';
import type { ReceivePaymentRequest } from '../../src/services/receive.js';
import { ValidationError } from '../../src';

const VALID_RETAIL_REQUEST: ReceivePaymentRequest = {
  channelId: 'ch-1',
  sequenceId: 'seq-1',
  customerUID: 'cust-1',
  customerType: 'retail',
  amount: 100,
  recipient: {
    name: 'John Doe',
    phone: '+2349092916898',
    email: 'john.doe@yellowcard.io',
    country: 'GH',
    address: 'Home Address',
    dob: '02/01/1997',
    idNumber: '314159',
    idType: 'license',
  },
  source: { accountType: 'bank', accountNumber: '1111111111' },
};

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
      const req = VALID_RETAIL_REQUEST;
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

    it('rejects an invalid request before hitting the network', async () => {
      const { service, fetchFn } = makeService(PAYMENT);

      await expect(service.create({ amount: 100 })).rejects.toBeInstanceOf(ValidationError);
      expect(fetchFn).not.toHaveBeenCalled();
    });
  });

  describe('validateReceivePaymentRequest', () => {
    it('passes a complete retail request', () => {
      expect(validateReceivePaymentRequest(VALID_RETAIL_REQUEST)).toEqual([]);
    });

    it('flags the always-required top-level fields', () => {
      const issues = validateReceivePaymentRequest({});
      expect(issues).toEqual(
        expect.arrayContaining([
          'channelId is required',
          'sequenceId is required',
          'customerUID is required',
          'customerType is required',
        ])
      );
    });

    it('rejects an unknown customerType', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, customerType: 'vip' as never });
      expect(issues).toContain('customerType must be one of "retail" | "institution" (got "vip")');
    });

    it('requires the full retail KYC set', () => {
      const issues = validateReceivePaymentRequest({
        channelId: 'ch-1',
        sequenceId: 'seq-1',
        customerUID: 'cust-1',
        customerType: 'retail',
        recipient: { name: 'John Doe' },
      });
      expect(issues).toEqual(
        expect.arrayContaining([
          'recipient.phone is required when customerType is "retail"',
          'recipient.email is required when customerType is "retail"',
          'recipient.idType is required when customerType is "retail"',
        ])
      );
    });

    it('requires a second ID for Nigerian retail recipients', () => {
      const issues = validateReceivePaymentRequest({
        ...VALID_RETAIL_REQUEST,
        recipient: { ...VALID_RETAIL_REQUEST.recipient, country: 'NG' },
      });
      expect(issues).toEqual(
        expect.arrayContaining([
          'recipient.additionalIdType is required for retail recipients in NG',
          'recipient.additionalIdNumber is required for retail recipients in NG',
        ])
      );
    });

    it('requires business identity for institution recipients', () => {
      const issues = validateReceivePaymentRequest({
        channelId: 'ch-1',
        sequenceId: 'seq-1',
        customerUID: 'cust-1',
        customerType: 'institution',
        recipient: { email: 'ops@acme.io' },
      });
      expect(issues).toEqual(
        expect.arrayContaining([
          'recipient.businessId is required when customerType is "institution"',
          'recipient.businessName is required when customerType is "institution"',
        ])
      );
    });

    it('requires country and currency when channelType is used', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, channelType: 'momo' });
      expect(issues).toEqual(
        expect.arrayContaining([
          'country is required when channelType is used',
          'currency is required when channelType is used',
        ])
      );
    });

    it('requires settlement info when directSettlement is true', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, directSettlement: true });
      expect(issues).toContain('settlementInfo is required when directSettlement is true');
    });

    it('rejects a schemeless redirectUrl', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, redirectUrl: 'example.com/return' });
      expect(issues).toContain('redirectUrl must be a valid URL including the http:// or https:// scheme');
    });

    it('accepts an http(s) redirectUrl', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, redirectUrl: 'https://example.com/return' });
      expect(issues).toEqual([]);
    });

    it('rejects an unknown channelType', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, channelType: 'wire' as never });
      expect(issues).toContain('channelType must be one of "bank" | "momo" (got "wire")');
    });

    it('rejects a non-integer amount', () => {
      const issues = validateReceivePaymentRequest({ ...VALID_RETAIL_REQUEST, amount: 10.5 });
      expect(issues).toContain('amount must be an integer');
    });

    it('rejects an unknown source.accountType', () => {
      const issues = validateReceivePaymentRequest({
        ...VALID_RETAIL_REQUEST,
        source: { accountType: 'crypto' as never },
      });
      expect(issues).toContain('source.accountType must be one of "bank" | "momo" (got "crypto")');
    });

    it('flags each missing settlementInfo field when directSettlement is true', () => {
      const issues = validateReceivePaymentRequest({
        ...VALID_RETAIL_REQUEST,
        directSettlement: true,
        settlementInfo: { walletAddress: '0xabc' },
      });
      expect(issues).toEqual(
        expect.arrayContaining([
          'settlementInfo.cryptoCurrency is required when directSettlement is true',
          'settlementInfo.cryptoNetwork is required when directSettlement is true',
        ])
      );
      expect(issues).not.toContain('settlementInfo.walletAddress is required when directSettlement is true');
    });

    it('passes a complete institution request', () => {
      const issues = validateReceivePaymentRequest({
        channelId: 'ch-1',
        sequenceId: 'seq-1',
        customerUID: 'cust-1',
        customerType: 'institution',
        amount: 100,
        recipient: { email: 'ops@acme.io', businessId: 'biz-1', businessName: 'Acme Inc' },
        source: { accountType: 'momo', accountNumber: '1111111111' },
      });
      expect(issues).toEqual([]);
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
