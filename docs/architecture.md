# Architecture

~~~text
mobile/app routes
  -> mobile/src/features and shared UI
  -> mobile/src/features/auth/services or lib/api
  -> backend REST controllers
  -> backend services, identity and authorization
  -> Prisma / PostgreSQL
~~~

mobile and backend have separate package manifests, lockfiles, TypeScript settings, dependencies, environment files, and checks. Root npm scripts delegate to the selected application; there is no dependency hoisting.

mobile/app owns Expo navigation. Authentication routes are under (auth), protected routes under (app), and the public landing under (public). The root entry derives its destination from server session/onboarding state. Protected home lives at (app)/index.tsx; account settings, deletion, app lock, and onboarding keep their existing feature implementations.

mobile/src/features/auth contains components, hooks, services, schemas, types, utilities, and screens. Authentication/session provider composition lives in src/providers. Generic feedback belongs in src/components/feedback and presentation primitives in src/components/ui. Client-only environment and public constants belong in src/lib/config; API and storage adapters remain under src/lib.

The frontend contains no +api.ts routes, database connection, email delivery, or privileged server module. Better Auth's client cookie/OTP protocol remains compatible with the Nest server. Route guards improve navigation; Nest guards and services authorize direct HTTP requests.

backend/src/modules owns auth, identity, sessions, authorization, onboarding, and demo resources. Controllers declare HTTP contracts, services apply rules, DTOs validate application requests, and Prisma performs persistence. Better Auth validates its own auth request schemas.

shared contains public app identity and auth-policy JSON only. Metro watches that folder explicitly and excludes backend. Backend build/test code reads the same public files. No frontend npm dependency is required to start the compiled API.

backend/legacy-expo is the preserved earlier Expo/Drizzle server, including its old tests and migrations. It is not an active server entry point. Its independent test package keeps archived maintenance separate from the mobile dependency graph.

Use frontend boundary tests and static export/client-secret auditing to detect accidental server imports. Use backend HTTP tests with a disposable PostgreSQL database and the compiled dependency-isolation check for server verification.
