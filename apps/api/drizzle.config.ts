import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) process.loadEnvFile('.env');

function readMigrationUrl(): string {
  const raw = process.env.DIRECT_URL;
  if (!raw) {
    throw new Error(
      '[drizzle.config.ts] The DIRECT_URL environment variable is missing.\n' +
        '  • Local : check apps/api/.env and copy apps/api/.env.example if absent.\n' +
        '  • CI/CD : check the DIRECT_URL secret in GitHub Environment.',
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('[drizzle.config.ts] DIRECT_URL is not a valid URL (value hidden).');
  }

  if (url.hostname.includes('-pooler')) {
    throw new Error(
      `[drizzle.config.ts] DIRECT_URL targets the PgBouncer pooler (${url.hostname}). ` +
        'Migrations require the direct endpoint (ADR-010, ADR-017).',
    );
  }
  if (url.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('[drizzle.config.ts] DIRECT_URL must use sslmode=verify-full (ADR-002).');
  }

  console.error(`[drizzle] target: ${url.hostname}${url.pathname}`);
  return raw;
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: '../../drizzle/',
  dialect: 'postgresql',
  dbCredentials: { url: readMigrationUrl() },
});