import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'
import { sendMagicLinkEmail } from './email'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        await sendMagicLinkEmail(email, token, url)
      },
    }),
  ],
  // database: drizzleAdapter(useDb(), {
  //   provider: 'sqlite',
  //   usePlural: true,
  // }),
})
