import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { ApiError } from '../../common/errors/api-error.js';
import { profilePhotoPolicy } from '../../config/configuration.js';

@Injectable()
export class ProfilePhotoProcessor {
  async process(base64: string): Promise<string> {
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > profilePhotoPolicy.maxUploadBytes) {
      throw new ApiError(413, 'PHOTO_TOO_LARGE', 'Choose a smaller profile photo.');
    }
    if (!bytes.length || bytes.toString('base64') !== base64) {
      throw new ApiError(400, 'INVALID_PHOTO', 'Choose a valid JPEG, PNG, or WebP image.');
    }

    try {
      const image = sharp(bytes, { limitInputPixels: 16_777_216, failOn: 'warning' });
      const metadata = await image.metadata();
      if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) > 1) {
        throw new Error('Unsupported image format');
      }
      // Re-encoding strips source metadata and prevents storing arbitrary uploaded files.
      const thumbnail = await image.rotate()
        .resize(profilePhotoPolicy.thumbnailSize, profilePhotoPolicy.thumbnailSize, { fit: 'cover' })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 82 })
        .toBuffer();
      if (thumbnail.length > profilePhotoPolicy.maxStoredBytes) throw new Error('Thumbnail too large');
      return `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
    } catch {
      throw new ApiError(400, 'INVALID_PHOTO', 'Choose a valid, non-animated JPEG, PNG, or WebP image.');
    }
  }
}
