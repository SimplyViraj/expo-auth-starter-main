# Production

Production uses the same auth flow as development. Only origins, secrets, signing, hosting, and provider credentials change.

## Environment and secrets

Server-only values: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `EMAIL_FROM`, `RESEND_API_KEY`, optional `AUTH_TRUSTED_ORIGINS`, and `GOOGLE_CLIENT_SECRET`.

Client build values: `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_API_URL`, and optional public Google client IDs. `APPLE_TEAM_ID` is optional signing metadata for the local/EAS build environment.

- Use HTTPS for deployed API/auth origins and exact additional browser origins.
- Store secrets in the deployment secret manager, never in the Expo bundle.
- Do not add `EXPO_PUBLIC_` to database, auth, email, or provider secrets.
- Do not use broad wildcard browser origins.

## Sessions and recovery

- Server-backed sessions last 30 days and become refresh-eligible after one day.
- GET checks remain read-only; refresh writes are deferred to POST.
- Logout, reset, deletion, revocation, expiry, and protected API `401` responses revalidate client state.
- Initial network failure preserves the secure cookie and shows recovery instead of logout.
- Biometrics never create, refresh, or extend a session.

New/reset passwords allow 15–128 characters without composition rules. Sign-in accepts existing shorter passwords so policy changes do not lock out old accounts. Change the shared policy in `src/constants/auth-policy.ts`.

Recovery returns the same response for registered, deleted, and unknown emails; Better Auth sends a code only when the user exists. Social providers are not forcibly trusted. A matching Google or Apple identity links automatically only after the existing local email account has been verified.

## Account deletion

- Credential users confirm the current password.
- Social-only users need a session created within the last 15 minutes.
- Users type `DELETE` before the action is enabled.
- Better Auth removes the user, linked accounts, and sessions; the client clears protected queries and local biometric preference.

Add deletion behavior for every future product table and external resource. Use reviewed cascades for exclusively owned rows and deletion hooks for files, billing, jobs, or retained records.

Google Play requires a public web deletion URL. Apple-linked deletion must also revoke Apple authorization using private server credentials and a revocable token.

- [Google Play deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Apple deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

## Rate limiting and proxy deployment

Better Auth uses the database-backed `rate_limit` table with a global 100-request/60-second policy and stricter OTP limits.

Configure `advanced.ipAddress` for the hosting provider's sanitized client-IP header or a narrowly trusted proxy list. Never trust arbitrary forwarded headers; keep the origin reachable only through the trusted proxy when relying on them.

## Health and observability

`GET /api/health` uses `no-store`. Development includes database reachability/latency; production returns only `{ "status": "ok" }` or HTTP `503` with `{ "status": "unavailable" }`.

`src/server/observability/server-error-reporter.ts` accepts only allowlisted operational events—never raw errors, requests, headers, emails, OTPs, cookies, tokens, or arbitrary metadata. Replace its function body for a monitoring provider while preserving that contract. Monitoring failure cannot change API responses, and expected invalid credentials/codes are not reported as server failures.

## Database and ORM portability

### Another PostgreSQL host

Replace the driver/connection in `src/server/db/index.ts`, update its dependency and URL format, retain the PostgreSQL schema/migrations, then run migrations and authentication tests. No client or route changes are needed.

### Another database engine

Update the Drizzle dialect/schema, Better Auth adapter provider, migration history, and onboarding persistence query. Client auth, providers, and navigation remain unchanged.

### Prisma or another ORM

1. Replace the Better Auth adapter in `src/server/auth/auth-server.ts` and CLI schema config.
2. Replace `src/server/db`, Drizzle configuration/migrations, commands, and dependencies.
3. Rewrite the profile update in `src/server/onboarding/onboarding-handler.ts`.
4. Generate/apply the new schema and run lifecycle/authorization tests.

## Testing

```sh
npm run check
npm run audit:client
```

## Release checklist

1. Create new production secrets and HTTPS origins.
2. Configure trusted proxy/IP behavior and exact browser origins.
3. Verify the email domain/sender and apply reviewed migrations.
4. Configure production Google clients and Apple signing/entitlement.
5. Build native binaries with production public values.
6. Test credential, recovery, Google, Apple, onboarding, APIs, logout, offline recovery, deletion, and biometrics on physical devices.
7. Run automated checks and client-bundle audits; inspect build/deployment logs for secrets.
8. Add the Google Play deletion URL and Apple authorization revocation before store release.
