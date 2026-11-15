import { Injectable } from '@nestjs/common';
import type { Membership, MembershipRecurring } from '@prisma/client';
import { ApiError } from '../../common/errors/api-error.js';

export type VerifiedMembershipPayment = {
  provider: string;
  paymentId: string;
  membershipId: string;
  amountPaise: number;
  currency: string;
  mandateId?: string;
};

// Only a trusted server adapter may return this receipt, after provider verification.
// No client-provided success flags or payment receipts enter this boundary.
@Injectable()
export class MembershipPaymentGateway {
  readonly available: boolean = false;
  async verify(_membership: Membership, _options: { autoRenew: boolean }): Promise<VerifiedMembershipPayment | null> {
    throw new ApiError(503, 'PAYMENTS_UNAVAILABLE', 'Online payment is not available yet. Your membership remains pending; no payment has been taken.');
  }

  // Adapter must charge using this stable cycle reference as the provider idempotency key,
  // within the original amount/currency/cadence consent, and verify capture independently.
  async renew(_subscription: MembershipRecurring, _membership: Membership, _reference: string): Promise<VerifiedMembershipPayment | null> {
    throw new ApiError(503, 'PAYMENTS_UNAVAILABLE', 'Recurring billing is awaiting payment integration.');
  }

  // Return true only after the provider has disabled future mandate charges.
  async cancelRecurring(_subscription: MembershipRecurring): Promise<boolean> {
    throw new ApiError(503, 'PAYMENTS_UNAVAILABLE', 'Recurring billing is awaiting payment integration.');
  }
}
