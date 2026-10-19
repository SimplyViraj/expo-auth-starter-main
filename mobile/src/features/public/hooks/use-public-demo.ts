import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api/api-client';
import type { PublicDemoResponse } from '@/types/demo-api';

export function usePublicDemo() {
  return useQuery({
    queryKey: ['public', 'demo'],
    queryFn: () => apiRequest<PublicDemoResponse>('/api/demo/public'),
    enabled: false,
    staleTime: 60_000,
    retry: false,
  });
}
