import magicLinkTemplate from '../templates/magic-link.html'
import { sendSesEmail } from './ses'

function htmlToText(html: string) {
  return html
    // Remove script, style, comments
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Replace block tags with newlines
    .replace(/<\/(p|div|td|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '- ')
    // Convert links: inner text - href
    .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, inner) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      return `${text} - ${href}`
    })
    // Remove all other tags
    .replace(/<[^>]+>/g, '')
    // Decode entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // Collapse multiple spaces into one
    .replace(/[ \t]+/g, ' ')
    // Collapse multiple newlines into max 2
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    // Trim each line and overall
    .split('\n').map(line => line.trim()).join('\n').trim()
}


export const renderTemplate = (template: string, variables: Record<string, string | number>): string => {
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    template = template.replace(regex, value.toString())
  }
  return template
}

export function getUserAgentInfo(ua: string): string {
  let browser: string | null = null
  let os: string | null = null

  // Detect OS
  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10'
  else if (/windows nt 11\.0/i.test(ua)) os = 'Windows 11'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/mac os x/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'
  else if (/linux/i.test(ua)) os = 'Linux'
  else if (/cros/i.test(ua)) os = 'ChromeOS'

  // Detect Browser
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge'
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome'
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
  else if (/firefox\//i.test(ua)) browser = 'Firefox'
  else if (/opera|opr\//i.test(ua)) browser = 'Opera'
  else if (/chromium/i.test(ua)) browser = 'Chromium'

  if (browser && os) return `${browser}, ${os}`
  return browser || os || 'Unknown'
}

export const sendMagicLinkEmail = async (email: string, token: string, url: string, request: Request) => {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const useragent = getUserAgentInfo(request.headers.get('user-agent') || '')

  const html = renderTemplate(magicLinkTemplate, { email, token, url, date, time, useragent })
  const text = htmlToText(html)
  await sendSesEmail({
    toEmails: [email],
    subject: 'Log in to your account',
    html,
    message: text,
  })
}