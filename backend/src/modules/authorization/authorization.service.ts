import { Injectable } from '@nestjs/common';
import type { AuthSession } from '../auth/auth.service.js';
import { ApiError } from '../../common/errors/api-error.js';

@Injectable()
export class AuthorizationService {
  requireOnboarded(session: AuthSession) {
    if (!session.user.onboardingCompleted) throw new ApiError(403, 'PROFILE_INCOMPLETE', 'Complete your profile to continue.');
  }
}
