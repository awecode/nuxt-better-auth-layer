import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const appendResponseHeader = vi.fn()

vi.mock('../server/utils/auth', () => ({ useServerAuth: () => ({ api: { getSession } }) }))
vi.mock('h3', () => ({ appendResponseHeader, defineEventHandler: vi.fn(), createError: vi.fn() }))

const { getAuthSession } = await import('../server/utils/session')

const member = { user: { role: 'user' }, session: { id: '1' } }

function fakeEvent() {
  return { headers: new Headers(), context: {} } as unknown as H3Event
}

describe('getAuthSession', () => {
  beforeEach(() => {
    getSession.mockReset()
    appendResponseHeader.mockReset()
  })

  it('forwards refreshed session cookies to the response', async () => {
    const headers = new Headers()
    headers.append('set-cookie', 'better-auth.session_token=new; Max-Age=604800')
    getSession.mockResolvedValue({ response: member, headers })
    const event = fakeEvent()

    expect(await getAuthSession(event)).toEqual(member)
    expect(getSession).toHaveBeenCalledWith({ headers: event.headers, returnHeaders: true })
    expect(appendResponseHeader).toHaveBeenCalledWith(event, 'set-cookie', 'better-auth.session_token=new; Max-Age=604800')
  })

  it('reads the session once per request', async () => {
    getSession.mockResolvedValue({ response: member, headers: new Headers() })
    const event = fakeEvent()
    await getAuthSession(event)
    await getAuthSession(event)
    expect(getSession).toHaveBeenCalledOnce()
    expect(appendResponseHeader).not.toHaveBeenCalled()
  })
})
