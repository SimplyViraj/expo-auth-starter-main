import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { TwilioVerifyProvider } from '../identity/providers/twilio-verify.provider.js';
import { PhoneError } from './phone-error.js';

export type PhonePurpose = 'verify' | 'sign-in';
const invalid = () => new PhoneError(400, 'INVALID_PHONE_CODE', 'This code is invalid or expired. Request a new code if needed.');
@Injectable()
export class PhoneService {
  constructor(private readonly prisma: PrismaService, private readonly twilio: TwilioVerifyProvider) {}
  async send(phoneNumber: string, purpose: PhonePurpose, userId?: string) {
    const user = purpose === 'verify'
      ? await this.prisma.user.findUnique({ where: { id: userId! } })
      : await this.prisma.user.findFirst({ where: { phoneNumber, phoneNumberVerified: true } });
    if (purpose === 'verify' && !user) throw new PhoneError(401, 'UNAUTHORIZED', 'Sign in again to verify your phone.');
    const now = new Date();
    const id = randomUUID();
    const data = { id, phoneNumber, purpose, userId: user?.id ?? null, verificationSid: null, consumedAt: null, attempts: 0, createdAt: now, expiresAt: new Date(now.getTime() + 600_000) };
    // A unique phone row and conditional update serialize sends across all server instances and purposes.
    try {
      const previous = await this.prisma.phoneChallenge.findUnique({ where: { phoneNumber } });
      if (!previous) await this.prisma.phoneChallenge.create({ data });
      else {
        const claimed = await this.prisma.phoneChallenge.updateMany({ where: { phoneNumber, createdAt: { lte: new Date(now.getTime() - 60_000) } }, data });
        if (!claimed.count) throw new PhoneError(429, 'PHONE_RATE_LIMITED', 'Wait one minute before requesting another code.');
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new PhoneError(429, 'PHONE_RATE_LIMITED', 'Wait one minute before requesting another code.');
      throw error;
    }
    // Unknown login numbers get an indistinguishable challenge, without sending SMS or creating an account.
    if (user) {
      const verificationSid = await this.twilio.send(phoneNumber);
      await this.prisma.phoneChallenge.updateMany({ where: { id }, data: { verificationSid } });
    }
    // Expired rows contain no codes; clear them opportunistically without deleting the current reservation.
    await this.prisma.phoneChallenge.deleteMany({ where: { expiresAt: { lt: now } } });
    return { challengeId: id, expiresIn: 600, resendAfter: 60 };
  }
  async confirm(challengeId: string, code: string, purpose: PhonePurpose, userId?: string) {
    const challenge = await this.prisma.phoneChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.purpose !== purpose || (purpose === 'verify' && challenge.userId !== userId)) throw invalid();
    const reserved = await this.prisma.phoneChallenge.updateMany({
      where: { id: challengeId, attempts: { lt: 5 }, consumedAt: null, expiresAt: { gt: new Date() } }, data: { attempts: { increment: 1 } },
    });
    if (!reserved.count || !challenge.verificationSid || !challenge.userId) throw invalid();
    if (!await this.twilio.check(challenge.verificationSid, code)) throw invalid();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const consumed = await tx.phoneChallenge.updateMany({ where: { id: challengeId, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
        if (!consumed.count) throw invalid();
        if (purpose === 'verify') return tx.user.update({ where: { id: challenge.userId! }, data: { phoneNumber: challenge.phoneNumber, phoneNumberVerified: true, phoneNumberVerifiedAt: new Date() } });
        const user = await tx.user.findFirst({ where: { id: challenge.userId!, phoneNumber: challenge.phoneNumber, phoneNumberVerified: true } });
        if (!user) throw invalid();
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new PhoneError(409, 'PHONE_NUMBER_TAKEN', 'This phone number is already linked to another account.');
      throw error;
    }
  }
}
