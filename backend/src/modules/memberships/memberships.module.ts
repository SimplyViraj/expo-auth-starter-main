import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { MembershipCatalogController, MembershipsController } from './memberships.controller.js';
import { MembershipPaymentGateway } from './membership-payment.gateway.js';
import { MembershipsService } from './memberships.service.js';
import { MembershipRecurringWorker } from './membership-recurring.worker.js';

@Module({ imports: [AuthModule, AuthorizationModule], controllers: [MembershipCatalogController, MembershipsController], providers: [MembershipsService, MembershipPaymentGateway, MembershipRecurringWorker], exports: [MembershipsService] })
export class MembershipsModule {}
