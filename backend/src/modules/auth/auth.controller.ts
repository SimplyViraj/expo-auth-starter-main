import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthOriginGuard } from '../../common/guards/auth-origin.guard.js';
import { AuthService } from './auth.service.js';

// The real auth endpoint schemas are merged into Swagger from Better Auth.
@ApiExcludeController()
@UseGuards(AuthOriginGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @All('{*path}')
  handle(@Req() request: Request, @Res() response: Response) {
    return this.auth.handle(request, response);
  }
}
