import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateTo = vi.fn((to: unknown) => to)
const loggedIn = { value: false }
const options = {
  redirectUserTo: '/',
  redirectGuestTo: '/login',
  authRequiredByDefault: true,
}

vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
vi.stubGlobal('useAuth', () => ({
  loggedIn,
  options,
}))
vi.stubGlobal('navigateTo', navigateTo)

const middleware = (await import('../app/middleware/auth.global')).default as (to: {
  path: string
  fullPath: string
  meta: { auth?: false | { only?: string } }
}) => Promise<unknown>

function route(path: string, fullPath = path, auth?: false | { only?: string }) {
  return {
    path,
    fullPath,
    meta: auth === undefined ? {} : { auth },
  }
}

describe('auth route middleware', () => {
  beforeEach(() => {
    navigateTo.mockClear()
    loggedIn.value = false
    options.authRequiredByDefault = true
    options.redirectGuestTo = '/login'
  })

  it('sends a guest to login with the page they wanted', async () => {
    await middleware(route('/private', '/private?tab=1'))
    expect(navigateTo).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/private?tab=1' },
    })
  })

  it('does not redirect a guest who is already on the login page', async () => {
    await expect(middleware(route('/login'))).resolves.toBeUndefined()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('leaves a page alone when auth is disabled', async () => {
    await middleware(route('/public', '/public', false))
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('does not send a signed-in user to login', async () => {
    loggedIn.value = true
    await middleware(route('/private'))
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
