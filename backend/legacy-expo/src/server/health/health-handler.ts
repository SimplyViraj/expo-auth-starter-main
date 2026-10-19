import { sql } from 'drizzle-orm';

import { getDatabase } from '@/server/db';
import { reportServerError } from '@/server/observability/server-error-reporter';

export async function GET() {
  const startedAt = Date.now();

  try {
    await getDatabase().execute(sql`select 1`);

    return healthResponse(
      process.env.NODE_ENV === 'production'
        ? { status: 'ok' }
        : {
            status: 'ok',
            database: 'reachable',
            latencyMs: Date.now() - startedAt,
          },
    );
  } catch {
    reportServerError({ event: 'health.database-check-failed' });

    return healthResponse(
      process.env.NODE_ENV === 'production'
        ? { status: 'unavailable' }
        : {
            status: 'degraded',
            database: 'unreachable',
          },
      503,
    );
  }
}

function healthResponse(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
