import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()

vi.mock('../server/utils/session', () => ({
  getAuthSession: getSession,
}))

const authConfig = {
  authenticatedOnlyApiRoutes: '/api/private',
  adminOnlyApiRoutes: '/api/admin',
}

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('useRuntimeConfig', () => ({
  auth: authConfig,
  public: {
    auth: {
      redirectUserTo: '/',
      redirectGuestTo: '/login',
    },
  },
}))
vi.stubGlobal('getHeader', () => '/account')
vi.stubGlobal('createError', (error: { statusMessage: string }) => Object.assign(new Error(error.statusMessage), error))

const middleware = (await import('../server/middleware/auth')).default as (event: {
  path: string
  headers: Headers
  context: { auth?: unknown }
}) => Promise<void>

function request(path: string, cookie?: string) {
  const headers = new Headers()
  if (cookie)
    headers.set('cookie', cookie)
  return {
    path,
    headers,
    context: {} as { auth?: unknown },
  }
}

const sessionCookie = 'better-auth.session_token=abc'
const member = { user: { role: 'user', email: 'a@example.com' }, session: { id: '1' } }

describe('auth API middleware', () => {
  beforeEach(() => {
    getSession.mockReset()
    getSession.mockResolvedValue(member)
    authConfig.authenticatedOnlyApiRoutes = '/api/private'
    authConfig.adminOnlyApiRoutes = '/api/admin'
  })

  it('does not load a session for a public path', async () => {
    const event = request('/api/open', sessionCookie)
    await middleware(event)
    expect(getSession).not.toHaveBeenCalled()
    expect(event.context.auth).toBeUndefined()
  })

  it('does not treat a longer prefix as protected', async () => {
    const event = request('/api/private-notes', sessionCookie)
    await middleware(event)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('rejects the exact protected path when a query string is present', async () => {
    await expect(middleware(request('/api/private?x=1'))).rejects.toMatchObject({
      statusCode: 401,
    })
    await expect(middleware(request('/api/admin?x=1'))).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(getSession).not.toHaveBeenCalled()
  })

  it('does not treat a longer name plus a query as protected', async () => {
    const event = request('/api/private-notes?x=1', sessionCookie)
    await middleware(event)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('rejects a protected path with no session cookie', async () => {
    await expect(middleware(request('/api/private/profile'))).rejects.toMatchObject({
      statusCode: 401,
      data: { redirect: '/login?redirect=%2Faccount' },
    })
    expect(getSession).not.toHaveBeenCalled()
  })

  it('loads the session and allows a signed-in user on a protected path', async () => {
    const event = request('/api/private', sessionCookie)
    await middleware(event)
    expect(getSession).toHaveBeenCalledOnce()
    expect(event.context.auth).toEqual(member)
  })

  it('rejects a signed-in non-admin on an admin path', async () => {
    await expect(middleware(request('/api/admin/users', sessionCookie))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('allows an admin on an admin path', async () => {
    getSession.mockResolvedValue({ user: { role: 'admin' }, session: { id: '2' } })
    await expect(middleware(request('/api/admin', sessionCookie))).resolves.toBeUndefined()
  })
})
