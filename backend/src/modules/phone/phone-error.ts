export class PhoneError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 409 | 429 | 503, readonly code: string, message: string) { super(message); }
}
