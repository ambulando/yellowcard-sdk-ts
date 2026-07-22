import { sign, authHeaders } from '../src/auth.js';

describe('sign', () => {
  const SECRET = 'my-secret';
  const TS = new Date().toISOString();

  it('is deterministic', () => {
    const s1 = sign(SECRET, 'POST', '/business/business/payments', '{"amount":100}', TS);
    const s2 = sign(SECRET, 'POST', '/business/business/payments', '{"amount":100}', TS);
    expect(s1).toBe(s2);
  });

  it('returns a base64-encoded string', () => {
    const s = sign(SECRET, 'POST', '/business/business/payments', '{"amount":100}', TS);
    expect(s).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it('differs for different secrets', () => {
    const s1 = sign(SECRET, 'POST', '/business/path', '', TS);
    const s2 = sign('other-secret', 'POST', '/business/path', '', TS);
    expect(s1).not.toBe(s2);
  });

  it('differs for different timestamps', () => {
    const s1 = sign(SECRET, 'GET', '/business/rates', '', 1000);
    const s2 = sign(SECRET, 'GET', '/business/rates', '', 2000);
    expect(s1).not.toBe(s2);
  });

  it('differs for different methods', () => {
    const s1 = sign(SECRET, 'GET', '/business/rates', '', TS);
    const s2 = sign(SECRET, 'POST', '/business/rates', '', TS);
    expect(s1).not.toBe(s2);
  });
});

describe('authHeaders', () => {
  it('returns the two required headers', () => {
    const headers = authHeaders('api-key', 'secret', 'GET', '/business/rates', '');
    expect(headers).toHaveProperty('Authorization');
    expect(headers).toHaveProperty('X-YC-Timestamp');
  });

  it('Authorization uses YcHmacV1 scheme with apiKey', () => {
    const { Authorization } = authHeaders('api-key', 'secret', 'GET', '/business/rates', '');
    expect(Authorization).toMatch(/^YcHmacV1 api-key:/);
  });

  it('X-YC-Timestamp is an ISO8601 string', () => {
    const { 'X-YC-Timestamp': ts } = authHeaders('k', 's', 'GET', '/business/rates', '');
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
