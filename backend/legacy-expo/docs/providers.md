# Provider setup

Email/password uses the required database and email service. Google, Apple, and biometric app lock are optional native capabilities.

## Resend

Set the server-only values:

```dotenv
EMAIL_FROM=Expo Auth Starter <onboarding@resend.dev>
RESEND_API_KEY=re_replace_with_your_server_only_key
```

The shared Resend sender can normally deliver only to the account owner's address. For real users, verify a domain, create a server API key, update `EMAIL_FROM`, and restart the server.

Delivery is isolated in `src/server/email/email-delivery.ts`. To change providers, preserve `sendAuthOtpEmail`, replace the request, and update provider-specific validation in `src/server/env.ts`. The adapter must send text/HTML, time out, throw on rejection, and never log recipients or codes. Better Auth continues to own OTP generation, hashing, expiry, attempts, and verification.

## Google Sign-In

Finalize `iosBundleIdentifier` and `androidPackage` in `app-identity.json` first.

In one Google Cloud project:

1. Configure the OAuth consent screen and test users when required.
2. Create a Web OAuth client and keep its client ID/secret.
3. Create an iOS client using the exact bundle ID.
4. Create an Android client using the exact package and signing SHA-1.

Different debug, EAS, and store certificates may require separate Android fingerprints. After generating Android locally, inspect them with:

```sh
cd android
./gradlew signingReport
```

Set all four values:

```dotenv
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

The client IDs are public; the secret stays server-only. Rebuild iOS and Android after changes.

The native SDK returns an ID token. Better Auth verifies its audience, links or creates the verified identity, and establishes the application session. Logout clears the app session without revoking Google's external authorization.

Common problems:

| Problem | Check |
|---|---|
| Android developer error | Package, signing SHA-1, Android client ID |
| iOS configuration error | Bundle ID and iOS client ID |
| Server token rejection | Complete Web client ID/secret and token audience |
| Old behavior after changes | Rebuild the native app, not Metro only |

## Sign in with Apple

1. Register the exact iOS bundle ID as an Apple App ID.
2. Enable **Sign in with Apple** for it.
3. Use Xcode automatic signing or normal EAS credentials.
4. Optionally set `APPLE_TEAM_ID` in the ignored local/build environment.
5. Rebuild iOS.

The native identity-token flow needs no Service ID, web callback, `.p8` key, or Apple client secret. `APPLE_TEAM_ID` selects a signing team; it is not an authentication credential.

The client sends a nonce-bound identity token to Better Auth. Apple may provide name/email only on first authorization, so the app forwards that profile immediately and uses Apple's stable provider subject for returning identities.

Test on a physical device when possible. Web Sign in with Apple is not included; it would require a Service ID, HTTPS callback, and server-generated Apple client secret.

### Apple account deletion

App Store deletion additionally requires revoking the user's Apple authorization. Revocation needs private server-held Apple credentials and a revocable token. Add that product-specific cleanup before release; never place its key or client secret in Expo code.

[Apple account-deletion requirements](https://developer.apple.com/support/offering-account-deletion-in-your-app/)

## Biometric app lock

Users can enable app lock during onboarding or under **Settings → App lock**. Both controls use the same local, user-scoped preference, which covers protected content after cold start or backgrounding until the system prompt succeeds. Cancelling keeps the app locked; sign-out remains available.

Biometrics neither create nor extend a Better Auth session and never authorize APIs. They require a native development build.
