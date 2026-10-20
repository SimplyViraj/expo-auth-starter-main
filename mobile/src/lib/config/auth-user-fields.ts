export const authUserAdditionalFields = {
  phoneNumber: { type: 'string', required: false, input: false },
  phoneNumberVerified: { type: 'boolean', required: true, defaultValue: false, input: false },
  phoneNumberVerifiedAt: { type: 'date', required: false, input: false },
  username: {
    type: 'string',
    required: false,
    input: false,
  },
  onboardingCompleted: {
    type: 'boolean',
    required: true,
    defaultValue: false,
    input: false,
  },
  onboardingCompletedAt: {
    type: 'date',
    required: false,
    input: false,
  },
} as const;
