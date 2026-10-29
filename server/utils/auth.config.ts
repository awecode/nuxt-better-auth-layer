import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, bearer, admin, customSession } from 'better-auth/plugins'
import { sessionForClient } from '../../shared/sessionForClient'
// import { createAuthMiddleware } from 'better-auth/api'
// import { allowDomainForEmail, allowDomains, allowEmailForEmail, allowEmails, sessionUserEmail, setAdminForEmail } from '../lib/hook-utils'
import type { Db } from '~~/server/utils/db'

import { sendMagicLinkEmail } from './email'
import { toMagicLinkConfirmUrl } from './magicLinkConfirmUrl'
import { getSocialProviders } from './socialProviders'
import type { BetterAuthOptions } from 'better-auth'

export function createAuthConfig(db: Db) {
  return {
    emailAndPassword: {
      enabled: false,
    },
    // Google login turns on when NUXT_AUTH_GOOGLE_CLIENT_ID and NUXT_AUTH_GOOGLE_CLIENT_SECRET are set.
    socialProviders: getSocialProviders(),
    plugins: [
      bearer(),
      admin(),
      magicLink({
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
      // Last plugin: replaces GET /get-session JSON so browsers never see session.token.
      // The second argument only types `user` with the admin fields (role).
      customSession(async ({ user, session }) => ({
        user,
        session: sessionForClient(session),
      }), { plugins: [admin()] }),
    ],
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
    }),
    // Allowlist: enable the request hooks and the database hooks together. The
    // request hooks stop magic-link emails to disallowed addresses. The
    // database hooks cover every sign-in method, Google included, and also
    // block existing users removed from the allowlist.
    // hooks: {
    //   before: createAuthMiddleware(async (ctx) => {
    //     // Only allow emails from configured domains as users
    //     allowDomains(ctx)
    //     // Only allow configured emails as users
    //     allowEmails(ctx)
    //   }),
    // },
    // databaseHooks: {
    //   user: {
    //     create: {
    //       before: async (user, ctx) => {
    //         allowDomainForEmail(user.email, ctx)
    //         allowEmailForEmail(user.email, ctx)
    //         // Automatically set admin role for configured emails
    //         return setAdminForEmail(user)
    //       },
    //     },
    //   },
    //   session: {
    //     create: {
    //       before: async (session, ctx) => {
    //         const email = await sessionUserEmail(session, ctx)
    //         allowDomainForEmail(email, ctx)
    //         allowEmailForEmail(email, ctx)
    //       },
    //     },
    //   },
    // },
  } satisfies BetterAuthOptions
}
