import { describe, expect, it } from 'vitest'
import { sessionForClient } from '../shared/sessionForClient'

describe('sessionForClient', () => {
  it('drops the bearer token and keeps the rest of the session', () => {
    const session = sessionForClient({
      id: 'session-id',
      userId: 'user-id',
      token: 'secret-session',
      expiresAt: '2026-10-15T00:00:00.000Z',
    })

    expect(session).toEqual({
      id: 'session-id',
      userId: 'user-id',
      expiresAt: '2026-10-15T00:00:00.000Z',
    })
    expect(session).not.toHaveProperty('token')
  })

  it('returns null when there is no session', () => {
    expect(sessionForClient(null)).toBeNull()
    expect(sessionForClient(undefined)).toBeNull()
  })
})
