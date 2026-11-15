# Membership verification — 7 November 2026

## Verdict

The membership lifecycle is implemented and passes automated tests using real PostgreSQL persistence and simulated payment-provider responses. It is **not ready to accept real payments**: the registered `MembershipPaymentGateway` has `available = false`, and its verification, renewal and mandate cancellation methods return `PAYMENTS_UNAVAILABLE`.

Saving a purchase currently creates a pending membership. It does not charge the customer, start membership validity, or allocate sessions. The mobile purchase action also does not launch a provider checkout. A provider adapter, checkout flow, verified callbacks and reconciliation are still needed before paid membership can operate end to end.

## Final results

| Check | Result |
| --- | --- |
| Membership PostgreSQL integration | 102 passed |
| Authentication/profile PostgreSQL integration | 29 passed |
| Backend unit tests | 86 passed |
| Mobile unit tests | 68 passed |
| Backend TypeScript and production build | Passed |
| Mobile lint | Passed |
| Mobile TypeScript | Failed: five errors in navigation/OTP files, described below |

Total: **285 passing automated tests**. The final integration run had no failures or skipped tests. Machine-readable integration results are saved locally in `.tmp/membership-e2e-results.json`. The disposable database was stopped and removed after verification.

Changes made for this verification are limited to expanded backend/mobile tests and this report; application behavior was not changed.

## Test environment

- Disposable PostgreSQL 17 container, bound to localhost port 55433, using database `aayuva_membership_test`.
- Existing migrations applied to that test database only; application database not used.
- Membership integration tests use real HTTP routing, validation, authorization guards, services, transactions and database constraints. Session lookup and external payment responses are substituted.
- Provider timeouts, declined/unsettled payments, invalid captures and cancellation races are deliberately simulated. No customer charges are made.
- Each membership scenario clears only its test users' accounts. Gateway spies are restored between scenarios.

## Scenarios covered

| Area | Coverage |
| --- | --- |
| Plan purchases | All 36 account type / tier / duration combinations through HTTP; exact server price; pending state before payment; monthly allocations per participant after successful verification; no purchase credits |
| Successful payments | Verified activation; validity dates; duplicate refreshes; simultaneous callbacks; one receipt and one set of allowances |
| Failed payments | Production gateway unavailable; provider timeout; declined/unsettled result; retry on the same purchase; no access before successful verification |
| Invalid receipts | Wrong amount, currency or purchase; missing provider/payment ID; reused initial or renewal receipt |
| Purchase safety | Stable idempotency keys; conflicting payloads; concurrent purchases; stale catalog; invalid plan/program/account type |
| Access controls | Authentication and onboarding; cross-owner access denial; invalid origins; rejected client payment/status assertions; private no-store responses |
| Withdrawal | Repeated pending withdrawal; fresh purchase after cancellation; rejection of paid withdrawal; provider-enabled cancellation restriction; late payment after withdrawal |
| Mandates | Explicit recurring consent; pending setup without mandate; delayed mandate linked to original capture; unsolicited or late cancelled-consent mandate |
| Renewals | No early charge; successful and concurrent renewals; stable cycle reference across timeout/decline retries; invalid receipt rejection; unpaid terms remain expired |
| Recurring cancellation | Provider error; unconfirmed cancellation; repeated confirmation; no further worker charges; cancellation racing captured renewal requires reconciliation |
| Worker behavior | Disabled gateway; database leases; retry delay; processing other accounts after provider failure; cancellation retries |
| Changed terms | Renewal pauses for fresh consent when price or session allowance differs |
| Transaction integrity | Activation, renewal and credit award failures roll back associated writes; renewal succeeds on retry after allocation failure |
| Attendance | Separate participant balances; duplicate booking; concurrent exhaustion; invalid/future dates; foreign participants; pending memberships; changed booking replay |
| Monthly boundaries | Inclusive period start, exclusive end; end-of-month clamping and leap years; no session rollover; immediate derived expiry |
| Credits | All ten programs; first-four threshold; later protocol thresholds; no duplicate award; expired credit exclusion; preserved progress across a later membership |
| Mobile transport | Stable purchase key after network failure; backend statuses preserved; payment errors surfaced; refresh recovery; cancellation without payment assertions |

## Release limitations

- Tests verify application behavior at the payment adapter boundary. They do not prove any real provider's checkout, capture, signature verification, mandate cancellation, refunds or settlement behavior.
- Provider-specific callbacks and reconciliation for payments captured during cancellation are not implemented. The tests verify rejection/required reconciliation, not an automatic refund.
- Failed or unsettled payment verification returns no receipt and keeps the purchase pending; there is no separate declined-payment status in the membership contract.
- Attendance is an internal service boundary. A booking/reception integration must call it; no member-facing attendance endpoint exists.
- Native device interaction and rendered screen flows were not exercised.
- The mobile TypeScript check failed in navigation layouts (`initialRouteName`) and OTP input refs (`TextInput`/`focus`). These errors were present before the test additions and lie outside membership code. Backend type-checking/build and mobile lint passed.

## Reproduction

Run `npm test` for mobile and backend unit tests. Run `npm --prefix backend run typecheck`, `npm --prefix backend run build` and `npm --prefix mobile run lint` for the passing static/build checks.

For integration tests, provision a disposable PostgreSQL database whose name ends in `_test`, set `TEST_DATABASE_URL` for that process, then run:

```powershell
npm --prefix backend run test:e2e
```

The integration harness deploys migrations to the test database before running. Never point this harness at an application database.
