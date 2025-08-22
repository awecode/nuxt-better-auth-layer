import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'auth',
  },
  runtimeConfig: {
    auth: {
      allowedDomains: '',
      allowedEmails: '',
      adminEmails: '',
      authenticatedOnlyApiRoutes: '',
      adminOnlyApiRoutes: '',
    },
    ses: {
      region: 'us-east-1',
      accessKeyId: '',
      secretKey: '',
      fromEmail: '',
    },
    public: {
      auth: {
        redirectUserTo: '/',
        redirectNewUserTo: '/',
        redirectErrorTo: '/auth/error',
        redirectGuestTo: '/login',
        authRequiredByDefault: true,
      },
    },
  }, alias: {
    '#layers/auth': fileURLToPath(new URL('.', import.meta.url)),
  },
  nitro: {
    experimental: {
      asyncContext: true,
    },
  },
})
