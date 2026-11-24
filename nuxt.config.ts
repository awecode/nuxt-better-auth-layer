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
      // Copies of the two settings above as set in nuxt.config (filled at build
      // time, see the nitro:config hook). The middleware uses them when the env
      // var is empty.
      authenticatedOnlyApiRoutesDefault: '',
      adminOnlyApiRoutesDefault: '',
      googleClientId: process.env.NUXT_AUTH_GOOGLE_CLIENT_ID || '',
      // Secrets default to empty: nuxt.config runs at build time, and a value
      // read here would be copied into the build. NUXT_AUTH_GOOGLE_CLIENT_SECRET
      // and NUXT_SES_SECRET_KEY still set them at runtime.
      googleClientSecret: '',
      magicLinkSubject: process.env.NUXT_AUTH_MAGIC_LINK_SUBJECT || 'Log in to your account',
      // Seconds a magic link stays valid
      magicLinkExpiresIn: process.env.NUXT_AUTH_MAGIC_LINK_EXPIRES_IN || 300,
    },
    ses: {
      region: process.env.NUXT_SES_REGION || 'us-east-1',
      accessKeyId: process.env.NUXT_SES_ACCESS_KEY_ID || '',
      secretKey: '',
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
    // #auth-client-options is the app's app/auth.client.options.ts (extra
    // better-auth client plugins), or the layer's empty default.
    (_options, nuxt) => {
      const appOptions = join(nuxt.options.serverDir, 'auth.options.ts')
      nuxt.options.alias['#auth-options'] = existsSync(appOptions) ? appOptions : join(currentDir, 'server/auth.options.ts')
      const appClientOptions = join(nuxt.options.srcDir, 'auth.client.options.ts')
      nuxt.options.alias['#auth-client-options'] = existsSync(appClientOptions) ? appClientOptions : join(currentDir, 'app/auth.client.options.ts')
    },
  ],
  hooks: {
    'nitro:config'(nitroConfig) {
      // A NUXT_AUTH_*_ONLY_API_ROUTES env var replaces runtimeConfig even when
      // it is empty, so keep the nuxt.config routes for the middleware to fall back to.
      const auth = nitroConfig.runtimeConfig!.auth
      auth.authenticatedOnlyApiRoutesDefault = auth.authenticatedOnlyApiRoutes
      auth.adminOnlyApiRoutesDefault = auth.adminOnlyApiRoutes
      nitroConfig.serverAssets = nitroConfig.serverAssets || []
      nitroConfig.serverAssets.push({
        baseName: 'auth',
        dir: join(currentDir, 'server/assets'),
      })
    },
  },
})
