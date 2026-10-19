import { ValidationPipe } from '@nestjs/common';
import { ApiError } from '../errors/api-error.js';

export function createValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    exceptionFactory: () => new ApiError(400, 'INVALID_REQUEST', 'Check the request fields and try again.'),
  });
}
