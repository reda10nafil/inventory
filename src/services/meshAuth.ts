/** Checks the short lived pairing credential for an HTTP mesh request. */
export function isMeshRequestAuthorized(
  url: URL,
  authorizationHeader: string | undefined,
  expectedToken: string | null,
): boolean {
  if (!expectedToken) return false;

  const bearer = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const presented = bearer ?? url.searchParams.get('token');
  return presented === expectedToken;
}
