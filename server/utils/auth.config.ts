import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, bearer, admin } from 'better-auth/plugins'
// import { createAuthMiddleware } from 'better-auth/api'
// import { allowDomains, allowEmails, setAdminForEmail } from '../lib/hook-utils'
import { useDb } from '../../../../server/utils/db'

import { sendMagicLinkEmail } from './email'
import { toMagicLinkConfirmUrl } from './magicLinkConfirmUrl'
import type { BetterAuthOptions } from 'better-auth'

export function createAuthConfig(): BetterAuthOptions {
  return {
    emailAndPassword: {
      enabled: false,
    },
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
    ],
    database: drizzleAdapter(useDb(), {
      provider: 'pg',
      usePlural: true,
    }),
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
    //       before: async (user) => {
    //         // Automatically set admin role for configured emails
    //         return setAdminForEmail(user)
    //       },
    //     },
    //   },
    // },
  }
}
