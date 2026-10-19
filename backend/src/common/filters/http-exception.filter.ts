import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { reportOperationalFailure } from '../logging/operational-logger.js';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const parseError = exception && typeof exception === 'object' && 'type' in exception ? exception.type : undefined;
    const status = exception instanceof HttpException ? exception.getStatus()
      : parseError === 'entity.parse.failed' ? 400 : parseError === 'entity.too.large' ? 413 : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const candidate = body && typeof body === 'object' && 'error' in body ? body.error : null;
    const error = candidate && typeof candidate === 'object' &&
      'code' in candidate && typeof candidate.code === 'string' &&
      'message' in candidate && typeof candidate.message === 'string'
      ? { error: { code: candidate.code, message: candidate.message } }
      : {
        error: {
          code: status === 400 ? 'INVALID_REQUEST' : status === 404 ? 'NOT_FOUND' : status === 413 ? 'REQUEST_TOO_LARGE' : 'REQUEST_FAILED',
          message: status >= 500 ? 'We could not process this request. Please try again.' : 'The request could not be accepted.',
        },
      };
    if (status >= 500) reportOperationalFailure('http.request-failed', status);
    response.setHeader('Cache-Control', 'private, no-store');
    response.status(status).json(error);
  }
}
