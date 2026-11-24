import { describe, expect, it, vi } from 'vitest'

// Stands in for an app's app/auth.client.options.ts adding organizationClient()
vi.mock('#auth-client-options', () => ({ default: { plugins: [{ id: 'organization' }] } }))

const { authClientConfig } = await import('../app/composables/auth.client.config')

describe('client config', () => {
  it('adds app client plugins before customSessionClient', () => {
    expect(authClientConfig.plugins.map(plugin => plugin.id)).toEqual(['magic-link', 'admin-client', 'organization', 'infer-server-plugin'])
  })
})
