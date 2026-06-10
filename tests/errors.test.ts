import { APIError, isNotFound, isUnauthorized } from '../src/errors.js';

describe('APIError', () => {
  it('includes status code and message', () => {
    const err = new APIError(404, 'NOT_FOUND', 'Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toContain('404');
    expect(err.message).toContain('Resource not found');
  });

  it('is an instance of Error', () => {
    expect(new APIError(500, '', 'oops')).toBeInstanceOf(Error);
  });
});

describe('isNotFound', () => {
  it('returns true for 404 APIError', () => {
    expect(isNotFound(new APIError(404, 'NOT_FOUND', 'x'))).toBe(true);
  });

  it('returns false for non-404 APIError', () => {
    expect(isNotFound(new APIError(500, 'ERROR', 'x'))).toBe(false);
  });

  it('returns false for non-APIError', () => {
    expect(isNotFound(new Error('not found'))).toBe(false);
    expect(isNotFound(null)).toBe(false);
  });
});

describe('isUnauthorized', () => {
  it('returns true for 401 APIError', () => {
    expect(isUnauthorized(new APIError(401, 'UNAUTHORIZED', 'x'))).toBe(true);
  });

  it('returns false for non-401', () => {
    expect(isUnauthorized(new APIError(403, 'FORBIDDEN', 'x'))).toBe(false);
  });
});
