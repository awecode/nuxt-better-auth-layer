export function readMagicLinkSendEmail(body: unknown): string | null {
  const email = (body as { email?: unknown } | null)?.email
  if (typeof email !== 'string')
    return null

  const trimmed = email.trim()
  if (!trimmed)
    return null

  return trimmed
}

/**
 * Rebuild a magic-link-send request as Better Auth's sign-in route.
 * That route is what the HTTP rate limiter counts.
 */
export function magicLinkSignInRequest(request: Request, email: string) {
  const url = new URL(request.url)
  if (!url.pathname.endsWith('/magic-link-send')) {
    throw new Error('Expected a /magic-link-send request.')
  }
  url.pathname = url.pathname.replace(/\/magic-link-send$/, '/sign-in/magic-link')

  const headers = new Headers(request.headers)
  headers.set('content-type', 'application/json')
  headers.delete('content-length')

  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email }),
  })
}
