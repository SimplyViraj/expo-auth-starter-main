import { Module } from '@nestjs/common';
import { PhoneService } from './phone.service.js';
import { TwilioVerifyProvider } from '../identity/providers/twilio-verify.provider.js';
@Module({ providers: [PhoneService, TwilioVerifyProvider], exports: [PhoneService] })
export class PhoneModule {}
