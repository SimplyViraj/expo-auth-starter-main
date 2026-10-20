import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { ApiError } from '../../common/errors/api-error.js';
import type { CompleteOnboardingDto, CompleteOnboardingResponseDto } from './dto/complete-onboarding.dto.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}
  async complete(userId: string, input: CompleteOnboardingDto): Promise<CompleteOnboardingResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true, phoneNumberVerified: true } });
    if (!existing) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Please sign in again.');
    if (!existing.phoneNumber || !existing.phoneNumberVerified) throw new ApiError(403, 'PHONE_VERIFICATION_REQUIRED', 'Verify your mobile number before finishing setup.');
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { username: input.username, onboardingCompleted: true, onboardingCompletedAt: new Date() },
        select: { id: true, username: true, onboardingCompletedAt: true },
      });
      return { user: { id: user.id, username: user.username!, onboardingCompleted: true, onboardingCompletedAt: user.onboardingCompletedAt!.toISOString() } };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError(409, 'USERNAME_TAKEN', 'That username is already taken. Try another one.');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Please sign in again.');
      throw error;
    }
  }
}
