import { z } from 'zod';
export const phoneNumberSchema = z.string().transform((value) => value.trim().replace(/[ ()-]/g, '')).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Include your country code, for example +14155552671.'));
export const phoneCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the six-digit SMS code.');
