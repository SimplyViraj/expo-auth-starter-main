import { useMutation } from '@tanstack/react-query';

import type {
  CompleteOnboardingInput,
  CompleteOnboardingResponse,
} from '@/features/onboarding/onboarding-contract';
import { apiRequest } from '@/lib/api/api-client';

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: (input: CompleteOnboardingInput) =>
      apiRequest<CompleteOnboardingResponse>('/api/onboarding', {
        method: 'PATCH',
        body: input,
      }),
  });
}
