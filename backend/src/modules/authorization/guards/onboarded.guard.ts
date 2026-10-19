import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../common/guards/session.guard.js';
import { AuthorizationService } from '../authorization.service.js';

@Injectable()
export class OnboardedGuard implements CanActivate {
  constructor(private readonly authorization: AuthorizationService) {}
  canActivate(context: ExecutionContext) {
    this.authorization.requireOnboarded(context.switchToHttp().getRequest<AuthenticatedRequest>().authSession);
    return true;
  }
}
