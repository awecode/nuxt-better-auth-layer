import { describe, expect, it } from 'vitest'
import { toMagicLinkConfirmUrl } from '../server/utils/magicLinkConfirmUrl'
import { safeInternalPath } from '../shared/safeInternalPath'

describe('toMagicLinkConfirmUrl', () => {
  it('rewrites the one-shot verify URL into a confirm page on the same origin', () => {
    const confirm = new URL(toMagicLinkConfirmUrl(
      'https://example.com/api/auth/magic-link/verify?token=raw&callbackURL=%2Fadmin&newUserCallbackURL=%2Fwelcome&errorCallbackURL=%2Fauth%2Ferror',
      'plain-token',
    ))

    expect(confirm.origin).toBe('https://example.com')
    expect(confirm.pathname).toBe('/auth/confirm')
    expect(confirm.searchParams.get('token')).toBe('plain-token')
    expect(confirm.searchParams.get('callbackURL')).toBe('/admin')
    expect(confirm.searchParams.get('newUserCallbackURL')).toBe('/welcome')
    expect(confirm.searchParams.get('errorCallbackURL')).toBe('/auth/error')
    expect(confirm.pathname).not.toContain('verify')
  })

  it('omits callback params that the verify URL does not have', () => {
    const confirm = new URL(toMagicLinkConfirmUrl(
      'https://example.com/api/auth/magic-link/verify?token=raw',
      'plain-token',
    ))

    expect(confirm.searchParams.get('token')).toBe('plain-token')
    expect(confirm.searchParams.get('callbackURL')).toBeNull()
    expect(confirm.searchParams.get('errorCallbackURL')).toBeNull()
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
