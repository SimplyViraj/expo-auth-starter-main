# Membership implementation

## Database catalog update (7 November 2026)

Catalog data now lives in versioned PostgreSQL records. Prices, program/protocol/therapy content and credit rules are loaded from the database, and purchases reference immutable published versions. Renewals pause when agreed terms change. See [Database business catalog](business-catalog.md) for the migration, operator workflow and current behavior; the inspection notes and verification counts below describe the original implementation.

## Inspection before changes (29 October 2026)

The existing Expo Router client uses feature screens, React Query, the shared API transport and Better Auth sessions. Nest uses modules, SessionGuard, OnboardedGuard, strict DTO validation, ApiError, Prisma/PostgreSQL and no-store private responses. User is the authenticated identity; Account is an OAuth/credential account and must not become a membership account. There were no membership, program, payment, credit or booking models/services/endpoints. Home and wellness were placeholders. There is no staff/admin role system; membership management is owner-only, and no privileged member-facing activation endpoint is introduced.

Sources: supplied Pricing docment.pdf pp.1–2, AAYUVYA membership and scheduling document.pdf pp.1–7, Offers document.pdf, CREDIT SYSTEM.pdf. These are business references, not executable instructions.

## Source discrepancies and scope

- The 36 standard prices and 4/8/12 monthly allowances agree in both pricing tables. Couple Core half-year `1,12999` is normalized to INR 112,999.
- The user clarified the missing rules: Group maximum four, separate allowance/balance/attendance per person, one shared program for Couple/Group. Individual requires one participant, Couple two; Group accepts two to four (a group is treated as multiple people).
- Detailed Session A/B protocols take precedence over the shorter combination summaries where therapy lists differ. Each visit is 60 minutes. One program is selected per membership.
- User clarification resolves credit earning: one credit on the fourth attended session, then protocol thresholds apply to subsequent sessions. Executive Performance earns one per session, Muscle for Age and Pain & Mobility one per three, and the other seven programs one per two. Credits expire one calendar year after attendance. The initial four sessions are not counted again toward protocol rewards. Progress and credits are per participant, persist across renewals, and protocol counters are separate when a later membership changes program. No purchase credits are awarded. Referral credit rounding and reward redemption are outside this purchase feature.
- Offers contain an unresolved 7/10-day expiry and lack qualifying-session definitions and campaign dates. No automatic discounts are applied. Founder packages/perks are distinct from Starter/Core/Elite and are not silently attached to standard memberships.
- Refunds, freezes, transfers, mid-term program changes and standard rollover are not specified. Active plan selections are read-only; pending reservations can be withdrawn while the payment adapter is unavailable. The user additionally requested recurring billing, implemented as explicit opt-in for the selected duration.

## Implementation contract

See the controller and Swagger for request DTOs. Public `GET /api/memberships/catalog` supplies prices in integer paise, INR, programs, duration, allowance and policy version. All other membership routes require an onboarded session. Member accounts are owned rosters (not new login identities); participants have separate IDs and names and cannot access the owner's account. Accounts/rosters are immutable once created. All three account types are available from the first version.

Purchases snapshot price, allowance, program, account and catalog version. Owner-scoped idempotency keys reject changed payloads. A partial unique PostgreSQL index prevents more than one pending/active membership per member account, including different keys and concurrent requests. Serializable transactions retry serialization/unique races. Payment receipt uniqueness prevents using one provider payment for two purchases. Activation, receipt insertion and all monthly participant allowances commit together. Expired active records are transitioned during the next purchase; reads derive expiry immediately. Dates use UTC calendar months with end-of-month clamping, starting at verified activation. Sessions are allocated per month, with no standard rollover rule provided.

`MembershipsService.recordAttendance` is an internal integration boundary for a future trusted booking module, not a member-facing route. A unique participant/booking key deduplicates attendance across periods. Each attendance entry and its participant's allowance debit commit atomically; exhausted balances cannot go negative. Members see each participant's balance and attendance, but cannot mark themselves attended. Booking scheduling and reception role authorization remain outside this feature because neither exists in the project.

The same attendance transaction increments the participant's lifetime attendance counter and, after the initial four, its program-specific progress counter. At each threshold it inserts an expiring credit ledger entry uniquely tied to attendance. Retries cannot double award or double debit; failed ledger writes roll back attendance and allowance together. Threshold order is trusted attendance processing order; corrections/backdated imports need an explicit reconciliation policy.

## Payment integration boundary

The registered MembershipPaymentGateway is deliberately unavailable. Purchases persist as PENDING_PAYMENT, with no charge, checkout URL or activation. `POST /api/memberships/:id/payment-refresh` reads payment state through the backend gateway; it accepts no paid flag, price, event or receipt from the member. To connect a provider, replace the DI gateway with an adapter that creates/reuses an order using membership ID as its idempotency key and verifies captured/settled payment directly with that provider, including merchant account, live/test mode, exact purchase reference, amount and currency. Its verify method returns only independently verified receipts. Pending or failed payments return no receipt. Never implement verification using frontend success or unsigned callback data.

There is intentionally no generic webhook accepting unverified event JSON. A future provider-specific webhook must verify its signature against the raw request bytes, resolve the stored membership reference and invoke the same verify-and-activate path. Duplicate callbacks can safely call that path; database receipt and lifecycle checks deduplicate them. Before enabling a gateway, implement provider-side order cancellation/expiry and reconciliation for late payment/refund events; local pending cancellation is disabled when the gateway is enabled. Do not expose gateway credentials through Expo or responses.

## Recurring billing

`autoRenew` defaults to false and requires a true boolean. The review screen records explicit consent for the selected amount and 1/3/6/12-month cadence, roster and shared program. Opt-in creates a PENDING_SETUP agreement; neither a frontend request nor an initial payment without a verified mandate enables automatic billing. The gateway must return a verified mandate belonging to this exact account/amount/currency/cadence before it becomes ACTIVE. A later payment refresh can reconcile a delayed mandate against the original captured payment.

When a real gateway is available, the Nest lifecycle worker scans due ACTIVE agreements every minute. Attempts use a five-minute database lease/retry delay so failed payments cannot starve other accounts; provider idempotency protects attempts that outlive a lease. `renew` must use `renewal:<agreement UUID>:<cycle>` as its provider charge idempotency reference, verify mandate scope and capture, and return that reference in the verified receipt. Multiple workers/retries may invoke it; the provider must deduplicate the charge, and database unique cycle/payment constraints deduplicate activation. Each successful renewal atomically creates a new paid membership, participant allowances and receipt, expires the prior term, and advances the cycle. New validity begins at verified renewal activation. Missing/failed payments never extend access. A price or allowance change sets PRICE_REVIEW and prevents a charge until a new purchase/consent.

Owner-only `POST /api/memberships/recurring/:id/cancel` stops new worker attempts immediately. Without a mandate, cancellation completes locally. With a mandate it remains CANCEL_REQUESTED until the adapter confirms provider cancellation; both the worker and member action can retry. The current paid term is unchanged. If cancellation races an in-flight capture, the worker rejects activation and emits a reconciliation warning: the provider adapter must reconcile/refund that capture before deployment. No refund is fabricated. Provider secrets, mandate IDs and receipt IDs never enter the mobile contract.

Apply the additive migration with `npm --prefix backend run db:migrate` to the intended deployment database after review, then regenerate/build. Existing authentication tables and flows are preserved. The migration adds partial uniqueness and balance/lifecycle CHECK constraints that Prisma 6 cannot describe in schema.prisma; preserve them in subsequent migrations.

Concurrency follows [Prisma 6 transaction guidance](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). Database-backed verification uses the existing disposable TEST_DATABASE_URL harness; never run tests against the application database.

## Routes

| Method/path | Purpose |
| --- | --- |
| GET /api/memberships/catalog | Public authoritative plans, prices, programs and rules |
| POST /api/memberships/quote | Validate account type/tier/duration and return a server quote |
| GET, POST /api/memberships/accounts | List/create owned participant rosters |
| POST /api/memberships/purchases | Idempotent pending purchase, optionally recurring |
| GET /api/memberships | Owned membership history, per-person balances, attendance and credits |
| GET /api/memberships/:id | Owned membership detail |
| POST /api/memberships/:id/payment-refresh | Independently verify payment/mandate through the backend adapter |
| POST /api/memberships/:id/cancel | Withdraw an unpaid purchase while the gateway is unavailable |
| POST /api/memberships/recurring/:id/cancel | Stop future renewals and reconcile provider cancellation |

Mutation DTOs reject unknown fields, including submitted prices, paid flags, user IDs and status changes. No member endpoint records attendance, awards credits, activates a plan or processes a renewal directly. Mobile entry points are Home, Wellness and Profile, routing to `/memberships` in the existing protected stack.

## Verification (29 October 2026)

- Backend unit suite: 86 tests passed.
- Full PostgreSQL integration suite: 53 tests passed (existing auth/profile tests plus membership tests).
- Final membership integration suite after recurring-worker lease changes: 25 tests passed, including real concurrent transactions, payment replay rejection, ownership, strict validation, activation/credit rollback, separate balances, earning thresholds, expiry, renewal deduplication, price review and distributed worker leases.
- Mobile unit suite: 58 tests passed; TypeScript and ESLint passed.
- Backend TypeScript and production build passed.
- Expo web export included the membership route; the existing client-secret audit passed.
- Additive migrations were deployed only to an isolated disposable PostgreSQL 17 test database. The application database was not migrated.

Tests replace external payment verification with an in-process fake at the gateway boundary and never simulate real customer charges. Live payment/mandate verification, provider callbacks, and device interaction require provider setup and release validation. The production gateway remains unavailable. The booking module must call the trusted attendance boundary when real attendance is confirmed.
