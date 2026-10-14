import { describe, expect, it } from 'vitest'
import { getSessionCookie } from 'better-auth/cookies'

describe('getSessionCookie', () => {
  it('is null when the request has no session cookie', () => {
    expect(getSessionCookie(new Headers())).toBeNull()
    expect(getSessionCookie(new Headers({ cookie: 'other=1' }))).toBeNull()
  })

  it('reads the better-auth session token', () => {
    const headers = new Headers({
      cookie: 'better-auth.session_token=abc',
    })
    expect(getSessionCookie(headers)).toBe('abc')
  })
})
