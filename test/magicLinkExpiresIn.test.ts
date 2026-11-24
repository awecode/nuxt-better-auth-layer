import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_MAGIC_LINK_EXPIRES_IN, getMagicLinkExpiresIn, resolveMagicLinkExpiresIn } from '../server/lib/magicLinkExpiresIn'

describe('magic link lifetime', () => {
  it('defaults to 300 seconds', () => {
    expect(resolveMagicLinkExpiresIn(undefined)).toBe(DEFAULT_MAGIC_LINK_EXPIRES_IN)
    expect(resolveMagicLinkExpiresIn('')).toBe(300)
  })

  it('reads a number or a numeric env string', () => {
    expect(resolveMagicLinkExpiresIn(900)).toBe(900)
    expect(resolveMagicLinkExpiresIn('900')).toBe(900)
  })

  it('rejects values that are not whole positive seconds', () => {
    for (const value of ['15m', '0', '-5', '1.5'])
      expect(() => resolveMagicLinkExpiresIn(value)).toThrow('NUXT_AUTH_MAGIC_LINK_EXPIRES_IN')
  })

  it('uses the default outside the Nuxt runtime', () => {
    vi.stubGlobal('useRuntimeConfig', () => {
      throw new Error('no runtime')
    })
    expect(getMagicLinkExpiresIn()).toBe(300)
    vi.unstubAllGlobals()
  })
})
