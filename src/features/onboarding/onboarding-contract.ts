import { z } from 'zod';

export const completeOnboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must contain at least 3 characters')
    .max(24, 'Username must contain at most 24 characters')
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Use lowercase letters, numbers, or underscores, starting with a letter',
    ),
});

export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

export type CompleteOnboardingResponse = {
  user: {
    id: string;
    username: string;
    onboardingCompleted: true;
    onboardingCompletedAt: string;
  };
};
