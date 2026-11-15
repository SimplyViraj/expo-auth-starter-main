import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthSession } from '../auth/auth.service.js';
import { OnboardedGuard } from '../authorization/guards/onboarded.guard.js';
import { CreateMemberAccountDto, EmptyMembershipActionPipe, MembershipIdDto, PurchaseMembershipDto, QuoteMembershipDto } from './dto/membership.dto.js';
import { MembershipsService } from './memberships.service.js';

@ApiTags('Membership catalog')
@Controller('memberships/catalog')
export class MembershipCatalogController {
  constructor(private readonly memberships: MembershipsService) {}
  @Get() catalog() { return this.memberships.catalog(); }
}

@ApiTags('Memberships') @ApiCookieAuth()
@UseGuards(SessionGuard, OnboardedGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}
  @Post('quote') quote(@Body() body: QuoteMembershipDto) { return this.memberships.quote(body); }
  @Get('accounts') accounts(@CurrentSession() session: AuthSession) { return this.memberships.accounts(session.user.id); }
  @Post('accounts') createAccount(@CurrentSession() session: AuthSession, @Body() body: CreateMemberAccountDto) { return this.memberships.createAccount(session.user.id, body); }
  @Get() list(@CurrentSession() session: AuthSession) { return this.memberships.list(session.user.id); }
  @Post('purchases') purchase(@CurrentSession() session: AuthSession, @Body() body: PurchaseMembershipDto) { return this.memberships.purchase(session.user.id, body); }
  @Post('recurring/:id/cancel') cancelRecurring(@CurrentSession() session: AuthSession, @Param() params: MembershipIdDto, @Body(new EmptyMembershipActionPipe()) _body: unknown) { return this.memberships.cancelRecurring(session.user.id, params.id); }
  @Get(':id') get(@CurrentSession() session: AuthSession, @Param() params: MembershipIdDto) { return this.memberships.get(session.user.id, params.id); }
  @Post(':id/cancel') cancel(@CurrentSession() session: AuthSession, @Param() params: MembershipIdDto, @Body(new EmptyMembershipActionPipe()) _body: unknown) { return this.memberships.cancel(session.user.id, params.id); }
  @Post(':id/payment-refresh') refresh(@CurrentSession() session: AuthSession, @Param() params: MembershipIdDto, @Body(new EmptyMembershipActionPipe()) _body: unknown) { return this.memberships.refreshPayment(session.user.id, params.id); }
}
