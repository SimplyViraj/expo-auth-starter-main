import { ErrorResponseDto } from '../../common/errors/error-response.dto.js';
import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiForbiddenResponse, ApiOkResponse, ApiProperty, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { SessionGuard } from '../../common/guards/session.guard.js';
import { OnboardedGuard } from '../authorization/guards/onboarded.guard.js';

class ContentDto {
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
}
class PublicDemoDto { @ApiProperty({ type: ContentDto }) tip!: ContentDto; }
class ProtectedDemoDto { @ApiProperty({ type: ContentDto }) workspace!: ContentDto; }

@ApiTags('Demo')
@Controller('demo')
export class DemoController {
  @Get('public')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOkResponse({ type: PublicDemoDto })
  publicDemo(): PublicDemoDto {
    return { tip: { title: 'Public transmission received', body: 'Today’s reminder: drink some water, stretch, and pretend your inbox does not exist for five minutes.' } };
  }
  @Get('protected')
  @ApiCookieAuth()
  @UseGuards(SessionGuard, OnboardedGuard)
  @ApiOkResponse({ type: ProtectedDemoDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Session required' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Profile incomplete' })
  protectedDemo(): ProtectedDemoDto {
    return { workspace: { title: 'Top secret unlocked', body: 'Your mission: finish one important task before opening another browser tab.' } };
  }
}
