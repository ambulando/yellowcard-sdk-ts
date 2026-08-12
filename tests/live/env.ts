import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(here, '../../.env.test');

/**
 * Minimal, dependency-free `.env.test` loader. Values already present in
 * `process.env` win, so credentials can also be injected via the shell/CI.
 */
function loadEnvFile(): void {
  let raw: string;
  try {
    raw = readFileSync(ENV_PATH, 'utf8');
  } catch {
    return; // no file — rely on whatever is already in process.env
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

export const YC_API_KEY = process.env.YC_API_KEY ?? '';
export const YC_SECRET_KEY = process.env.YC_SECRET_KEY ?? '';

/** True only when both sandbox credentials are available. */
export const hasCredentials = Boolean(YC_API_KEY && YC_SECRET_KEY);
