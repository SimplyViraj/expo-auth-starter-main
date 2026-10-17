# Architecture

The project separates routes, product features, client integrations, and trusted server code. Screens remain readable, vendors have clear replacement points, and server modules never enter the native bundle.

## Dependency direction

```text
routes -> features -> shared UI
                 -> client infrastructure

API routes -> server handlers -> auth/database/email
```

| Directory | Ownership |
|---|---|
| `src/app` | Expo Router routes, layouts, and thin API entry points |
| `src/features` | Feature screens, hooks, components, validation, and contracts |
| `src/components/ui` | Presentation-only reusable primitives |
| `src/lib` | Client-safe API, storage, device, and provider adapters |
| `src/providers` | App-wide React provider composition |
| `src/server` | Authentication, database, email, authorization, observability |
| `src/config`, `src/constants` | Runtime configuration, identity, and policies |
| `src/theme` | Tokens and persisted appearance state |
| `drizzle` | Reviewed SQL migrations and metadata |

Add shared folders only when independent features genuinely share code. Do not create empty architectural placeholders or abstractions for hypothetical providers.

## Route access

```text
src/app/
  _layout.tsx                  providers, startup boundary, root guards
  index.tsx                    phase-aware entry redirect
  (public)/                    available with or without a session
  (auth)/                      signed-out authentication routes
  (main)/                      authenticated boundary
    (onboarding)/              signed in, profile incomplete
    dashboard.tsx              completed-user landing
    settings.tsx               account settings
    delete-account.tsx         destructive account action
    biometric-lock.tsx         local app-lock settings
  api/                         HTTP entry points
```

Parentheses organize layouts without appearing in URLs. `(main)/dashboard.tsx` resolves to `/dashboard`.

The auth provider derives `checking`, `signed-out`, `needs-onboarding`, or `ready`. Native startup keeps the splash visible until the initial server session and app-lock preference identify the correct route. Network failure shows recovery without deleting the secure cookie or pretending the user signed out.

Onboarding sits inside `(main)` because it requires authentication, but its product logic remains in `features/onboarding`. New users must claim a normalized, database-unique username before the server marks onboarding complete. App Lock is offered from the same screen but remains an optional, device-local preference shared with Settings.

## Feature ownership

```text
features/auth          session state and identity-entry flows
features/onboarding    authenticated profile-completion policy
features/public        session-independent example content
features/home          completed-user landing experience
features/account       settings and account deletion
features/biometrics    device-local privacy lock
```

Authentication is not a catch-all for signed-in screens. Account management, onboarding, home, and local privacy remain separate modules.

## API boundaries

```text
feature hook
  -> src/lib/api       client origin, cookies, JSON, stable errors
  -> src/app/api       URL and HTTP method
  -> src/server        input, session, authorization, privileged work
```

- Client code contains no secrets, database drivers, or server imports.
- `+api.ts` files delegate immediately; they contain no reusable business logic.
- Server handlers validate sessions and product authorization on every private request.
- Route guards improve navigation but do not protect direct HTTP calls.

Current server modules:

```text
server/auth            Better Auth runtime/options/schema CLI
server/db              database connection and auth schema
server/email           replaceable OTP delivery
server/demo            public/private API examples
server/onboarding      authenticated profile update
server/health          readiness probe
server/observability   allowlisted operational reporting
server/env.ts          lazy server-only environment validation
```

## Security responsibilities

- Better Auth owns server sessions, verification/reset codes, hashing, expiry, and attempts.
- Native cookies are handled through the Better Auth Expo client boundary.
- Protected APIs revalidate auth state after `401` responses.
- Database-backed rate limits work across server instances.
- OAuth tokens retained by Better Auth are encrypted.
- Email adapters deliver codes but never log or validate them.
- Biometrics only conceal an existing session; they cannot authorize APIs.

## Adding a protected feature

1. Add the feature screen and hooks under a meaningful `src/features/<feature>` folder.
2. Add a thin route under `src/app/(main)` and register it in the `ready` protected stack.
3. Keep client requests in the feature hook or reusable `src/lib/api` boundary.
4. Add a thin `src/app/api/...+api.ts` entry and trusted handler under `src/server`.
5. Validate the Better Auth session, input, and resource ownership in the server handler.
6. Add authorization tests for signed-out, forbidden, and successful requests.

## Optional capabilities

### Onboarding

To remove it, delete its feature, route, API entry, and server handler; remove onboarding user fields and the `needs-onboarding` phase; remove profile checks from protected handlers; then regenerate the auth schema, create a migration, and update tests.

The included username demonstrates a genuinely required field that Google and Apple do not provide. Replace it with the product's own required profile, organization, or legal fields. Optional choices such as App Lock must not satisfy the required completion policy by themselves.

### Biometric app lock

To remove it, delete the biometric feature, device adapter, provider/gate, route, Settings link, Expo plugin, and package. Keep `app-storage.ts` while appearance preference still uses it.

### Google or Apple

Remove the provider's button, `src/lib/auth` adapter, Better Auth server configuration, native plugin/package, and environment values. Email/password, sessions, onboarding, and protected APIs remain unchanged.

### Demonstration APIs

After adding real product resources, remove the demo routes, `server/demo`, public/home demo hooks and UI, and `types/demo-api.ts`. Keep `/api/health`.

## Placement rules

- Routes and guards belong in `src/app`; screen behavior belongs in a feature.
- Shared UI receives data/callbacks and imports no feature or server state.
- Client SDKs have one adapter under `src/lib`; secrets stay under `src/server`.
- Feature-only hooks, components, validation, and types stay with their feature.
- Promote code to shared ownership only after real reuse appears.
