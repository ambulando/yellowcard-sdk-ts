import { authHeaders } from './auth.js';
import { APIError } from './errors.js';

export const DEFAULT_BASE_URL = 'https://api.yellowcard.io';
export const SANDBOX_BASE_URL = 'https://sandbox.api.yellowcard.io';

export interface ClientOptions {
  /** Override the API base URL. */
  baseURL?: string;
  /** Point to the sandbox environment. Ignored when baseURL is set. */
  sandbox?: boolean;
  /** Supply a custom fetch implementation (e.g. for testing or proxying). */
  fetch?: typeof globalThis.fetch;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseURL: string;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(apiKey: string, secretKey: string, options: ClientOptions = {}) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseURL = options.baseURL ?? (options.sandbox ? SANDBOX_BASE_URL : DEFAULT_BASE_URL);
    this.fetchFn = options.fetch ?? globalThis.fetch;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders(this.apiKey, this.secretKey, method, path, body),
    };
    const rawBody = body != null ? JSON.stringify(body) : '';
    const response = await this.fetchFn(this.baseURL + path, {
      method,
      headers,
      body: rawBody || undefined,
    });

    const text = await response.text();

    if (!response.ok) {
      let code = '';
      let message = response.statusText;
      if (text) {
        try {
          const parsed = JSON.parse(text) as { code?: string; message?: string };
          code = parsed.code ?? '';
          message = parsed.message ?? message;
        } catch {
          // non-JSON error body — keep statusText
        }
      }
      throw new APIError(response.status, code, message);
    }

    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete(path: string): Promise<void> {
    return this.request<void>('DELETE', path);
  }
}
