import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportServerError } from '@/server/observability/server-error-reporter';

describe('server error reporter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records only the allowlisted event fields', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    reportServerError({
      event: 'email.delivery-failed',
      purpose: 'forget-password',
      providerStatus: 503,
    });

    expect(consoleError).toHaveBeenCalledWith(
      '[server-error]',
      JSON.stringify({
        event: 'email.delivery-failed',
        purpose: 'forget-password',
        providerStatus: 503,
      }),
    );
  });

  it('never lets a reporting failure change request handling', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {
      throw new Error('monitor unavailable');
    });

    expect(() => reportServerError({ event: 'health.database-check-failed' })).not.toThrow();
  });
});
