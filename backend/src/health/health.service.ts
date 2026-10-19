import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ApiError } from '../common/errors/api-error.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Service unavailable.');
    }
  }
}
