import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
// import { createAuthMiddleware } from 'better-auth/api'
import { magicLink, bearer, admin } from 'better-auth/plugins'
// import { runtime } from 'std-env'
import { useDb } from '../../../../server/utils/db'
// import { allowDomains, allowEmails, setAdminForEmail } from '../lib/hook-utils'
import { sendMagicLinkEmail } from './email'

export const createBetterAuth = () => betterAuth({
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
  //     allowDomains(ctx)
  //     // allowEmails(ctx)
  //   }),
  // },
  // databaseHooks: {
  //   user: {
  //     create: {
  //       before: async (user) => {
  //         return setAdminForEmail(user)
  //       },
  //     },
  //   },
  // },
})

// let _auth: ReturnType<typeof createBetterAuth>

// // Used by npm run auth:schema only.
// const isAuthSchemaCommand = process.argv.some(arg => arg.includes('server/database/schema/auth.ts'))
// if (isAuthSchemaCommand) {
//   _auth = createBetterAuth()
// }
// export const auth = _auth!

// export const useServerAuth = () => {
//   if (runtime === 'node') {
//     if (!_auth) {
//       _auth = createBetterAuth()
//     }
//     return _auth
//   }
//   else {
//     return createBetterAuth()
//   }
// }

export const useServerAuth = () => {
  return createBetterAuth()
}
