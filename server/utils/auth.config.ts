import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, bearer, admin, customSession } from 'better-auth/plugins'
import { sessionForClient } from '../../shared/sessionForClient'
import { createAuthMiddleware } from 'better-auth/api'
import { allowListedEmail, allowListedSignup, sessionUserEmail } from '../lib/hook-utils'
// import { setAdminForEmail } from '../lib/hook-utils'
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
    // Allowlist from NUXT_AUTH_ALLOWED_EMAILS and NUXT_AUTH_ALLOWED_DOMAINS.
    // Nobody can log in until one is set; use `*` to allow everyone.
    hooks: {
      // Rejects magic-link requests early, so no email goes to a disallowed address.
      before: createAuthMiddleware(async (ctx) => {
        allowListedSignup(ctx)
      }),
    },
    // Database hooks run for every sign-in method (magic link, Google, OAuth).
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            allowListedEmail(user.email, ctx)
            // Automatically set admin role for configured emails
            // return setAdminForEmail(user)
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
  } satisfies BetterAuthOptions
}
