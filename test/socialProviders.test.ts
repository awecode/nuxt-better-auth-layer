import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSocialProviders, resolveSocialProviders } from '../server/utils/socialProviders'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveSocialProviders', () => {
  it('enables nothing when Google is not configured', () => {
    expect(resolveSocialProviders({ clientId: '', clientSecret: '' })).toEqual({})
  })

  it('enables Google when both credentials are set', () => {
    expect(resolveSocialProviders({ clientId: 'id', clientSecret: 'secret' })).toEqual({
      google: { clientId: 'id', clientSecret: 'secret' },
    })
  })

  it('throws when only one credential is set', () => {
    expect(() => resolveSocialProviders({ clientId: 'id', clientSecret: '' })).toThrow('NUXT_AUTH_GOOGLE_CLIENT_SECRET')
    expect(() => resolveSocialProviders({ clientId: '', clientSecret: 'secret' })).toThrow('NUXT_AUTH_GOOGLE_CLIENT_ID')
  })
})

describe('getSocialProviders', () => {
  it('reads Google credentials from runtime config', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({ auth: { googleClientId: 'id', googleClientSecret: 'secret' } }))
    expect(getSocialProviders()).toEqual({ google: { clientId: 'id', clientSecret: 'secret' } })
  })

  it('enables nothing outside the Nuxt runtime', () => {
    expect(getSocialProviders()).toEqual({})
  })
})

describe('better-auth with the resolved providers', () => {
  const create = (socialProviders: ReturnType<typeof resolveSocialProviders>) => betterAuth({
    baseURL: 'https://app.example.com',
    secret: 'test-secret-that-is-long-enough-for-better-auth',
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    socialProviders,
  })

  const signInGoogle = (auth: ReturnType<typeof create>) => auth.handler(new Request('https://app.example.com/api/auth/sign-in/social', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'origin': 'https://app.example.com' },
    body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
  }))

  it('redirects to Google with the layer callback when configured', async () => {
    const response = await signInGoogle(create(resolveSocialProviders({ clientId: 'id', clientSecret: 'secret' })))
    expect(response.status).toBe(200)
    const url = new URL((await response.json()).url)
    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.searchParams.get('client_id')).toBe('id')
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/api/auth/callback/google')
  })

  it('rejects Google sign-in when not configured', async () => {
    const response = await signInGoogle(create(resolveSocialProviders({})))
    expect(response.status).toBeGreaterThanOrEqual(400)
  })
})
