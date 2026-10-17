import { z } from 'zod';

import { authPolicy } from '@/constants/auth-policy';

const emailSchema = z.string().min(1, 'Enter your email address').email('Enter a valid email address');
const currentPasswordSchema = z
  .string()
  .min(1, 'Enter your password')
  .max(authPolicy.maximumPasswordLength, `Password must contain at most ${authPolicy.maximumPasswordLength} characters`);
const newPasswordSchema = currentPasswordSchema.min(
  authPolicy.minimumPasswordLength,
  `Password must contain at least ${authPolicy.minimumPasswordLength} characters`,
);
const otpSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the six-digit code');

export const signInSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must contain at least 2 characters').max(80, 'Name must contain at most 80 characters'),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyEmailOtpSchema = z.object({
  otp: otpSchema,
});

export const resetPasswordSchema = z
  .object({
    otp: otpSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type VerifyEmailOtpValues = z.infer<typeof verifyEmailOtpSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
