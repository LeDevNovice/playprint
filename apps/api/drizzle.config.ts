import { defineConfig } from 'drizzle-kit';

const directUrl = process.env.DIRECT_URL;

if (!directUrl) {
  throw new Error(
    '[drizzle.config.ts] The DIRECT_URL environment variable is missing.\n' +
      '  • Local : check apps/api/.env and copy apps/api/.env.example if absent.\n' +
      '  • CI/CD : check the DIRECT_URL secret in GitHub Environment.'
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: '../../drizzle/',
  dialect: 'postgresql',
  dbCredentials: {
    url: directUrl,
  },
  verbose: true,
  strict: true,
});