import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ApiError } from '../../common/errors/api-error.js';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, currentId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true, userAgent: true },
      orderBy: { createdAt: 'desc' },
    });
    return { sessions: sessions.map((session) => ({ ...session, current: session.id === currentId })) };
  }
  async revoke(userId: string, id: string) {
    const result = await this.prisma.session.deleteMany({ where: { id, userId } });
    if (!result.count) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found.');
  }
}
