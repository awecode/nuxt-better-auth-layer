import { describe, expect, it } from 'vitest'
import { authDataForClient, sessionForClient } from '../shared/sessionForClient'

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

describe('authDataForClient', () => {
  it('drops the bearer token from session in a get-session payload', () => {
    const data = authDataForClient({
      user: { id: 'u1', email: 'a@example.com' },
      session: {
        id: 's1',
        userId: 'u1',
        token: 'secret-session',
      },
    })

    expect(data?.user).toEqual({ id: 'u1', email: 'a@example.com' })
    expect(data?.session).toEqual({ id: 's1', userId: 'u1' })
    expect(data?.session).not.toHaveProperty('token')
  })

  it('returns null when data is missing', () => {
    expect(authDataForClient(null)).toBeNull()
    expect(authDataForClient(undefined)).toBeNull()
  })
})
