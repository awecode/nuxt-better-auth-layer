import { getSessionCookie } from 'better-auth/cookies'
import { sessionForClient } from '#layers/auth/shared/sessionForClient'

export default defineNuxtPlugin({
  name: 'better-auth-fetch-plugin',
  enforce: 'pre',
  async setup(nuxtApp) {
    // Flag if request is cached
    nuxtApp.payload.isCached = Boolean(useRequestEvent()?.context.cache)
    if (nuxtApp.payload.serverRendered && !nuxtApp.payload.prerenderedAt && !nuxtApp.payload.isCached) {
      const event = useRequestEvent()
      if (!event || getSessionCookie(event.headers) === null)
        return

      const session = useState<unknown>('auth:session', () => null)
      const user = useState<unknown>('auth:user', () => null)
      const { getAuthSession } = await import('#layers/auth/server/utils/session')
      const data = await getAuthSession(event)
      session.value = sessionForClient(data?.session)
      user.value = data?.user ?? null
    }
  },
})
