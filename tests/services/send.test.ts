import { validateSubmitSendRequest } from '../../src/services/send.js';
import type { SubmitSendRequest } from '../../src/services/send.js';

const VALID_RETAIL_REQUEST: SubmitSendRequest = {
  sequenceId: 'seq-1',
  reason: 'entertainment',
  customerUID: 'cust-1',
  customerType: 'retail',
  forceAccept: false,
  amount: 100,
  sender: {
    name: 'John Doe',
    country: 'GH',
    address: 'Home Address',
    dob: '02/01/1997',
    idNumber: '314159',
    idType: 'license',
  },
  destination: {
    accountName: 'Elom',
    accountNumber: '1111111111',
    accountType: 'bank',
    networkId: 'net-1',
  },
};

const VALID_INSTITUTION_REQUEST: SubmitSendRequest = {
  sequenceId: 'seq-2',
  reason: 'invoice',
  customerUID: 'cust-2',
  customerType: 'institution',
  forceAccept: true,
  localAmount: 20000,
  sender: {
    businessId: 'biz-1',
    businessName: 'Acme Corp',
  },
  destination: {
    accountName: 'Acme',
    accountNumber: '2222222222',
    accountType: 'momo',
    networkId: 'net-2',
  },
};

describe('validateSubmitSendRequest', () => {
  it('passes a complete retail request', () => {
    expect(validateSubmitSendRequest(VALID_RETAIL_REQUEST)).toEqual([]);
  });

  it('passes a complete institution request', () => {
    expect(validateSubmitSendRequest(VALID_INSTITUTION_REQUEST)).toEqual([]);
  });

  it('flags the always-required top-level fields', () => {
    const issues = validateSubmitSendRequest({} as SubmitSendRequest);
    expect(issues).toContain('sequenceId is required');
    expect(issues).toContain('reason is required');
    expect(issues).toContain('customerUID is required');
    expect(issues).toContain('customerType is required');
    expect(issues).toContain('forceAccept is required');
  });

  it('accepts forceAccept: false as present', () => {
    const issues = validateSubmitSendRequest({ ...VALID_RETAIL_REQUEST, forceAccept: false });
    expect(issues).not.toContain('forceAccept is required');
  });

  it('rejects an unknown customerType', () => {
    const issues = validateSubmitSendRequest({ ...VALID_RETAIL_REQUEST, customerType: 'vip' as never });
    expect(issues).toContain('customerType must be one of "retail" | "institution" (got "vip")');
  });

  it('rejects an unknown channelType', () => {
    const issues = validateSubmitSendRequest({
      ...VALID_RETAIL_REQUEST,
      channelType: 'wire' as never,
      country: 'GH',
      currency: 'GHS',
    });
    expect(issues).toContain('channelType must be one of "bank" | "momo" (got "wire")');
  });

  describe('amount / localAmount', () => {
    it('requires one of amount or localAmount', () => {
      const { amount, ...rest } = VALID_RETAIL_REQUEST;
      void amount;
      const issues = validateSubmitSendRequest(rest as SubmitSendRequest);
      expect(issues).toContain('one of amount or localAmount is required');
    });

    it('rejects providing both amount and localAmount', () => {
      const issues = validateSubmitSendRequest({ ...VALID_RETAIL_REQUEST, localAmount: 20000 });
      expect(issues).toContain('amount and localAmount are mutually exclusive — provide only one');
    });

    it('rejects a non-integer amount', () => {
      const issues = validateSubmitSendRequest({ ...VALID_RETAIL_REQUEST, amount: 10.5 });
      expect(issues).toContain('amount must be an integer');
    });

    it('rejects a non-integer localAmount', () => {
      const { amount, ...rest } = VALID_RETAIL_REQUEST;
      void amount;
      const issues = validateSubmitSendRequest({ ...rest, localAmount: 10.5 } as SubmitSendRequest);
      expect(issues).toContain('localAmount must be an integer');
    });
  });

  describe('channelType routing', () => {
    it('requires country and currency when channelType is used', () => {
      const issues = validateSubmitSendRequest({ ...VALID_RETAIL_REQUEST, channelType: 'momo' });
      expect(issues).toContain('country is required when channelType is used');
      expect(issues).toContain('currency is required when channelType is used');
    });

    it('passes when channelType is used with country and currency', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_RETAIL_REQUEST,
        channelType: 'momo',
        country: 'GH',
        currency: 'GHS',
      });
      expect(issues).toEqual([]);
    });
  });

  describe('destination', () => {
    it('flags a missing destination', () => {
      const { destination, ...rest } = VALID_RETAIL_REQUEST;
      void destination;
      const issues = validateSubmitSendRequest(rest as SubmitSendRequest);
      expect(issues).toContain('destination is required');
    });

    it('requires the destination subset of fields', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_RETAIL_REQUEST,
        destination: {} as SubmitSendRequest['destination'],
      });
      expect(issues).toContain('destination.accountNumber is required');
      expect(issues).toContain('destination.accountType is required');
      expect(issues).toContain('destination.networkId is required');
      expect(issues).toContain('destination.accountName is required');
    });

    it('rejects an unknown destination.accountType', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_RETAIL_REQUEST,
        destination: { ...VALID_RETAIL_REQUEST.destination, accountType: 'wallet' as never },
      });
      expect(issues).toContain('destination.accountType must be one of "bank" | "momo" (got "wallet")');
    });
  });

  describe('retail sender KYC', () => {
    it('requires the full retail KYC set', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_RETAIL_REQUEST,
        sender: {},
      });
      for (const f of ['name', 'country', 'address', 'dob', 'idNumber', 'idType']) {
        expect(issues).toContain(`sender.${f} is required when customerType is "retail"`);
      }
    });

    it('requires a second ID for Nigerian retail senders', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_RETAIL_REQUEST,
        sender: { ...VALID_RETAIL_REQUEST.sender, country: 'NG' },
      });
      expect(issues).toContain('sender.additionalIdType is required for retail senders in NG');
      expect(issues).toContain('sender.additionalIdNumber is required for retail senders in NG');
    });

    it('passes a Nigerian retail sender with a second ID', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_RETAIL_REQUEST,
        sender: {
          ...VALID_RETAIL_REQUEST.sender,
          country: 'NG',
          additionalIdType: 'bvn',
          additionalIdNumber: '12345678901',
        },
      });
      expect(issues).toEqual([]);
    });
  });

  describe('institution sender identity', () => {
    it('requires business identity for institution senders', () => {
      const issues = validateSubmitSendRequest({
        ...VALID_INSTITUTION_REQUEST,
        sender: {},
      });
      expect(issues).toContain('sender.businessId is required when customerType is "institution"');
      expect(issues).toContain('sender.businessName is required when customerType is "institution"');
    });
  });
});
