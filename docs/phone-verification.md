# Phone verification and SMS login

Phone verification is required before completing onboarding or accessing onboarded resources. Existing users without a verified phone return to onboarding; their usernames and existing accounts are retained. Email/password and Google/Apple sign-in remain available. Phone login uses an SMS code for an existing linked account; it does not create a new account or replace email registration.

## Twilio configuration

Create a [Twilio Verify Service](https://www.twilio.com/docs/verify/api/service) with SMS enabled, six-digit codes, and the default ten-minute validity. Enable the destination countries you need in Verify Geo Permissions. Trial accounts can send only to permitted/verified recipients; check your Twilio account restrictions before live testing.

Set these three server-only variables in backend/.env:

~~~dotenv
TWILIO_ACCOUNT_SID=AC_your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=VA_your_verify_service_sid
~~~

Account SIDs use AC followed by 32 hexadecimal characters; Verify Service SIDs use VA followed by 32 hexadecimal characters. Supply the real values from Twilio. Never place these values in mobile/.env or use EXPO_PUBLIC_ for them. The auth token stays on the server. The provider uses the [Verify REST API](https://www.twilio.com/docs/verify/api/verification) with timed-out, authenticated HTTPS requests. Twilio generates and validates the code; the application does not generate or store an SMS code.

The variables must be configured together. Development can start without them, but phone verification fails closed and onboarding cannot finish. Production environment validation requires all three.

## Database and startup

Stop a running backend before regenerating Prisma on Windows. Review the additive migration and apply it to your Prisma-managed development database:

~~~sh
npm --prefix backend run db:generate
npm --prefix backend run db:migrate
npm run backend:dev
~~~

Restart Metro after adding routes:

~~~sh
npm run start:go
~~~

The SMS screens use existing Expo Go compatible components and add no native package. Physical-device behavior still needs live verification. Existing native/social capabilities keep their own build requirements. For an existing pre-Prisma database or P3005, follow the [reviewed baseline procedure](database-baseline.md) before deploying migrations. The migration was created under backend/prisma/migrations/20261020000000_phone_verification. If your database still uses the pre-Prisma schema, follow backend/README.md before applying Prisma migrations.

User now has nullable unique phoneNumber, phoneNumberVerified (default false), and phoneNumberVerifiedAt. Existing users retain their email, usernames and sessions. PhoneChallenge stores the canonical number, purpose, bound user, Twilio verification SID, attempt count, expiration and consumption timestamps. It stores no SMS code. Challenges cascade on account deletion, and expired challenges are cleared opportunistically when requesting codes.

## Mobile flow

During onboarding, select Verify mobile number, enter the international number including + and country code (for example +919876543210), request an SMS, and enter its six-digit code. Return to the profile screen to finish setup. Username entry and optional app lock are preserved. Linking a login number requires a session created in the last fifteen minutes; sign out and in again if prompted.

At sign-in, select Sign in with mobile number and request a code for the verified number. The SMS-login response installs the same Better Auth session cookie used by existing login methods. The client uses Better Auth's fetch transport so Expo SecureStore cookie handling is preserved.

## REST contracts

All endpoints are served by the existing AuthController under /api/auth, with strict Zod request validation, auth-origin checks, no-store responses, and Swagger schemas at /api/docs.

| Endpoint | Body | Behavior |
| --- | --- | --- |
| POST /api/auth/phone/send-code | phoneNumber, purpose: verify or sign-in | Returns opaque challengeId, expiresIn: 600, resendAfter: 60 |
| POST /api/auth/phone/verify | challengeId, code | Requires a fresh session and its own verification challenge; links the approved unique number |
| POST /api/auth/phone/sign-in | challengeId, code | Consumes an approved login challenge and creates an existing-account session |

Phone numbers must be canonical E.164 on the server; the client removes display separators before sending. A code is exactly six numeric digits. The client never submits a phone number or user ID with the confirmation; the server reads them from the challenge.

Challenge IDs cannot be exchanged between users or purposes. Sends have a database-backed sixty-second per-number cooldown across purposes and server instances, plus per-socket-IP limits of three sends per minute. Verification permits five code attempts per challenge and ten confirmation requests per minute per endpoint/IP. Twilio's own rate limits also apply. Configure Twilio's account/service protections for your deployment; the server uses the existing direct-socket IP policy.

Only an approved Twilio response can mark a phone verified. A transactional consume gate prevents duplicate session creation even if a provider repeats an approved response. Wrong, expired, consumed, wrong-purpose and foreign-user challenges fail. A linked number is unique across accounts. Unknown login numbers get the same challenge shape without sending SMS or creating an account. Provider failures return safe errors and retain the resend cooldown.

## Verification limits

Automated tests replace the Twilio transport at its dependency-injection boundary. They exercise the real auth engine, HTTP contracts, cookies, Prisma and PostgreSQL. Provider unit tests separately verify Twilio REST requests, approval checks and safe failure handling. These checks do not establish live SMS delivery or physical-device behavior; those require real Twilio credentials and an explicit test on a real number.
