import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { IdentityService } from '../../modules/identity/identity.service.js';
import { ApiError } from '../errors/api-error.js';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly identity: IdentityService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const origins = [request.headers.origin, request.headers['expo-origin']].flat()
      .filter((value): value is string => typeof value === 'string');
    const allows = (origin: string) => this.identity.allowsApplicationOrigin(origin) ||
      (request.path === '/api/auth/callback/apple' && origin === 'https://appleid.apple.com');
    if (origins.some((origin) => !allows(origin))) {
      throw new ApiError(403, 'INVALID_ORIGIN', 'This origin is not allowed.');
    }
    return true;
  }
}
