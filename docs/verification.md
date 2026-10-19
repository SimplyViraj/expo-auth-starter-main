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

The audit checks JavaScript, HTML, JSON, source maps, and native Hermes bundle files for configured server values without printing the values. Environment files and dependency folders remain ignored by Git. Mobile contains public configuration only; the original mixed environment is preserved in the ignored backend/legacy-expo/.env.

The PostgreSQL test container was removed after verification. No existing application database was migrated. JavaScript exports do not verify installation or behavior on a physical device. Live email delivery, Google/Apple authorization, and device capabilities remain unverified. Phone/SMS verification requires a separate complete feature; no inactive route was added.
