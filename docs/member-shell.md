# AAyuva member shell and profile

The authenticated app opens four bottom tabs: Home, Appointments, Wellness, and Profile. Home welcomes the authenticated member and links to the other tabs. Appointments and Wellness are placeholders for future features. Settings, app lock, and account deletion remain accessible from Profile.

`Stack.Protected` keeps signed-out users out of member routes and members who still need onboarding out of tabs and account screens. Onboarding now uses `/complete-profile`; `/profile` belongs to the member tab. The existing biometric gate continues to cover authenticated screens. `/dashboard` redirects to Home for compatibility.

## Profile API

`GET /api/profile` and `PATCH /api/profile` require a valid session, completed onboarding, and a verified phone number. Both always use the session user ID. Responses select only public account fields and use `Cache-Control: private, no-store`.

PATCH accepts either or both of:

- `name`: trimmed, 2–80 characters, no embedded control characters.
- `username`: trimmed, lowercased, 3–24 characters, starts with a letter, followed by letters, numbers, or underscores.

Empty updates, nulls, invalid types, and unknown fields are rejected. Email, phone number, verification flags, account ID, and onboarding state cannot be changed here. The existing database unique constraint enforces username uniqueness, including concurrent claims; conflicts return `409 USERNAME_TAKEN`. No database migration is needed.

## Client behavior

Profile shows a loading indicator, a retry action if loading fails, and a warning with the last saved details if a refresh fails. Returning to the tab refreshes its data. Editing supports inline validation, cancel, a pending save state, username conflict feedback, and retry after a failed save. Successful saves update the profile query and refresh the auth session so the Home greeting and Settings also reflect the change.

Profile queries include the member ID in their cache key. Profile reads accept an abort signal. Logout cancels queries and clears the query cache; the auth guards remove member history. Logout uses an inline confirmation on native and web, blocks repeated requests, and leaves the session active with an error toast when the sign-out request fails. The logout action remains available even if profile loading fails.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm test` from the repository root. Backend profile HTTP tests exercise real guards, validation, controller, and service with mocked persistence. They cover anonymous/incomplete accounts, session ownership, field validation, origins, partial updates, conflicts, and missing accounts. Mobile tests cover profile validation and normalization.

The existing database integration suite includes profile persistence, session synchronization, concurrent username edits, account isolation, and access after logout. Run `npm run test:e2e` with `TEST_DATABASE_URL` set to a dedicated PostgreSQL database whose name ends in `_test`.

Manual device checks:

1. Sign in as a member with incomplete onboarding; confirm tabs and `/profile` cannot bypass setup.
2. Complete setup; switch between all four tabs and open Settings from Profile.
3. Edit name and username; confirm Save, Cancel, invalid input, and a taken username behave correctly. Reopen Profile and verify persistence.
4. Disconnect before opening Profile and before saving; confirm retry actions and preserved form input.
5. Sign out, then try Back and a member deep link; confirm member screens stay protected. Sign in as a different member and confirm their own details appear.
6. Repeat with app lock enabled and check the keyboard, bottom safe area, and light/dark appearance on native devices.
