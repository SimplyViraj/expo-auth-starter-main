# Expo mobile app and NestJS backend

The repository now has two independent applications:

~~~text
mobile/                 Expo Router frontend, screens, client services, assets, tests
backend/                NestJS REST API, Prisma, PostgreSQL, backend tests
shared/                 Public app identity and auth-policy JSON
docs/                   Current architecture and provider documentation
~~~

The frontend remains the existing Expo application. Routes live in mobile/app; auth components, hooks, services, schemas, types, and utilities live in mobile/src/features/auth. Feedback components, client configuration, storage, providers, themes, and product features keep their own folders.

## Install

Use Node 24 and npm. Each app owns its dependencies and lockfile:

~~~sh
npm --prefix mobile ci
npm --prefix backend ci
~~~

The root package contains convenience commands only. It does not hoist the app dependencies.

## Configure and run

Use mobile/.env.example for public client/build values and backend/.env.example for server configuration. Existing environment values were preserved and separated during the restructure; the original environment is retained in the ignored backend/.backups/original-expo.env.

Set mobile EXPO_PUBLIC_API_URL and backend BETTER_AUTH_URL to the same reachable API origin. For local development this is usually http://localhost:3000; a phone can use the computer's LAN IP. If using a tunnel, point the tunnel at Nest port 3000. Add the actual Expo web origin to backend AUTH_TRUSTED_ORIGINS.

Start the API and Expo in separate terminals:

~~~sh
npm run backend:dev
npm run start:go
~~~

npm start retains development-client startup. npm run web, npm run android, and npm run ios delegate to mobile. Restart any old Metro instance after the move.

Follow [backend setup](backend/README.md) to prepare a NEW PostgreSQL database, apply Prisma migrations, and configure email/OAuth. Existing pre-Prisma databases require the documented schema review and baseline before Prisma migrations.

## Routes and preserved behavior

Registration is /register. Existing /sign-up links redirect there. The protected home is /(app), with /dashboard retained as a compatibility redirect. Public browsing, required username onboarding, account settings/deletion, email verification/recovery, and optional local app lock are preserved.

Phone verification through Twilio Verify is required to finish onboarding. Verified numbers can also sign in using an SMS code. Configure the server credentials and apply the additive Prisma migration using [phone setup](docs/phone-verification.md). Existing users without verified numbers return to onboarding. The UI currently uses system fonts; assets/fonts documents where licensed custom fonts belong.

Expo Go remains available for supported flows. Native identity/device capabilities retain their existing development-build requirements.

## Checks

~~~sh
npm run check
npm run audit:client
~~~

The client audit inspects the static mobile export against configured backend secret values without importing backend code into Expo.

For database-backed tests, use a dedicated disposable TEST_DATABASE_URL as described in [backend testing](backend/README.md):

~~~sh
npm run test:e2e
npm --prefix backend run test:standalone
~~~

The preserved SQL fixtures independently verify adoption of a pre-Prisma database:

~~~sh
npm run test:baseline
~~~

Use an EMPTY disposable TEST_DATABASE_URL ending in _test for that check. Fixture SQL lives in backend/test/fixtures/pre-prisma and needs no archived server.

Edit shared/app-identity.json for product/native identity and shared/auth-policy.json for password limits and sensitive-action freshness. Neither file contains secrets.

See [architecture](docs/architecture.md), [provider setup](docs/providers.md), [production](docs/production.md), and [mobile setup](mobile/README.md).

Verification results for this restructure are recorded in [verification](docs/verification.md).
