import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeAuth = { allowedDomains: '', allowedEmails: '', adminEmails: '' }
vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth, public: { auth: { redirectErrorTo: '/auth/error' } } }))

const { allowDomainForEmail, allowEmailForEmail, sessionUserEmail, setAdminForEmail } = await import('../server/lib/hook-utils')

const baseURL = 'https://app.example.com'

// Only the database hooks: no request hooks, so these tests show the
// database hooks alone cover every sign-in method.
function createAuth() {
  const db = { user: [], session: [], account: [], verification: [] } as Record<string, Record<string, unknown>[]>
  const auth = betterAuth({
    baseURL,
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    socialProviders: { google: { clientId: 'id', clientSecret: 'secret' } },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            allowDomainForEmail(user.email, ctx)
            allowEmailForEmail(user.email, ctx)
            return setAdminForEmail(user)
          },
        },
      },
      session: {
        create: {
          before: async (session, ctx) => {
            const email = await sessionUserEmail(session, ctx)
            allowDomainForEmail(email, ctx)
            allowEmailForEmail(email, ctx)
          },
        },
      },
    },
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
  runtimeAuth.allowedDomains = '*'
  runtimeAuth.allowedEmails = '*'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth, public: { auth: { redirectErrorTo: '/auth/error' } } }))
})

describe('allowDomainForEmail and allowEmailForEmail', () => {
  it('allow listed values and the * wildcard', () => {
    runtimeAuth.allowedDomains = 'example.com'
    runtimeAuth.allowedEmails = 'a@example.com'
    expect(() => allowDomainForEmail('b@example.com')).not.toThrow()
    expect(() => allowEmailForEmail('a@example.com')).not.toThrow()
    runtimeAuth.allowedDomains = '*'
    runtimeAuth.allowedEmails = '*'
    expect(() => allowDomainForEmail('x@other.com')).not.toThrow()
    expect(() => allowEmailForEmail('x@other.com')).not.toThrow()
  })

  it('reject unlisted, lookalike, and missing emails', () => {
    runtimeAuth.allowedDomains = 'example.com'
    runtimeAuth.allowedEmails = 'a@example.com'
    expect(() => allowDomainForEmail('a@evilexample.com')).toThrow('not authorized')
    expect(() => allowEmailForEmail('b@example.com')).toThrow('not authorized')
    expect(() => allowDomainForEmail(undefined)).toThrow('not authorized')
    expect(() => allowEmailForEmail(undefined)).toThrow('not authorized')
  })

  it('reject everything when the lists are unset', () => {
    runtimeAuth.allowedDomains = ''
    runtimeAuth.allowedEmails = ''
    expect(() => allowDomainForEmail('a@example.com')).toThrow('not authorized')
    expect(() => allowEmailForEmail('a@example.com')).toThrow('not authorized')
  })
})

describe('sessionUserEmail', () => {
  it('throws when there is no endpoint context to look up the user', async () => {
    await expect(sessionUserEmail({ userId: 'u1' } as never, null)).rejects.toThrow('not authorized')
  })
})

describe('allowlist database hooks', () => {
  it('lets an allowed email sign up', async () => {
    runtimeAuth.allowedEmails = 'a@example.com'
    const { auth, db } = createAuth()
    const res = await post(auth, '/sign-up/email', { email: 'a@example.com', password, name: 'A' })
    expect(res.status).toBe(200)
    expect(db.user).toHaveLength(1)
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
