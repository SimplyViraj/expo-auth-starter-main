import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { DemoModule } from './modules/demo/demo.module.js';
import { ProfileModule } from './modules/profile/profile.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: process.env.NODE_ENV === 'test', validate: validateEnvironment }),
    DatabaseModule, HealthModule, AuthModule, OnboardingModule, SessionsModule, DemoModule, ProfileModule,
  ],
})
export class AppModule {}
