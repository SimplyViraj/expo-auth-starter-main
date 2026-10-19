import { useQuery } from '@tanstack/react-query';

import { authClient } from '@/features/auth/services/auth-client';

export function useUserAccounts() {
  return useQuery({
    queryKey: ['protected', 'accounts'],
    queryFn: async () => {
      const result = await authClient.listAccounts();

      if (result.error) {
        throw new Error('We could not load your sign-in methods.');
      }

      return result.data;
    },
    retry: false,
  });
}
