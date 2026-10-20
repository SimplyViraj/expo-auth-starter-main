import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { ProfilePhotoProcessor } from './profile-photo.processor.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ProfileController],
  providers: [ProfileService, ProfilePhotoProcessor],
})
export class ProfileModule {}
