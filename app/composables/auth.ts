// https://github.com/atinux/nuxthub-better-auth/blob/main/app/composables/auth.ts
import { getSessionCookie } from 'better-auth/cookies'
import { createAuthClient } from 'better-auth/client'
import { defu } from 'defu'
import { authClientConfig } from './auth.client.config'
import { sessionForClient } from '#layers/auth/shared/sessionForClient'
import type {
  InferSessionFromClient,
  InferUserFromClient,
} from 'better-auth/client'
import type { RouteLocationRaw } from 'vue-router'

interface RuntimeAuthConfig {
  redirectUserTo: RouteLocationRaw | string
  redirectGuestTo: RouteLocationRaw | string
  authRequiredByDefault: boolean
}

export function useAuth() {
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders() : undefined

  const clientOptions = {
    ...authClientConfig,
    baseURL: url.origin,
    fetchOptions: {
      headers,
    },
  }

  const client = createAuthClient(clientOptions)

  const options = defu(useRuntimeConfig().public.auth as Partial<RuntimeAuthConfig>, {
    redirectUserTo: '/',
    redirectGuestTo: '/',
  })
  const session = useState<InferSessionFromClient<typeof clientOptions> | null>('auth:session', () => null)
  const user = useState<InferUserFromClient<typeof clientOptions> | null>('auth:user', () => null)
  const sessionFetching = import.meta.server ? ref(false) : useState('auth:sessionFetching', () => false)

  const fetchSession = async () => {
    if (sessionFetching.value) {
      return
    }
    sessionFetching.value = true
    if (import.meta.server) {
      const event = useRequestEvent()
      if (!event || getSessionCookie(event.headers) === null) {
        session.value = null
        user.value = null
        sessionFetching.value = false
        return null
      }

      // HTTP fallback if in-process reads break on Workers:
      // const result = await useFetch('/api/auth/get-session', { headers })
      // const data = result.data.value
      const { getAuthSession } = await import('#layers/auth/server/utils/session')
      const data = await getAuthSession(event)

      session.value = sessionForClient(data?.session) as typeof session.value
      user.value = (data?.user ?? null) as typeof user.value
      sessionFetching.value = false
      return data
    }
    else {
      const { data } = await client.getSession({
        fetchOptions: {
          headers,
        },
      })
      session.value = sessionForClient(data?.session) as typeof session.value
      user.value = data?.user || null
      sessionFetching.value = false
      return data
    }
  }

  const signOut = async ({ redirectTo }: { redirectTo?: RouteLocationRaw } = {}) => {
    const res = await client.signOut()
    session.value = null
    user.value = null
    if (redirectTo) {
      await navigateTo(redirectTo)
    }
    return res
  }

  if (import.meta.client) {
    client.$store.listen('$sessionSignal', async (signal) => {
      if (!signal) return
      await fetchSession()
    })
  }

  return {
    session,
    sessionFetching,
    user,
    loggedIn: computed(() => !!session.value),
    signIn: client.signIn,
    signUp: client.signUp,
    signOut,
    options,
    fetchSession,
    client,
  }
}
