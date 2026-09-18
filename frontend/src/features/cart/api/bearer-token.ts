const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function toBearerAuthorization(token: string | undefined): string | undefined {
  if (!token || !jwtPattern.test(token)) {
    return undefined;
  }

  return `Bearer ${token}`;
}
