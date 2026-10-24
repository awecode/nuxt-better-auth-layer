import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const betterAuth = vi.fn((options: unknown) => ({ options }))
const useDb = vi.fn((event: H3Event) => ({ event }))

vi.mock('better-auth', () => ({ betterAuth }))
vi.mock('~~/server/utils/db', () => ({ useDb, createDbClient: vi.fn() }))
vi.mock('../server/utils/auth.config', () => ({ createAuthConfig: (db: unknown) => ({ db }) }))
vi.mock('../server/utils/authBaseUrl', () => ({ getAuthBaseURL: () => 'https://example.com' }))

const { useServerAuth } = await import('../server/utils/auth')

function fakeEvent() {
  return { context: {} } as H3Event
}

describe('useServerAuth', () => {
  beforeEach(() => {
    betterAuth.mockClear()
    useDb.mockClear()
  })

  it('builds one instance per request and reuses it', () => {
    const event = fakeEvent()
    const first = useServerAuth(event)
    expect(useServerAuth(event)).toBe(first)
    expect(betterAuth).toHaveBeenCalledTimes(1)
    expect(event.context.betterAuth).toBe(first)
  })

  it('builds a separate instance on the request database for each request', () => {
    const a = fakeEvent()
    const b = fakeEvent()
    expect(useServerAuth(a)).not.toBe(useServerAuth(b))
    expect(useDb).toHaveBeenNthCalledWith(1, a)
    expect(useDb).toHaveBeenNthCalledWith(2, b)
    expect(betterAuth).toHaveBeenLastCalledWith({ db: { event: b }, baseURL: 'https://example.com' })
  })

  it('uses the current request when no event is passed', () => {
    const event = fakeEvent()
    vi.stubGlobal('useEvent', () => event)
    expect(useServerAuth()).toBe(event.context.betterAuth)
  })
})
