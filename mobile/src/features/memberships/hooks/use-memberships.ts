import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../membership-api';
import type { PlanSelection } from '../membership-contract';
import { ApiError } from '@/lib/api/api-client';
import { useAuth } from '@/providers/auth-provider';

const retry = (count: number, error: Error) => !(error instanceof ApiError && error.status < 500) && count < 1;
export function useMemberships() {
  const { user, phase } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['protected', 'memberships', user?.id];
  const enabled = phase === 'ready' && Boolean(user);
  const catalog = useQuery({ queryKey: ['membership-catalog'], queryFn: ({ signal }) => membershipApi.catalog(signal), retry });
  const accounts = useQuery({ queryKey: [...queryKey, 'accounts'], queryFn: ({ signal }) => membershipApi.accounts(signal), enabled, retry });
  const memberships = useQuery({ queryKey: [...queryKey, 'list'], queryFn: ({ signal }) => membershipApi.list(signal), enabled, retry });
  // Invalidation cannot recreate cleared private data after sign-out.
  const onSuccess = async () => { await queryClient.invalidateQueries({ queryKey }); };
  const createAccount = useMutation({ mutationFn: membershipApi.createAccount, onSuccess, retry: false });
  const purchase = useMutation({ mutationFn: membershipApi.purchase, onSuccess, retry: false });
  const cancel = useMutation({ mutationFn: membershipApi.cancel, onSuccess, retry: false });
  const refresh = useMutation({ mutationFn: membershipApi.refresh, onSuccess, retry: false });
  const cancelRecurring = useMutation({ mutationFn: membershipApi.cancelRecurring, onSuccess, retry: false });
  return { catalog, accounts, memberships, createAccount, purchase, cancel, refresh, cancelRecurring };
}

export function useMembershipQuote(selection: PlanSelection, enabled: boolean) {
  const { user, phase } = useAuth();
  return useQuery({ queryKey: ['protected', 'memberships', user?.id, 'quote', selection], queryFn: ({ signal }) => membershipApi.quote(selection, signal), enabled: enabled && phase === 'ready', retry, staleTime: 0 });
}
