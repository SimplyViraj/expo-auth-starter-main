import { apiRequest } from '@/lib/api/api-client';
import type { Catalog, CreateMemberAccount, MemberAccount, Membership, PlanSelection, PurchaseInput, Quote, Recurring } from './membership-contract';

export const membershipApi = {
  catalog: (signal?: AbortSignal) => apiRequest<Catalog>('/api/memberships/catalog', { signal }),
  accounts: (signal?: AbortSignal) => apiRequest<MemberAccount[]>('/api/memberships/accounts', { signal }),
  list: (signal?: AbortSignal) => apiRequest<Membership[]>('/api/memberships', { signal }),
  quote: (body: PlanSelection, signal?: AbortSignal) => apiRequest<Quote>('/api/memberships/quote', { method: 'POST', body, signal }),
  createAccount: (body: CreateMemberAccount) => apiRequest<MemberAccount>('/api/memberships/accounts', { method: 'POST', body }),
  purchase: (body: PurchaseInput) => apiRequest<Membership>('/api/memberships/purchases', { method: 'POST', body }),
  cancel: (id: string) => apiRequest<Membership>(`/api/memberships/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  refresh: (id: string) => apiRequest<Membership>(`/api/memberships/${encodeURIComponent(id)}/payment-refresh`, { method: 'POST' }),
  cancelRecurring: (id: string) => apiRequest<Recurring>(`/api/memberships/recurring/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
};
