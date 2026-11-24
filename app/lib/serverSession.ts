import { appendResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import { authDataForClient } from '../../shared/sessionForClient'

// Reads the session during SSR through the app's own /api/auth/get-session.
// On the server, $fetch calls that handler in the same process (no network),
// so server auth code (and the app's database schema) stays out of the Vue
// bundle. Refreshed session cookies are passed on to the browser.
export async function fetchServerAuthSession(event: H3Event) {
  const headers = new Headers(event.headers)
  headers.delete('content-length')
  headers.delete('content-type')
  const response = await $fetch.raw<{ session?: object | null, user?: object | null } | null>('/api/auth/get-session', { headers })
  for (const cookie of response.headers.getSetCookie?.() ?? [])
    appendResponseHeader(event, 'set-cookie', cookie)
  return authDataForClient(response._data ?? null)
}
