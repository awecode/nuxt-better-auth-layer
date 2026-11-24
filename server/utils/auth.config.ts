import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, bearer, admin, customSession } from 'better-auth/plugins'
import { sessionForClient } from '../../shared/sessionForClient'
import { createAuthMiddleware } from 'better-auth/api'
import { allowListedEmail, allowListedSignup, sessionUserEmail, setAdminForEmail } from '../lib/hook-utils'
import { getMagicLinkExpiresIn } from '../lib/magicLinkExpiresIn'
import type { Db } from '~~/server/utils/db'

import { sendMagicLinkEmail } from './email'
import { toMagicLinkConfirmUrl } from './magicLinkConfirmUrl'
import { getSocialProviders } from './socialProviders'
import { getDbProvider } from './dbProvider'
import type { BetterAuthOptions, BetterAuthPlugin, UnionToIntersection } from 'better-auth'
import appOptions from '#auth-options'

// Allowlist from NUXT_AUTH_ALLOWED_EMAILS and NUXT_AUTH_ALLOWED_DOMAINS.
// Nobody can log in until one is set; use `*` to allow everyone.
// A plugin, so the app's own `hooks` and `databaseHooks` add to these instead
// of replacing them. better-auth runs the app's request hooks first, then
// these; and these database hooks first, then the app's.
export const allowlist = {
  id: 'auth-layer-allowlist',
  hooks: {
    before: [{
      matcher: () => true,
      // Rejects magic-link requests early, so no email goes to a disallowed address.
      handler: createAuthMiddleware(async (ctx) => {
        allowListedSignup(ctx)
      }),
    }],
  },
  init: () => ({
    options: {
      // Database hooks run for every sign-in method (magic link, Google, OAuth).
      databaseHooks: {
        user: {
          create: {
            before: async (user, ctx) => {
              allowListedEmail(user.email, ctx)
              // Admin role for emails in NUXT_AUTH_ADMIN_EMAILS (new users only)
              return setAdminForEmail(user)
            },
          },
        },
        session: {
          create: {
            // Blocks existing users whose email was removed from the allowlist.
            before: async (session, ctx) => {
              allowListedEmail(await sessionUserEmail(session, ctx), ctx)
            },
          },
        },
      },
    },
  }),
} satisfies BetterAuthPlugin

// Plugins from the app's server/auth.options.ts, typed so their API methods
// and user fields show up on the auth instance.
type AppPlugins = typeof appOptions extends { plugins: infer P extends BetterAuthPlugin[] } ? P : []
const appPlugins = ((appOptions as BetterAuthOptions).plugins ?? []) as AppPlugins

// better-auth reads plugin user and session fields only from a tuple, and an
// app's `plugins: [...]` is an array. A tuple of the same plugin types:
type LastOf<U> = UnionToIntersection<U extends unknown ? (x: U) => void : never> extends (x: infer L) => void ? L : never
type UnionToTuple<U, L = LastOf<U>> = [U] extends [never] ? [] : [...UnionToTuple<Exclude<U, L>>, L]
// Only for types: customSession's second argument is not used at runtime.
const adminForTypes = admin()
type SessionPlugins = [typeof adminForTypes, ...UnionToTuple<AppPlugins[number]>]

export function createAuthConfig(db: Db) {
  // Defaults the app's server/auth.options.ts may replace. An object, so an app
  // that sets one of them (such as emailAndPassword) is not a duplicate key.
  const defaults = {
    emailAndPassword: {
      enabled: false,
    },
    database: drizzleAdapter(db, {
      // pg by default. Set NUXT_AUTH_DB_PROVIDER=sqlite for SQLite or D1.
      provider: getDbProvider(),
      usePlural: true,
    }),
  }
  return {
    ...defaults,
    // The app's options replace the defaults above. Its social providers and
    // plugins are added to the layer's, and its hooks run alongside the allowlist.
    ...appOptions,
    // Google login turns on when NUXT_AUTH_GOOGLE_CLIENT_ID and NUXT_AUTH_GOOGLE_CLIENT_SECRET are set.
    socialProviders: { ...getSocialProviders(), ...(appOptions as BetterAuthOptions).socialProviders },
    plugins: [
      allowlist,
      bearer(),
      admin(),
      magicLink({
        // Seconds; NUXT_AUTH_MAGIC_LINK_EXPIRES_IN, default 300
        expiresIn: getMagicLinkExpiresIn(),
        // Store a SHA-256 hash. The email still receives the plaintext token.
        storeToken: 'hashed',
        sendMagicLink: async ({ email, token, url }, request) => {
          // Do not email the raw /magic-link/verify GET URL. Scanners prefetch it
          // and burn the one-time token. Paste-token login still works because
          // the plain token in the email body is not fetched.
          const confirmUrl = toMagicLinkConfirmUrl(url, token)
          await sendMagicLinkEmail(email, token, confirmUrl, request)
        },
      }),
      ...appPlugins,
      // Last plugin: replaces GET /get-session JSON so browsers never see session.token.
      // The second argument is only for types: `user` and `session` keep the
      // fields of the admin plugin and the app's plugins (such as
      // session.activeOrganizationId from organization()).
      customSession(async ({ user, session }) => ({
        user,
        session: sessionForClient(session),
      }), { plugins: [admin(), ...appPlugins] as SessionPlugins }),
    ],
  } satisfies BetterAuthOptions
}
