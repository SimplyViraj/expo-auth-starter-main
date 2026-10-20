import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ProfileResponse, UpdateProfileInput } from '@/features/profile/profile-contract';
import { ApiError, apiRequest } from '@/lib/api/api-client';
import { useAuth } from '@/providers/auth-provider';

export function useProfile() {
  const { phase, user } = useAuth();

  return useQuery({
    queryKey: ['protected', 'profile', user?.id],
    queryFn: ({ signal }) => apiRequest<ProfileResponse>('/api/profile', { signal }),
    enabled: phase === 'ready' && Boolean(user),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });
}

export function useUpdateProfile() {
  return useProfileMutation((input: UpdateProfileInput) => apiRequest<ProfileResponse>('/api/profile', { method: 'PATCH', body: input }));
}

export function useUploadProfilePhoto() {
  return useProfileMutation((base64: string) => apiRequest<ProfileResponse>('/api/profile/photo', { method: 'PATCH', body: { base64 } }));
}

export function useRemoveProfilePhoto() {
  return useProfileMutation<void>(() => apiRequest<ProfileResponse>('/api/profile/photo', { method: 'DELETE' }));
}

function useProfileMutation<TInput>(mutationFn: (input: TInput) => Promise<ProfileResponse>) {
  const queryClient = useQueryClient();
  const { refreshSession, user } = useAuth();

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      // A save may finish after sign-out. Never recreate a signed-out user's cache.
      if (user?.id !== data.user.id || !queryClient.getQueryState(['protected', 'profile', data.user.id])) return;
      await queryClient.cancelQueries({ queryKey: ['protected', 'profile', data.user.id] });
      if (!queryClient.getQueryState(['protected', 'profile', data.user.id])) return;
      queryClient.setQueryData(['protected', 'profile', data.user.id], data);
      await refreshSession();
    },
  });
}
