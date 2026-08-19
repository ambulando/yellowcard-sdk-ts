import { validateTravelRuleData } from '../../src/services/transactions.js';
import type { TravelRuleConfig, TravelRuleField } from '../../src/services/transactions.js';

function field(overrides: Partial<TravelRuleField> = {}): TravelRuleField {
  return {
    displayName: 'Sender Full Name',
    fieldType: 'string',
    required: true,
    payloadName: 'senderName',
    ...overrides,
  };
}

function config(dataFields: TravelRuleField[]): TravelRuleConfig {
  return {
    id: 'config-1',
    countryCode: 'NG',
    minAmount: 1000,
    status: 'ACTIVE',
    timeoutAction: 'PROCEED',
    counterPartyRepair: 'outgoing',
    repairWaitTime: 30,
    repairCount: 3,
    dataFields,
  };
}

describe('validateTravelRuleData', () => {
  it('passes when all required fields are present', () => {
    const cfg = config([
      field({ payloadName: 'senderName' }),
      field({ payloadName: 'senderDob', fieldType: 'date', displayName: 'Sender DOB' }),
    ]);
    const result = validateTravelRuleData(cfg, {
      senderName: 'Ada Lovelace',
      senderDob: '1815-12-10',
    });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('flags a missing required field', () => {
    const cfg = config([field({ payloadName: 'senderName', displayName: 'Sender Name' })]);
    const result = validateTravelRuleData(cfg, {});
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Required field "Sender Name" (senderName) is missing',
    ]);
  });

  it('treats an empty or whitespace-only value as missing', () => {
    const cfg = config([field({ payloadName: 'senderName' })]);
    expect(validateTravelRuleData(cfg, { senderName: '' }).valid).toBe(false);
    expect(validateTravelRuleData(cfg, { senderName: '   ' }).valid).toBe(false);
  });

  it('ignores missing optional fields', () => {
    const cfg = config([field({ payloadName: 'senderName', required: false })]);
    const result = validateTravelRuleData(cfg, {});
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('defaults data to an empty object', () => {
    const cfg = config([field({ payloadName: 'senderName', displayName: 'Sender Name' })]);
    const result = validateTravelRuleData(cfg);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Required field "Sender Name" (senderName) is missing');
  });

  it('rejects an invalid date value', () => {
    const cfg = config([
      field({ payloadName: 'senderDob', fieldType: 'date', displayName: 'Sender DOB' }),
    ]);
    const result = validateTravelRuleData(cfg, { senderDob: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Field "Sender DOB" (senderDob) is not a valid date: "not-a-date"',
    ]);
  });

  it('accepts a valid date value', () => {
    const cfg = config([field({ payloadName: 'senderDob', fieldType: 'date' })]);
    expect(validateTravelRuleData(cfg, { senderDob: '2025-10-31T17:41:38.833Z' }).valid).toBe(true);
  });

  it('rejects an invalid number value', () => {
    const cfg = config([
      field({ payloadName: 'amount', fieldType: 'number', displayName: 'Amount' }),
    ]);
    const result = validateTravelRuleData(cfg, { amount: 'abc' });
    expect(result.errors).toEqual([
      'Field "Amount" (amount) is not a valid number: "abc"',
    ]);
  });

  it('accepts a valid number value', () => {
    const cfg = config([field({ payloadName: 'amount', fieldType: 'number' })]);
    expect(validateTravelRuleData(cfg, { amount: '42' }).valid).toBe(true);
  });

  it('is case-insensitive on fieldType', () => {
    const cfg = config([field({ payloadName: 'senderDob', fieldType: 'DATE' })]);
    expect(validateTravelRuleData(cfg, { senderDob: 'nope' }).valid).toBe(false);
  });

  it('does not type-check missing optional typed fields', () => {
    const cfg = config([
      field({ payloadName: 'senderDob', fieldType: 'date', required: false }),
    ]);
    expect(validateTravelRuleData(cfg, {}).valid).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const cfg = config([
      field({ payloadName: 'senderName', displayName: 'Sender Name' }),
      field({ payloadName: 'senderDob', fieldType: 'date', displayName: 'Sender DOB' }),
    ]);
    const result = validateTravelRuleData(cfg, { senderDob: 'bad' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('passes when the config has no data fields', () => {
    expect(validateTravelRuleData(config([]), {})).toEqual({ valid: true, errors: [] });
  });
});
