import './environment.cjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const root = fileURLToPath(new URL('../', import.meta.url));
const prisma = new PrismaClient({ log: [] });
function cli(args, expectedFailure) {
  try {
    const output = execFileSync(process.execPath, [join(root, 'node_modules/prisma/build/index.js'), ...args], { cwd: root, env: process.env, stdio: 'pipe' }).toString();
    assert.ok(!expectedFailure, 'Expected a guarded refusal');
    return output;
  } catch (error) {
    const output = String(error.stdout ?? '') + String(error.stderr ?? '');
    if (expectedFailure) { assert.ok(output.includes(expectedFailure), 'Wrong refusal: ' + output); return; }
    throw new Error('Prisma baseline test failed: ' + output, { cause: error });
  }
}
function execute(file, expectedFailure) { return cli(['db', 'execute', '--file', file, '--schema', 'prisma/schema.prisma'], expectedFailure); }
async function snapshot() {
  const result = {};
  for (const table of ['user', 'account', 'session', 'verification', 'rate_limit']) {
    const query = "SELECT count(*)::text AS count, md5(coalesce(string_agg(md5((to_jsonb(t) - ARRAY['phone_number','phone_number_verified','phone_number_verified_at'])::text), '' ORDER BY t.id), '')) AS digest FROM public." + JSON.stringify(table) + " t";
    result[table] = await prisma.$queryRawUnsafe(query);
  }
  return result;
}
try {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
  assert.equal(tables.length, 0, 'Baseline test requires an EMPTY disposable _test database');
  for (const file of ['0000_neat_arclight.sql', '0001_add_rate_limit.sql', '0002_faithful_prima.sql']) execute(join(root, 'test/fixtures/pre-prisma', file));
  await prisma.$executeRawUnsafe(`INSERT INTO "user" (id,name,email,email_verified,username,created_at,updated_at,onboarding_completed,onboarding_completed_at) VALUES ('legacy-user','Legacy Fixture','legacy-fixture@example.com',true,'legacy_fixture','2026-10-19 12:34:56.123456','2026-10-19 12:34:56.123',true,'2026-10-19 12:34:56.123')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "account" (id,account_id,provider_id,user_id,password,access_token,created_at,updated_at,access_token_expires_at,refresh_token_expires_at) VALUES ('legacy-account','legacy-user','credential','legacy-user','fixture-password-hash','fixture-encrypted-token','2026-10-19 12:34:56.123','2026-10-19 12:34:56.123','2026-10-19 12:34:56.123','2026-10-19 12:34:56.123')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "session" (id,token,user_id,expires_at,created_at,updated_at) VALUES ('legacy-session','fixture-session-token','legacy-user','2026-11-19 12:34:56.123','2026-10-19 12:34:56.123','2026-10-19 12:34:56.123')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "verification" (id,identifier,value,expires_at,created_at,updated_at) VALUES ('legacy-verification','fixture-identifier','fixture-hashed-code','2026-11-19 12:34:56.123','2026-10-19 12:34:56.123','2026-10-19 12:34:56.123')`);
  await prisma.$executeRawUnsafe(`INSERT INTO "rate_limit" (id,key,count,last_request) VALUES ('legacy-rate','fixture-rate',1,1)`);
  const alignment = join(root, 'prisma/baseline/align-pre-prisma.sql');
  const precise = await snapshot();
  execute(alignment, 'Submillisecond timestamps require a separate preservation plan');
  assert.deepEqual(await snapshot(), precise, 'Refused precision conversion must leave all rows untouched');
  const unchanged = await prisma.$queryRaw`SELECT datetime_precision FROM information_schema.columns WHERE table_schema='public' AND table_name='user' AND column_name='created_at'`;
  assert.equal(unchanged[0].datetime_precision, 6);
  await prisma.$executeRawUnsafe(`UPDATE "user" SET created_at = date_trunc('milliseconds', created_at)`);
  const original = await snapshot();
  execute(alignment);
  assert.deepEqual(await snapshot(), original, 'Alignment changed legacy records');
  const initialPath = join(root, 'prisma/baseline/initial.prisma');
  cli(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', initialPath, '--exit-code']);
  cli(['migrate', 'resolve', '--applied', '20261017000000_initial']);
  cli(['migrate', 'deploy']);
  cli(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code']);
  assert.deepEqual(await snapshot(), original, 'Phone migration changed existing legacy fields');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: 'legacy-user' } });
  assert.equal(user.phoneNumber, null);
  assert.equal(user.phoneNumberVerified, false);
  assert.equal(user.onboardingCompleted, true);
  const history = await prisma.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
  assert.deepEqual(history.map(row => row.migration_name), ['20261017000000_initial', '20261020000000_phone_verification']);
  execute(alignment, 'Prisma history already exists');
  assert.deepEqual(await snapshot(), original);
  console.log('Legacy baseline passed: precision guard and rollback, preserved records, baseline, phone migration, zero drift, repeated-run guard.');
} finally {
  await prisma.$disconnect();
}
