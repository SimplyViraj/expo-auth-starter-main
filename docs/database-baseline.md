# Existing database: Prisma P3005

P3005 occurs when a database already contains tables but Prisma has no recorded baseline for them. In this project, the original pre-Prisma tables used timestamp(6), older unique/index names, and foreign keys with ON UPDATE NO ACTION. The initial Prisma migration uses timestamp(3), standardized names, and ON UPDATE CASCADE. Recording the initial migration without reconciling those differences would leave drift.

See [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) for the migration-history concept. The commands below use this project's installed Prisma 6 CLI.

## Current configured database - 20 October 2026

The configured database was backed up, its existing definitions were aligned, the initial migration was marked applied, and the phone-verification migration was deployed. Prisma status and schema comparison passed with no drift. Original-record fingerprints were unchanged. No table reset, data reset, or replay of the initial CREATE TABLE migration was performed.

The private custom-format backup is in backend/.backups/. Its archive contents were validated with pg_restore --list. Backup files and local review fingerprints are ignored by Git. Keep the backup private: it may contain password hashes, sessions and encrypted OAuth tokens. The private backend/.baseline-review/backup-path.txt records the exact backup file used.

The two migration files and their checksums were retained. The compatibility SQL is deliberately outside prisma/migrations: it repairs an existing legacy database before establishing its baseline and is never run during normal fresh-database migration deployment.

## Procedure for another existing database

Back up that database and compare its schema before applying anything. The supplied SQL targets the exact reviewed legacy public schema preserved in backend/test/fixtures/pre-prisma; it is not a generic repair for other schemas. Test on a staging copy first.

The repair file is backend/prisma/baseline/align-pre-prisma.sql. It runs transactionally, locks only the five application tables, and refuses to proceed if Prisma history or phone fields already exist. It also refuses timestamps containing sub-millisecond values, so existing precision cannot be rounded silently. If that guard fails, preserve the higher precision through a separately reviewed schema/migration plan rather than bypassing it.

After backup and review, from backend/:

~~~sh
node node_modules/prisma/build/index.js db execute --file prisma/baseline/align-pre-prisma.sql --schema prisma/schema.prisma
node node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/baseline/initial.prisma --exit-code
~~~

Continue only when the comparison exits successfully with no difference. The frozen prisma/baseline/initial.prisma represents the existing initial migration and intentionally excludes the later phone feature. Then:

~~~sh
node node_modules/prisma/build/index.js migrate resolve --applied 20261017000000_initial
npm run db:migrate
node node_modules/prisma/build/index.js migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
node node_modules/prisma/build/index.js migrate status
~~~

Only the initial migration is baselined. The phone migration must actually run; do not mark it applied when its tables/columns are missing. Once Prisma history exists, use normal db:migrate for later changes; do not rerun the alignment SQL. Never reset an existing deployment to work around P3005.

## Regression verification

Run against an EMPTY disposable PostgreSQL database ending in _test:

~~~sh
npm run test:baseline
~~~

Set TEST_DATABASE_URL in the shell first, as with the other backend integration checks. The script refuses non-test databases and non-empty public schemas. It creates the historical PostgreSQL schema and non-empty synthetic user, account, session, verification and rate-limit records. It verifies precision-loss refusal and transaction rollback, successful alignment without record changes, exact initial-schema matching, migration baselining, real phone migration deployment, no final schema drift, and refusal to rerun against an already managed database.
