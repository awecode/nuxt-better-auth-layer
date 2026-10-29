import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { createAuthMiddleware } from 'better-auth/api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeAuth = { allowedDomains: '', allowedEmails: '', adminEmails: '' }
const appUserHook = vi.fn()
vi.mock('../server/utils/email', () => ({ sendMagicLinkEmail: vi.fn() }))
vi.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: () => ({}) }))
vi.stubGlobal('useRuntimeConfig', () => ({ auth: { ...runtimeAuth, googleClientId: 'g-id', googleClientSecret: 'g-secret' }, public: { auth: { redirectErrorTo: '/auth/error' } } }))

// Stands in for an app's server/auth.options.ts, like book-creator (email
// normalization, rate limits, an extra plugin) and nt (staff role).
vi.mock('#auth-options', () => ({
  default: {
    rateLimit: { enabled: false, window: 60, max: 100 },
    socialProviders: { github: { clientId: 'gh-id', clientSecret: 'gh-secret' } },
    plugins: [{ id: 'app-plugin' }],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (typeof ctx.body?.email === 'string')
          ctx.body.email = ctx.body.email.trim().toLowerCase()
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: { email: string, role?: string }) => {
            appUserHook(user.email)
            return { data: { ...user, role: user.role === 'admin' ? 'admin' : 'staff' } }
          },
        },
      },
    },
  },
}))

const { createAuthConfig } = await import('../server/utils/auth.config')

const baseURL = 'https://app.example.com'

function createAuth() {
  const db = { user: [], session: [], account: [], verification: [] } as Record<string, Record<string, unknown>[]>
  const auth = betterAuth({
    ...createAuthConfig({ id: 'db' }),
    baseURL,
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
  })
  return { auth, db }
}

const signUp = (auth: ReturnType<typeof createAuth>['auth'], email: string) => auth.handler(new Request(`${baseURL}/api/auth/sign-up/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'origin': baseURL },
  body: JSON.stringify({ email, password: 'a-long-test-password', name: 'A' }),
}))

beforeEach(() => {
  appUserHook.mockClear()
  runtimeAuth.allowedEmails = 'a@example.com,boss@example.com'
  runtimeAuth.adminEmails = 'boss@example.com'
})

afterEach(() => {
  runtimeAuth.adminEmails = ''
})

describe('app options', () => {
  it('keeps app options and adds app plugins before customSession', () => {
    const config = createAuthConfig({ id: 'db' })
    expect(config.rateLimit).toEqual({ enabled: false, window: 60, max: 100 })
    const ids = config.plugins.map(plugin => plugin.id)
    expect(ids[0]).toBe('auth-layer-allowlist')
    expect(ids).toContain('app-plugin')
    expect(ids.at(-1)).toBe('custom-session')
  })

  it('adds app social providers to Google from env', () => {
    expect(Object.keys(createAuthConfig({ id: 'db' }).socialProviders)).toEqual(['google', 'github'])
  })

  it('runs the app request hook before the allowlist', async () => {
    const { auth, db } = createAuth()
    expect((await signUp(auth, ' A@Example.com ')).status).toBe(200)
    expect(db.user[0]?.email).toBe('a@example.com')
  })

  it('runs the app user hook after the layer allows the user', async () => {
    const { auth, db } = createAuth()
    expect((await signUp(auth, 'a@example.com')).status).toBe(200)
    expect((await signUp(auth, 'boss@example.com')).status).toBe(200)
    expect(db.user.map(user => [user.email, user.role])).toEqual([['a@example.com', 'staff'], ['boss@example.com', 'admin']])
  })

  it('never runs the app user hook for a disallowed email', async () => {
    const { auth, db } = createAuth()
    expect((await signUp(auth, 'other@example.com')).status).toBe(400)
    expect(appUserHook).not.toHaveBeenCalled()
    expect(db.user).toHaveLength(0)
  })
})
