# Restructure verification - 19 October 2026

The existing Expo app was relocated into mobile, with the active Nest API in backend. Each application has its own dependency install, lockfile, environment, and TypeScript configuration. Shared public identity and auth-policy JSON live in shared.

| Check | Result |
| --- | --- |
| Mobile TypeScript and ESLint | Passed after removing the old server packages |
| Mobile Vitest | 20 tests passed, including frontend/server boundary checks |
| Nest Prisma generation, TypeScript, production build | Passed |
| Nest unit tests | 16 passed |
| Nest HTTP tests against isolated PostgreSQL 17 | 17 passed |
| Compiled Nest startup without root/mobile dependencies | Passed; database readiness, Swagger, auth-origin rejection verified |
| Preserved Expo server TypeScript and regression suite | Passed; 21 tests |
| Expo Android and iOS JavaScript exports | Passed; Hermes bundles generated |
| Expo static web export | Passed; 30 routes generated |
| Export audit against four configured backend secret values | Passed |
| Lockfile integrity metadata | Present for all package entries in all three installs |
| Git whitespace check | Passed |

There are 74 passing tests across the four suites. The original 39 client/server regression tests remain represented: 18 in mobile and 21 in the preserved server package. Two new mobile boundary checks bring the mobile total to 20.

The final mobile checks and all-platform export ran after pruning obsolete server packages from its install. Better Auth core 1.6.23 and utils 0.4.2 are explicit JavaScript dependencies so the Expo client no longer depends on the archived server CLI to supply its peers. Existing Expo, React, React Native, and native dependency versions were preserved.

The audit checks JavaScript, HTML, JSON, source maps, and native Hermes bundle files for configured server values without printing the values. Environment files and dependency folders remain ignored by Git. Mobile contains public configuration only; the original mixed environment is preserved in the ignored backend/.backups/original-expo.env.

The PostgreSQL test container was removed after verification. No existing application database was migrated. JavaScript exports do not verify installation or behavior on a physical device. Live email delivery, Google/Apple authorization, and device capabilities remain unverified. Phone/SMS verification requires a separate complete feature; no inactive route was added.


## Phone feature verification - 20 October 2026

Added required Twilio Verify onboarding, phone ownership fields and an additive Prisma migration, plus SMS-code login to existing verified accounts. Setup and REST contracts are in [phone verification](phone-verification.md).

| Check | Result |
| --- | --- |
| Mobile TypeScript and ESLint | Passed |
| Mobile Vitest | 30 tests passed |
| Backend Prisma generation, TypeScript and production build | Passed |
| Backend unit tests | 25 tests passed |
| PostgreSQL HTTP tests | 27 tests passed |
| Compiled standalone backend | Passed: own dependencies, readiness, Swagger, origin guard |
| Prisma migration and schema comparison | Migration applied to isolated PostgreSQL 17; no schema difference detected |
| Expo iOS and Android export | Passed; Hermes bundles generated |
| Expo static web export | Passed; 36 routes, including verify-phone and phone-sign-in |
| Client credential audit | Passed for seven configured backend values across web and Hermes bundles |

The current application suites contain 82 passing tests. The archived server package was unchanged and was not rerun for this feature. HTTP tests cover phone ownership/purpose binding, fresh sessions, number uniqueness, onboarding and protected-resource enforcement, code expiry, attempt caps, resend cooldown, persistent per-IP limits, forged verification fields, provider outages, unknown-number responses, cookie-based login, and concurrent replay. The concurrent test deliberately allows repeated provider approval to exercise the database consume gate independently.

Twilio transport is replaced only at its dependency-injection boundary in HTTP tests. Separate provider tests exercise real request construction with mocked HTTP responses. Live SMS delivery and physical-device behavior were not tested. All three Twilio values are now present in backend/.env and pass format checks; no credential values were printed. Server environment examples and provider setup document the required values; none were added to the mobile environment. The export audit passed for all seven configured server credential values, including Twilio.

The application database was not changed, and this implementation did not write environment credentials. The temporary PostgreSQL container was removed. The running backend was stopped to release Prisma's locked Windows engine for regeneration; configure Twilio, apply the migration to your Prisma-managed database, and restart the backend before using this feature.


## Existing database baseline repair - 20 October 2026

Resolved P3005 on the configured legacy Drizzle database after a read-only schema and precision review and a private PostgreSQL backup. Reconciled existing definitions transactionally, verified an exact match to the frozen initial schema, marked only 20261017000000_initial applied, and deployed 20261020000000_phone_verification. Prisma migration status and final schema diff passed. Original-record fingerprints were unchanged.

The standalone legacy-baseline regression passed against disposable PostgreSQL with non-empty synthetic records, including rollback when timestamp precision would be lost, preserved records, successful baseline/phone deployment, zero drift and repeated-run refusal. See [baseline procedure](database-baseline.md). This supersedes the earlier note that the configured application database had not been migrated.


## ORM cleanup - 20 October 2026

Removed backend/legacy-expo completely, including its ORM implementation, configuration, package manifests, separate dependency installation, generated output and obsolete archive-only tests. Removed the test:legacy launcher and updated current setup/architecture documents. The original mixed environment was preserved byte-for-byte in the ignored backend/.backups/original-expo.env.

Moved the three original SQL migrations unchanged to backend/test/fixtures/pre-prisma. The baseline regression now reads those dependency-free SQL fixtures and uses prisma/baseline/align-pre-prisma.sql. The Prisma deployment migrations and configured database were unchanged by this cleanup.

Verification after removing the archive:

| Check | Result |
| --- | --- |
| Backend TypeScript and unit tests | Passed; 25 tests |
| Mobile TypeScript, ESLint and tests | Passed; 30 tests |
| PostgreSQL HTTP tests | Passed; 27 tests |
| Baseline regression with relocated SQL | Passed; precision refusal/rollback, preserved records, phone deployment, no drift and repeated-run refusal |
| Running backend health | HTTP 200 |
| Application imports and direct ORM/CLI dependencies | Zero Drizzle imports, zero direct Drizzle dependencies, zero drizzle-orm/drizzle-kit lock entries |
| Private original environment copy | Hash-verified and ignored by Git |

The active suites contain 82 passing tests. Earlier sections describe the archive before its removal. Better Auth 1.6.23 still includes its unused @better-auth/drizzle-adapter package as an upstream dependency in both application lockfiles. Its metadata was retained to preserve reproducible npm installs; the ORM and CLI are absent and the application uses Prisma.
