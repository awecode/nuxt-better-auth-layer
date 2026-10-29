import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDbProvider, resolveDbProvider } from '../server/utils/dbProvider'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('resolveDbProvider', () => {
  it('defaults to pg', () => {
    expect(resolveDbProvider('')).toBe('pg')
    expect(resolveDbProvider(undefined)).toBe('pg')
  })

  it('accepts sqlite and mysql', () => {
    expect(resolveDbProvider('sqlite')).toBe('sqlite')
    expect(resolveDbProvider('mysql')).toBe('mysql')
  })

  it('throws on an unknown provider', () => {
    expect(() => resolveDbProvider('postgres')).toThrow('NUXT_AUTH_DB_PROVIDER')
  })
})

describe('getDbProvider', () => {
  it('reads runtime config', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ auth: { dbProvider: 'sqlite' } }))
    expect(getDbProvider()).toBe('sqlite')
  })

  it('reads the env var outside the Nuxt runtime', () => {
    vi.stubEnv('NUXT_AUTH_DB_PROVIDER', 'sqlite')
    expect(getDbProvider()).toBe('sqlite')
  })
})
