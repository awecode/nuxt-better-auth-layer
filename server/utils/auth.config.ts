import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, bearer, admin } from 'better-auth/plugins'
// import { createAuthMiddleware } from 'better-auth/api'
// import { allowDomains, allowEmails, setAdminForEmail } from '../lib/hook-utils'
import { useDb } from '../../../../server/utils/db'

import { sendMagicLinkEmail } from './email'
import type { BetterAuthOptions } from 'better-auth'

export const authConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    bearer(),
    admin(),
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        await sendMagicLinkEmail(email, token, url, request)
      },
    }),
  ],
  database: drizzleAdapter(useDb(), {
    provider: 'sqlite',
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
