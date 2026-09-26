import { defineConfig } from 'drizzle-kit';
import { loadDirectUrl } from './src/db/direct-url';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: '../../drizzle/',
  dialect: 'postgresql',
  dbCredentials: { url: loadDirectUrl() },
});