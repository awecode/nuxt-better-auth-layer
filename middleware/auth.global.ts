import { authClient } from '#layers/auth/utils/auth'

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { public: { auth } } = useRuntimeConfig()
  const authRequired = to.meta.auth ?? auth.authRequiredByDefault

  if (authRequired) {
    const { data: sessionData } = await authClient.useSession(useFetch)
    if (!sessionData.value) {
      return navigateTo(auth.loginPage)
    }
  }
})
