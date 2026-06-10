import crypto from "crypto-js"

export function sign(secretKey: string, method: string, path: string, rawBody: string, timestamp: string | number): string {
  const hmac = crypto.algo.HMAC.create(crypto.algo.SHA256, secretKey);
  hmac.update(String(timestamp));
  hmac.update(path);
  hmac.update(method);
  if (rawBody) {
    hmac.update(crypto.SHA256(rawBody).toString(crypto.enc.Base64));
  }
  return hmac.finalize().toString(crypto.enc.Base64);
}

export function authHeaders(
  apiKey: string,
  secretKey: string,
  method: string,
  path: string,
  body: unknown,
): Record<string, string> {
  const timestamp = new Date().toISOString();
  const rawBody = body ? JSON.stringify(body) : '';
  const signature = sign(secretKey, method, path, rawBody, timestamp);
  return {
    'Authorization': `YcHmacV1 ${apiKey}:${signature}`,
    'X-YC-Timestamp': timestamp,
  };
}
