import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, bearer } from 'better-auth/plugins'
import { useDb } from '../../../../server/utils/db'
import { sendMagicLinkEmail } from './email'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    bearer(),
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
})
