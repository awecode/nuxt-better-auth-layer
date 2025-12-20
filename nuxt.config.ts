import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'auth',
  },
  runtimeConfig: {
    auth: {
      allowedDomains: process.env.NUXT_AUTH_ALLOWED_DOMAINS || '',
      allowedEmails: process.env.NUXT_AUTH_ALLOWED_EMAILS || '',
      adminEmails: process.env.NUXT_AUTH_ADMIN_EMAILS || '',
      authenticatedOnlyApiRoutes: process.env.NUXT_AUTH_AUTHENTICATED_ONLY_API_ROUTES || '',
      adminOnlyApiRoutes: process.env.NUXT_AUTH_ADMIN_ONLY_API_ROUTES || '',
    },
    ses: {
      region: process.env.NUXT_SES_REGION || 'us-east-1',
      accessKeyId: process.env.NUXT_SES_ACCESS_KEY_ID || '',
      secretKey: process.env.NUXT_SES_SECRET_KEY || '',
      fromEmail: process.env.NUXT_SES_FROM_EMAIL || '',
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
