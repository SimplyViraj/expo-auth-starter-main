import { ErrorResponseDto } from '../common/errors/error-response.dto.js';
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}
  @Get()
  @ApiOkResponse({ schema: { type: 'object', properties: { status: { type: 'string', enum: ['ok'] } }, required: ['status'] } })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto, description: 'Database unavailable' })
  readiness() { return this.health.readiness(); }
}
