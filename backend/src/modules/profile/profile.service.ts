import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';

import { ApiError } from '../../common/errors/api-error.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto.js';
import { ProfilePhotoProcessor } from './profile-photo.processor.js';

const profileSelect = {
  id: true,
  name: true,
  image: true,
  username: true,
  email: true,
  emailVerified: true,
  phoneNumber: true,
  phoneNumberVerified: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

type ProfileRecord = Pick<User, keyof typeof profileSelect>;

function response(user: ProfileRecord): ProfileResponseDto {
  return { user: { ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() } };
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService, private readonly photos: ProfilePhotoProcessor) {}

  async uploadPhoto(userId: string, base64: string): Promise<ProfileResponseDto> {
    return this.savePhoto(userId, await this.photos.process(base64));
  }

  async removePhoto(userId: string): Promise<ProfileResponseDto> {
    return this.savePhoto(userId, null);
  }

  private async savePhoto(userId: string, image: string | null): Promise<ProfileResponseDto> {
    try {
      return response(await this.prisma.user.update({ where: { id: userId }, data: { image }, select: profileSelect }));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Please sign in again.');
      }
      throw error;
    }
  }

  async get(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
    if (!user) throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Please sign in again.');
    return response(user);
  }

  async update(userId: string, input: UpdateProfileDto): Promise<ProfileResponseDto> {
    if (input.name === undefined && input.username === undefined) {
      throw new ApiError(400, 'INVALID_REQUEST', 'Provide a name or username to update.');
    }

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.username !== undefined ? { username: input.username } : {}),
        },
        select: profileSelect,
      });
      return response(user);
    } catch (error) {
      // The database unique constraint also handles concurrent username claims.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'USERNAME_TAKEN', 'That username is already taken. Try another one.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Please sign in again.');
      }
      throw error;
    }
  }
}
