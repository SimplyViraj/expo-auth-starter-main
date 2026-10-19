# Expo Auth Starter

## Separate NestJS backend

The new [backend setup guide](backend/README.md) runs authentication and REST APIs on NestJS, TypeScript, PostgreSQL, and Prisma while preserving the Expo frontend. Start Nest on port 3000 and point the root EXPO_PUBLIC_API_URL at that origin. Keep server secrets in backend/.env.

The original Expo API routes and Drizzle implementation remain available for existing deployments. The original setup below describes that legacy server. Use the backend guide for a new Nest deployment; do not apply the initial Prisma migration over an existing Drizzle database without the documented schema review and baseline.

Password limits and sensitive-action freshness now share [auth-policy.json](auth-policy.json) between Expo and Nest.

A production-ready Expo Router authentication starter using Better Auth, PostgreSQL, Drizzle, and Resend. It keeps navigation, product features, client integrations, and server security separate so providers can be replaced without rewriting screens.

Built by **Code with Nomi**.

**Jump to:** [Quick start](#quick-start) · [Native providers](#native-providers) · [Architecture](#how-it-fits-together) · [Customize](#customization-map) · [Test](#testing) · [Release](#before-production)

## Included

- Email/password registration, verification, sign-in, logout, and two-step recovery
- Native Google sign-in on Android/iOS and Sign in with Apple on iOS
- Secure Better Auth sessions and protected Expo Router route groups
- Required unique-username onboarding with optional App Lock setup
- Account deletion with password or recent-session confirmation
- Optional biometric app lock and system/light/dark appearance
- Database-backed rate limiting, health checks, safe reporting, and tests

The product UI after authentication is intentionally small: one public resource and one private resource demonstrate how to build on the session.

## Stack

| Area | Reference choice |
|---|---|
| App and routing | Expo, React Native, TypeScript, Expo Router |
| Authentication | Better Auth |
| Database and ORM | Supabase/PostgreSQL, Drizzle |
| Email | Resend |
| Server state | TanStack Query |
| Native identity | Nitro Google Sign-In, Expo Apple Authentication |
| Local app lock | Expo Local Authentication |

Supabase/PostgreSQL, Drizzle, and Resend are replaceable server boundaries, not UI dependencies.

## Prerequisites

- Current Node.js LTS and npm
- Xcode for iOS and Android Studio/SDK for Android
- PostgreSQL database and Resend account
- Optional Google Cloud and Apple Developer accounts

Google, Apple, and biometrics require a native development build; Expo Go is not sufficient.

## Quick start

### 1. Install and choose the app identity

```sh
npm install
cp .env.example .env
```

Edit `app-identity.json` before creating OAuth clients or native builds:

```json
{
  "name": "Expo Auth Starter",
  "slug": "expo-auth-starter",
  "scheme": "expoauthstarter",
  "iosBundleIdentifier": "com.example.expoauthstarter",
  "androidPackage": "com.example.expoauthstarter"
}
```

This single file supplies the product name, Expo slug, URL scheme, iOS bundle ID, and Android package throughout the project.

### 2. Configure the required environment

```dotenv
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
BETTER_AUTH_URL=http://localhost:8081
EXPO_PUBLIC_API_URL=http://localhost:8081
EXPO_PUBLIC_APP_ENV=development
EMAIL_FROM=Expo Auth Starter <onboarding@resend.dev>
RESEND_API_KEY=re_replace_with_your_server_only_key
```

Generate the auth secret with `npx auth secret`. Only intentionally public build values use the `EXPO_PUBLIC_` prefix; database, auth, email, and OAuth secrets stay server-only.

### 3. Prepare the database and email

Create a Supabase project or another PostgreSQL database, set `DATABASE_URL` to the PostgreSQL connection string from the Supabase **Connect** dialog (include `?sslmode=require`), and apply the committed schema:

```sh
npm run db:migrate
```

Create a Resend API key and sender. The shared `onboarding@resend.dev` sender can normally email only the address associated with your Resend account; verify your own domain before testing other recipients or deploying.

### 4. Build and run

```sh
npm start
npm run ios
npm run android
```

Email/password works before Google or Apple is configured. Rebuild after changing native plugins, identifiers, entitlements, or OAuth configuration; restarting Metro is not enough.

### 5. Verify the setup

- Open `http://localhost:8081/api/health` and confirm the database is reachable.
- Register with a password of at least 15 characters.
- Enter the six-digit email code, choose a unique username, and optionally enable App Lock.
- Confirm public data works without a session and private data requires one.

## Environment reference

| Variable | When | Visibility |
|---|---|---|
| `DATABASE_URL` | Required | Server |
| `BETTER_AUTH_SECRET` | Required | Server |
| `BETTER_AUTH_URL` | Required | Server |
| `EXPO_PUBLIC_API_URL` | Required | Client |
| `EXPO_PUBLIC_APP_ENV` | Required | Client |
| `EMAIL_FROM`, `RESEND_API_KEY` | Required | Server |
| `AUTH_TRUSTED_ORIGINS` | Additional browser origins | Server |
| `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | Google | Client |
| `GOOGLE_CLIENT_SECRET` | Google | Server |
| `APPLE_TEAM_ID` | Optional signing selection | Build environment |

See `.env.example` for descriptions and placeholders.

## Native providers

### Google

For Expo Go, use the browser-based OAuth flow. Create a **Web application** OAuth client in Google Cloud, put its client ID in `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and keep its client secret in `GOOGLE_CLIENT_SECRET`. Add this exact redirect URI to that Web client:

```text
http://localhost:8081/api/auth/callback/google
```

The URI must match `BETTER_AUTH_URL` exactly, followed by `/api/auth/callback/google`. For example, if `BETTER_AUTH_URL` uses a LAN address while testing on a phone, add `http://192.168.1.10:8081/api/auth/callback/google` instead and use the same LAN address in `BETTER_AUTH_URL`. Do not add the Expo `exp://` URL as Google's redirect URI; Better Auth's Expo proxy handles the final return to Expo Go.

Native development builds can additionally use separate iOS and Android OAuth clients. The iOS client uses the bundle ID; Android uses the package and signing SHA-1.

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

All four values must be present. The client IDs are public; the client secret is not.

### Apple

Register the exact iOS bundle ID, enable **Sign in with Apple** for that App ID, and use normal Xcode/EAS signing. The native ID-token flow does not require a Service ID, web callback, `.p8` key, or Apple client secret.

Detailed setup, troubleshooting, and Apple deletion requirements are in [Provider setup](docs/providers.md).

## How it fits together

```text
app starts
  -> restore server session and local app-lock preference
  -> signed out: auth routes
  -> signed in but incomplete: onboarding
  -> signed in and complete: dashboard
  -> session request failed: retry screen
```

```text
feature -> client API -> app/api route -> server handler -> auth/database/email
```

`src/app` owns routes, `src/features` owns product behavior, `src/components` owns reusable UI, `src/lib` owns client integrations, and `src/server` owns secrets and privileged work. Route guards control navigation; every private API still validates the server session.

See [Architecture](docs/architecture.md) for route groups, module placement, adding protected features, and removing optional capabilities.

## Customization map

| Goal | Start here |
|---|---|
| Change name, scheme, or native IDs | `app-identity.json` |
| Change password limits | `src/constants/auth-policy.ts` |
| Change username/onboarding rules | `src/features/onboarding/onboarding-contract.ts`, `src/server/onboarding` |
| Change colors and UI primitives | `src/theme`, `src/components/ui` |
| Add a protected screen/API | [Architecture](docs/architecture.md#adding-a-protected-feature) |
| Add or change user fields | `src/constants/auth-user-fields.ts`, auth schema, migration |
| Replace Supabase with another PostgreSQL host | `src/server/db/index.ts` |
| Replace Drizzle with Prisma/another ORM | [Production](docs/production.md#database-and-orm-portability) |
| Replace Resend | `src/server/email/email-delivery.ts`, `src/server/env.ts` |
| Remove onboarding or biometrics | [Architecture](docs/architecture.md#optional-capabilities) |
| Remove Google or Apple | [Provider setup](docs/providers.md) |
| Replace Better Auth | `src/lib/auth`, `src/server/auth`, auth API route/provider |

Provider replacement should preserve the small application contract rather than changing every screen.

## API examples

| Endpoint | Access |
|---|---|
| `GET /api/health` | Public readiness |
| `/api/auth/*` | Better Auth operations |
| `GET /api/demo/public` | Public example |
| `GET /api/demo/protected` | Authenticated and onboarded |
| `PATCH /api/onboarding` | Authenticated unique-username completion |

The example buttons make these requests explicitly. The public demo works without a session and may be cached. The protected demo validates the Better Auth session and completed onboarding on the server, returns `401` or `403` when access is unavailable, and uses private `no-store` caching.

Remove the demo endpoints after real product resources replace them; keep the health endpoint.

## Commands

| Command | Purpose |
|---|---|
| `npm start` | Start Metro |
| `npm run ios` / `npm run android` | Build native applications |
| `npm run check` | TypeScript, ESLint, and isolated tests |
| `npm run auth:schema` | Regenerate Better Auth's Drizzle schema |
| `npm run db:generate` / `npm run db:migrate` | Generate/apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run audit:client` | Check exported bundles for server secrets |

## Testing

```sh
npm run check
```

## Before production

- Use HTTPS origins and unique secrets from a secret manager.
- Verify the Resend domain and apply reviewed migrations.
- Configure trusted proxy/IP behavior for database-backed rate limiting.
- Build with production environment values and test authentication on physical devices.
- Run the automated checks and client-secret audit command.
- Add Google Play's public account-deletion URL.
- Implement Apple authorization revocation before shipping Apple-linked deletion.

See [Production](docs/production.md) for session, deletion, observability, portability, and release details.

## Documentation

- [Architecture](docs/architecture.md)
- [Provider setup](docs/providers.md)
- [Production](docs/production.md)
