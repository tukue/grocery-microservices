/**
 * Formats a token as an Authorization header value.
 *
 * This is a client-side utility only — it validates that the token
 * has JWT format (three base64url segments) before attaching it to
 * outbound requests. Signature, expiration, and claims verification
 * happen server-side; embedding signing keys in client code would be
 * a greater security risk than this format check prevents.
 */
const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function toBearerAuthorization(
  token: string | undefined,
): string | undefined {
  if (!token || !jwtPattern.test(token)) {
    return undefined;
  }

  return `Bearer ${token}`;
}
