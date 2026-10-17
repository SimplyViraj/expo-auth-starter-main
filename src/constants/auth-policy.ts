const MINUTES_IN_SECONDS = 60;

export const authPolicy = {
  minimumPasswordLength: 15,
  maximumPasswordLength: 128,
  sensitiveActionFreshnessSeconds: 15 * MINUTES_IN_SECONDS,
} as const;
