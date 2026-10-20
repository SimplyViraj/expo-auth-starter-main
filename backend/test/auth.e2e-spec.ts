import { PhoneError } from '../src/modules/phone/phone-error.js';
import { TwilioVerifyProvider } from '../src/modules/identity/providers/twilio-verify.provider.js';
import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { appIdentity } from '../src/config/configuration.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { EmailProvider, type OtpEmail } from '../src/modules/identity/providers/email.provider.js';

const password = 'a secure password used only in tests';
const runId = 'nest-' + randomUUID();
const deliveries: OtpEmail[] = [];
let app: INestApplication;
let prisma: PrismaService;
let counter = 0;
let phoneCounter = Math.floor(Math.random() * 8000000);
const sms = new Map<string, { phoneNumber: string; approved: boolean }>();
const sentPhones: string[] = [];
let failSms = false;
let allowRepeatedApproval = false;
function phoneNumber() { return '+1555' + (++phoneCounter).toString().padStart(7, '0'); }
async function linkPhone(agent: Agent, number = phoneNumber()) {
  const challenge = await agent.post('/api/auth/phone/send-code').send({ phoneNumber: number, purpose: 'verify' }).expect(200);
  await agent.post('/api/auth/phone/verify').send({ challengeId: challenge.body.challengeId, code: '123456' }).expect(200);
  return number;
}
type Agent = ReturnType<typeof request.agent>;

function address() { return runId + '-' + (++counter) + '@example.com'; }
function code(email: string, type: OtpEmail['type']) {
  const message = deliveries.findLast((item) => item.email === email && item.type === type);
  expect(message).toBeDefined();
  return message!.otp;
}
async function register(agent: Agent, email = address()) {
  await agent.post('/api/auth/sign-up/email').send({ name: 'Test User', email, password }).expect(200);
  return email;
}
async function verified(withPhone = true) {
  const agent = request.agent(app.getHttpServer());
  const email = await register(agent);
  await agent.post('/api/auth/email-otp/verify-email').send({ email, otp: code(email, 'email-verification') }).expect(200);
  if (withPhone) await linkPhone(agent);
  return { agent, email };
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailProvider).useValue({ sendOtp: async (message: OtpEmail) => { deliveries.push(message); } })
    .overrideProvider(TwilioVerifyProvider).useValue({
      send: async (phoneNumber: string) => {
        if (failSms) throw new PhoneError(503, 'PHONE_DELIVERY_FAILED', 'The verification service is unavailable. Please try again later.');
        const sid = 'VE' + randomUUID().replace(/-/g, '');
        sms.set(sid, { phoneNumber, approved: false }); sentPhones.push(phoneNumber); return sid;
      },
      check: async (sid: string, code: string) => {
        const entry = sms.get(sid);
        if (!entry || (!allowRepeatedApproval && entry.approved) || code !== '123456') return false;
        entry.approved = true; return true;
      },
    })
    .compile();
  app = module.createNestApplication({ bodyParser: false, logger: false });
  await configureApp(app);
  await app.init();
  prisma = app.get(PrismaService);
});
beforeEach(async () => {
  // This database is explicitly required to be disposable by environment.cjs.
  await prisma.rateLimit.deleteMany();
  await prisma.phoneChallenge.deleteMany();
  failSms = false;
  allowRepeatedApproval = false;
});
afterAll(async () => {
  if (prisma) {
    await prisma.user.deleteMany({ where: { email: { startsWith: runId } } });
    await prisma.verification.deleteMany({ where: { identifier: { contains: runId } } });
    await prisma.rateLimit.deleteMany();
  }
  if (app) await app.close();
});

describe('foundation and API contracts', () => {
  it('checks real PostgreSQL readiness and denies anonymous private requests', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
    await request(app.getHttpServer()).get('/api/demo/public').expect(200).expect('Cache-Control', 'public, max-age=60');
    await request(app.getHttpServer()).get('/api/demo/protected').expect(401).expect({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } });
    await request(app.getHttpServer()).patch('/api/onboarding').send({ username: 'river' }).expect(401);
    await request(app.getHttpServer()).get('/api/sessions').expect(401);
  });
  it('publishes application and real auth schemas in Swagger', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    expect(response.body.paths['/api/onboarding'].patch.requestBody).toBeDefined();
    expect(response.body.paths['/api/auth/sign-up/email'].post.requestBody).toBeDefined();
    expect(response.body.paths['/api/sessions/{id}'].delete).toBeDefined();
    expect(response.body.paths['/api/auth/phone/send-code'].post.requestBody).toBeDefined();
    expect(response.body.paths['/api/auth/phone/verify'].post.requestBody).toBeDefined();
    expect(response.body.paths['/api/auth/phone/sign-in'].post.requestBody).toBeDefined();
  });
  it('returns safe structured errors for malformed JSON', async () => {
    const { agent } = await verified();
    const response = await agent.patch('/api/onboarding').set('Content-Type', 'application/json').send('{"username":').expect(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
    expect(response.headers['cache-control']).toContain('no-store');
  });
  it('allows only configured credentialed browser CORS', async () => {
    const allowed = await request(app.getHttpServer()).options('/api/onboarding').set('Origin', 'http://localhost:8081').set('Access-Control-Request-Method', 'PATCH').expect(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app.getHttpServer()).options('/api/onboarding').set('Origin', 'https://untrusted.example').set('Access-Control-Request-Method', 'PATCH');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('email authentication lifecycle', () => {
  it('validates registration, hashes passwords/OTPs, verifies email, and signs out', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-up/email').send({ name: 'User', email: address(), password: 'short' }).expect(400);
    await agent.post('/api/auth/sign-up/email').send({ name: 'User', email: 'invalid', password }).expect(400);
    const email = await register(agent);
    const otp = code(email, 'email-verification');
    expect(otp).toMatch(/^\d{6}$/);
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, include: { accounts: true } });
    expect(user.emailVerified).toBe(false);
    expect(user.accounts[0].password).not.toBe(password);
    const verification = await prisma.verification.findFirst({ where: { identifier: { contains: email } } });
    expect(verification?.value).not.toContain(otp);
    await agent.get('/api/auth/get-session').expect(200).expect('null');
    await agent.post('/api/auth/sign-in/email').send({ email, password }).expect(403);
    const latestOtp = code(email, 'email-verification');
    await agent.post('/api/auth/email-otp/verify-email').send({ email, otp: latestOtp }).expect(200);
    expect((await agent.get('/api/auth/get-session')).body.user.emailVerified).toBe(true);
    await agent.post('/api/auth/email-otp/verify-email').send({ email, otp: latestOtp }).expect(400);
    await agent.post('/api/auth/sign-out').send({}).expect(200);
    await agent.get('/api/demo/protected').expect(401);
  });
  it('rejects wrong/expired verification codes and caps attempts', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = await register(agent);
    const otp = code(email, 'email-verification');
    const incorrect = otp === '000000' ? '111111' : '000000';
    for (let attempt = 0; attempt < 3; attempt++) {
      await agent.post('/api/auth/email-otp/verify-email').send({ email, otp: incorrect }).expect(400);
    }
    await prisma.rateLimit.deleteMany(); // Isolate per-code attempts from per-IP throttling.
    await agent.post('/api/auth/email-otp/verify-email').send({ email, otp }).expect(403);
    const other = await register(agent);
    await prisma.verification.updateMany({ where: { identifier: { contains: other } }, data: { expiresAt: new Date(0) } });
    await agent.post('/api/auth/email-otp/verify-email').send({ email: other, otp: code(other, 'email-verification') }).expect(400);
  });
  it('uses database-backed rate limiting with a retry header', async () => {
    const agent = request.agent(app.getHttpServer());
    for (let i = 0; i < 3; i++) await agent.post('/api/auth/email-otp/send-verification-otp').send({ email: address(), type: 'email-verification' }).expect(200);
    const response = await agent.post('/api/auth/email-otp/send-verification-otp').send({ email: address(), type: 'email-verification' }).expect(429);
    expect(Number(response.headers['x-retry-after'])).toBeGreaterThan(0);
    expect(await prisma.rateLimit.count()).toBeGreaterThan(0);
  });
  it('recovers passwords without account enumeration and revokes prior sessions', async () => {
    const { agent, email } = await verified();
    const unknown = address();
    const knownResponse = await agent.post('/api/auth/email-otp/request-password-reset').send({ email }).expect(200);
    const unknownResponse = await agent.post('/api/auth/email-otp/request-password-reset').send({ email: unknown }).expect(200);
    expect(knownResponse.body).toEqual(unknownResponse.body);
    expect(deliveries.some((message) => message.email === unknown)).toBe(false);
    const newPassword = 'a different secure password for testing';
    await agent.post('/api/auth/email-otp/reset-password').send({ email, otp: code(email, 'forget-password'), password: newPassword }).expect(200);
    await agent.get('/api/sessions').expect(401);
    await agent.post('/api/auth/sign-in/email').send({ email, password }).expect(401);
    await agent.post('/api/auth/sign-in/email').send({ email, password: newPassword }).expect(200);
    await agent.get('/api/sessions').expect(200);
  });
  it('rejects client attempts to set protected profile fields during registration', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = address();
    await agent.post('/api/auth/sign-up/email').send({
      name: 'Test User', email, password,
      phoneNumber: '+14155552671', phoneNumberVerified: true, phoneNumberVerifiedAt: new Date().toISOString(),
      username: 'claimed_by_client', onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
    }).expect(400);
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });
  it('accepts the existing native cookie and expo-origin protocol', async () => {
    const { email } = await verified();
    const response = await request(app.getHttpServer()).post('/api/auth/sign-in/email')
      .set('expo-origin', appIdentity.scheme + '://')
      .send({ email, password }).expect(200);
    const headers = response.headers['set-cookie'] as unknown as string[];
    expect(headers.some((cookie) => cookie.includes('better-auth.session_token=') && cookie.includes('HttpOnly'))).toBe(true);
    const cookie = headers.map((value) => value.split(';')[0]).join('; ');
    await request(app.getHttpServer()).get('/api/sessions').set('Cookie', cookie).expect(200);
    await request(app.getHttpServer()).patch('/api/onboarding')
      .set('Cookie', cookie).set('expo-origin', appIdentity.scheme + '://')
      .send({ username: 'native_' + randomUUID().slice(0, 8) }).expect(200);
    await request(app.getHttpServer()).patch('/api/onboarding')
      .set('Cookie', cookie).set('expo-origin', 'untrusted://')
      .send({ username: 'native_other' }).expect(403);
  });
  it('denies untrusted auth origins', async () => {
    await request(app.getHttpServer()).post('/api/auth/sign-in/email').set('Origin', 'https://untrusted.example').send({ email: address(), password }).expect(403);
  });
});

describe('onboarding and resource authorization', () => {
  it('normalizes usernames and unlocks the existing protected response', async () => {
    const { agent } = await verified();
    await agent.get('/api/demo/protected').expect(403);
    const response = await agent.patch('/api/onboarding').send({ username: '  River_42  ' }).expect(200);
    expect(response.body.user).toMatchObject({ username: 'river_42', onboardingCompleted: true });
    expect(new Date(response.body.user.onboardingCompletedAt).getTime()).toBeGreaterThan(0);
    const session = await agent.get('/api/auth/get-session');
    expect(session.body.user.username).toBe('river_42');
    const protectedResponse = await agent.get('/api/demo/protected').expect(200);
    expect(protectedResponse.body.workspace.title).toBe('Top secret unlocked');
    expect(protectedResponse.headers['cache-control']).toBe('private, no-store');
  });
  it('rejects invalid DTOs, privilege fields, and untrusted mutation origins', async () => {
    const { agent } = await verified();
    for (const input of [{ username: 'ab' }, { username: '1invalid' }, { username: 42 }, { username: 'ok_name', onboardingCompleted: true }, null]) {
      await agent.patch('/api/onboarding').send(input ?? {}).expect(400);
    }
    await agent.patch('/api/onboarding').set('Origin', 'https://untrusted.example').send({ username: 'valid_name' }).expect(403);
  });
  it('enforces unique usernames under concurrent requests', async () => {
    const a = await verified();
    const b = await verified();
    const username = 'race_' + randomUUID().replace(/-/g, '').slice(0, 12);
    const results = await Promise.all([
      a.agent.patch('/api/onboarding').send({ username }),
      b.agent.patch('/api/onboarding').send({ username: username.toUpperCase() }),
    ]);
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(results.find((response) => response.status === 409)?.body.error.code).toBe('USERNAME_TAKEN');
    const loser = results[0].status === 409 ? a.agent : b.agent;
    await loser.get('/api/demo/protected').expect(403);
  });
});

describe('owned sessions and deletion', () => {
  it('lists safe session metadata and prevents cross-user revocation', async () => {
    const a = await verified();
    const b = await verified();
    const list = await a.agent.get('/api/sessions').expect(200);
    expect(list.body.sessions).toHaveLength(1);
    expect(list.body.sessions[0]).toMatchObject({ current: true });
    expect(list.body.sessions[0]).not.toHaveProperty('token');
    expect(list.body.sessions[0]).not.toHaveProperty('userId');
    const sessionId = list.body.sessions[0].id;
    await b.agent.delete('/api/sessions/' + sessionId).expect(404);
    await a.agent.get('/api/sessions').expect(200);
    await a.agent.delete('/api/sessions/' + sessionId).expect(204);
    await a.agent.get('/api/sessions').expect(401);
  });
  it('rejects expired or forged cookies', async () => {
    const { agent, email } = await verified();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(0) } });
    await agent.get('/api/sessions').expect(401);
    await request(app.getHttpServer()).get('/api/sessions').set('Cookie', 'better-auth.session_token=forged').expect(401);
  });
  it('requires the password for credential deletion and cascades accounts/sessions', async () => {
    const { agent, email } = await verified();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await agent.post('/api/auth/delete-user').send({}).expect(400);
    await agent.post('/api/auth/delete-user').send({ password: 'wrong password' }).expect(400);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
    await agent.post('/api/auth/delete-user').send({ password }).expect(200);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(0);
    expect(await prisma.account.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    await agent.get('/api/sessions').expect(401);
  });
});

describe('member profile lifecycle', () => {
  it('protects the profile, persists edits, and exposes the changes in the session', async () => {
    await request(app.getHttpServer()).get('/api/profile').expect(401);
    await request(app.getHttpServer()).patch('/api/profile').send({ name: 'No Session' }).expect(401);
    const { agent, email } = await verified();
    await agent.get('/api/profile').expect(403);
    const username = 'member_' + randomUUID().replace(/-/g, '').slice(0, 12);
    await agent.patch('/api/onboarding').send({ username }).expect(200);
    const original = await agent.get('/api/profile').expect(200);
    expect(original.body.user).toMatchObject({ email, username, phoneNumberVerified: true });
    expect(original.body.user).not.toHaveProperty('accounts');
    const updated = await agent.patch('/api/profile').send({ name: '  AAyuva Member  ', username: username.toUpperCase() }).expect(200);
    expect(updated.body.user).toMatchObject({ name: 'AAyuva Member', username, email });
    expect((await agent.get('/api/profile')).body.user.name).toBe('AAyuva Member');
    expect((await agent.get('/api/auth/get-session')).body.user.name).toBe('AAyuva Member');
    const photo = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#163300' } }).png().toBuffer();
    const uploaded = await agent.patch('/api/profile/photo').send({ base64: photo.toString('base64') }).expect(200);
    expect(uploaded.body.user.image).toMatch(/^data:image\/jpeg;base64,/);
    expect((await agent.get('/api/profile')).body.user.image).toBe(uploaded.body.user.image);
    expect((await agent.get('/api/auth/get-session')).body.user.image).toBe(uploaded.body.user.image);
    await agent.post('/api/auth/update-user').send({ image: 'https://example.com/unvalidated.svg' }).expect(400);
    await agent.delete('/api/profile/photo').expect(200);
    expect((await agent.get('/api/profile')).body.user.image).toBeNull();
    await agent.post('/api/auth/sign-out').send({}).expect(200);
    await agent.get('/api/profile').expect(401);
    await agent.patch('/api/profile').send({ name: 'Signed Out' }).expect(401);
  });

  it('enforces database uniqueness during concurrent profile edits without changing contact details', async () => {
    const a = await verified(), b = await verified();
    const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
    await a.agent.patch('/api/onboarding').send({ username: 'a_' + suffix }).expect(200);
    await b.agent.patch('/api/onboarding').send({ username: 'b_' + suffix }).expect(200);
    const username = 'shared_' + suffix;
    const results = await Promise.all([
      a.agent.patch('/api/profile').send({ username }),
      b.agent.patch('/api/profile').send({ username: username.toUpperCase() }),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(results.find((result) => result.status === 409)?.body.error.code).toBe('USERNAME_TAKEN');
    const bProfile = await b.agent.get('/api/profile').expect(200);
    await a.agent.patch('/api/profile').send({ id: bProfile.body.user.id, name: 'Other Member' }).expect(400);
    await a.agent.patch('/api/profile').send({ email: b.email }).expect(400);
    await a.agent.patch('/api/profile').send({ phoneNumberVerified: true }).expect(400);
    expect((await b.agent.get('/api/profile')).body.user.email).toBe(b.email);
    expect((await a.agent.get('/api/profile')).body.user.email).toBe(a.email);
  });
});


describe('Twilio-backed phone onboarding and login', () => {
  it('requires verified phone ownership to complete onboarding, including previously completed accounts', async () => {
    const { agent, email } = await verified(false);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({ where: { id: user.id }, data: { onboardingCompleted: true } });
    await agent.get('/api/demo/protected').expect(403);
    const denied = await agent.patch('/api/onboarding').send({ username: 'phone_' + counter }).expect(403);
    expect(denied.body.error.code).toBe('PHONE_VERIFICATION_REQUIRED');
    const number = await linkPhone(agent);
    const session = await agent.get('/api/auth/get-session').expect(200);
    expect(session.body.user).toMatchObject({ phoneNumber: number, phoneNumberVerified: true });
    expect(session.body.user.phoneNumberVerifiedAt).toBeTruthy();
    await agent.patch('/api/onboarding').send({ username: 'phone_' + counter }).expect(200);
    await agent.get('/api/demo/protected').expect(200);
  });
  it('validates request contracts and rejects anonymous, stale-session and untrusted linking', async () => {
    const anonymous = request.agent(app.getHttpServer());
    await anonymous.post('/api/auth/phone/send-code').send({ phoneNumber: phoneNumber(), purpose: 'verify' }).expect(401);
    await anonymous.post('/api/auth/phone/send-code').send({ phoneNumber: '12345', purpose: 'sign-in' }).expect(400);
    await anonymous.post('/api/auth/phone/send-code').set('Origin', 'https://untrusted.example').send({ phoneNumber: phoneNumber(), purpose: 'sign-in' }).expect(403);
    const { agent, email } = await verified(false);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.session.updateMany({ where: { userId: user.id }, data: { createdAt: new Date(0) } });
    await agent.post('/api/auth/phone/send-code').send({ phoneNumber: phoneNumber(), purpose: 'verify' }).expect(403);
    await anonymous.post('/api/auth/phone/sign-in').send({ challengeId: randomUUID(), code: 'short' }).expect(400);
  });
  it('binds verification to its account and purpose and enforces resend cooldown', async () => {
    const a = await verified(false), b = await verified(false), number = phoneNumber();
    const challenge = (await a.agent.post('/api/auth/phone/send-code').send({ phoneNumber: number, purpose: 'verify' }).expect(200)).body;
    await b.agent.post('/api/auth/phone/verify').send({ challengeId: challenge.challengeId, code: '123456' }).expect(400);
    await a.agent.post('/api/auth/phone/sign-in').send({ challengeId: challenge.challengeId, code: '123456' }).expect(400);
    await a.agent.post('/api/auth/phone/send-code').send({ phoneNumber: number, purpose: 'verify' }).expect(429);
    await a.agent.post('/api/auth/phone/verify').send({ challengeId: challenge.challengeId, code: '123456' }).expect(200);
    await a.agent.post('/api/auth/phone/verify').send({ challengeId: challenge.challengeId, code: '123456' }).expect(400);
  });
  it('rejects incorrect and expired codes and caps attempts before calling Twilio again', async () => {
    const { agent } = await verified(false);
    const challenge = (await agent.post('/api/auth/phone/send-code').send({ phoneNumber: phoneNumber(), purpose: 'verify' }).expect(200)).body;
    for (let i = 0; i < 5; i++) await agent.post('/api/auth/phone/verify').send({ challengeId: challenge.challengeId, code: '999999' }).expect(400);
    await agent.post('/api/auth/phone/verify').send({ challengeId: challenge.challengeId, code: '123456' }).expect(400);
    const expired = (await agent.post('/api/auth/phone/send-code').send({ phoneNumber: phoneNumber(), purpose: 'verify' }).expect(200)).body;
    await prisma.phoneChallenge.update({ where: { id: expired.challengeId }, data: { expiresAt: new Date(0) } });
    await agent.post('/api/auth/phone/verify').send({ challengeId: expired.challengeId, code: '123456' }).expect(400);
  });
  it('enforces unique verified numbers across different accounts', async () => {
    const a = await verified(), b = await verified(false);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: a.email } });
    await prisma.phoneChallenge.updateMany({ where: { phoneNumber: user.phoneNumber! }, data: { createdAt: new Date(0) } });
    const challenge = (await b.agent.post('/api/auth/phone/send-code').send({ phoneNumber: user.phoneNumber, purpose: 'verify' }).expect(200)).body;
    await b.agent.post('/api/auth/phone/verify').send({ challengeId: challenge.challengeId, code: '123456' }).expect(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: b.email } })).phoneNumberVerified).toBe(false);
  });
  it('creates an existing-account session after SMS login and prevents concurrent replay', async () => {
    const { agent, email } = await verified();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await agent.patch('/api/onboarding').send({ username: 'sms_' + counter }).expect(200);
    await agent.post('/api/auth/sign-out').send({}).expect(200);
    await prisma.phoneChallenge.updateMany({ where: { phoneNumber: user.phoneNumber! }, data: { createdAt: new Date(0) } });
    const challenge = (await agent.post('/api/auth/phone/send-code').send({ phoneNumber: user.phoneNumber, purpose: 'sign-in' }).expect(200)).body;
    allowRepeatedApproval = true; // Prove the database consume gate independently of Twilio's one-use behavior.
    const a = request.agent(app.getHttpServer()), b = request.agent(app.getHttpServer());
    const results = await Promise.all([a.post('/api/auth/phone/sign-in').send({ challengeId: challenge.challengeId, code: '123456' }), b.post('/api/auth/phone/sign-in').send({ challengeId: challenge.challengeId, code: '123456' })]);
    expect(results.map(r => r.status).sort()).toEqual([200, 400]);
    const winner = results[0].status === 200 ? a : b;
    await winner.get('/api/demo/protected').expect(200);
    expect((await winner.get('/api/auth/get-session')).body.user.id).toBe(user.id);
    const sessions = await prisma.session.count({ where: { userId: user.id } });
    expect(sessions).toBe(1);
  });
  it('does not send SMS, create accounts or disclose membership for unknown login numbers', async () => {
    const previous = sentPhones.length;
    const agent = request.agent(app.getHttpServer()), number = phoneNumber();
    const challenge = (await agent.post('/api/auth/phone/send-code').send({ phoneNumber: number, purpose: 'sign-in' }).expect(200)).body;
    expect(challenge).toMatchObject({ challengeId: expect.any(String), expiresIn: 600, resendAfter: 60 });
    expect(sentPhones.length).toBe(previous);
    await agent.post('/api/auth/phone/sign-in').send({ challengeId: challenge.challengeId, code: '123456' }).expect(400);
    expect(await prisma.user.count({ where: { phoneNumber: number } })).toBe(0);
    await agent.get('/api/auth/get-session').expect(200).expect('null');
  });
});


describe('phone failure and abuse boundaries', () => {
  it('does not let a client mark a number verified through profile updates', async () => {
    const { agent, email } = await verified(false);
    await agent.post('/api/auth/update-user').send({ phoneNumber: phoneNumber(), phoneNumberVerified: true, phoneNumberVerifiedAt: new Date().toISOString() }).expect(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { email } })).phoneNumberVerified).toBe(false);
  });
  it('returns a safe provider failure and keeps the reservation to prevent rapid retries', async () => {
    const { agent } = await verified(false), number = phoneNumber();
    failSms = true;
    const response = await agent.post('/api/auth/phone/send-code').send({ phoneNumber: number, purpose: 'verify' }).expect(503);
    expect(response.body.code).toBe('PHONE_DELIVERY_FAILED');
    await agent.post('/api/auth/phone/send-code').send({ phoneNumber: number, purpose: 'verify' }).expect(429);
    expect((await agent.get('/api/auth/get-session')).body.user.phoneNumberVerified).toBe(false);
  });
  it('limits anonymous sends per socket IP in the persistent rate-limit store', async () => {
    const agent = request.agent(app.getHttpServer());
    for (let i = 0; i < 3; i++) await agent.post('/api/auth/phone/send-code').send({ phoneNumber: phoneNumber(), purpose: 'sign-in' }).expect(200);
    const response = await agent.post('/api/auth/phone/send-code').send({ phoneNumber: phoneNumber(), purpose: 'sign-in' }).expect(429);
    expect(Number(response.headers['x-retry-after'])).toBeGreaterThan(0);
  });
});
