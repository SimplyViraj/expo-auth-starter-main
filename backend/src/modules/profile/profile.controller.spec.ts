import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CacheControlInterceptor } from '../../common/interceptors/cache-control.interceptor.js';
import { createValidationPipe } from '../../common/pipes/validation.pipe.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuthService, type AuthSession } from '../auth/auth.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { OnboardedGuard } from '../authorization/guards/onboarded.guard.js';
import { IdentityService } from '../identity/identity.service.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

const record = {
  id: 'member-a', name: 'Anaya Sharma', username: 'anaya',
  email: 'anaya@example.com', emailVerified: true,
  phoneNumber: '+919876543210', phoneNumberVerified: true,
  createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-02T00:00:00Z'),
};
const session = {
  session: { id: 'session-a' },
  user: { ...record, onboardingCompleted: true },
} as AuthSession;
const getSession = jest.fn<() => Promise<AuthSession | null>>();
const findUnique = jest.fn<(args: { where: { id: string }; select: Record<string, boolean> }) => Promise<typeof record | null>>();
const update = jest.fn<(args: { where: { id: string }; data: { name?: string; username?: string } }) => Promise<typeof record>>();
let app: INestApplication;

beforeAll(async () => {
  // Exercise the real HTTP guards, validation pipe, controller, and service without a database.
  const module = await Test.createTestingModule({
    controllers: [ProfileController],
    providers: [
      ProfileService, SessionGuard, OnboardedGuard, AuthorizationService,
      { provide: PrismaService, useValue: { user: { findUnique, update } } },
      { provide: AuthService, useValue: { getSession } },
      { provide: IdentityService, useValue: { allowsApplicationOrigin: (origin: string) => origin === 'http://localhost:8081' } },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new CacheControlInterceptor());
  await app.init();
});

beforeEach(() => {
  jest.resetAllMocks();
  getSession.mockResolvedValue(session);
  findUnique.mockResolvedValue(record);
  update.mockImplementation(async ({ data }) => ({ ...record, ...data }));
});

afterAll(async () => { await app?.close(); });

describe('authenticated member profile API', () => {
  it('requires a session for reads and writes', async () => {
    getSession.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/api/profile').expect(401);
    await request(app.getHttpServer()).patch('/api/profile').send({ name: 'Someone Else' }).expect(401);
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    { onboardingCompleted: false },
    { phoneNumber: null },
    { phoneNumberVerified: false },
  ])('requires completed onboarding and verified phone ownership: %j', async (fields) => {
    getSession.mockResolvedValue({ ...session, user: { ...session.user, ...fields } } as AuthSession);
    await request(app.getHttpServer()).get('/api/profile').expect(403);
    await request(app.getHttpServer()).patch('/api/profile').send({ name: 'New Name' }).expect(403);
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('reads only the authenticated account and returns safe, non-cacheable profile fields', async () => {
    const result = await request(app.getHttpServer()).get('/api/profile?userId=member-b').expect(200);
    expect(result.body.user).toEqual({ ...record, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() });
    expect(result.headers['cache-control']).toBe('private, no-store');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'member-a' }, select: {
      id: true, name: true, username: true, email: true, emailVerified: true,
      phoneNumber: true, phoneNumberVerified: true, createdAt: true, updatedAt: true,
    } });
    expect(result.body.user).not.toHaveProperty('sessions');
    expect(result.body.user).not.toHaveProperty('accounts');
  });

  it('normalizes profile edits and updates the authenticated account', async () => {
    const result = await request(app.getHttpServer()).patch('/api/profile').send({ name: '  Anaya S.  ', username: '  ANAYA_NEW  ' }).expect(200);
    expect(result.body.user).toMatchObject({ id: 'member-a', name: 'Anaya S.', username: 'anaya_new' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'member-a' }, data: { name: 'Anaya S.', username: 'anaya_new' } }));
  });

  it('supports partial updates without clearing other fields', async () => {
    const result = await request(app.getHttpServer()).patch('/api/profile').send({ name: 'आन्या शर्मा' }).expect(200);
    expect(result.body.user).toMatchObject({ name: 'आन्या शर्मा', username: 'anaya' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'आन्या शर्मा' } }));
  });

  it.each([
    {}, { name: '' }, { name: '  ' }, { name: 'a' }, { name: 'a'.repeat(81) },
    { name: 123 }, { name: null }, { name: 'Anaya\nSharma' },
    { username: null }, { username: 'ab' }, { username: '1invalid' }, { username: 'a'.repeat(25) },
    { username: 'invalid-name' }, { username: 123 },
    { name: 'Valid Name', id: 'member-b' }, { name: 'Valid Name', email: 'other@example.com' },
    { name: 'Valid Name', phoneNumber: '+919999999999' }, { phoneNumberVerified: true },
    { onboardingCompleted: true }, { image: 'https://example.com/avatar.png' },
  ])('rejects invalid or protected fields: %j', async (input) => {
    await request(app.getHttpServer()).patch('/api/profile').send(input).expect(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('denies mutations from untrusted browser and native origins', async () => {
    for (const header of ['Origin', 'expo-origin']) {
      await request(app.getHttpServer()).patch('/api/profile').set(header, 'https://untrusted.example').send({ name: 'Valid Name' }).expect(403);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it('allows a configured browser origin', async () => {
    await request(app.getHttpServer()).patch('/api/profile').set('Origin', 'http://localhost:8081').send({ username: 'anaya_new' }).expect(200);
  });

  it('returns a username field conflict when the database unique constraint rejects a claim', async () => {
    update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: '6.19.0' }));
    const result = await request(app.getHttpServer()).patch('/api/profile').send({ username: 'taken_name' }).expect(409);
    expect(result.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('handles account deletion between session validation and profile access', async () => {
    findUnique.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/api/profile').expect(404);
    update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Missing record', { code: 'P2025', clientVersion: '6.19.0' }));
    const result = await request(app.getHttpServer()).patch('/api/profile').send({ name: 'Valid Name' }).expect(404);
    expect(result.body.error.code).toBe('ACCOUNT_NOT_FOUND');
  });
});
