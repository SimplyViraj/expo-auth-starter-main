import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service.js';
import { OnboardedGuard } from './guards/onboarded.guard.js';

@Module({ providers: [AuthorizationService, OnboardedGuard], exports: [AuthorizationService, OnboardedGuard] })
export class AuthorizationModule {}
