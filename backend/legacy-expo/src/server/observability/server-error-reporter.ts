type ServerErrorEvent =
  | { event: 'email.delivery-failed'; purpose: 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'; providerStatus?: number }
  | { event: 'health.database-check-failed' | 'demo.protected-request-failed' | 'onboarding.profile-update-failed' };

// Construct an allowlisted record; never pass arbitrary errors or request data.
export function reportServerError(event: ServerErrorEvent) {
  const record = event.event === 'email.delivery-failed'
    ? { event: event.event, purpose: event.purpose, ...(event.providerStatus === undefined ? {} : { providerStatus: event.providerStatus }) }
    : { event: event.event };
  try {
    console.error('[server-error]', JSON.stringify(record));
  } catch {
    // Reporting must not change the HTTP response.
  }
}
