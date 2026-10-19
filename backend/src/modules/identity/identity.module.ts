import { Module } from '@nestjs/common';
import { EmailProvider } from './providers/email.provider.js';
import { IdentityService } from './identity.service.js';

@Module({ providers: [IdentityService, EmailProvider], exports: [IdentityService, EmailProvider] })
export class IdentityModule {}
