import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { AuthSession } from '../auth/auth.service.js';
import { CompleteOnboardingDto, CompleteOnboardingResponseDto } from './dto/complete-onboarding.dto.js';
import { OnboardingService } from './onboarding.service.js';

@ApiTags('Onboarding')
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}
  @Patch()
  @ApiOkResponse({ type: CompleteOnboardingResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid username or unknown fields' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Session required' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Username taken' })
  complete(@CurrentSession() session: AuthSession, @Body() body: CompleteOnboardingDto) {
    return this.onboarding.complete(session.user.id, body);
  }
}
