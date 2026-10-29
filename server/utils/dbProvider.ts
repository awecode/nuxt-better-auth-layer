import type { DrizzleAdapterConfig } from 'better-auth/adapters/drizzle'

type DbProvider = DrizzleAdapterConfig['provider']

const providers: DbProvider[] = ['pg', 'sqlite', 'mysql']

export function resolveDbProvider(value?: string): DbProvider {
  if (!value)
    return 'pg'
  if (!providers.includes(value as DbProvider))
    throw new Error(`NUXT_AUTH_DB_PROVIDER must be one of ${providers.join(', ')}, got "${value}".`)
  return value as DbProvider
}

export function getDbProvider() {
  let value: string | undefined
  try {
    value = useRuntimeConfig().auth.dbProvider
  }
  catch {
    // Nuxt runtime is unavailable during the auth schema CLI, which loads .env.
    value = process.env.NUXT_AUTH_DB_PROVIDER
  }
  return resolveDbProvider(value)
}
