import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionsService } from './sessions.service.js';
import { SessionsController } from './sessions.controller.js';

@Module({ imports: [AuthModule], controllers: [SessionsController], providers: [SessionsService] })
export class SessionsModule {}
