import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'auth',
  },
  runtimeConfig: {
    auth: {
      dbProvider: process.env.NUXT_AUTH_DB_PROVIDER || 'pg',
      allowedDomains: process.env.NUXT_AUTH_ALLOWED_DOMAINS || '',
      allowedEmails: process.env.NUXT_AUTH_ALLOWED_EMAILS || '',
      adminEmails: process.env.NUXT_AUTH_ADMIN_EMAILS || '',
      authenticatedOnlyApiRoutes: process.env.NUXT_AUTH_AUTHENTICATED_ONLY_API_ROUTES || '',
      adminOnlyApiRoutes: process.env.NUXT_AUTH_ADMIN_ONLY_API_ROUTES || '',
      googleClientId: process.env.NUXT_AUTH_GOOGLE_CLIENT_ID || '',
      googleClientSecret: process.env.NUXT_AUTH_GOOGLE_CLIENT_SECRET || '',
      magicLinkSubject: process.env.NUXT_AUTH_MAGIC_LINK_SUBJECT || 'Log in to your account',
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
        // Shows the Google button on the login page. Set NUXT_PUBLIC_AUTH_GOOGLE_LOGIN=true with the Google credentials.
        googleLogin: false,
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
  modules: [
    // #auth-options is the app's server/auth.options.ts (extra better-auth
    // plugins, hooks and options), or the layer's empty default.
    (_options, nuxt) => {
      const appOptions = join(nuxt.options.serverDir, 'auth.options.ts')
      nuxt.options.alias['#auth-options'] = existsSync(appOptions) ? appOptions : join(currentDir, 'server/auth.options.ts')
    },
  ],
  hooks: {
    'nitro:config'(nitroConfig) {
      nitroConfig.serverAssets = nitroConfig.serverAssets || []
      nitroConfig.serverAssets.push({
        baseName: 'auth',
        dir: join(currentDir, 'server/assets'),
      })
    },
  },
})
