import { readFileSync } from 'node:fs';
import { z } from 'zod';

// Shared by Expo and Nest. Same relative location from src/config and dist/config.
export const appIdentity = z.object({
  name: z.string().min(1),
  scheme: z.string().regex(/^[a-z][a-z0-9+.-]*$/),
  iosBundleIdentifier: z.string().min(1),
}).parse(JSON.parse(readFileSync(new URL('../../../shared/app-identity.json', import.meta.url), 'utf8')));

export const authPolicy = z.object({
  minimumPasswordLength: z.number().int().min(8),
  maximumPasswordLength: z.number().int().min(15),
  sensitiveActionFreshnessSeconds: z.number().int().positive(),
}).refine((value) => value.maximumPasswordLength >= value.minimumPasswordLength)
  .parse(JSON.parse(readFileSync(new URL('../../../shared/auth-policy.json', import.meta.url), 'utf8')));

export const profilePhotoPolicy = z.object({
  thumbnailSize: z.number().int().positive(),
  maxSourceBytes: z.number().int().positive(),
  maxUploadBytes: z.number().int().positive(),
  maxStoredBytes: z.number().int().positive(),
}).parse(JSON.parse(readFileSync(new URL('../../../shared/profile-photo-policy.json', import.meta.url), 'utf8')));
