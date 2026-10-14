import { describe, expect, it } from 'vitest'
import { assertMagicLinkVerifyOrigin, isMagicLinkAutoVerifyPath, magicLinkVerifyCookies, MagicLinkVerifyOriginError } from '../server/utils/magicLinkVerifyRequest'

const baseURL = 'https://app.example/auth'

describe('assertMagicLinkVerifyOrigin', () => {
  it('allows a same-origin fetch', () => {
    const headers = new Headers({
      origin: 'https://app.example',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
    })

    expect(() => assertMagicLinkVerifyOrigin(headers, baseURL)).not.toThrow()
  })

  it('allows a matching referer when the origin header is absent', () => {
    const headers = new Headers({
      referer: 'https://app.example/auth/confirm',
    })

    expect(() => assertMagicLinkVerifyOrigin(headers, baseURL)).not.toThrow()
  })

  it('rejects a cross-site form post', () => {
    const headers = new Headers({
      origin: 'https://evil.example',
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'navigate',
    })

    expect(() => assertMagicLinkVerifyOrigin(headers, baseURL)).toThrow(MagicLinkVerifyOriginError)
  })

  it('rejects a cross-site fetch site even when the origin header matches', () => {
    const headers = new Headers({
      origin: 'https://app.example',
      'sec-fetch-site': 'cross-site',
    })

    expect(() => assertMagicLinkVerifyOrigin(headers, baseURL)).toThrow(MagicLinkVerifyOriginError)
  })

  it('rejects a request with no origin or referer', () => {
    expect(() => assertMagicLinkVerifyOrigin(new Headers(), baseURL)).toThrow(MagicLinkVerifyOriginError)
  })
})

describe('isMagicLinkAutoVerifyPath', () => {
  it('matches the one-shot verify route', () => {
    expect(isMagicLinkAutoVerifyPath('/api/auth/magic-link/verify')).toBe(true)
    expect(isMagicLinkAutoVerifyPath('/api/auth/magic-link/verify/')).toBe(true)
    expect(isMagicLinkAutoVerifyPath('/api/auth/magic-link%2Fverify')).toBe(true)
  })

  it('leaves the confirm POST and the send route alone', () => {
    expect(isMagicLinkAutoVerifyPath('/api/auth/magic-link-verify')).toBe(false)
    expect(isMagicLinkAutoVerifyPath('/api/auth/sign-in/magic-link')).toBe(false)
    expect(isMagicLinkAutoVerifyPath('/api/auth/magic-link/verify-extra')).toBe(false)
  })
})

describe('magicLinkVerifyCookies', () => {
  it('returns the session cookie and not the response body', () => {
    const response = new Response(JSON.stringify({
      token: 'secret-session',
      user: { email: 'a@example.com' },
    }), {
      headers: {
        'content-type': 'application/json',
        'set-cookie': 'better-auth.session_token=abc; HttpOnly; Path=/',
      },
    })

    expect(magicLinkVerifyCookies(response)).toEqual([
      'better-auth.session_token=abc; HttpOnly; Path=/',
    ])
    expect(JSON.stringify(magicLinkVerifyCookies(response))).not.toContain('secret-session')
  })
})
