export const authUserAdditionalFields = {
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
