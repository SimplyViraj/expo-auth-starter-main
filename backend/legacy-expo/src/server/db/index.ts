import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as authSchema from '@/server/db/auth-schema';
import { getServerEnv } from '@/server/env';

function createDatabase() {
  const client = postgres(getServerEnv().DATABASE_URL, {
    prepare: false,
  });

  return drizzle(client, {
    schema: authSchema,
  });
}

export type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDatabase() {
  database ??= createDatabase();
  return database;
}
