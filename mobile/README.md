# Mobile frontend

This is the existing React Native/Expo application, relocated into its own project. Run all Expo commands from this directory or through the repository root scripts.

~~~sh
npm ci
npm run start:go
~~~

npm start uses the existing development-client flow. Native builds use npm run android / npm run ios. No new native dependency was introduced.

Use .env.example for public configuration. Server secrets belong in ../backend/.env. The mobile application calls the Nest REST API through EXPO_PUBLIC_API_URL and does not contain API routes or database/server modules.

The source layout is:

~~~text
app/
  _layout.tsx, index.tsx
  (auth)/                 sign-in, register, email verification/recovery
  (app)/                  protected member tabs, onboarding, account/app-lock screens
    (tabs)/               Home, Appointments, Wellness, Profile
  (public)/               public landing
src/
  features/auth/
    components/, hooks/, services/, schemas/, types/, utils/, screens/
  components/ui/, components/feedback/
  lib/api/, lib/config/, lib/storage/, lib/device/
  providers/, theme/, types/
  features/               account, appointments, biometrics, home, onboarding, profile, public, wellness
assets/images/, assets/icons/, assets/fonts/
__tests__/
~~~

Shared public JSON configuration lives in ../shared and is explicitly watched by Metro. Native icon assets retain their Expo .icon format under assets/icons/expo.icon. The UI currently uses system fonts; assets/fonts contains the custom-font placement guide.

Registration links use /register; /sign-up redirects for compatibility. Home is /(app); /dashboard redirects for compatibility. Root routing still follows session/onboarding state, with server authorization enforced by Nest.

Member tabs are Home (`/(app)`), Appointments (`/appointments`), Wellness (`/wellness`), and Profile (`/profile`). Profile setup uses `/complete-profile` to keep onboarding separate from the member Profile tab. Tabs and account routes require completed onboarding and verified phone ownership. The existing biometric gate also covers the member shell.

Profile loads the current account from `GET /api/profile` and saves name/username through `PATCH /api/profile`. Name is trimmed and must contain 2–80 characters; usernames follow the onboarding rules and remain unique. Email and verified mobile number are read-only. Unknown fields, identity changes, verification flags, and empty updates are rejected by the server. Member profile queries are scoped by user ID and cleared on logout.

Profile displays the saved social photo and supports choosing, previewing, uploading, and removing a replacement through `/api/profile/photo`. Apple sign-in does not provide a photo; missing/broken photos use initials. Photos are processed into small JPEG thumbnails and stored with the account. Rebuild existing development clients after installing the new `expo-image-picker` and `expo-image-manipulator` dependencies. See [member shell documentation](../docs/member-shell.md#profile-photos) for upload validation and storage details.

Appointments and Wellness currently show coming-soon placeholders. See [member shell verification](../docs/member-shell.md) for behavior and checks.

Phone verification lives at app/(app)/(onboarding)/verify-phone.tsx. SMS login lives at app/(auth)/phone-sign-in.tsx. Twilio credentials stay in backend/.env. See [phone verification](../docs/phone-verification.md) for setup, migration and testing.

~~~sh
npm run check
npm run audit:client
~~~

The web export is static. Deploy it separately from the Nest API and configure exact credentialed web origins on the backend.

See [recorded verification](../docs/verification.md) for test counts and Android, iOS, and web export results.
