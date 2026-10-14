import { beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeAuth = {
  allowedDomains: '',
  allowedEmails: '',
  adminEmails: '',
}

vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth }))

const { allowDomains, allowEmails, setAdminForEmail } = await import('../server/lib/hook-utils')

function signupContext(path: string, email?: string) {
  return {
    path,
    body: email === undefined ? {} : { email },
  } as Parameters<typeof allowDomains>[0]
}

describe('allowDomains', () => {
  beforeEach(() => {
    runtimeAuth.allowedDomains = 'example.com,awecode.com'
  })

  it('ignores paths that are not signup', () => {
    expect(() => allowDomains(signupContext('/sign-in/email', 'a@evil.com'))).not.toThrow()
  })

  it('allows an email on a configured domain', () => {
    expect(() => allowDomains(signupContext('/sign-in/magic-link', 'a@example.com'))).not.toThrow()
    expect(() => allowDomains(signupContext('/sign-up/email', 'a@awecode.com'))).not.toThrow()
  })

  it('rejects a lookalike domain', () => {
    expect(() => allowDomains(signupContext('/sign-in/magic-link', 'a@notexample.com')))
      .toThrow('You are not authorized to log in with this email.')
    expect(() => allowDomains(signupContext('/sign-up/email', 'a@example.com.evil')))
      .toThrow('You are not authorized to log in with this email.')
  })

  it('allows every domain when the list is *', () => {
    runtimeAuth.allowedDomains = '*'
    expect(() => allowDomains(signupContext('/sign-in/magic-link', 'a@anywhere.test'))).not.toThrow()
  })
})

describe('allowEmails', () => {
  beforeEach(() => {
    runtimeAuth.allowedEmails = 'staff@example.com,admin@example.com'
  })

  it('allows only the listed addresses on signup', () => {
    expect(() => allowEmails(signupContext('/sign-in/magic-link', 'staff@example.com'))).not.toThrow()
    expect(() => allowEmails(signupContext('/sign-up/email', 'other@example.com')))
      .toThrow('You are not authorized to log in with this email.')
  })

  it('ignores other paths and a wildcard list', () => {
    expect(() => allowEmails(signupContext('/get-session', 'other@example.com'))).not.toThrow()
    runtimeAuth.allowedEmails = '*'
    expect(() => allowEmails(signupContext('/sign-in/magic-link', 'other@example.com'))).not.toThrow()
  })
})

describe('setAdminForEmail', () => {
  beforeEach(() => {
    runtimeAuth.adminEmails = 'admin@example.com'
  })

  it('sets the admin role for a configured email', () => {
    const user = { id: '1', email: 'admin@example.com', name: 'Admin' }
    expect(setAdminForEmail(user as Parameters<typeof setAdminForEmail>[0])).toEqual({
      data: {
        ...user,
        role: 'admin',
      },
    })
  })

  it('leaves other users unchanged', () => {
    const user = { id: '2', email: 'staff@example.com', name: 'Staff' }
    expect(setAdminForEmail(user as Parameters<typeof setAdminForEmail>[0])).toEqual({
      data: user,
    })
  })
})
