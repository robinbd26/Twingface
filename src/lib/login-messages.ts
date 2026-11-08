/**
 * Shared login failure copy.
 *
 * The API deliberately returns a single generic message for every failed
 * login so that a caller cannot tell an unknown account from a wrong
 * password (no account enumeration). The UI needs the same message in the
 * user's own language, so the server copy is treated as an opaque marker
 * that clients translate instead of showing verbatim.
 */
export const GENERIC_INVALID_CREDENTIALS = 'Invalid email or password.';

/**
 * Resolves the message to display for a failed login.
 *
 * @param serverError - The `error` field returned by the login API, if any.
 * @param localized - The client-side translation of the generic message.
 * @returns The localized message for generic failures, otherwise the
 * server-provided message (e.g. a validation error) unchanged.
 */
export function resolveLoginError(serverError: unknown, localized: string): string {
  if (typeof serverError !== 'string' || serverError.trim().length === 0) return localized;
  if (serverError === GENERIC_INVALID_CREDENTIALS) return localized;
  return serverError;
}
