import magicLinkTemplate from '../templates/magic-link.html'
import { sendSesEmail } from './ses'

function htmlToText(html: string) {
  return html
    // Remove script and style tags + their content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Replace <br> and <p> with line breaks
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip all other HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    // Trim extra spaces/newlines
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

export const renderTemplate = (template: string, variables: Record<string, string | number>): string => {
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    template = template.replace(regex, value.toString())
  }
  return template
}

export const sendMagicLinkEmail = async (email: string, token: string, url: string) => {
  const html = renderTemplate(magicLinkTemplate, { token, url })
  const text = htmlToText(html)
  await sendSesEmail({
    toEmails: [email],
    subject: 'Magic Link',
    html,
    message: text,
  })
}