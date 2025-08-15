import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { magicLink, bearer, admin } from 'better-auth/plugins'
import { useDb } from '../../../../server/utils/db'
import { allowDomains, allowEmails } from '../lib/hook-utils'
import { sendMagicLinkEmail } from './email'

export const auth = betterAuth({
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      allowDomains(ctx)
      allowEmails(ctx)
    }),
  },
})
