import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService, type AuthSession } from '../../modules/auth/auth.service.js';
import { IdentityService } from '../../modules/identity/identity.service.js';
import { ApiError } from '../errors/api-error.js';

export type AuthenticatedRequest = Request & { authSession: AuthSession };
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly identity: IdentityService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const suppliedOrigins = [request.headers.origin, request.headers['expo-origin']].flat().filter((value): value is string => typeof value === 'string');
      if (suppliedOrigins.some((value) => !this.identity.allowsApplicationOrigin(value))) throw new ApiError(403, 'INVALID_ORIGIN', 'This origin is not allowed.');
    }
    const session = await this.auth.getSession(request);
    if (!session) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
    request.authSession = session;
    return true;
  }
}
