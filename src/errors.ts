export class APIError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(`yellowcard: ${statusCode} ${code} — ${message}`);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`yellowcard: request validation failed — ${issues.join('; ')}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export function isNotFound(err: unknown): err is APIError {
  return err instanceof APIError && err.statusCode === 404;
}

export function isUnauthorized(err: unknown): err is APIError {
  return err instanceof APIError && err.statusCode === 401;
}
