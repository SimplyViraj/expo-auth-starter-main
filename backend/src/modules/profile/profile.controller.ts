import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthSession } from '../auth/auth.service.js';
import { OnboardedGuard } from '../authorization/guards/onboarded.guard.js';
import { ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto.js';
import { ProfileService } from './profile.service.js';

@ApiTags('Profile')
@ApiCookieAuth()
@UseGuards(SessionGuard, OnboardedGuard)
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Session required' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Onboarding incomplete or untrusted origin' })
@ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Account no longer exists' })
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOkResponse({ type: ProfileResponseDto })
  get(@CurrentSession() session: AuthSession) {
    return this.profile.get(session.user.id);
  }

  @Patch()
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid, empty, or unknown fields' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Username already taken' })
  update(@CurrentSession() session: AuthSession, @Body() body: UpdateProfileDto) {
    return this.profile.update(session.user.id, body);
  }
}
