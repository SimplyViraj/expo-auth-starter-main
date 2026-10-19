import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { Controller, Delete, Get, HttpCode, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { CurrentSession } from '../../common/decorators/current-session.decorator.js';
import type { AuthSession } from '../auth/auth.service.js';
import { SessionsService } from './sessions.service.js';
import { SessionIdDto, SessionListDto } from './dto/session.dto.js';

@ApiTags('Sessions')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Session required' })
@UseGuards(SessionGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}
  @Get()
  @ApiOkResponse({ type: SessionListDto })
  list(@CurrentSession() session: AuthSession) { return this.sessions.list(session.user.id, session.session.id); }
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Owned session revoked' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Unknown session or session belongs to another user' })
  revoke(@CurrentSession() session: AuthSession, @Param() params: SessionIdDto) {
    return this.sessions.revoke(session.user.id, params.id);
  }
}
