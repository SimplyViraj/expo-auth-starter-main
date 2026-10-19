import { Logger } from '@nestjs/common';

const logger = new Logger('Backend');
export function reportOperationalFailure(event: 'http.request-failed' | 'email.delivery-failed', status?: number) {
  logger.error({ event, ...(status === undefined ? {} : { status }) });
}
