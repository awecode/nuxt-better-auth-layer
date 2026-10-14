import { describe, expect, it } from 'vitest'
import { parseMagicLinkConfirmHash, toMagicLinkConfirmUrl } from '../server/utils/magicLinkConfirmUrl'
import { safeInternalPath } from '../shared/safeInternalPath'

function fragment(url: string) {
  return new URLSearchParams(new URL(url).hash.slice(1))
}

describe('toMagicLinkConfirmUrl', () => {
  it('puts the token in the fragment, not the query string', () => {
    const raw = toMagicLinkConfirmUrl(
      'https://example.com/api/auth/magic-link/verify?token=raw&callbackURL=%2Fadmin&newUserCallbackURL=%2Fwelcome&errorCallbackURL=%2Fauth%2Ferror',
      'plain-token',
    )
    const confirm = new URL(raw)
    const hash = fragment(raw)

    expect(confirm.origin).toBe('https://example.com')
    expect(confirm.pathname).toBe('/auth/confirm')
    expect(confirm.search).toBe('')
    expect(`${confirm.pathname}${confirm.search}`).not.toContain('plain-token')
    expect(hash.get('token')).toBe('plain-token')
    expect(hash.get('callbackURL')).toBe('/admin')
    expect(hash.get('newUserCallbackURL')).toBe('/welcome')
    expect(hash.get('errorCallbackURL')).toBe('/auth/error')
  })

  it('omits callback params that the verify URL does not have', () => {
    const hash = fragment(toMagicLinkConfirmUrl(
      'https://example.com/api/auth/magic-link/verify?token=raw',
      'plain-token',
    ))

    expect(hash.get('token')).toBe('plain-token')
    expect(hash.get('callbackURL')).toBeNull()
    expect(hash.get('errorCallbackURL')).toBeNull()
  })
})

describe('parseMagicLinkConfirmHash', () => {
  it('reads the token and callback from the fragment', () => {
    expect(parseMagicLinkConfirmHash('#token=plain-token&callbackURL=%2Fadmin')).toEqual({
      token: 'plain-token',
      callbackURL: '/admin',
    })
  })
})

describe('safeInternalPath', () => {
  it('keeps a same-site path', () => {
    expect(safeInternalPath('/admin?tab=1', '/')).toBe('/admin?tab=1')
  })

  it('falls back for off-site and non-string targets', () => {
    expect(safeInternalPath('https://evil.test', '/')).toBe('/')
    expect(safeInternalPath('//evil.test', '/')).toBe('/')
    expect(safeInternalPath('/\\evil.test', '/')).toBe('/')
    expect(safeInternalPath(undefined, '/home')).toBe('/home')
  })
})
