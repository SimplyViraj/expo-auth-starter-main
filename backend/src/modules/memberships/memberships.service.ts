import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../../common/errors/api-error.js';
import { PrismaService } from '../../database/prisma.service.js';
import { addCalendarMonths } from './membership.catalog.js';
import { catalogProgramInclude, catalogResponse, currentCatalog, programResponse, quoteFromCatalog } from './membership-catalog.store.js';
import type { CreateMemberAccountDto, PurchaseMembershipDto, QuoteMembershipDto } from './dto/membership.dto.js';
import { MembershipPaymentGateway } from './membership-payment.gateway.js';

const accountInclude = { participants: { orderBy: { position: 'asc' as const }, include: { credits: { orderBy: { earnedAt: 'desc' as const } } } } };
const membershipInclude = {
  account: { include: accountInclude },
  catalog: true, catalogProgram: { include: catalogProgramInclude },
  recurring: true, renewalOf: true,
  allowances: { orderBy: [{ monthIndex: 'asc' as const }, { participantId: 'asc' as const }], include: { attendance: { orderBy: { attendedAt: 'desc' as const } } } },
};
type MembershipRecord = Prisma.MembershipGetPayload<{ include: typeof membershipInclude }>;

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService, private readonly payments: MembershipPaymentGateway) {}

  async catalog() {
    return catalogResponse(await currentCatalog(this.prisma), this.payments.available);
  }

  async quote(input: QuoteMembershipDto) {
    return quoteFromCatalog(await currentCatalog(this.prisma), input);
  }

  accounts(ownerId: string) {
    return this.prisma.memberAccount.findMany({ where: { ownerId }, include: accountInclude, orderBy: { createdAt: 'desc' } });
  }

  async createAccount(ownerId: string, input: CreateMemberAccountDto) {
    return this.transaction(async tx => {
      const existing = await tx.memberAccount.findUnique({ where: { ownerId_creationKey: { ownerId, creationKey: input.creationKey } }, include: accountInclude });
      if (existing) {
        if (existing.accountType !== input.accountType || existing.name !== input.name || JSON.stringify(existing.participants.map(p => p.name)) !== JSON.stringify(input.participants.map(p => p.name))) {
          throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was already used for different account details.');
        }
        return existing;
      }
      const catalog = await currentCatalog(tx);
      const count = input.participants.length;
      if (!catalog.plans.some(p => p.accountType === input.accountType) || (input.accountType === 'INDIVIDUAL' && count !== 1) || (input.accountType === 'COUPLE' && count !== 2) || (input.accountType === 'GROUP' && (count < 2 || count > catalog.groupMaximum))) {
        throw new ApiError(400, 'INVALID_ROSTER', `Individual requires one person, Couple two, and Group two to ${catalog.groupMaximum}.`);
      }
      return tx.memberAccount.create({ data: { ownerId, name: input.name, creationKey: input.creationKey, accountType: input.accountType, participants: { create: input.participants.map((p, position) => ({ name: p.name, position })) } }, include: accountInclude });
    });
  }

  async list(ownerId: string) {
    const records = await this.prisma.membership.findMany({ where: { account: { ownerId } }, include: membershipInclude, orderBy: { createdAt: 'desc' } });
    return records.map(record => this.response(record));
  }

  async get(ownerId: string, id: string) {
    return this.response(await this.owned(this.prisma, ownerId, id));
  }

  async purchase(ownerId: string, input: PurchaseMembershipDto) {
    const hash = createHash('sha256').update(JSON.stringify([input.accountId, input.accountType, input.tier, input.months, input.programId, input.catalogVersion, input.autoRenew ?? false])).digest('hex');
    const record = await this.transaction(async tx => {
      const account = await tx.memberAccount.findFirst({ where: { id: input.accountId, ownerId }, include: accountInclude });
      if (!account) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Member account not found.');
      const existing = await tx.membership.findUnique({ where: { ownerId_idempotencyKey: { ownerId, idempotencyKey: input.idempotencyKey } }, include: membershipInclude });
      if (existing) {
        if (existing.requestHash !== hash) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was already used for a different purchase.');
        return existing;
      }
      const catalog = await currentCatalog(tx);
      if (input.catalogVersion !== catalog.version) throw new ApiError(409, 'CATALOG_CHANGED', 'Plan details changed. Review a fresh quote before purchasing.');
      if (account.accountType !== input.accountType) throw new ApiError(400, 'ACCOUNT_TYPE_MISMATCH', 'Select a member account matching the plan type.');
      if (account.accountType === 'GROUP' && account.participants.length > catalog.groupMaximum) throw new ApiError(400, 'INVALID_ROSTER', 'This group exceeds the current plan participant limit.');
      if (!catalog.programs.some(program => program.programId === input.programId)) throw new ApiError(400, 'INVALID_PROGRAM', 'Select one available wellness program.');
      const quote = quoteFromCatalog(catalog, input);
      await tx.membership.updateMany({ where: { accountId: account.id, status: 'ACTIVE', endsAt: { lte: new Date() } }, data: { status: 'EXPIRED' } });
      if (await tx.membership.findFirst({ where: { accountId: account.id, status: { in: ['PENDING_PAYMENT', 'ACTIVE'] } } })) throw new ApiError(409, 'MEMBERSHIP_EXISTS', 'This member account already has an active or pending membership. Open My memberships to manage it.');
      if (await tx.membershipRecurring.findFirst({ where: { membership: { accountId: account.id }, status: { not: 'CANCELLED' } } })) throw new ApiError(409, 'RECURRING_EXISTS', 'Cancel the existing recurring agreement before purchasing another plan for this account.');
      const created = await tx.membership.create({ data: {
        ownerId, accountId: account.id, idempotencyKey: input.idempotencyKey, requestHash: hash,
        tier: input.tier, months: input.months, programId: input.programId, catalogVersion: catalog.version,
        amountPaise: quote.amountPaise, currency: quote.currency, sessionsPerMonth: quote.sessionsPerMonth, allowanceScope: quote.allowanceScope,
      }, include: membershipInclude });
      if (input.autoRenew) await tx.membershipRecurring.create({ data: { membershipId: created.id, currentMembershipId: created.id } });
      return this.owned(tx, ownerId, created.id);
    });
    return this.response(record);
  }

  async cancel(ownerId: string, id: string) {
    // Once a provider exists, cancellation must coordinate with its orders/refunds.
    if (this.payments.available) throw new ApiError(409, 'PROVIDER_CANCELLATION_REQUIRED', 'Contact support to cancel this payment.');
    return this.transaction(async tx => {
      const membership = await this.owned(tx, ownerId, id);
      if (membership.status === 'CANCELLED') return this.response(membership);
      if (membership.status !== 'PENDING_PAYMENT') throw new ApiError(409, 'MEMBERSHIP_NOT_PENDING', 'Only a pending membership can be withdrawn.');
      await tx.membership.update({ where: { id }, data: { status: 'CANCELLED' } });
      await tx.membershipRecurring.updateMany({ where: { membershipId: id, status: 'PENDING_SETUP' }, data: { status: 'CANCELLED' } });
      return this.response(await this.owned(tx, ownerId, id));
    });
  }

  async refreshPayment(ownerId: string, id: string) {
    const initial = await this.owned(this.prisma, ownerId, id);
    if ((initial.status === 'ACTIVE' || initial.status === 'EXPIRED') && !(initial.recurring?.status === 'PENDING_SETUP' && this.payments.available)) return this.response(initial);
    if (!['PENDING_PAYMENT', 'ACTIVE', 'EXPIRED'].includes(initial.status)) throw new ApiError(409, 'MEMBERSHIP_NOT_PENDING', 'This purchase is no longer awaiting payment.');
    const receipt = await this.payments.verify(initial, { autoRenew: Boolean(initial.recurring && initial.recurring.status !== 'CANCELLED') });
    if (!receipt) return this.response(initial);
    if (!receipt.provider || !receipt.paymentId || receipt.membershipId !== id || receipt.currency !== initial.currency || receipt.amountPaise !== initial.amountPaise) {
      throw new ApiError(409, 'PAYMENT_MISMATCH', 'Verified payment does not match this membership. Contact support.');
    }
    const record = await this.transaction(async tx => {
      const membership = await this.owned(tx, ownerId, id);
      const prior = await tx.membershipPaymentReceipt.findUnique({ where: { provider_paymentId: { provider: receipt.provider, paymentId: receipt.paymentId } } });
      if (prior && prior.membershipId !== id) throw new ApiError(409, 'PAYMENT_ALREADY_USED', 'This payment is already assigned to another purchase.');
      if (membership.status === 'ACTIVE' || membership.status === 'EXPIRED') {
        if (prior?.membershipId !== id) throw new ApiError(409, 'PAYMENT_MISMATCH', 'Payment does not match the original capture.');
        await this.confirmRecurring(tx, membership, receipt.provider, receipt.mandateId);
        return this.owned(tx, ownerId, id);
      }
      if (membership.status !== 'PENDING_PAYMENT') throw new ApiError(409, 'MEMBERSHIP_NOT_PENDING', 'This purchase is no longer awaiting payment.');
      const startsAt = new Date();
      await tx.membershipPaymentReceipt.create({ data: { membershipId: id, provider: receipt.provider, paymentId: receipt.paymentId } });
      await tx.membership.update({ where: { id }, data: { status: 'ACTIVE', startsAt, endsAt: addCalendarMonths(startsAt, membership.months) } });
      await tx.membershipAllowance.createMany({ data: membership.account.participants.flatMap(participant => Array.from({ length: membership.months }, (_, monthIndex) => ({
        membershipId: id, participantId: participant.id, monthIndex,
        startsAt: addCalendarMonths(startsAt, monthIndex), endsAt: addCalendarMonths(startsAt, monthIndex + 1), included: membership.sessionsPerMonth,
      }))) });
      const activated = await this.owned(tx, ownerId, id);
      await this.confirmRecurring(tx, activated, receipt.provider, receipt.mandateId);
      return this.owned(tx, ownerId, id);
    });
    return this.response(record);
  }

  // Internal boundary for a future trusted booking/attendance module. Never exposed to members.
  async recordAttendance(membershipId: string, participantId: string, bookingId: string, attendedAt: Date) {
    if (!bookingId.trim() || bookingId.length > 120 || !Number.isFinite(attendedAt.getTime()) || attendedAt > new Date()) throw new ApiError(400, 'INVALID_ATTENDANCE', 'Invalid attendance record.');
    return this.transaction(async tx => {
      const allowance = await tx.membershipAllowance.findFirst({ where: { membershipId, participantId, startsAt: { lte: attendedAt }, endsAt: { gt: attendedAt }, membership: { status: { in: ['ACTIVE', 'EXPIRED'] } } } });
      if (!allowance) throw new ApiError(409, 'NO_ALLOWANCE', 'No valid allowance for this participant and visit.');
      const previous = await tx.membershipAttendance.findUnique({ where: { participantId_bookingId: { participantId, bookingId } } });
      if (previous) {
        if (previous.allowanceId !== allowance.id || previous.attendedAt.getTime() !== attendedAt.getTime()) throw new ApiError(409, 'ATTENDANCE_CONFLICT', 'This booking already has a different attendance record.');
        return previous;
      }
      const changed = await tx.membershipAllowance.updateMany({ where: { id: allowance.id, used: { lt: allowance.included } }, data: { used: { increment: 1 } } });
      if (!changed.count) throw new ApiError(409, 'ALLOWANCE_EXHAUSTED', 'This participant has no sessions remaining in this period.');
      const attendance = await tx.membershipAttendance.create({ data: { allowanceId: allowance.id, participantId, bookingId, attendedAt } });
      const participant = await tx.memberParticipant.update({ where: { id: participantId }, data: { attendedSessions: { increment: 1 } } });
      const membership = await tx.membership.findUniqueOrThrow({ where: { id: membershipId }, include: { catalog: true, catalogProgram: true } });
      const initialAward = await tx.memberCredit.findFirst({ where: { participantId, reason: { in: ['FIRST_FOUR_SESSIONS', 'INITIAL_SESSIONS'] } } });
      let reason: string | null = !initialAward && participant.attendedSessions >= membership.catalog.firstCreditSessions ? 'INITIAL_SESSIONS' : null;
      if (initialAward) {
        const rate = membership.catalogProgram.creditEverySessions;
        const programId = membership.catalogProgram.creditProgressKey;
        const progress = await tx.memberCreditProgress.upsert({ where: { participantId_programId: { participantId, programId } }, create: { participantId, programId, sessions: 1 }, update: { sessions: { increment: 1 } } });
        if (progress.sessions % rate === 0) reason = 'PROTOCOL:' + membership.programId;
      }
      if (reason) await tx.memberCredit.create({ data: { participantId, attendanceId: attendance.id, points: 1, reason, earnedAt: attendedAt, expiresAt: addCalendarMonths(attendedAt, membership.catalog.creditValidityMonths) } });
      return attendance;
    });
  }

  private async owned(tx: Prisma.TransactionClient, ownerId: string, id: string) {
    const membership = await tx.membership.findFirst({ where: { id, account: { ownerId } }, include: membershipInclude });
    if (!membership) throw new ApiError(404, 'MEMBERSHIP_NOT_FOUND', 'Membership not found.');
    return membership;
  }

  private response(record: MembershipRecord) {
    const now = new Date();
    // Explicit projection excludes provider receipts, idempotency internals and auth data.
    return {
      id: record.id, account: { id: record.account.id, name: record.account.name, accountType: record.account.accountType, participants: record.account.participants.map(p => ({ id: p.id, name: p.name, position: p.position, attendedSessions: p.attendedSessions, creditBalance: p.credits.filter(c => c.expiresAt > now).reduce((sum, c) => sum + c.points, 0), credits: p.credits.map(c => ({ id: c.id, points: c.points, reason: c.reason, earnedAt: c.earnedAt, expiresAt: c.expiresAt })) })) },
      tier: record.tier, months: record.months, program: programResponse(record.catalogProgram), catalogVersion: record.catalogVersion,
      amountPaise: record.amountPaise, currency: record.currency, sessionsPerMonth: record.sessionsPerMonth,
      allowanceScope: record.allowanceScope, status: record.status === 'ACTIVE' && record.endsAt && record.endsAt <= now ? 'EXPIRED' : record.status,
      startsAt: record.startsAt, endsAt: record.endsAt, createdAt: record.createdAt,
      paymentAvailable: this.payments.available,
      recurring: this.recurringResponse(record.recurring ?? record.renewalOf),
      balances: record.allowances.map(a => ({ participantId: a.participantId, monthIndex: a.monthIndex, startsAt: a.startsAt, endsAt: a.endsAt, included: a.included, used: a.used, remaining: a.included - a.used, current: a.startsAt <= now && now < a.endsAt, attendance: a.attendance.map(visit => ({ id: visit.id, attendedAt: visit.attendedAt })) })),
    };
  }

  private recurringResponse(recurring: Prisma.MembershipRecurringGetPayload<object> | null) {
    return recurring ? { id: recurring.id, status: recurring.status, nextBillingAt: recurring.nextBillingAt, cycle: recurring.cycle } : null;
  }

  private async confirmRecurring(tx: Prisma.TransactionClient, membership: MembershipRecord, provider: string, mandateId?: string) {
    if (membership.recurring?.status === 'PENDING_SETUP' && mandateId && membership.endsAt) {
      await tx.membershipRecurring.update({ where: { id: membership.recurring.id }, data: { provider, mandateId, status: 'ACTIVE', nextBillingAt: membership.endsAt } });
    }
  }

  async cancelRecurring(ownerId: string, id: string) {
    const recurring = await this.transaction(async tx => {
      const found = await tx.membershipRecurring.findFirst({ where: { id, membership: { account: { ownerId } } } });
      if (!found) throw new ApiError(404, 'RECURRING_NOT_FOUND', 'Recurring agreement not found.');
      if (found.status === 'CANCELLED') return found;
      return tx.membershipRecurring.update({ where: { id }, data: { status: found.mandateId ? 'CANCEL_REQUESTED' : 'CANCELLED' } });
    });
    if (recurring.status === 'CANCEL_REQUESTED' && await this.payments.cancelRecurring(recurring)) {
      return this.recurringResponse(await this.prisma.membershipRecurring.update({ where: { id }, data: { status: 'CANCELLED', nextBillingAt: null } }));
    }
    return this.recurringResponse(recurring);
  }

  // Trusted worker/webhook boundary, never accepts prices, payment IDs or success from a member.
  async processRenewal(id: string) {
    const subscription = await this.prisma.membershipRecurring.findUnique({ where: { id }, include: { membership: { include: membershipInclude } } });
    if (!subscription || subscription.status !== 'ACTIVE' || !subscription.mandateId || !subscription.nextBillingAt || subscription.nextBillingAt > new Date()) return;
    const original = subscription.membership;
    const catalog = await currentCatalog(this.prisma);
    const plan = catalog.plans.find(p => p.accountType === original.account.accountType && p.tier === original.tier && p.months === original.months);
    const program = catalog.programs.find(p => p.programId === original.programId);
    if (!plan || !program || plan.amountPaise !== original.amountPaise || plan.sessionsPerMonth !== original.sessionsPerMonth
      || catalog.currency !== original.currency || catalog.firstCreditSessions !== original.catalog.firstCreditSessions
      || catalog.creditValidityMonths !== original.catalog.creditValidityMonths || catalog.groupMaximum !== original.catalog.groupMaximum
      || JSON.stringify(catalog.terms) !== JSON.stringify(original.catalog.terms)
      || program.creditEverySessions !== original.catalogProgram.creditEverySessions || program.creditProgressKey !== original.catalogProgram.creditProgressKey
      || JSON.stringify(programResponse(program)) !== JSON.stringify(programResponse(original.catalogProgram))) {
      await this.prisma.membershipRecurring.updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'PRICE_REVIEW' } });
      return;
    }
    const cycle = subscription.cycle + 1;
    const reference = `renewal:${id}:${cycle}`;
    const receipt = await this.payments.renew(subscription, original, reference);
    if (!receipt) return;
    if (receipt.membershipId !== reference || receipt.provider !== subscription.provider || receipt.mandateId !== subscription.mandateId || receipt.amountPaise !== original.amountPaise || receipt.currency !== original.currency || !receipt.paymentId) throw new ApiError(409, 'PAYMENT_MISMATCH', 'Renewal payment does not match the agreement.');
    return this.transaction(async tx => {
      const existing = await tx.membership.findUnique({ where: { renewalOfId_renewalCycle: { renewalOfId: id, renewalCycle: cycle } }, include: membershipInclude });
      if (existing) return this.response(existing);
      const current = await tx.membershipRecurring.findUniqueOrThrow({ where: { id } });
      if (current.status !== 'ACTIVE' || current.cycle !== cycle - 1) throw new ApiError(409, 'RENEWAL_RECONCILIATION_REQUIRED', 'The recurring agreement changed while payment was processing. Provider reconciliation is required.');
      if (await tx.membershipPaymentReceipt.findUnique({ where: { provider_paymentId: { provider: receipt.provider, paymentId: receipt.paymentId } } })) throw new ApiError(409, 'PAYMENT_ALREADY_USED', 'Renewal payment was already used.');
      const startsAt = new Date();
      const endsAt = addCalendarMonths(startsAt, original.months);
      await tx.membership.updateMany({ where: { accountId: original.accountId, status: 'ACTIVE', endsAt: { lte: startsAt } }, data: { status: 'EXPIRED' } });
      const renewed = await tx.membership.create({ data: {
        ownerId: original.ownerId, accountId: original.accountId, idempotencyKey: randomUUID(), requestHash: reference,
        tier: original.tier, months: original.months, programId: original.programId, catalogVersion: original.catalogVersion,
        amountPaise: original.amountPaise, currency: original.currency, sessionsPerMonth: original.sessionsPerMonth,
        allowanceScope: 'PER_PERSON', status: 'ACTIVE', startsAt, endsAt, renewalOfId: id, renewalCycle: cycle,
        receipt: { create: { provider: receipt.provider, paymentId: receipt.paymentId } },
        allowances: { create: original.account.participants.flatMap(p => Array.from({ length: original.months }, (_, monthIndex) => ({ participantId: p.id, monthIndex, startsAt: addCalendarMonths(startsAt, monthIndex), endsAt: addCalendarMonths(startsAt, monthIndex + 1), included: original.sessionsPerMonth }))) },
      } });
      await tx.membershipRecurring.update({ where: { id }, data: { cycle, currentMembershipId: renewed.id, nextBillingAt: endsAt, nextAttemptAt: null } });
      return this.response(await this.owned(tx, original.ownerId, renewed.id));
    });
  }

  private async transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2034', 'P2002'].includes(error.code)) throw error;
        if (attempt === 4) throw new ApiError(409, 'CONCURRENT_UPDATE', 'Another request is processing. Refresh and retry with the same request key.');
      }
    }
    throw new ApiError(409, 'CONCURRENT_UPDATE', 'Please retry.');
  }
}
