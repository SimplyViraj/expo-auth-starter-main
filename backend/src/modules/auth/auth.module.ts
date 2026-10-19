import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AuthOriginGuard } from '../../common/guards/auth-origin.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';

@Module({ imports: [IdentityModule], controllers: [AuthController], providers: [AuthService, SessionGuard, AuthOriginGuard], exports: [AuthService, SessionGuard, IdentityModule] })
export class AuthModule {}
