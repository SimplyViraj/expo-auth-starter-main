import 'reflect-metadata';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { MembershipsService } from '../src/modules/memberships/memberships.service.js';
import { MembershipCatalogController, MembershipsController } from '../src/modules/memberships/memberships.controller.js';
import { MembershipPaymentGateway, type VerifiedMembershipPayment } from '../src/modules/memberships/membership-payment.gateway.js';
import { SessionGuard } from '../src/common/guards/session.guard.js';
import { OnboardedGuard } from '../src/modules/authorization/guards/onboarded.guard.js';
import { AuthorizationService } from '../src/modules/authorization/authorization.service.js';
import { AuthService, type AuthSession } from '../src/modules/auth/auth.service.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { createValidationPipe } from '../src/common/pipes/validation.pipe.js';
import { CacheControlInterceptor } from '../src/common/interceptors/cache-control.interceptor.js';
import type { AccountType } from '../src/modules/memberships/membership.catalog.js';
import type { PurchaseMembershipDto } from '../src/modules/memberships/dto/membership.dto.js';
import { MembershipRecurringWorker } from '../src/modules/memberships/membership-recurring.worker.js';
import { ACCOUNT_TYPES, TIERS, MONTHS, ALLOWANCES, CREDIT_SESSION_RATES, PROGRAMS } from './fixtures/membership-catalog.js';
import { addCalendarMonths } from '../src/modules/memberships/membership.catalog.js';
import { cloneCatalog } from '../src/modules/memberships/membership-catalog.store.js';
const run = 'membership-' + randomUUID();
const owner = run + '-owner';
const other = run + '-other';
const receipts = new Map<string, VerifiedMembershipPayment>();
const renewals = new Map<string, VerifiedMembershipPayment>();
let renewalCalls = 0;
const gateway = {
  available: false,
  verify: async (membership: { id: string }, _options: { autoRenew: boolean }) => receipts.get(membership.id) ?? null,
  renew: async (_subscription: unknown, _membership: unknown, reference: string) => { renewalCalls++; return renewals.get(reference) ?? null; },
  cancelRecurring: async () => true,
};
let prisma: PrismaService;
let service: MembershipsService;
let app: INestApplication;
let originalCatalogVersion: string;
beforeAll(async () => {
  prisma = new PrismaService(new ConfigService({ DATABASE_URL: process.env.TEST_DATABASE_URL }));
  await prisma.$connect();
  for (const id of [owner, other]) await prisma.user.create({ data: { id, name: id, email: id + '@example.com' } });
  const module = await Test.createTestingModule({
    controllers: [MembershipCatalogController, MembershipsController],
    providers: [MembershipsService, SessionGuard, OnboardedGuard, AuthorizationService,
      { provide: PrismaService, useValue: prisma }, { provide: MembershipPaymentGateway, useValue: gateway },
      // Only session resolution is replaced; HTTP guards, validation, service and PostgreSQL are real.
      { provide: AuthService, useValue: { getSession: async (req: { headers: Record<string, string> }) => {
        const id = req.headers['x-test-member'];
        if (![owner, other, 'incomplete'].includes(id)) return null;
        return { user: { id, onboardingCompleted: id !== 'incomplete', phoneNumber: '+15550000000', phoneNumberVerified: true }, session: { id: 'test-session' } } as AuthSession;
      } } },
      { provide: IdentityService, useValue: { allowsApplicationOrigin: (origin: string) => origin === 'http://localhost:8081' } },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api'); app.useGlobalPipes(createValidationPipe()); app.useGlobalFilters(new HttpExceptionFilter()); app.useGlobalInterceptors(new CacheControlInterceptor());
  await app.init(); service = app.get(MembershipsService);
  originalCatalogVersion = (await service.catalog()).version;
});
beforeEach(async () => {
  gateway.available = false; renewalCalls = 0; receipts.clear(); renewals.clear();
  // Workers scan the database, so old due agreements must not leak between scenarios.
  await prisma.memberAccount.deleteMany({ where: { ownerId: { in: [owner, other] } } });
  await prisma.membershipCatalogCurrent.upsert({ where: { id: 'current' }, create: { id: 'current', version: originalCatalogVersion }, update: { version: originalCatalogVersion } });
});
afterEach(() => { jest.restoreAllMocks(); });
afterAll(async () => {
  if (prisma && originalCatalogVersion) await prisma.membershipCatalogCurrent.upsert({ where: { id: 'current' }, create: { id: 'current', version: originalCatalogVersion }, update: { version: originalCatalogVersion } });
  if (prisma) await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
  if (app) await app.close();
  if (prisma) await prisma.$disconnect();
});

async function account(type: AccountType = 'INDIVIDUAL', count = type === 'INDIVIDUAL' ? 1 : type === 'COUPLE' ? 2 : 4) {
  return service.createAccount(owner, { accountType: type, name: 'Test wellness account', creationKey: randomUUID(), participants: Array.from({ length: count }, (_, i) => ({ name: `Person ${i + 1}` })) });
}

async function purchase(type: AccountType = 'INDIVIDUAL', changes: Partial<PurchaseMembershipDto> = {}) {
  const a = await account(type);
  const input: PurchaseMembershipDto = { accountId: a.id, accountType: type, tier: 'ELITE', months: 1, programId: 'sleep-reset', catalogVersion: (await service.catalog()).version, idempotencyKey: randomUUID(), autoRenew: false, ...changes };
  return { account: a, input, membership: await service.purchase(owner, input) };
}

async function activate(id: string, mandateId?: string, paymentId = randomUUID()) {
  const m = await service.get(owner, id);
  receipts.set(id, { provider: 'test-provider', paymentId, membershipId: id, amountPaise: m.amountPaise, currency: 'INR', mandateId });
  return service.refreshPayment(owner, id);
}

async function dueRenewal() {
  const { membership, account: memberAccount } = await purchase('INDIVIDUAL', { autoRenew: true });
  const mandateId = randomUUID();
  const active = await activate(membership.id, mandateId);
  const id = active.recurring!.id;
  await prisma.membership.update({ where: { id: membership.id }, data: { startsAt: new Date('2025-01-01'), endsAt: new Date('2025-02-01') } });
  await prisma.membershipRecurring.update({ where: { id }, data: { nextBillingAt: new Date('2025-02-01') } });
  const reference = `renewal:${id}:1`;
  const receipt: VerifiedMembershipPayment = { provider: 'test-provider', paymentId: randomUUID(), membershipId: reference, amountPaise: membership.amountPaise, currency: 'INR', mandateId };
  return { id, membership, account: memberAccount, reference, receipt };
}

async function catalogDraft() {
  const version = `test-${randomUUID()}`;
  await prisma.$transaction(tx => cloneCatalog(tx, version), { timeout: 30_000 });
  return version;
}

async function publishCatalog(version: string) {
  await prisma.$queryRaw`SELECT publish_membership_catalog(${version})`;
}

describe('versioned database business catalog', () => {
  it('keeps direct catalog administration unavailable to public/client database roles', async () => {
    const publicExecution = await prisma.$queryRaw<{ allowed: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc p, LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE p.oid = 'publish_membership_catalog(text)'::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
      ) AS allowed`;
    expect(publicExecution[0].allowed).toBe(false);
    const roles = await prisma.$queryRaw<{ allowed: boolean }[]>`
      SELECT has_table_privilege(rolname, 'catalog_plan', 'INSERT')
        OR has_table_privilege(rolname, 'membership_catalog_current', 'UPDATE')
        OR has_function_privilege(rolname, 'publish_membership_catalog(text)', 'EXECUTE') AS allowed
      FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`;
    expect(roles.every(role => !role.allowed)).toBe(true);
  });
  it('keeps drafts private and makes a reviewed database price live without a code change', async () => {
    const version = await catalogDraft();
    await prisma.catalogPlan.updateMany({ where: { catalogVersion: version, accountType: 'INDIVIDUAL', tier: 'ELITE', months: 1 }, data: { amountPaise: 1234500 } });
    expect((await service.catalog()).version).toBe(originalCatalogVersion);
    await expect(prisma.membershipCatalogCurrent.update({ where: { id: 'current' }, data: { version } })).rejects.toBeDefined();
    await publishCatalog(version);
    expect((await service.catalog()).version).toBe(version);
    expect(await service.quote({ accountType: 'INDIVIDUAL', tier: 'ELITE', months: 1 })).toMatchObject({ catalogVersion: version, amountPaise: 1234500 });
    const { membership } = await purchase();
    expect(membership.amountPaise).toBe(1234500);
    expect((await activate(membership.id)).status).toBe('ACTIVE');
  });
  it('preserves pending purchase terms and idempotent retries after publishing a new catalog', async () => {
    const { membership, input } = await purchase();
    const version = await catalogDraft();
    await prisma.catalogPlan.updateMany({ where: { catalogVersion: version }, data: { amountPaise: { increment: 10000 }, sessionsPerMonth: 9 } });
    await prisma.catalogProtocol.updateMany({ where: { catalogVersion: version, programId: 'sleep-reset', key: 'A' }, data: { description: 'New published protocol description' } });
    await publishCatalog(version);
    await expect(service.purchase(owner, { ...input, idempotencyKey: randomUUID() })).rejects.toMatchObject({ response: { error: { code: 'CATALOG_CHANGED' } } });
    expect((await service.purchase(owner, input)).id).toBe(membership.id);
    const active = await activate(membership.id);
    expect(active.catalogVersion).toBe(originalCatalogVersion);
    expect(active.amountPaise).toBe(membership.amountPaise);
    expect(active.sessionsPerMonth).toBe(12);
    expect(active.program).toEqual(membership.program);
    expect(active.balances[0].included).toBe(12);
    expect((await service.catalog()).programs.find(p => p.id === 'sleep-reset')!.sessionA).toBe('New published protocol description');
  });
  it('keeps purchased credit rules while new purchases use new thresholds and expiry', async () => {
    const old = await purchase();
    await activate(old.membership.id);
    const version = await catalogDraft();
    await prisma.membershipCatalog.update({ where: { version }, data: { firstCreditSessions: 2, creditValidityMonths: 6 } });
    await prisma.catalogProgram.updateMany({ where: { catalogVersion: version, programId: 'sleep-reset' }, data: { creditEverySessions: 1, creditProgressKey: `sleep-reset-${version}` } });
    await publishCatalog(version);
    const fresh = await purchase();
    await activate(fresh.membership.id);
    for (const entry of [old, fresh]) {
      for (let i = 0; i < 6; i++) await service.recordAttendance(entry.membership.id, entry.account.participants[0].id, randomUUID(), new Date());
    }
    expect((await service.get(owner, old.membership.id)).account.participants[0].creditBalance).toBe(2);
    expect((await service.get(owner, fresh.membership.id)).account.participants[0].creditBalance).toBe(5);
    const freshCredit = await prisma.memberCredit.findFirstOrThrow({ where: { participantId: fresh.account.participants[0].id } });
    expect(freshCredit.expiresAt).toEqual(addCalendarMonths(freshCredit.earnedAt, 6));
  });
  it('does not award the initial credit again when thresholds change for a later purchase', async () => {
    const old = await purchase();
    await activate(old.membership.id);
    const participantId = old.account.participants[0].id;
    for (let i = 0; i < 5; i++) await service.recordAttendance(old.membership.id, participantId, randomUUID(), new Date());
    await prisma.membership.update({ where: { id: old.membership.id }, data: { startsAt: new Date('2025-01-01'), endsAt: new Date('2025-02-01') } });
    const version = await catalogDraft();
    await prisma.membershipCatalog.update({ where: { version }, data: { firstCreditSessions: 6 } });
    await publishCatalog(version);
    const next = await service.purchase(owner, { ...old.input, catalogVersion: version, idempotencyKey: randomUUID() });
    await activate(next.id);
    await service.recordAttendance(next.id, participantId, randomUUID(), new Date());
    expect(await prisma.memberCredit.count({ where: { participantId, reason: 'INITIAL_SESSIONS' } })).toBe(1);
    expect((await service.get(owner, next.id)).account.participants[0].creditBalance).toBe(2);
  });
  it.each(['price', 'allowance', 'protocol', 'credit', 'therapy', 'removed plan', 'removed program'] as const)('pauses renewal before charging when published %s changes', async change => {
    const due = await dueRenewal();
    const version = await catalogDraft();
    if (change === 'price') await prisma.catalogPlan.updateMany({ where: { catalogVersion: version }, data: { amountPaise: { increment: 100 } } });
    if (change === 'allowance') await prisma.catalogPlan.updateMany({ where: { catalogVersion: version }, data: { sessionsPerMonth: 10 } });
    if (change === 'protocol') await prisma.catalogProtocol.updateMany({ where: { catalogVersion: version, programId: 'sleep-reset', key: 'B' }, data: { description: 'Changed protocol' } });
    if (change === 'credit') await prisma.catalogProgram.updateMany({ where: { catalogVersion: version, programId: 'sleep-reset' }, data: { creditEverySessions: 3, creditProgressKey: version } });
    if (change === 'therapy') await prisma.catalogTherapy.updateMany({ where: { catalogVersion: version, therapyId: 'sauna' }, data: { name: 'Changed sauna therapy' } });
    if (change === 'removed plan') await prisma.catalogPlan.deleteMany({ where: { catalogVersion: version, tier: 'ELITE' } });
    if (change === 'removed program') {
      const where = { catalogVersion: version, programId: 'sleep-reset' };
      await prisma.catalogStepTherapy.deleteMany({ where });
      await prisma.catalogProtocolStep.deleteMany({ where });
      await prisma.catalogProtocol.deleteMany({ where });
      await prisma.catalogProgram.deleteMany({ where });
    }
    await publishCatalog(version);
    await service.processRenewal(due.id);
    expect(renewalCalls).toBe(0);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id: due.id } })).status).toBe('PRICE_REVIEW');
    expect(await prisma.membership.count({ where: { renewalOfId: due.id } })).toBe(0);
  });
  it('allows unchanged terms to renew under the original purchased version', async () => {
    const due = await dueRenewal();
    await publishCatalog(await catalogDraft());
    renewals.set(due.reference, due.receipt);
    await service.processRenewal(due.id);
    const renewed = await prisma.membership.findFirstOrThrow({ where: { renewalOfId: due.id } });
    expect(renewed.catalogVersion).toBe(originalCatalogVersion);
    expect(renewed.status).toBe('ACTIVE');
  });
  it('accepts newly published durations and allowances through HTTP', async () => {
    const version = await catalogDraft();
    await prisma.catalogPlan.deleteMany({ where: { catalogVersion: version, months: { not: 1 } } });
    await prisma.catalogPlan.updateMany({ where: { catalogVersion: version }, data: { months: 2, sessionsPerMonth: 7 } });
    await publishCatalog(version);
    const response = await request(app.getHttpServer()).post('/api/memberships/quote').set('x-test-member', owner).send({ accountType: 'INDIVIDUAL', tier: 'ELITE', months: 2 }).expect(201);
    expect(response.body).toMatchObject({ sessionsPerMonth: 7, totalSessionsPerPerson: 14 });
    const { membership } = await purchase('INDIVIDUAL', { months: 2 });
    const active = await activate(membership.id);
    expect(active.balances).toHaveLength(2);
    expect(active.balances.every(b => b.included === 7)).toBe(true);
  });
  it('fails closed without a current catalog while preserving existing membership reads', async () => {
    const { membership } = await purchase();
    await prisma.membershipCatalogCurrent.delete({ where: { id: 'current' } });
    await request(app.getHttpServer()).get('/api/memberships/catalog').expect(503);
    await expect(service.quote({ accountType: 'INDIVIDUAL', tier: 'CORE', months: 1 })).rejects.toMatchObject({ response: { error: { code: 'CATALOG_UNAVAILABLE' } } });
    expect((await service.get(owner, membership.id)).program.id).toBe('sleep-reset');
    expect((await activate(membership.id)).status).toBe('ACTIVE');
  });
  it.each(['catalog', 'plan', 'program', 'protocol', 'step', 'therapy', 'link', 'insert', 'delete'] as const)('rejects edits to published %s records at the database boundary', async kind => {
    const version = originalCatalogVersion;
    const where = { catalogVersion: version };
    const operations = {
      catalog: () => prisma.membershipCatalog.update({ where: { version }, data: { firstCreditSessions: 1 } }),
      plan: () => prisma.catalogPlan.updateMany({ where, data: { amountPaise: 1 } }),
      program: () => prisma.catalogProgram.updateMany({ where, data: { name: 'Edited' } }),
      protocol: () => prisma.catalogProtocol.updateMany({ where, data: { description: 'Edited' } }),
      step: () => prisma.catalogProtocolStep.updateMany({ where, data: { minutes: 1 } }),
      therapy: () => prisma.catalogTherapy.updateMany({ where, data: { name: 'Edited' } }),
      link: () => prisma.catalogStepTherapy.deleteMany({ where }),
      insert: () => prisma.catalogTherapy.create({ data: { catalogVersion: version, therapyId: 'injected', name: 'Injected' } }),
      delete: () => prisma.membershipCatalog.delete({ where: { version } }),
    };
    await expect(operations[kind]()).rejects.toThrow('Published catalog is immutable');
    expect((await service.catalog()).version).toBe(version);
  });
  it.each(['incomplete matrix', 'missing protocol', 'wrong duration', 'missing therapy', 'reused credit key'] as const)('refuses to publish a draft with %s and keeps the current catalog unchanged', async problem => {
    const version = await catalogDraft();
    if (problem === 'incomplete matrix') await prisma.catalogPlan.deleteMany({ where: { catalogVersion: version, accountType: 'INDIVIDUAL', tier: 'ELITE', months: 1 } });
    if (problem === 'missing protocol') {
      const where = { catalogVersion: version, programId: 'sleep-reset', protocolKey: 'A' };
      await prisma.catalogStepTherapy.deleteMany({ where });
      await prisma.catalogProtocolStep.deleteMany({ where });
      await prisma.catalogProtocol.deleteMany({ where: { catalogVersion: version, programId: 'sleep-reset', key: 'A' } });
    }
    if (problem === 'wrong duration') await prisma.catalogProtocolStep.updateMany({ where: { catalogVersion: version, minutes: 20 }, data: { minutes: 21 } });
    if (problem === 'missing therapy') await prisma.catalogStepTherapy.deleteMany({ where: { catalogVersion: version } });
    if (problem === 'reused credit key') await prisma.catalogProgram.updateMany({ where: { catalogVersion: version, programId: 'sleep-reset' }, data: { creditEverySessions: 1 } });
    const messages = {
      'incomplete matrix': 'Catalog plans must cover', 'missing protocol': 'Each program requires',
      'wrong duration': 'Protocol step durations', 'missing therapy': 'Every protocol step requires',
      'reused credit key': 'Changed credit rules require',
    };
    await expect(publishCatalog(version)).rejects.toThrow(messages[problem]);
    expect((await service.catalog()).version).toBe(originalCatalogVersion);
    expect((await prisma.membershipCatalog.findUniqueOrThrow({ where: { version } })).status).toBe('DRAFT');
  });
});

describe('complete plan activation matrix', () => {
  const plans = ACCOUNT_TYPES.flatMap(accountType => TIERS.flatMap(tier => MONTHS.map(months => ({ accountType, tier, months }))));
  it.each(plans)('activates $accountType $tier for $months months through HTTP', async ({ accountType, tier, months }) => {
    const a = await account(accountType);
    const input = { accountId: a.id, accountType, tier, months, programId: 'sleep-reset', catalogVersion: (await service.catalog()).version, idempotencyKey: randomUUID() };
    const created = await request(app.getHttpServer()).post('/api/memberships/purchases').set('x-test-member', owner).send(input).expect(201);
    expect(created.body).toMatchObject({ status: 'PENDING_PAYMENT', balances: [], startsAt: null, endsAt: null, recurring: null });
    const expected = await service.quote({ accountType, tier, months });
    receipts.set(created.body.id, { provider: 'test-provider', paymentId: randomUUID(), membershipId: created.body.id, amountPaise: expected.amountPaise, currency: 'INR' });
    const response = await request(app.getHttpServer()).post(`/api/memberships/${created.body.id}/payment-refresh`).set('x-test-member', owner).expect(201);
    const active = response.body;
    expect(active).toMatchObject({ status: 'ACTIVE', amountPaise: expected.amountPaise, currency: 'INR', sessionsPerMonth: ALLOWANCES[tier] });
    expect(active.endsAt).toBe(addCalendarMonths(new Date(active.startsAt), months).toISOString());
    expect(active.balances).toHaveLength(a.participants.length * months);
    for (const participant of a.participants) {
      const balances = active.balances.filter((balance: { participantId: string }) => balance.participantId === participant.id);
      expect(balances.map((balance: { included: number; used: number; monthIndex: number }) => [balance.monthIndex, balance.included, balance.used])).toEqual(Array.from({ length: months }, (_, index) => [index, ALLOWANCES[tier], 0]));
      expect(balances.filter((balance: { current: boolean }) => balance.current)).toHaveLength(1);
    }
    expect(active.account.participants.every((p: { creditBalance: number }) => p.creditBalance === 0)).toBe(true);
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: active.id } })).toBe(1);
  });
});

describe('payment failure and recovery', () => {
  it.each([
    ['wrong amount', { amountPaise: 1 }], ['wrong currency', { currency: 'USD' }],
    ['wrong purchase', { membershipId: 'another-purchase' }], ['missing provider', { provider: '' }],
    ['missing payment ID', { paymentId: '' }],
  ] as [string, Partial<VerifiedMembershipPayment>][])('rejects %s without allocating access', async (_label, patch) => {
    const { membership } = await purchase('COUPLE', { autoRenew: true });
    receipts.set(membership.id, { provider: 'test-provider', paymentId: randomUUID(), membershipId: membership.id, amountPaise: membership.amountPaise, currency: 'INR', mandateId: randomUUID(), ...patch });
    const response = await request(app.getHttpServer()).post(`/api/memberships/${membership.id}/payment-refresh`).set('x-test-member', owner).expect(409);
    expect(response.body.error.code).toBe('PAYMENT_MISMATCH');
    expect(await service.get(owner, membership.id)).toMatchObject({ status: 'PENDING_PAYMENT', startsAt: null, endsAt: null, balances: [], recurring: { status: 'PENDING_SETUP' } });
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: membership.id } })).toBe(0);
  });
  it('returns 503 with the production gateway and leaves the purchase pending', async () => {
    const { membership } = await purchase();
    jest.spyOn(gateway, 'verify').mockImplementation(m => new MembershipPaymentGateway().verify(m as never, { autoRenew: false }));
    const response = await request(app.getHttpServer()).post(`/api/memberships/${membership.id}/payment-refresh`).set('x-test-member', owner).expect(503);
    expect(response.body.error.code).toBe('PAYMENTS_UNAVAILABLE');
    expect(await service.get(owner, membership.id)).toMatchObject({ status: 'PENDING_PAYMENT', balances: [] });
  });
  it('recovers from provider timeout and declined/unsettled payment on the same purchase', async () => {
    const { membership, input } = await purchase();
    const verify = jest.spyOn(gateway, 'verify').mockRejectedValueOnce(new Error('Provider timeout')).mockResolvedValueOnce(null);
    await request(app.getHttpServer()).post(`/api/memberships/${membership.id}/payment-refresh`).set('x-test-member', owner).expect(500);
    expect(await service.get(owner, membership.id)).toMatchObject({ status: 'PENDING_PAYMENT', balances: [] });
    expect((await service.refreshPayment(owner, membership.id)).status).toBe('PENDING_PAYMENT');
    expect((await service.purchase(owner, input)).id).toBe(membership.id);
    const active = await activate(membership.id);
    expect(active.status).toBe('ACTIVE');
    expect(verify).toHaveBeenCalledTimes(3);
    expect((await service.refreshPayment(owner, membership.id)).startsAt).toEqual(active.startsAt);
    expect(verify).toHaveBeenCalledTimes(3);
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: membership.id } })).toBe(1);
  });
  it('withdraws pending purchases idempotently and permits a fresh purchase', async () => {
    const { membership, input } = await purchase('INDIVIDUAL', { autoRenew: true });
    for (let i = 0; i < 2; i++) {
      expect(await service.cancel(owner, membership.id)).toMatchObject({ status: 'CANCELLED', balances: [], recurring: { status: 'CANCELLED' } });
    }
    const verify = jest.spyOn(gateway, 'verify');
    await expect(service.refreshPayment(owner, membership.id)).rejects.toMatchObject({ response: { error: { code: 'MEMBERSHIP_NOT_PENDING' } } });
    expect(verify).not.toHaveBeenCalled();
    expect((await service.purchase(owner, input)).status).toBe('CANCELLED');
    expect((await service.purchase(owner, { ...input, idempotencyKey: randomUUID() })).status).toBe('PENDING_PAYMENT');
  });
  it('blocks local withdrawal with an enabled provider and withdrawal of paid memberships', async () => {
    const { membership } = await purchase();
    gateway.available = true;
    await expect(service.cancel(owner, membership.id)).rejects.toMatchObject({ response: { error: { code: 'PROVIDER_CANCELLATION_REQUIRED' } } });
    gateway.available = false;
    await activate(membership.id);
    await expect(service.cancel(owner, membership.id)).rejects.toMatchObject({ response: { error: { code: 'MEMBERSHIP_NOT_PENDING' } } });
    expect((await service.get(owner, membership.id)).status).toBe('ACTIVE');
  });
  it('rejects a verified payment arriving after local withdrawal', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    jest.spyOn(gateway, 'verify').mockImplementationOnce(async () => {
      await service.cancel(owner, membership.id);
      return { provider: 'test-provider', paymentId: randomUUID(), membershipId: membership.id, amountPaise: membership.amountPaise, currency: 'INR' };
    });
    await expect(service.refreshPayment(owner, membership.id)).rejects.toMatchObject({ response: { error: { code: 'MEMBERSHIP_NOT_PENDING' } } });
    expect(await service.get(owner, membership.id)).toMatchObject({ status: 'CANCELLED', balances: [], recurring: { status: 'CANCELLED' } });
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: membership.id } })).toBe(0);
  });
});

describe('mandate verification and recurring failure recovery', () => {
  it('reconciles a delayed mandate only against the original payment without reallocating sessions', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    const paymentId = randomUUID();
    const active = await activate(membership.id, undefined, paymentId);
    gateway.available = true;
    await expect(activate(membership.id, randomUUID())).rejects.toMatchObject({ response: { error: { code: 'PAYMENT_MISMATCH' } } });
    const reconciled = await activate(membership.id, randomUUID(), paymentId);
    expect(reconciled.recurring).toMatchObject({ status: 'ACTIVE', cycle: 0, nextBillingAt: active.endsAt });
    expect(reconciled.balances).toEqual(active.balances);
    expect(reconciled.startsAt).toEqual(active.startsAt);
  });
  it('does not re-enable cancelled recurring consent when a late mandate arrives', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    await service.cancelRecurring(owner, membership.recurring!.id);
    const verify = jest.spyOn(gateway, 'verify');
    expect((await activate(membership.id, randomUUID())).recurring?.status).toBe('CANCELLED');
    expect(verify).toHaveBeenCalledWith(expect.anything(), { autoRenew: false });
  });
  it('does not charge before the renewal date or without a verified mandate', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    await service.processRenewal(membership.recurring!.id);
    await activate(membership.id, randomUUID());
    await service.processRenewal(membership.recurring!.id);
    expect(renewalCalls).toBe(0);
  });
  it.each([
    ['amount', { amountPaise: 1 }], ['currency', { currency: 'USD' }],
    ['cycle reference', { membershipId: 'wrong-cycle' }], ['provider', { provider: 'another-provider' }],
    ['mandate', { mandateId: 'another-mandate' }], ['payment ID', { paymentId: '' }],
  ] as [string, Partial<VerifiedMembershipPayment>][])('rejects renewal with incorrect %s', async (_label, patch) => {
    const { id, membership, reference, receipt } = await dueRenewal();
    renewals.set(reference, { ...receipt, ...patch });
    await expect(service.processRenewal(id)).rejects.toMatchObject({ response: { error: { code: 'PAYMENT_MISMATCH' } } });
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
    expect((await service.get(owner, membership.id)).status).toBe('EXPIRED');
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).cycle).toBe(0);
  });
  it('retries failed renewal with the same cycle reference and activates once', async () => {
    const { id, membership, reference, receipt } = await dueRenewal();
    const renew = jest.spyOn(gateway, 'renew').mockRejectedValueOnce(new Error('Provider timeout')).mockResolvedValueOnce(null).mockResolvedValueOnce(receipt);
    await expect(service.processRenewal(id)).rejects.toThrow('Provider timeout');
    await service.processRenewal(id);
    expect((await service.get(owner, membership.id)).status).toBe('EXPIRED');
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
    await service.processRenewal(id);
    await service.processRenewal(id);
    expect(renew.mock.calls.map(call => call[2])).toEqual([reference, reference, reference]);
    expect(await prisma.membership.count({ where: { renewalOfId: id, status: 'ACTIVE' } })).toBe(1);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).cycle).toBe(1);
  });
  it('rejects reuse of the initial payment for a renewal', async () => {
    const { id, membership, reference, receipt } = await dueRenewal();
    const initial = await prisma.membershipPaymentReceipt.findUniqueOrThrow({ where: { membershipId: membership.id } });
    renewals.set(reference, { ...receipt, paymentId: initial.paymentId });
    await expect(service.processRenewal(id)).rejects.toMatchObject({ response: { error: { code: 'PAYMENT_ALREADY_USED' } } });
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
  });
  it('rolls back a captured renewal if session allocation fails and recovers on retry', async () => {
    const { id, reference, receipt } = await dueRenewal();
    renewals.set(reference, receipt);
    await prisma.$executeRawUnsafe('ALTER TABLE membership_allowance ADD CONSTRAINT test_reject_renewal CHECK (included < 12) NOT VALID');
    try { await expect(service.processRenewal(id)).rejects.toBeDefined(); }
    finally { await prisma.$executeRawUnsafe('ALTER TABLE membership_allowance DROP CONSTRAINT test_reject_renewal'); }
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
    expect(await prisma.membershipPaymentReceipt.count({ where: { paymentId: receipt.paymentId } })).toBe(0);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).cycle).toBe(0);
    await service.processRenewal(id);
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(1);
  });
  it('keeps cancellation pending on provider failure and retries confirmation without renewing', async () => {
    const { id, membership } = await dueRenewal();
    const cancel = jest.spyOn(gateway, 'cancelRecurring').mockRejectedValueOnce(new Error('Provider timeout')).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(service.cancelRecurring(owner, id)).rejects.toThrow('Provider timeout');
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).status).toBe('CANCEL_REQUESTED');
    await service.processRenewal(id);
    expect(renewalCalls).toBe(0);
    expect(await service.cancelRecurring(owner, id)).toMatchObject({ status: 'CANCEL_REQUESTED' });
    expect(await service.cancelRecurring(owner, id)).toMatchObject({ status: 'CANCELLED', nextBillingAt: null });
    await service.cancelRecurring(owner, id);
    expect(cancel).toHaveBeenCalledTimes(3);
    expect((await service.get(owner, membership.id)).status).toBe('EXPIRED');
  });
  it('requires reconciliation when cancellation wins a race against a captured renewal', async () => {
    const { id, receipt } = await dueRenewal();
    jest.spyOn(gateway, 'renew').mockImplementationOnce(async () => {
      await service.cancelRecurring(owner, id);
      return receipt;
    });
    await expect(service.processRenewal(id)).rejects.toMatchObject({ response: { error: { code: 'RENEWAL_RECONCILIATION_REQUIRED' } } });
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).status).toBe('CANCELLED');
  });
});

describe('membership HTTP security and ownership', () => {
  it('allows catalog browsing but requires an onboarded session for member resources', async () => {
    await request(app.getHttpServer()).get('/api/memberships/catalog').expect(200);
    for (const path of ['/api/memberships', '/api/memberships/accounts']) await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).post('/api/memberships/purchases').send({}).expect(401);
    await request(app.getHttpServer()).get('/api/memberships').set('x-test-member', 'incomplete').expect(403);
    await request(app.getHttpServer()).post('/api/memberships/quote').set('x-test-member', owner).set('Origin', 'https://evil.example').send({ accountType: 'INDIVIDUAL', tier: 'CORE', months: 1 }).expect(403);
  });
  it('validates prices, enums, duration and nested roster fields', async () => {
    const base = { accountType: 'INDIVIDUAL', tier: 'STARTER', months: 1 };
    for (const patch of [{ amountPaise: 1 }, { months: '1' }, { months: 2 }, { tier: 'FREE' }, { accountType: 'FAMILY' }, { paid: true }]) {
      await request(app.getHttpServer()).post('/api/memberships/quote').set('x-test-member', owner).send({ ...base, ...patch }).expect(400);
    }
    for (const participants of [[], [{ name: ' ' }], [{ name: 'Valid Name', role: 'admin' }], Array.from({ length: 5 }, () => ({ name: 'Valid Name' }))]) {
      await request(app.getHttpServer()).post('/api/memberships/accounts').set('x-test-member', owner).send({ name: 'Account', accountType: 'GROUP', creationKey: randomUUID(), participants }).expect(400);
    }
    await request(app.getHttpServer()).get('/api/memberships/not-a-uuid').set('x-test-member', owner).expect(400);
  });
  it('checks owner for purchase, detail, payment refresh, cancellation and recurring management', async () => {
    const { membership, input } = await purchase('COUPLE', { autoRenew: true });
    await request(app.getHttpServer()).post('/api/memberships/purchases').set('x-test-member', other).send({ ...input, idempotencyKey: randomUUID() }).expect(404);
    await request(app.getHttpServer()).get(`/api/memberships/${membership.id}`).set('x-test-member', other).expect(404);
    for (const operation of ['payment-refresh', 'cancel']) await request(app.getHttpServer()).post(`/api/memberships/${membership.id}/${operation}`).set('x-test-member', other).expect(404);
    await request(app.getHttpServer()).post(`/api/memberships/recurring/${membership.recurring!.id}/cancel`).set('x-test-member', other).expect(404);
    const result = await request(app.getHttpServer()).get(`/api/memberships/${membership.id}`).set('x-test-member', owner).expect(200).expect('Cache-Control', 'private, no-store');
    expect(JSON.stringify(result.body)).not.toMatch(/requestHash|idempotencyKey|mandateId|paymentId/);
  });
  it('rejects frontend activation fields and coercion of recurring consent', async () => {
    const { membership, input } = await purchase();
    await request(app.getHttpServer()).post(`/api/memberships/${membership.id}/payment-refresh`).set('x-test-member', owner).send({ paid: true, paymentId: 'fake' }).expect(400);
    await request(app.getHttpServer()).post('/api/memberships/purchases').set('x-test-member', owner).send({ ...input, autoRenew: 'true' }).expect(400);
    await request(app.getHttpServer()).post('/api/memberships/purchases').set('x-test-member', owner).send({ ...input, status: 'ACTIVE' }).expect(400);
    expect((await service.get(owner, membership.id)).status).toBe('PENDING_PAYMENT');
  });
});

describe('purchase and activation concurrency', () => {
  it.each(['INDIVIDUAL', 'COUPLE', 'GROUP'] as const)('supports %s with independent participant allowances', async type => {
    const { membership, account: a } = await purchase(type, { months: 3 });
    expect(membership.status).toBe('PENDING_PAYMENT'); expect(membership.balances).toHaveLength(0);
    const active = await activate(membership.id);
    expect(active.status).toBe('ACTIVE'); expect(active.balances).toHaveLength(a.participants.length * 3);
    expect(active.balances.every(b => b.included === 12 && b.used === 0)).toBe(true);
    expect(new Set(active.balances.map(b => b.participantId)).size).toBe(a.participants.length);
  });
  it('deduplicates simultaneous account creation and purchase requests', async () => {
    const create = { accountType: 'INDIVIDUAL' as const, name: 'Concurrent account', creationKey: randomUUID(), participants: [{ name: 'Test Person' }] };
    const accounts = await Promise.all([service.createAccount(owner, create), service.createAccount(owner, create)]);
    expect(accounts[0].id).toBe(accounts[1].id);
    const input: PurchaseMembershipDto = { accountId: accounts[0].id, accountType: 'INDIVIDUAL', tier: 'CORE', months: 1, programId: 'sleep-reset', catalogVersion: (await service.catalog()).version, idempotencyKey: randomUUID(), autoRenew: false };
    const results = await Promise.all(Array.from({ length: 3 }, () => service.purchase(owner, input)));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
    await expect(service.purchase(owner, { ...input, months: 3 })).rejects.toMatchObject({ response: { error: { code: 'IDEMPOTENCY_CONFLICT' } } });
  });
  it('rejects two different concurrent purchases for one member account', async () => {
    const a = await account();
    const input: PurchaseMembershipDto = { accountId: a.id, accountType: 'INDIVIDUAL', tier: 'CORE', months: 1, programId: 'sleep-reset', catalogVersion: (await service.catalog()).version, idempotencyKey: randomUUID(), autoRenew: false };
    const results = await Promise.allSettled([service.purchase(owner, input), service.purchase(owner, { ...input, idempotencyKey: randomUUID() })]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.membership.count({ where: { accountId: a.id } })).toBe(1);
  });
  it('rejects stale catalogs and program/type tampering', async () => {
    const { input } = await purchase();
    for (const patch of [{ catalogVersion: 'stale' }, { programId: 'made-up' }, { accountType: 'GROUP' as const }]) await expect(service.purchase(owner, { ...input, ...patch, idempotencyKey: randomUUID() })).rejects.toBeDefined();
  });
  it('never activates a missing, failed or mismatched payment', async () => {
    const { membership } = await purchase();
    expect((await service.refreshPayment(owner, membership.id)).status).toBe('PENDING_PAYMENT');
    receipts.set(membership.id, { provider: 'test-provider', paymentId: randomUUID(), membershipId: membership.id, amountPaise: 1, currency: 'INR' });
    await expect(service.refreshPayment(owner, membership.id)).rejects.toMatchObject({ response: { error: { code: 'PAYMENT_MISMATCH' } } });
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: membership.id } })).toBe(0);
    expect(await prisma.membershipAllowance.count({ where: { membershipId: membership.id } })).toBe(0);
    await expect(new MembershipPaymentGateway().verify({} as never, { autoRenew: false })).rejects.toMatchObject({ response: { error: { code: 'PAYMENTS_UNAVAILABLE' } } });
  });
  it('deduplicates payment callbacks and rejects receipt reuse across purchases', async () => {
    const first = await purchase('GROUP');
    const paymentId = randomUUID();
    receipts.set(first.membership.id, { provider: 'test-provider', paymentId, membershipId: first.membership.id, amountPaise: first.membership.amountPaise, currency: 'INR' });
    const results = await Promise.all(Array.from({ length: 3 }, () => service.refreshPayment(owner, first.membership.id)));
    expect(results.every(r => r.status === 'ACTIVE')).toBe(true);
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: first.membership.id } })).toBe(1);
    expect(await prisma.membershipAllowance.count({ where: { membershipId: first.membership.id } })).toBe(4);
    const second = await purchase('GROUP');
    await expect(activate(second.membership.id, undefined, paymentId)).rejects.toMatchObject({ response: { error: { code: 'PAYMENT_ALREADY_USED' } } });
    expect((await service.get(owner, second.membership.id)).status).toBe('PENDING_PAYMENT');
  });
  it('rolls back receipt and activation if allocation fails', async () => {
    const { membership } = await purchase();
    // Force a real constraint failure inside the transaction without mocking persistence.
    await prisma.$executeRawUnsafe('ALTER TABLE membership_allowance ADD CONSTRAINT test_reject_allocation CHECK (included < 12) NOT VALID');
    try { await expect(activate(membership.id)).rejects.toBeDefined(); }
    finally { await prisma.$executeRawUnsafe('ALTER TABLE membership_allowance DROP CONSTRAINT test_reject_allocation'); }
    expect((await service.get(owner, membership.id)).status).toBe('PENDING_PAYMENT');
    expect(await prisma.membershipPaymentReceipt.count({ where: { membershipId: membership.id } })).toBe(0);
  });
});

describe('participant attendance and credits', () => {
  it.each([
    ['blank booking', ' ', new Date('2025-01-01')],
    ['oversized booking', 'x'.repeat(121), new Date('2025-01-01')],
    ['invalid date', 'booking', new Date('invalid')],
    ['future date', 'booking', new Date('2999-01-01')],
  ] as const)('rejects %s before changing attendance', async (_label, bookingId, attendedAt) => {
    const { membership, account: a } = await purchase();
    await activate(membership.id);
    await expect(service.recordAttendance(membership.id, a.participants[0].id, bookingId, attendedAt)).rejects.toMatchObject({ response: { error: { code: 'INVALID_ATTENDANCE' } } });
    expect((await service.get(owner, membership.id)).balances[0].used).toBe(0);
  });
  it('rejects attendance on pending purchases and for another account participant', async () => {
    const { membership, account: a } = await purchase();
    await expect(service.recordAttendance(membership.id, a.participants[0].id, randomUUID(), new Date())).rejects.toMatchObject({ response: { error: { code: 'NO_ALLOWANCE' } } });
    await activate(membership.id);
    const foreign = await account();
    await expect(service.recordAttendance(membership.id, foreign.participants[0].id, randomUUID(), new Date())).rejects.toMatchObject({ response: { error: { code: 'NO_ALLOWANCE' } } });
    expect((await service.get(owner, membership.id)).balances[0].used).toBe(0);
  });
  it('uses half-open monthly periods without rollover and rejects changed booking replays', async () => {
    const { membership, account: a } = await purchase('INDIVIDUAL', { months: 3, tier: 'STARTER' });
    await activate(membership.id);
    const start = new Date('2025-01-31T09:30:00Z');
    await prisma.membership.update({ where: { id: membership.id }, data: { startsAt: start, endsAt: addCalendarMonths(start, 3) } });
    for (let monthIndex = 0; monthIndex < 3; monthIndex++) {
      await prisma.membershipAllowance.updateMany({ where: { membershipId: membership.id, monthIndex }, data: { startsAt: addCalendarMonths(start, monthIndex), endsAt: addCalendarMonths(start, monthIndex + 1) } });
    }
    const participantId = a.participants[0].id;
    const bookingId = randomUUID();
    await expect(service.recordAttendance(membership.id, participantId, randomUUID(), new Date(start.getTime() - 1))).rejects.toMatchObject({ response: { error: { code: 'NO_ALLOWANCE' } } });
    await service.recordAttendance(membership.id, participantId, bookingId, start);
    await expect(service.recordAttendance(membership.id, participantId, bookingId, new Date(start.getTime() + 1))).rejects.toMatchObject({ response: { error: { code: 'ATTENDANCE_CONFLICT' } } });
    await service.recordAttendance(membership.id, participantId, randomUUID(), addCalendarMonths(start, 1));
    await expect(service.recordAttendance(membership.id, participantId, randomUUID(), addCalendarMonths(start, 3))).rejects.toMatchObject({ response: { error: { code: 'NO_ALLOWANCE' } } });
    const result = await service.get(owner, membership.id);
    expect(result.status).toBe('EXPIRED');
    expect(result.balances.map(b => [b.used, b.remaining, b.current])).toEqual([[1, 3, false], [1, 3, false], [0, 4, false]]);
  });
  it('preserves credit progress across a fresh membership on the same account', async () => {
    const { membership, account: a, input } = await purchase();
    await activate(membership.id);
    const participantId = a.participants[0].id;
    for (let i = 0; i < 5; i++) await service.recordAttendance(membership.id, participantId, randomUUID(), new Date());
    await prisma.membership.update({ where: { id: membership.id }, data: { startsAt: new Date('2025-01-01'), endsAt: new Date('2025-02-01') } });
    const next = await service.purchase(owner, { ...input, idempotencyKey: randomUUID() });
    await activate(next.id);
    await service.recordAttendance(next.id, participantId, randomUUID(), new Date());
    const result = await service.get(owner, next.id);
    expect(result.account.participants[0]).toMatchObject({ attendedSessions: 6, creditBalance: 2 });
    expect(result.balances[0].used).toBe(1);
    expect((await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } })).status).toBe('EXPIRED');
  });
  it.each(Object.entries(CREDIT_SESSION_RATES))('applies first-four then %s protocol earning', async (programId, rate) => {
    const { membership, account: a } = await purchase('COUPLE', { programId });
    await activate(membership.id);
    const participant = a.participants[0].id;
    for (let i = 1; i <= 4 + rate; i++) {
      const at = new Date();
      const bookingId = randomUUID();
      await service.recordAttendance(membership.id, participant, bookingId, at);
      await service.recordAttendance(membership.id, participant, bookingId, at);
      expect(await prisma.memberCredit.count({ where: { participantId: participant } })).toBe(i < 4 ? 0 : i < 4 + rate ? 1 : 2);
    }
    const result = await service.get(owner, membership.id);
    expect(result.account.participants[0].creditBalance).toBe(2);
    expect(result.account.participants[1].creditBalance).toBe(0);
    expect(result.balances.find(b => b.participantId === a.participants[1].id)?.remaining).toBe(12);
    expect(result.account.participants[0].attendedSessions).toBe(4 + rate);
  });
  it('prevents concurrent over-spending and never debits another person', async () => {
    const { membership, account: a } = await purchase('COUPLE', { tier: 'STARTER' });
    await activate(membership.id);
    for (let i = 0; i < 3; i++) await service.recordAttendance(membership.id, a.participants[0].id, randomUUID(), new Date());
    const results = await Promise.allSettled([service.recordAttendance(membership.id, a.participants[0].id, randomUUID(), new Date()), service.recordAttendance(membership.id, a.participants[0].id, randomUUID(), new Date())]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const result = await service.get(owner, membership.id);
    expect(result.balances.find(b => b.participantId === a.participants[0].id)?.remaining).toBe(0);
    expect(result.balances.find(b => b.participantId === a.participants[1].id)?.remaining).toBe(4);
    expect(result.account.participants[0].creditBalance).toBe(1);
  });
  it('excludes expired credits and rolls back the entire attendance transaction when a credit award fails', async () => {
    const { membership, account: a } = await purchase();
    await activate(membership.id);
    const participantId = a.participants[0].id;
    for (let i = 0; i < 3; i++) await service.recordAttendance(membership.id, participantId, randomUUID(), new Date());
    await prisma.$executeRawUnsafe('ALTER TABLE member_credit ADD CONSTRAINT test_reject_credit CHECK (points < 1) NOT VALID');
    try { await expect(service.recordAttendance(membership.id, participantId, randomUUID(), new Date())).rejects.toBeDefined(); }
    finally { await prisma.$executeRawUnsafe('ALTER TABLE member_credit DROP CONSTRAINT test_reject_credit'); }
    expect((await service.get(owner, membership.id)).balances[0].used).toBe(3);
    expect((await prisma.memberParticipant.findUniqueOrThrow({ where: { id: participantId } })).attendedSessions).toBe(3);
    await service.recordAttendance(membership.id, participantId, randomUUID(), new Date());
    const credit = await prisma.memberCredit.findFirstOrThrow({ where: { participantId } });
    expect(credit.expiresAt.getUTCFullYear()).toBe(credit.earnedAt.getUTCFullYear() + 1);
    await prisma.memberCredit.update({ where: { id: credit.id }, data: { expiresAt: new Date('2025-01-01') } });
    expect((await service.get(owner, membership.id)).account.participants[0].creditBalance).toBe(0);
  });
});

describe('recurring consent and renewal safety', () => {
  it('does no background work while the production gateway is unavailable', async () => {
    await dueRenewal();
    const worker = new MembershipRecurringWorker(prisma, service, gateway);
    await worker.tick();
    expect(renewalCalls).toBe(0);
  });
  it('continues other renewals after a provider failure and delays the failed retry', async () => {
    const failed = await dueRenewal();
    const successful = await dueRenewal();
    const renew = jest.spyOn(gateway, 'renew').mockImplementation(async (_subscription, _membership, reference) => {
      if (reference === failed.reference) throw new Error('Provider timeout');
      return reference === successful.reference ? successful.receipt : null;
    });
    gateway.available = true;
    const worker = new MembershipRecurringWorker(prisma, service, gateway);
    await worker.tick();
    expect(renew).toHaveBeenCalledTimes(2);
    expect(await prisma.membership.count({ where: { renewalOfId: failed.id } })).toBe(0);
    expect(await prisma.membership.count({ where: { renewalOfId: successful.id, status: 'ACTIVE' } })).toBe(1);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id: failed.id } })).nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());
    await worker.tick();
    expect(renew).toHaveBeenCalledTimes(2);
  });
  it('retries provider cancellation in the worker without attempting another charge', async () => {
    const { id } = await dueRenewal();
    const cancel = jest.spyOn(gateway, 'cancelRecurring').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await service.cancelRecurring(owner, id);
    gateway.available = true;
    const worker = new MembershipRecurringWorker(prisma, service, gateway);
    await worker.tick();
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).status).toBe('CANCELLED');
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(renewalCalls).toBe(0);
  });
  it('pauses for fresh consent when the included allowance changes', async () => {
    const { id, membership } = await dueRenewal();
    await prisma.membership.update({ where: { id: membership.id }, data: { sessionsPerMonth: 8 } });
    await service.processRenewal(id);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).status).toBe('PRICE_REVIEW');
    expect(renewalCalls).toBe(0);
  });
  it('keeps opt-in pending until a mandate is verified and supports stopping pending recurrence', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    expect(membership.recurring?.status).toBe('PENDING_SETUP');
    const active = await activate(membership.id);
    expect(active.recurring?.status).toBe('PENDING_SETUP');
    expect((await service.cancelRecurring(owner, membership.recurring!.id))?.status).toBe('CANCELLED');
    expect((await service.get(owner, membership.id)).status).toBe('ACTIVE');
  });
  it('does not infer recurring consent from an unsolicited mandate', async () => {
    const { membership } = await purchase();
    expect((await activate(membership.id, randomUUID())).recurring).toBeNull();
  });
  it('deduplicates concurrent paid renewal cycles and carries the roster and program', async () => {
    const { membership } = await purchase('GROUP', { autoRenew: true });
    const mandate = randomUUID();
    const active = await activate(membership.id, mandate);
    const recurring = active.recurring!;
    const pastStart = new Date('2025-01-01'); const pastEnd = new Date('2025-02-01');
    await prisma.membership.update({ where: { id: membership.id }, data: { startsAt: pastStart, endsAt: pastEnd } });
    await prisma.membershipRecurring.update({ where: { id: recurring.id }, data: { nextBillingAt: pastEnd } });
    const reference = `renewal:${recurring.id}:1`;
    renewals.set(reference, { provider: 'test-provider', paymentId: randomUUID(), membershipId: reference, amountPaise: membership.amountPaise, currency: 'INR', mandateId: mandate });
    await Promise.all([service.processRenewal(recurring.id), service.processRenewal(recurring.id)]);
    const renewed = await prisma.membership.findMany({ where: { renewalOfId: recurring.id } });
    expect(renewed).toHaveLength(1); expect(renewed[0].programId).toBe('sleep-reset');
    expect(await prisma.membershipAllowance.count({ where: { membershipId: renewed[0].id } })).toBe(4);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id: recurring.id } })).cycle).toBe(1);
  });
  it('leaves unpaid renewals expired and stops charging when cancelled', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    const active = await activate(membership.id, randomUUID());
    const id = active.recurring!.id;
    await prisma.membership.update({ where: { id: membership.id }, data: { startsAt: new Date('2025-01-01'), endsAt: new Date('2025-02-01') } });
    await prisma.membershipRecurring.update({ where: { id }, data: { nextBillingAt: new Date('2025-02-01') } });
    await service.processRenewal(id);
    expect((await service.get(owner, membership.id)).status).toBe('EXPIRED');
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
    await service.cancelRecurring(owner, id);
    await service.processRenewal(id);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).status).toBe('CANCELLED');
  });
  it('pauses renewal before charging when the approved amount differs from current pricing', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    const active = await activate(membership.id, randomUUID());
    const id = active.recurring!.id;
    await prisma.membership.update({ where: { id: membership.id }, data: { amountPaise: membership.amountPaise - 100, startsAt: new Date('2025-01-01'), endsAt: new Date('2025-02-01') } });
    await prisma.membershipRecurring.update({ where: { id }, data: { nextBillingAt: new Date('2025-02-01') } });
    await service.processRenewal(id);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).status).toBe('PRICE_REVIEW');
    expect(await prisma.membership.count({ where: { renewalOfId: id } })).toBe(0);
  });
  it('leases due work across workers and delays retries without extending an unpaid term', async () => {
    const { membership } = await purchase('INDIVIDUAL', { autoRenew: true });
    const active = await activate(membership.id, randomUUID());
    const id = active.recurring!.id;
    await prisma.membership.update({ where: { id: membership.id }, data: { startsAt: new Date('2025-01-01'), endsAt: new Date('2025-02-01') } });
    await prisma.membershipRecurring.update({ where: { id }, data: { nextBillingAt: new Date('2025-02-01') } });
    gateway.available = true;
    const first = new MembershipRecurringWorker(prisma, service, gateway);
    const second = new MembershipRecurringWorker(prisma, service, gateway);
    await Promise.all([first.tick(), second.tick()]);
    expect(renewalCalls).toBe(1);
    expect((await prisma.membershipRecurring.findUniqueOrThrow({ where: { id } })).nextAttemptAt!.getTime()).toBeGreaterThan(Date.now());
    await first.tick();
    expect(renewalCalls).toBe(1);
    expect((await service.get(owner, membership.id)).status).toBe('EXPIRED');
  });
});

describe('database catalog matches the original business terms', () => {
  it('contains exactly 36 price combinations and ten shared programs', async () => {
    const catalog = await service.catalog();
    expect(catalog.plans).toHaveLength(36);
    expect(catalog.programs).toHaveLength(10);
    expect(catalog.programs).toEqual(PROGRAMS.map(program => expect.objectContaining(program)));
    expect(catalog.therapies).toHaveLength(24);
    for (const program of catalog.programs) {
      expect(program.protocols).toHaveLength(2);
      for (const protocol of program.protocols) {
        expect(protocol.steps.reduce((minutes, step) => minutes + (step.minutes ?? 0), 0)).toBe(program.sessionMinutes);
        expect(protocol.steps.every(step => step.therapies.length > 0)).toBe(true);
      }
    }
    expect(catalog.groupMaximum).toBe(4);
    expect(catalog.paymentAvailable).toBe(false);
    expect(new Set(catalog.plans.map(p => `${p.accountType}:${p.tier}:${p.months}`)).size).toBe(36);
    expect(catalog.plans.every(p => Number.isSafeInteger(p.amountPaise) && p.allowanceScope === 'PER_PERSON')).toBe(true);
  });
  it.each([
    ['INDIVIDUAL', 'STARTER', [8999, 22999, 43999, 81999]],
    ['INDIVIDUAL', 'CORE', [11999, 32999, 61999, 114999]],
    ['INDIVIDUAL', 'ELITE', [14999, 40999, 76999, 143999]],
    ['COUPLE', 'STARTER', [16999, 45999, 85999, 162999]],
    ['COUPLE', 'CORE', [21999, 59999, 112999, 211999]],
    ['COUPLE', 'ELITE', [27999, 75999, 142999, 268999]],
    ['GROUP', 'STARTER', [31999, 85999, 162999, 306999]],
    ['GROUP', 'CORE', [39999, 107999, 203999, 383999]],
    ['GROUP', 'ELITE', [50999, 136999, 259999, 488999]],
  ])('matches the PDF price row for %s %s', async (accountType, tier, prices) => {
    expect((await service.catalog()).plans.filter(p => p.accountType === accountType && p.tier === tier).map(p => p.amountPaise)).toEqual((prices as number[]).map(p => p * 100));
  });
  it('calculates each person’s monthly and term allowances on the server', async () => {
    expect(await service.quote({ accountType: 'GROUP', tier: 'ELITE', months: 12 })).toMatchObject({ sessionsPerMonth: 12, totalSessionsPerPerson: 144, amountPaise: 48899900 });
    expect(await service.quote({ accountType: 'COUPLE', tier: 'CORE', months: 6 })).toMatchObject({ sessionsPerMonth: 8, totalSessionsPerPerson: 48 });
  });
});
