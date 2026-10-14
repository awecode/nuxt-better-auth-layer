export class MagicLinkVerifyOriginError extends Error {
  statusCode = 403

  constructor() {
    super('Cross-site login is not allowed.')
  }
}

/**
 * Magic-link verify signs the browser in. A cross-site form can post a known
 * token and plant that session, so only a same-origin request may continue.
 */
export function assertMagicLinkVerifyOrigin(headers: Headers, baseURL: string) {
  if (headers.get('sec-fetch-site') === 'cross-site')
    throw new MagicLinkVerifyOriginError()

  const allowed = new URL(baseURL).origin
  const origin = headers.get('origin')
  const source = origin || headers.get('referer')
  if (!source)
    throw new MagicLinkVerifyOriginError()

  let actual: string
  try {
    actual = new URL(source).origin
  }
  catch {
    throw new MagicLinkVerifyOriginError()
  }

  if (actual !== allowed)
    throw new MagicLinkVerifyOriginError()
}

/**
 * Better Auth's GET /magic-link/verify sets a session cookie with no origin check.
 * Sign-in goes through the confirm page and POST /magic-link-verify instead.
 */
export function isMagicLinkAutoVerifyPath(pathname: string) {
  const pathOnly = pathname.split('?')[0] || pathname
  let decoded = pathOnly
  try {
    decoded = decodeURIComponent(pathOnly)
  }
  catch {
    // Keep the raw path when the encoding is invalid.
  }
  const path = decoded.replace(/\/+$/, '') || '/'
  return path.endsWith('/magic-link/verify')
}

/** Session cookies from Better Auth. The JSON body holds the bearer token and must not be forwarded. */
export function magicLinkVerifyCookies(response: Response) {
  if (typeof response.headers.getSetCookie === 'function')
    return response.headers.getSetCookie()

  const single = response.headers.get('set-cookie')
  return single ? [single] : []
}
