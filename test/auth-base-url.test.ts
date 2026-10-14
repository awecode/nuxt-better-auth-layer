import { describe, expect, it } from 'vitest'
import { resolveAuthBaseURL } from '../server/utils/authBaseUrl'

describe('resolveAuthBaseURL', () => {
  it('uses the first configured URL', () => {
    expect(resolveAuthBaseURL([
      'https://auth.example',
      'https://public.example',
    ])).toBe('https://auth.example')
  })

  it('falls through empty values to the public URL', () => {
    expect(resolveAuthBaseURL([
      '',
      undefined,
      'https://public.example',
    ])).toBe('https://public.example')
  })

  it('refuses to run without a configured URL', () => {
    expect(() => resolveAuthBaseURL([undefined, '', undefined]))
      .toThrow('Set BETTER_AUTH_URL or NUXT_PUBLIC_BASE_URL')
  })
})
