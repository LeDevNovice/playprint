import { existsSync } from 'node:fs';

/**
 * URL of the direct (non-pooled) Neon endpoint, for every process that runs
 * outside the API runtime: drizzle-kit, seed scripts (ADR-010, ADR-017, ADR-018).
 *
 * Loads `.env` from the current directory when present; variables already in
 * the environment win (CI secrets). Throws, without echoing credentials, if the
 * URL is missing, malformed, targets the PgBouncer pooler, or does not enforce
 * `sslmode=verify-full`. Writes the target host and database to stderr.
 */
export function loadDirectUrl(): string {
  if (existsSync('.env')) process.loadEnvFile('.env');

  const raw = process.env.DIRECT_URL;
  if (!raw) {
    throw new Error(
      '[db] The DIRECT_URL environment variable is missing.\n' +
        '  • Local : check apps/api/.env and copy apps/api/.env.example if absent.\n' +
        '  • CI/CD : check the DIRECT_URL secret in GitHub Environment.',
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('[db] DIRECT_URL is not a valid URL (value hidden).');
  }

  if (url.hostname.includes('-pooler')) {
    throw new Error(
      `[db] DIRECT_URL targets the PgBouncer pooler (${url.hostname}). ` +
        'Migrations and seeds require the direct endpoint (ADR-010, ADR-017).',
    );
  }
  if (url.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('[db] DIRECT_URL must use sslmode=verify-full (ADR-002).');
  }

  console.error(`[db] target: ${url.hostname}${url.pathname}`);
  return raw;
}