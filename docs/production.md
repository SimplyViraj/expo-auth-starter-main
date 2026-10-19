# Production

Deploy mobile and backend independently. Mobile web output is static; Nest serves the REST API and Swagger. Native Expo binaries use the same API origin configured in mobile/.env or the build environment.

Keep DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY, GOOGLE_CLIENT_SECRET and trusted-origin/proxy policy in backend/.env or the server secret manager. Only intentionally public values use EXPO_PUBLIC_ in mobile. Keep the ignored legacy environment archive private.

Package shared/app-identity.json and shared/auth-policy.json alongside backend and mobile as described in their setup guides. Never put secrets in shared. Preserve BETTER_AUTH_SECRET when moving existing encrypted OAuth tokens or sessions.

Review existing Drizzle databases in staging and baseline Prisma after comparing schemas; do not apply the initial Prisma migration blindly over existing tables. The legacy SQL history is preserved under backend/legacy-expo/drizzle. No production migration is performed by frontend installation or tests.

Use exact HTTPS browser origins and credentialed requests. Production web/API should share a site where browser cookie policy requires it. Direct-socket IP rate limiting is the conservative backend default; review a narrowly trusted proxy policy before scaling behind a load balancer.

Run npm run check and npm run audit:client from the root. Run backend integration and standalone checks against a dedicated disposable TEST_DATABASE_URL ending in _test. Original legacy server tests can be run independently with npm run test:legacy after installing that archive package.

Live email delivery, OAuth and physical-device behaviors require real credentials and device verification. Apple authorization revocation and public deletion requirements still need the product-specific release work described in providers.md. A source restructure does not establish those external behaviors.
