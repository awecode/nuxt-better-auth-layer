import { betterAuth } from 'better-auth'
import type { H3Event } from 'h3'
import type { Db } from '~~/server/utils/db'
import { createDbClient, useDb } from '~~/server/utils/db'
import { getAuthBaseURL } from './authBaseUrl'
import { createAuthConfig } from './auth.config'

export const createBetterAuth = (db: Db) => betterAuth({
  ...createAuthConfig(db),
  baseURL: getAuthBaseURL(),
})

// The better-auth CLI (`pnpm auth:generate`) imports this module outside Nitro.
const isAuthSchemaCommand = process.argv.some(arg => arg === 'generate')
export const auth = isAuthSchemaCommand
  ? createBetterAuth(createDbClient({ url: process.env.NUXT_DATABASE_URL }))
  : undefined!

// One instance per request, built on the request's database pool. Pass the
// event when calling from code outside Nitro's async context, such as a Vue
// SSR plugin.
export const useServerAuth = (event: H3Event = useEvent()) => {
  event.context.betterAuth ??= createBetterAuth(useDb(event))
  return event.context.betterAuth
}

declare module 'h3' {
  interface H3EventContext {
    betterAuth?: ReturnType<typeof createBetterAuth>
  }
}
