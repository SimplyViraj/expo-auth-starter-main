import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Drizzle commands. Copy .env.example to .env and provide a PostgreSQL URL.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/auth-schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
