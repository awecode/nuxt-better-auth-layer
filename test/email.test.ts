import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserAgentInfo, renderTemplate, sendMagicLinkEmail } from '../server/utils/email'

const sendSesEmail = vi.hoisted(() => vi.fn())

vi.mock('../server/utils/ses', () => ({
  sendSesEmail,
}))

const ses = {
  secretKey: '',
  region: 'us-east-1',
  accessKeyId: '',
  fromEmail: '',
}

let template: string | null = '<p>Hi {{ email }}</p><a href="{{ url }}">Log in</a><div>{{ token }}</div><p>{{ useragent }}</p>'

const auth = { magicLinkSubject: 'Log in to your account' }

vi.stubGlobal('useRuntimeConfig', () => ({ ses, auth }))
vi.stubGlobal('useStorage', () => ({
  getItem: async () => template,
}))

describe('renderTemplate', () => {
  it('fills placeholders and ignores unknown keys', () => {
    expect(renderTemplate('Hello {{ email }}, code {{ token }} {{ missing }}', {
      email: 'a@example.com',
      token: 1234,
    })).toBe('Hello a@example.com, code 1234 {{ missing }}')
  })

  it('allows spaces inside the braces', () => {
    expect(renderTemplate('{{email}}', { email: 'a@example.com' })).toBe('a@example.com')
  })
})

describe('getUserAgentInfo', () => {
  it('names the browser and operating system', () => {
    expect(getUserAgentInfo(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )).toBe('Chrome, Windows 10')

    expect(getUserAgentInfo(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    )).toBe('Microsoft Edge, Windows 10')

    expect(getUserAgentInfo(
      'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
    )).toBe('Firefox, Linux')

    expect(getUserAgentInfo(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    )).toBe('Safari, macOS')

    expect(getUserAgentInfo(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    )).toBe('Chrome, Android')
  })

  it('returns Unknown when nothing matches', () => {
    expect(getUserAgentInfo('')).toBe('Unknown')
  })
})

describe('sendMagicLinkEmail', () => {
  beforeEach(() => {
    sendSesEmail.mockReset()
    ses.secretKey = ''
    template = '<p>Hi {{ email }}</p><a href="{{ url }}">Log in</a><div>{{ token }}</div><p>{{ useragent }}</p>'
  })

  it('refuses to send when SES is not configured', async () => {
    await expect(sendMagicLinkEmail('a@example.com', 'tok', 'https://example.com/verify'))
      .rejects.toThrow('No SES configuration found.')
    expect(sendSesEmail).not.toHaveBeenCalled()
  })

  it('refuses to send when the email template is missing', async () => {
    ses.secretKey = 'secret'
    template = null
    await expect(sendMagicLinkEmail('a@example.com', 'tok', 'https://example.com/verify'))
      .rejects.toThrow('Magic link email template not found')
  })

  it('renders the template and sends html plus plain text', async () => {
    ses.secretKey = 'secret'
    const request = {
      getHeader: (name: string) => name.toLowerCase() === 'user-agent'
        ? 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0'
        : null,
    } as Parameters<typeof sendMagicLinkEmail>[3]

    await sendMagicLinkEmail('a@example.com', 'tok-1', 'https://example.com/verify', request)

    expect(sendSesEmail).toHaveBeenCalledOnce()
    const params = sendSesEmail.mock.calls[0][0]
    expect(params.toEmails).toEqual(['a@example.com'])
    expect(params.subject).toBe('Log in to your account')
    expect(params.html).toContain('a@example.com')
    expect(params.html).toContain('tok-1')
    expect(params.html).toContain('https://example.com/verify')
    expect(params.html).toContain('Firefox, Linux')
    expect(params.message).toContain('Log in - https://example.com/verify')
    expect(params.message).toContain('tok-1')
  })

  it('uses the subject from runtime config', async () => {
    ses.secretKey = 'secret'
    auth.magicLinkSubject = 'Sign in to Quillbind'
    await sendMagicLinkEmail('a@example.com', 'tok-1', 'https://example.com/verify')
    expect(sendSesEmail.mock.calls.at(-1)[0].subject).toBe('Sign in to Quillbind')
    auth.magicLinkSubject = 'Log in to your account'
  })
})
