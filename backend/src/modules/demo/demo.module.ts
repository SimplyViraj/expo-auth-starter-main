import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { DemoController } from './demo.controller.js';

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [DemoController] })
export class DemoModule {}
