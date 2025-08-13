import { betterAuth } from 'better-auth'
import { magicLink } from 'better-auth/plugins'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        console.log(email, token, url)
      },
    }),
  ],
  // database: drizzleAdapter(useDb(), {
  //   provider: 'sqlite',
  //   usePlural: true,
  // }),
})
