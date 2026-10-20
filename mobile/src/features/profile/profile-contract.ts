import { z } from 'zod';

import { completeOnboardingSchema } from '@/features/onboarding/onboarding-contract';

export const updateProfileSchema = z.object({
  name: z.string().trim()
    .min(2, 'Name must contain at least 2 characters')
    .max(80, 'Name must contain at most 80 characters')
    .regex(/^[^\u0000-\u001f\u007f]+$/, 'Use a name without line breaks or control characters'),
  username: completeOnboardingSchema.shape.username,
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type MemberProfile = {
  id: string;
  name: string;
  image: string | null;
  username: string | null;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfileResponse = { user: MemberProfile };
