import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runtimeAuth = {
  allowedDomains: '',
  allowedEmails: '',
  adminEmails: '',
}

vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth }))

const { allowListedEmail, allowListedSignup, setAdminForEmail } = await import('../server/lib/hook-utils')

afterEach(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({ auth: runtimeAuth }))
})

function signupContext(path: string, email?: string) {
  return {
    path,
    body: email === undefined ? {} : { email },
  } as Parameters<typeof allowListedSignup>[0]
}

const rejected = 'You are not authorized to log in with this email.'

describe('allowListedEmail', () => {
  beforeEach(() => {
    runtimeAuth.allowedDomains = ''
    runtimeAuth.allowedEmails = ''
  })

  it('rejects everyone when both lists are unset', () => {
    expect(() => allowListedEmail('a@example.com')).toThrow(rejected)
  })

  it('allows everyone when either list is *', () => {
    runtimeAuth.allowedEmails = '*'
    expect(() => allowListedEmail('a@anywhere.test')).not.toThrow()
    runtimeAuth.allowedEmails = ''
    runtimeAuth.allowedDomains = '*'
    expect(() => allowListedEmail('a@anywhere.test')).not.toThrow()
  })

  it('allows only the listed addresses', () => {
    runtimeAuth.allowedEmails = 'staff@example.com, admin@example.com'
    expect(() => allowListedEmail('admin@example.com')).not.toThrow()
    expect(() => allowListedEmail('other@example.com')).toThrow(rejected)
  })

  it('allows the listed domains and rejects lookalikes', () => {
    runtimeAuth.allowedDomains = 'example.com,awecode.com'
    expect(() => allowListedEmail('a@example.com')).not.toThrow()
    expect(() => allowListedEmail('a@awecode.com')).not.toThrow()
    expect(() => allowListedEmail('a@notexample.com')).toThrow(rejected)
    expect(() => allowListedEmail('a@example.com.evil')).toThrow(rejected)
  })

  it('allows an email that matches either list when both are set', () => {
    runtimeAuth.allowedDomains = 'company.com'
    runtimeAuth.allowedEmails = 'contractor@gmail.com'
    expect(() => allowListedEmail('a@company.com')).not.toThrow()
    expect(() => allowListedEmail('contractor@gmail.com')).not.toThrow()
    expect(() => allowListedEmail('other@gmail.com')).toThrow(rejected)
  })

  it('ignores case and spaces around list entries', () => {
    runtimeAuth.allowedEmails = ' Boss@Example.com , a@example.com'
    runtimeAuth.allowedDomains = ' Company.ORG '
    expect(() => allowListedEmail('boss@example.com')).not.toThrow()
    expect(() => allowListedEmail('BOSS@example.com')).not.toThrow()
    expect(() => allowListedEmail('a@example.com')).not.toThrow()
    expect(() => allowListedEmail('x@company.org')).not.toThrow()
    expect(() => allowListedEmail('x@COMPANY.org')).not.toThrow()
    expect(() => allowListedEmail('x@company.org.evil.test')).toThrow(rejected)
  })

  it('rejects a missing email', () => {
    runtimeAuth.allowedDomains = 'example.com'
    expect(() => allowListedEmail(undefined)).toThrow(rejected)
  })

  it('reads the allowlist when the check runs', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      auth: {
        allowedDomains: 'later.test',
        allowedEmails: '',
        adminEmails: '',
      },
    }))
    expect(() => allowListedEmail('a@later.test')).not.toThrow()
    expect(() => allowListedEmail('a@example.com')).toThrow(rejected)
  })
})

describe('allowListedSignup', () => {
  beforeEach(() => {
    runtimeAuth.allowedDomains = ''
    runtimeAuth.allowedEmails = 'staff@example.com'
  })

  it('checks magic-link and email sign-up requests', () => {
    expect(() => allowListedSignup(signupContext('/sign-in/magic-link', 'staff@example.com'))).not.toThrow()
    expect(() => allowListedSignup(signupContext('/sign-in/magic-link', 'other@example.com'))).toThrow(rejected)
    expect(() => allowListedSignup(signupContext('/sign-up/email', 'other@example.com'))).toThrow(rejected)
  })

  it('ignores other paths', () => {
    expect(() => allowListedSignup(signupContext('/sign-in/email', 'other@example.com'))).not.toThrow()
    expect(() => allowListedSignup(signupContext('/get-session', 'other@example.com'))).not.toThrow()
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

  it('ignores case and spaces around list entries', () => {
    runtimeAuth.adminEmails = 'a@example.com, Admin@Example.com '
    const user = { id: '1', email: 'admin@example.com', name: 'Admin' }
    expect(setAdminForEmail(user as Parameters<typeof setAdminForEmail>[0]).data).toMatchObject({ role: 'admin' })
  })

  it('leaves other users unchanged', () => {
    const user = { id: '2', email: 'staff@example.com', name: 'Staff' }
    expect(setAdminForEmail(user as Parameters<typeof setAdminForEmail>[0])).toEqual({
      data: user,
    })
  })
})
