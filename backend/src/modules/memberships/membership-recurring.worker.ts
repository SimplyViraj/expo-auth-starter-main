import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { MembershipPaymentGateway } from './membership-payment.gateway.js';
import { MembershipsService } from './memberships.service.js';

@Injectable()
export class MembershipRecurringWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(MembershipRecurringWorker.name);
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipsService, private readonly payments: MembershipPaymentGateway) {}
  onModuleInit() {
    if (!this.payments.available) return;
    this.timer = setInterval(() => { void this.tick(); }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async tick() {
    if (this.running || !this.payments.available) return;
    this.running = true;
    try {
      const now = new Date();
      const ready = { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] };
      const due = await this.prisma.membershipRecurring.findMany({ where: { status: 'ACTIVE', nextBillingAt: { lte: now }, ...ready }, select: { id: true }, orderBy: { nextBillingAt: 'asc' }, take: 25 });
      for (const subscription of due) {
        // Lease attempts across workers, and let other due accounts progress during retries.
        // Provider idempotency still protects a capture outliving this lease.
        const claimed = await this.prisma.membershipRecurring.updateMany({ where: { id: subscription.id, status: 'ACTIVE', ...ready }, data: { nextAttemptAt: new Date(now.getTime() + 5 * 60_000) } });
        if (!claimed.count) continue;
        try { await this.memberships.processRenewal(subscription.id); }
        catch { this.logger.warn('Recurring payment could not be reconciled; provider review or retry is required.'); }
      }
      const cancellations = await this.prisma.membershipRecurring.findMany({ where: { status: 'CANCEL_REQUESTED', ...ready }, include: { membership: { select: { ownerId: true } } }, take: 25 });
      for (const subscription of cancellations) {
        const claimed = await this.prisma.membershipRecurring.updateMany({ where: { id: subscription.id, status: 'CANCEL_REQUESTED', ...ready }, data: { nextAttemptAt: new Date(now.getTime() + 5 * 60_000) } });
        if (!claimed.count) continue;
        try { await this.memberships.cancelRecurring(subscription.membership.ownerId, subscription.id); }
        catch { this.logger.warn('Recurring cancellation is awaiting provider confirmation; will retry.'); }
      }
    } catch { this.logger.warn('Recurring billing scan unavailable; will retry.'); }
    finally { this.running = false; }
  }
}
