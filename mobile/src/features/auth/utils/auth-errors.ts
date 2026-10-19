type AuthError = {
  status?: number;
  code?: string;
};

export function isEmailNotVerifiedError(error: AuthError) {
  return error.code === 'EMAIL_NOT_VERIFIED';
}

export function getSignInErrorMessage(error: AuthError) {
  if (error.status === 429) return 'Too many sign-in attempts. Please wait and try again.';
  if (error.status && error.status >= 500) return 'We cannot sign you in right now. Please try again.';
  return 'The email or password is incorrect.';
}

export function getSignUpErrorMessage(error: AuthError) {
  if (error.status === 429) return 'Too many account requests. Please wait and try again.';
  if (error.status && error.status >= 500) return 'We cannot create your account right now. Please try again.';
  return 'We could not create an account with those details.';
}

export function getResetPasswordErrorMessage(error: AuthError) {
  if (error.status === 429) return 'Too many reset attempts. Please wait and try again.';
  if (error.code === 'INVALID_OTP') return 'That code is incorrect or has already been used.';
  if (error.code === 'OTP_EXPIRED') return 'That code has expired. Request a new code and try again.';
  if (error.code === 'TOO_MANY_ATTEMPTS') return 'Too many incorrect codes. Request a new code and try again.';
  if (error.status && error.status >= 500) return 'We cannot reset your password right now. Please try again.';
  return 'We could not reset your password. Request a new code and try again.';
}

export function getEmailOtpErrorMessage(error: AuthError) {
  if (error.status === 429) return 'Too many code requests. Please wait and try again.';
  if (error.code === 'INVALID_OTP') return 'That code is incorrect or has already been used.';
  if (error.code === 'OTP_EXPIRED') return 'That code has expired. Request a new code and try again.';
  if (error.code === 'TOO_MANY_ATTEMPTS') return 'Too many incorrect codes. Request a new code and try again.';
  if (error.status && error.status >= 500) return 'We cannot verify your email right now. Please try again.';
  return 'We could not verify that code. Request a new code and try again.';
}
