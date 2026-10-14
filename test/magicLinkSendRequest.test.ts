import { describe, expect, it } from 'vitest'
import { magicLinkSignInRequest } from '../server/utils/magicLinkSendRequest'

describe('magicLinkSignInRequest', () => {
  it('sends the email through the rate-limited sign-in route', async () => {
    const request = new Request('https://app.example/api/auth/magic-link-send', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'content-length': '20',
        'x-forwarded-for': '203.0.113.5',
      },
      body: 'ignored',
    })

    const forwarded = magicLinkSignInRequest(request, 'a@example.com')

    expect(new URL(forwarded.url).pathname).toBe('/api/auth/sign-in/magic-link')
    expect(forwarded.method).toBe('POST')
    expect(forwarded.headers.get('content-type')).toBe('application/json')
    expect(forwarded.headers.get('content-length')).toBeNull()
    expect(forwarded.headers.get('x-forwarded-for')).toBe('203.0.113.5')
    expect(await forwarded.json()).toEqual({ email: 'a@example.com' })
  })

  it('refuses to forward a request that is not the send route', () => {
    const request = new Request('https://app.example/api/auth/sign-in/magic-link', { method: 'POST' })
    expect(() => magicLinkSignInRequest(request, 'a@example.com')).toThrow('/magic-link-send')
  })
})
