import { appendResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import { authDataForClient } from '../../shared/sessionForClient'

// Reads the session during SSR through the app's own /api/auth/get-session.
// On the server, $fetch calls that handler in the same process (no network),
// so server auth code (and the app's database schema) stays out of the Vue
// bundle. Refreshed session cookies are passed on to the browser.
type SessionData = { session?: object | null, user?: object | null } | null

// A plain signature: Nitro's typed $fetch infers the response type of every
// app route, which is too deep for apps with many routes.
const fetchRaw = $fetch.raw as unknown as (url: string, options: { headers: Headers }) => Promise<{ headers: Headers, _data?: SessionData }>

export async function fetchServerAuthSession(event: H3Event) {
  const headers = new Headers(event.headers)
  headers.delete('content-length')
  headers.delete('content-type')
  const response = await fetchRaw('/api/auth/get-session', { headers })
  for (const cookie of response.headers.getSetCookie?.() ?? [])
    appendResponseHeader(event, 'set-cookie', cookie)
  return authDataForClient(response._data ?? null)
}
