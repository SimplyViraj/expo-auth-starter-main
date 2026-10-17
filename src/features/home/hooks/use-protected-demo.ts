import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '@/lib/api/api-client';
import type { ProtectedDemoResponse } from '@/types/demo-api';

export function useProtectedDemo() {
  return useQuery({
    queryKey: ['protected', 'demo'],
    queryFn: () => apiRequest<ProtectedDemoResponse>('/api/demo/protected'),
    enabled: false,
    staleTime: 30_000,
    retry: false,
  });
}
