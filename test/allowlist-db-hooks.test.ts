import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeAuth = { allowedDomains: '', allowedEmails: '', adminEmails: '' }
// The test passes its own database, so the app's drizzle client is not needed.
vi.mock('../server/utils/email', () => ({ sendMagicLinkEmail: vi.fn() }))
vi.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: () => ({}) }))
vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth, public: { auth: { redirectErrorTo: '/auth/error' } } }))

const { sessionUserEmail } = await import('../server/lib/hook-utils')
const { createAuthConfig } = await import('../server/utils/auth.config')

const baseURL = 'https://app.example.com'

// The layer's config from createAuthConfig, on an in-memory database.
// Email/password sign-in has no request hook, so it shows the database hooks
// alone cover sign-in methods other than the magic link.
function createAuth() {
  const db = { user: [], session: [], account: [], verification: [] } as Record<string, Record<string, unknown>[]>
  const auth = betterAuth({
    ...createAuthConfig({ id: 'db' }),
    baseURL,
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    socialProviders: { google: { clientId: 'id', clientSecret: 'secret' } },
  })
  return { auth, db }
}

const post = (auth: ReturnType<typeof createAuth>['auth'], path: string, body: unknown) => auth.handler(new Request(`${baseURL}/api/auth${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'origin': baseURL },
  body: JSON.stringify(body),
}))

const password = 'a-long-test-password'

beforeEach(() => {
  runtimeAuth.allowedDomains = ''
  runtimeAuth.allowedEmails = '*'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth, public: { auth: { redirectErrorTo: '/auth/error' } } }))
})

describe('sessionUserEmail', () => {
  it('throws when there is no endpoint context to look up the user', async () => {
    await expect(sessionUserEmail({ userId: 'u1' } as never, null)).rejects.toThrow('not authorized')
  })
})

describe('allowlist database hooks', () => {
  it('rejects every sign-up when neither list is set', async () => {
    runtimeAuth.allowedEmails = ''
    const { auth, db } = createAuth()
    const res = await post(auth, '/sign-up/email', { email: 'a@example.com', password, name: 'A' })
    expect(res.status).toBe(400)
    expect(db.user).toHaveLength(0)
  })

  it('lets an email on an allowed domain sign up', async () => {
    runtimeAuth.allowedEmails = ''
    runtimeAuth.allowedDomains = 'example.com'
    const { auth, db } = createAuth()
    expect((await post(auth, '/sign-up/email', { email: 'a@example.com', password, name: 'A' })).status).toBe(200)
    expect(db.user).toHaveLength(1)
  })

  it('lets an allowed email sign up', async () => {
    runtimeAuth.allowedEmails = 'a@example.com'
    const { auth, db } = createAuth()
    const res = await post(auth, '/sign-up/email', { email: 'a@example.com', password, name: 'A' })
    expect(res.status).toBe(200)
    expect(db.user).toHaveLength(1)
  })

  it('gives the admin role to a new user in NUXT_AUTH_ADMIN_EMAILS only', async () => {
    runtimeAuth.adminEmails = 'boss@example.com'
    const { auth, db } = createAuth()
    await post(auth, '/sign-up/email', { email: 'boss@example.com', password, name: 'Boss' })
    await post(auth, '/sign-up/email', { email: 'staff@example.com', password, name: 'Staff' })
    expect(db.user.find(user => user.email === 'boss@example.com')?.role).toBe('admin')
    expect(db.user.find(user => user.email === 'staff@example.com')?.role).toBe('user')
    runtimeAuth.adminEmails = ''
  })

  it('rejects a disallowed sign-up without creating the user', async () => {
    runtimeAuth.allowedEmails = 'a@example.com'
    const { auth, db } = createAuth()
    const res = await post(auth, '/sign-up/email', { email: 'b@example.com', password, name: 'B' })
    expect(res.status).toBe(400)
    expect(db.user).toHaveLength(0)
  })

  it('blocks a new session for an existing user removed from the allowlist', async () => {
    const { auth, db } = createAuth()
    expect((await post(auth, '/sign-up/email', { email: 'a@example.com', password, name: 'A' })).status).toBe(200)
    expect(db.session).toHaveLength(1)

    runtimeAuth.allowedEmails = 'other@example.com'
    const res = await post(auth, '/sign-in/email', { email: 'a@example.com', password })
    expect(res.status).toBe(400)
    expect(db.session).toHaveLength(1)
  })

  describe('Google', () => {
    function fakeIdToken(email: string) {
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
      return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: `google-${email}`, email, email_verified: true, name: 'G', iss: 'https://accounts.google.com', aud: 'id' })}.sig`
    }

    async function signInWithGoogle(auth: ReturnType<typeof createAuth>['auth'], email: string) {
      const start = await post(auth, '/sign-in/social', { provider: 'google', callbackURL: '/admin', errorCallbackURL: '/auth/error' })
      const state = new URL((await start.json()).url).searchParams.get('state')!
      const cookies = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
      const realFetch = globalThis.fetch
      vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).startsWith('https://oauth2.googleapis.com/token'))
          return Response.json({ access_token: 'access', id_token: fakeIdToken(email), token_type: 'Bearer', expires_in: 3600 })
        return realFetch(input, init)
      }))
      return auth.handler(new Request(`${baseURL}/api/auth/callback/google?code=code&state=${state}`, { headers: { cookie: cookies } }))
    }

    it('signs in an allowed Google account', async () => {
      runtimeAuth.allowedEmails = 'g@example.com'
      const { auth, db } = createAuth()
      const res = await signInWithGoogle(auth, 'g@example.com')
      expect(res.headers.get('location')).toBe('/admin')
      expect(db.user).toHaveLength(1)
      expect(db.session).toHaveLength(1)
    })

    it('links Google to an existing user with a verified email', async () => {
      const { auth, db } = createAuth()
      await post(auth, '/sign-up/email', { email: 'g@example.com', password, name: 'A' })
      // Magic-link users always have a verified email.
      db.user[0].emailVerified = true
      const res = await signInWithGoogle(auth, 'g@example.com')
      expect(res.headers.get('location')).toBe('/admin')
      expect(db.user).toHaveLength(1)
      expect(db.account.map(account => account.providerId)).toEqual(['credential', 'google'])
    })

    it('does not link Google to an existing user with an unverified email', async () => {
      const { auth, db } = createAuth()
      await post(auth, '/sign-up/email', { email: 'g@example.com', password, name: 'A' })
      const res = await signInWithGoogle(auth, 'g@example.com')
      expect(res.headers.get('location')).toBe('/auth/error?error=account_not_linked')
      expect(db.account.map(account => account.providerId)).toEqual(['credential'])
    })

    it('sends a user who cancels on Google to the error page', async () => {
      const { auth, db } = createAuth()
      const start = await post(auth, '/sign-in/social', { provider: 'google', callbackURL: '/admin', errorCallbackURL: '/auth/error' })
      const state = new URL((await start.json()).url).searchParams.get('state')!
      const cookies = start.headers.getSetCookie().map(cookie => cookie.split(';')[0]).join('; ')
      const res = await auth.handler(new Request(`${baseURL}/api/auth/callback/google?error=access_denied&state=${state}`, { headers: { cookie: cookies } }))
      expect(res.headers.get('location')).toBe('/auth/error?error=access_denied')
      expect(db.user).toHaveLength(0)
    })

    it('rejects a disallowed Google account without creating the user', async () => {
      runtimeAuth.allowedEmails = 'g@example.com'
      const { auth, db } = createAuth()
      const res = await signInWithGoogle(auth, 'other@example.com')
      expect(res.headers.get('location')).toBe('/auth/error?error=NOT_AUTHORIZED')
      expect(db.user).toHaveLength(0)
      expect(db.session).toHaveLength(0)
    })

    it('rejects an existing Google user removed from the allowlist', async () => {
      runtimeAuth.allowedEmails = 'g@example.com'
      const { auth, db } = createAuth()
      expect((await signInWithGoogle(auth, 'g@example.com')).headers.get('location')).toBe('/admin')

      runtimeAuth.allowedEmails = 'someone-else@example.com'
      const res = await signInWithGoogle(auth, 'g@example.com')
      expect(res.headers.get('location')).toBe('/auth/error?error=NOT_AUTHORIZED')
      expect(db.session).toHaveLength(1)
    })
  })
})
