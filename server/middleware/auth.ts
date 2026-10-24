import { getSessionCookie } from 'better-auth/cookies'
import { withLeadingSlash, withoutTrailingSlash } from 'ufo'
import { safeInternalPath } from '../../shared/safeInternalPath'
import { getAuthSession } from '../utils/session'

function normalizePath(path: string) {
  return withoutTrailingSlash(withLeadingSlash(path))
}

function requestPath(path: string) {
  const pathname = (path.split('?')[0] ?? path).split('#')[0] ?? path
  return normalizePath(pathname)
}

function parsePaths(raw: string): string[] {
  return raw?.split(',').map(p => p.trim()).filter(Boolean)
}

function matchesPrefix(path: string, prefix: string) {
  if (path === prefix) return true
  return path.startsWith(prefix + '/')
}

function matchesAnyPrefix(path: string, prefixes: string[]) {
  return prefixes.some(prefix => matchesPrefix(path, normalizePath(prefix)))
}

export default defineEventHandler(async (event) => {
  const path = requestPath(event.path)
  const config = useRuntimeConfig()
  const authConfig = config.auth
  const authenticatedOnly = parsePaths(authConfig.authenticatedOnlyApiRoutes)
  const adminOnly = parsePaths(authConfig.adminOnlyApiRoutes)

  const isAdminRoute = matchesAnyPrefix(path, adminOnly)
  const isAuthenticatedRoute = matchesAnyPrefix(path, authenticatedOnly)

  if (!isAdminRoute && !isAuthenticatedRoute)
    return

  // getAuthSession caches the session on event.context.auth and forwards
  // refreshed session cookies to the browser.
  const session = getSessionCookie(event.headers) !== null
    ? await getAuthSession(event)
    : null

  event.context.auth = session

  // Admin-only APIs
  if (isAdminRoute) {
    if (!session?.user) {
      // Get the referring page from the Referer header
      const referer = getHeader(event, 'referer') || getHeader(event, 'referrer')
      const returnPath = safeInternalPath(referer, config.public.auth.redirectUserTo)
      const redirectPath = `${config.public.auth.redirectGuestTo}?redirect=${encodeURIComponent(returnPath)}`
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: { redirect: redirectPath },
      })
    }
    if (!session?.user || session.user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden',
      })
    }
  }

  if (isAuthenticatedRoute) {
    if (!session?.user) {
      // Get the referring page from the Referer header
      const referer = getHeader(event, 'referer') || getHeader(event, 'referrer')
      const returnPath = safeInternalPath(referer, config.public.auth.redirectUserTo)
      const redirectPath = `${config.public.auth.redirectGuestTo}?redirect=${encodeURIComponent(returnPath)}`
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: { redirect: redirectPath },
      })
    }
  }
})
