# NestJS backend for the existing Expo app

This is a separate TypeScript REST server using NestJS, Prisma, and PostgreSQL. The Expo client now lives in ../mobile. The original Expo API/Drizzle implementation is preserved under legacy-expo and is not mounted by the mobile app.

The backend retains Better Auth 1.6.23 as the authentication engine so the Expo client's cookies, OTPs, recovery, Google, Apple, account deletion, and secure storage protocol stay compatible. Nest owns application controllers, DTOs, guards, authorization, error handling, and composition. Authentication requests are validated by Better Auth's endpoint schemas. Application requests use Nest's global ValidationPipe and class-validator DTOs.

## Install and run

Use Node 24 LTS and npm. From the repository root:

~~~sh
npm --prefix backend ci
~~~

Copy backend/.env.example to backend/.env and supply real email/auth values. For a NEW local PostgreSQL database, run docker compose up -d db from backend/; its local-only credentials match the example. A hosted PostgreSQL URL also works. Then:

~~~sh
cd backend
npm run db:generate
npm run db:migrate
npm run build
npm start
~~~

GET http://localhost:3000/api/health checks PostgreSQL. Swagger UI is /api/docs and JSON is /api/docs-json.

Development uses compiled TypeScript to preserve Nest's decorator metadata. After editing, run npm run build; npm run start:dev builds once and watches compiled output.

## Connect Expo

Set only the client API origin in mobile/.env:

~~~dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_ENV=development
~~~

On a physical device, use the computer's LAN IP, e.g. http://192.168.1.20:3000. The localhost development resolver also substitutes Metro's reachable hostname while retaining port 3000. Start Nest and Metro separately. Restart Metro after changing public environment values.

For Expo Go, use npx expo start --go from mobile/. Email/password and browser Google OAuth use the existing client. Native Google/Apple and device capabilities retain their existing development-build requirements. No new native package is added. Restart Metro once after adding the backend so its updated exclusion rules take effect.

For a tunnel, forward it to Nest port 3000. Set backend BETTER_AUTH_URL and mobile EXPO_PUBLIC_API_URL to the SAME tunnel HTTPS origin. Your original mixed .env is preserved in legacy-expo/.env. Add the actual Expo web origin to AUTH_TRUSTED_ORIGINS. Browser cookies use credentials and exact CORS origins; production web/API should share a site because cross-site cookie policies vary.

Google's Web OAuth redirect URI is BETTER_AUTH_URL + /api/auth/callback/google. Browser OAuth uses the existing Expo plugin. Native provider configuration remains in docs/providers.md.

## Environment

All variables below belong in backend/.env, except the explicitly identified Expo client value. Backend configuration does not read mobile/.env.

| Variable | Requirement |
| --- | --- |
| DATABASE_URL | Required PostgreSQL connection string; production TLS is controlled by the PostgreSQL URL/host |
| BETTER_AUTH_SECRET | Required random secret, at least 32 characters; use node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))" |
| BETTER_AUTH_URL | Required exact public HTTP(S) origin, HTTPS in production |
| EMAIL_FROM | Required sender address, optionally Name <address> |
| RESEND_API_KEY | Required server-only Resend key; verify a sender domain for real recipients |
| NODE_ENV | development (default), test, or production |
| PORT / HOST | 3000 / 0.0.0.0 by default |
| AUTH_TRUSTED_ORIGINS | Comma-separated exact browser origins, no wildcards or paths; HTTPS in production |
| EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID / GOOGLE_CLIENT_SECRET | Optional, required together to enable Google |
| EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID / EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID | Optional native Google audiences |
| EXPO_PUBLIC_API_URL | mobile/.env only; Nest public origin |
| TEST_DATABASE_URL | Integration tests only; dedicated disposable PostgreSQL database ending in _test |

App name, URL scheme, and Apple bundle ID come from ../shared/app-identity.json. Password policy comes from ../shared/auth-policy.json. Keep shared/ beside backend/ when deploying. Never prefix database, email, auth, or OAuth secrets with EXPO_PUBLIC_.

## Existing Drizzle databases

The initial Prisma migration targets a NEW database. Do not run it against a database already containing the Drizzle tables. No existing database is modified by installation or tests.

For an existing deployment: back up the database, compare its schema against schema.prisma using prisma migrate diff, reconcile types/indexes/defaults in staging, then baseline the reviewed initial migration with prisma migrate resolve --applied 20261017000000_initial. Do not use migrate reset or db push on production. Validate sessions, accounts, recovery, and deletion against a staging copy before switching traffic. SQL mappings retain the original table and column names, but timestamp precision and generated indexes still need review.

Keep the same BETTER_AUTH_SECRET when preserving sessions/encrypted OAuth tokens. The legacy Drizzle migration history is preserved in legacy-expo/drizzle.

The backend .npmrc skips automatic peer installation because Better Auth declares optional frontend integrations. Its server core and adapters are explicitly pinned to the same version as the Expo client.

## Verification

~~~sh
npm run check
~~~

Integration tests require a disposable database whose name ends in _test:

~~~sh
# Set TEST_DATABASE_URL in your shell to a dedicated PostgreSQL test database.
npm run test:e2e
~~~

The test runner refuses missing or non-test database URLs, applies committed migrations, and runs real HTTP requests against Nest with real PostgreSQL/Prisma and the real Better Auth engine. Email transport is replaced at its DI boundary so tests can verify OTP flows without sending mail. Test accounts and rate-limit rows are cleaned in that disposable database. Never point TEST_DATABASE_URL at shared data.

The production email transport and social identity providers require real credentials and external verification; automated tests do not establish provider delivery or physical-device behavior.

## REST surface and responsibilities

| Method and path | Contract |
| --- | --- |
| GET /api/health | Real database readiness; 503 on query failure |
| /api/auth/* | Better Auth REST schemas: registration, OTP verification/recovery, sessions, social providers, account deletion |
| PATCH /api/onboarding | Authenticated, validated username; 409 on database uniqueness conflicts |
| GET /api/demo/public | Existing public tip response |
| GET /api/demo/protected | Session and completed profile required |
| GET /api/sessions | Own active sessions, excluding bearer tokens |
| DELETE /api/sessions/:id | Revoke an owned session; 404 for unknown or foreign IDs |
| GET /api/docs / /api/docs-json | Swagger UI / combined OpenAPI document |

Application errors use { error: { code, message } }. Authentication engine errors retain Better Auth's code/message format because the existing client expects it. Private responses use no-store; the public demo can be cached for 60 seconds. Auth and application mutations reject untrusted Origin and expo-origin headers, including auth calls without a cookie. Apple callbacks explicitly accept the Apple origin.

Credential account deletion requires the current password on the server, including for fresh sessions. Social-only deletion uses the existing 15-minute freshness rule. Apple authorization revocation is still a release prerequisite described in ../docs/providers.md.

Auth rate limits are stored in PostgreSQL and use the direct socket address. Arbitrary client IP headers are overwritten. Behind a reverse proxy, this conservative default groups requests by proxy address; implement a narrowly trusted proxy policy before scaling, rather than trusting arbitrary forwarded IPs.

Prisma owns persistence. Identity owns provider configuration and email delivery. Auth owns the engine adapter. Sessions owns user-scoped listing/revocation. Authorization owns the completed-profile policy. Onboarding owns profile rules and persistence. Controllers declare HTTP contracts and delegate to services. Empty strategy/provider folders are not created: Better Auth already implements provider verification and password/session strategies.

For a disposable test database on Windows PowerShell:

~~~powershell
docker run --detach --rm --name expo-auth-test --publish 127.0.0.1:55432:5432 --env POSTGRES_DB=expo_auth_test --env POSTGRES_USER=expo_test --env POSTGRES_PASSWORD=expo_test_local_only postgres:17-alpine
$env:TEST_DATABASE_URL='postgresql://expo_test:expo_test_local_only@127.0.0.1:55432/expo_auth_test?schema=public'
npm run test:e2e
docker stop expo-auth-test
~~~

Wait for PostgreSQL to become ready before running the tests (docker exec expo-auth-test pg_isready -U expo_test -d expo_auth_test). The test container uses no persistent volume; stopping it removes its test database. The development compose database uses a persistent named volume.
Run the compiled dependency-isolation check with the same TEST_DATABASE_URL:

~~~sh
npm run test:standalone
~~~

It builds the server and rejects module resolution into root or mobile node_modules, then checks real PostgreSQL readiness, Swagger, and auth-origin rejection. Keep Node 24 for this check.


## Verification recorded 17 October 2026

Verified locally with Node 24.16.0 and an isolated PostgreSQL 17 database:

| Check | Result |
| --- | --- |
| Root npm run check | TypeScript, ESLint, 39 Expo tests passed |
| Root npm run audit:client | Web export and client-secret audit passed |
| Backend typecheck and production build | Passed |
| Backend npm test | 16 tests passed |
| Backend npm run test:e2e | 17 real PostgreSQL HTTP tests passed |
| Backend npm run test:standalone | Compiled startup, dependency isolation, readiness, Swagger, origin guard passed |
| Prisma migration deploy, seed, schema diff | Passed; no schema difference detected |
| Compose configuration and lockfile validation | Passed; all 533 locked packages include integrity hashes |

Integration tests replace only the email transport and exercise the real auth engine and database. Live Resend delivery, Google/Apple authorization, and physical-device behavior have not been verified.

The temporary verification database container was removed. The original environment and application database were preserved. The subsequent frontend restructure is documented in the root README. No existing Drizzle database was migrated.

See [19 October restructure verification](../docs/verification.md) for checks after separating the mobile project.
