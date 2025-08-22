import { withLeadingSlash, withoutTrailingSlash } from 'ufo'
import { useServerAuth } from '../utils/auth'

function normalizePath(path: string) {
  return withoutTrailingSlash(withLeadingSlash(path))
}

function parsePaths(raw: string): string[] {
  return raw?.split(',').map(p => p.trim()).filter(Boolean)
}

function matchesPrefix(path: string, prefix: string) {
  if (path === prefix) return true
  return path.startsWith(prefix + '/')
}

export default defineEventHandler(async (event) => {
  const session = await useServerAuth().api.getSession({
    headers: event.headers,
  })

  event.context.auth = session

  const path = normalizePath(event.path)
  const config = useRuntimeConfig()
  const authConfig = config.auth
  const authenticatedOnly = parsePaths(authConfig.authenticatedOnlyApiRoutes)
  const adminOnly = parsePaths(authConfig.adminOnlyApiRoutes)

  // Admin-only APIs
  if (adminOnly?.some(prefix => matchesPrefix(path, normalizePath(prefix)))) {
    if (!session?.user) {
      // Get the referring page from the Referer header
      const referer = getHeader(event, 'referer') || getHeader(event, 'referrer')
      const returnPath = referer ? new URL(referer).pathname : config.public.auth.redirectUserTo
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

  // Authenticated-only APIs
  if (authenticatedOnly?.some(prefix => matchesPrefix(path, normalizePath(prefix)))) {
    if (!session?.user) {
      // Get the referring page from the Referer header
      const referer = getHeader(event, 'referer') || getHeader(event, 'referrer')
      const returnPath = referer ? new URL(referer).pathname : config.public.auth.redirectUserTo
      const redirectPath = `${config.public.auth.redirectGuestTo}?redirect=${encodeURIComponent(returnPath)}`
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        data: { redirect: redirectPath },
      })
    }
  }
})
