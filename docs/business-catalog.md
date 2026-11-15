# Database business catalog

Membership catalog data now lives in PostgreSQL. Runtime code contains only supported account/tier identifiers, validation bounds, calendar arithmetic and lifecycle/credit calculation logic. The original prices and descriptions remain in a one-time migration and a regression-test fixture, not a runtime fallback.

## Records and versioning

- `membership_catalog`: version, draft/published state, INR currency, group maximum, first-credit threshold, credit validity and terms.
- `catalog_plan`: prices in paise and monthly session allowances for account/tier/duration combinations.
- `catalog_program`: names, duration, notes and credit-earning rates.
- `catalog_protocol`: the original Session A/B descriptions.
- `catalog_protocol_step`, `catalog_therapy`, `catalog_step_therapy`: ordered timed steps and their therapies. Therapies sharing a step share its duration. Untimed adjuncts retain a null duration; their time is not invented or added twice.
- `membership_catalog_current`: the single published version available for new purchases.

Each membership references its purchased catalog version and program through foreign keys. Existing memberships retain their price/allowance snapshots and read descriptions and credit rules from that immutable version. Activation of an existing pending purchase still honors that purchase even after a new catalog is published. A new purchase with an old catalog version is rejected; retrying an existing purchase with its original idempotency key still returns that purchase.

Database triggers prohibit inserts, edits and deletions in published versions, including their child records. Draft edits lock the catalog row, serializing them with publication. Publication validates the available price matrix, two protocols per program, step durations, therapy links and credit-progress compatibility, and atomically switches the current version. There is no member-facing catalog editing endpoint.

Catalog table privileges and publication execution are revoked from `PUBLIC` and, when present, Supabase's `anon` and `authenticated` roles. Public browsing uses the Nest catalog endpoint. Management requires the trusted backend/operator database connection; client sessions cannot write drafts or publish their own prices through Supabase.

Renewals compare the selected plan, program/protocol/therapy content, credit rules, group limit and terms against the original agreement before calling the payment adapter. Changes or removal of the selected plan/program set `PRICE_REVIEW` and prevent a charge. An unchanged agreement can renew after a new catalog release, retaining its original catalog reference.

## Initial migration

`20261107000000_business_catalog` imports all 36 prices, ten programs, twenty protocols and 24 named therapy/adjunct records. It preserves the original descriptions, including combinations or alternatives that the source described together. It attaches existing memberships using their original `catalog_version` and `program_id`; it does not rewrite their price, status, validity dates, allowances or credits.

The migration runs in one transaction. Unknown legacy versions/programs cause it to fail rather than silently substituting different terms. No separate catalog seed command is required. `db:seed` does not overwrite published catalog data.

Applied to the configured Supabase application database on 7 November 2026. Post-migration verification returned the original catalog version with 36 plans, ten programs, twenty protocols and 24 therapy/adjunct records. Prisma reported the database schema up to date. No test purchases were created in that database.

## Operator workflow

Run these commands from the repository root against the intended database configured for the backend:

```powershell
npm --prefix backend run db:migrate
npm --prefix backend run db:generate
npm --prefix backend run catalog:show
npm --prefix backend run catalog:clone -- aayuva-2026-11-v2
```

The clone command creates a complete editable draft. Use a trusted database client to edit only that version, for example:

```sql
UPDATE catalog_plan
SET amount_paise = 1599900
WHERE catalog_version = 'aayuva-2026-11-v2'
  AND account_type = 'INDIVIDUAL' AND tier = 'ELITE' AND months = 1;
```

Keep protocol descriptions and their structured steps consistent. If a program's credit rate changes, give it a new `credit_progress_key`; publication rejects reuse of a key for a different program or rate. An unchanged key preserves a participant's accumulated progress across renewals and catalog releases. The initial credit is awarded only once per participant, including when a later catalog changes the initial threshold. Existing ledger entries keep their original expiry dates.

Review and then publish:

```powershell
npm --prefix backend run catalog:show -- aayuva-2026-11-v2
npm --prefix backend run catalog:publish -- aayuva-2026-11-v2
```

The publish command uses the database publication function; failed validation leaves the old catalog current. Published versions remain available for historical purchases. To correct a published version, clone another draft and publish the correction.

Availability is represented by the plans/programs present in the new version. The current mobile selection flow requires a complete matrix of the included account types, tiers and durations, so removing a tier/duration/account type means removing that entire axis. Program availability can change independently. Supported account types and tier identifiers remain application enums; adding a new identifier requires a code/schema change. Bounds remain one to 120 months, up to four participants and INR currency.

If the current catalog is missing, browsing/quoting/new purchases fail with `CATALOG_UNAVAILABLE`; existing purchases remain readable and can still activate using their purchased terms. There is no hardcoded fallback.

## Verification

Verified on 7 November 2026:

| Check | Result |
| --- | --- |
| Full PostgreSQL integration suite | 171 passed, none failed or skipped (142 membership/catalog, 29 auth/profile) |
| Backend unit suite | 75 passed; eleven catalog assertions moved to database integration tests |
| Mobile unit suite | 68 passed |
| Backend TypeScript and production build | Passed |
| Mobile lint | Passed |
| Prisma schema comparison against migrated PostgreSQL | No difference detected |
| Upgrade with existing pending/active memberships and credit progress | Passed; existing records unchanged |
| Supabase-style default grants and client-role permissions | Passed; client roles cannot change or publish catalog records |
| Operator clone, publish and catalog read | Passed against an isolated database |
| Mobile TypeScript | Same five existing navigation/OTP errors; no membership errors |

Total: **314 passing automated tests**, plus migration/permission/CLI checks. Machine-readable integration results are in `.tmp/catalog-e2e-results.json`. Tests use disposable local PostgreSQL databases; they do not create test purchases in the application database.

The integration suite exercises all original membership/payment scenarios plus draft visibility, database price changes, preservation of purchase terms, changed credit thresholds/expiry, immutability, publication validation, new durations/allowances and renewal pauses for changed or removed terms. Original price and program assertions now execute against the migrated database rather than a hardcoded service.

Run with a dedicated `TEST_DATABASE_URL` whose database name ends in `_test`:

```powershell
npm --prefix backend run test:e2e
```

Payment-provider responses remain simulated: the production gateway is still disabled. This catalog change does not enable real charges.
