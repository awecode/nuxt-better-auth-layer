import magicLinkTemplate from '../templates/magic-link.html'
import { sendSesEmail } from './ses'

export const prepareEmailFromTemplate = (data: Record<string, string>): string => {
  return magicLinkTemplate
}

export const sendMagicLinkEmail = async (email: string, token: string, url: string) => {
  const template = prepareEmailFromTemplate({ token, url })
  await sendSesEmail({
    toEmails: [email],
    subject: 'Magic Link',
    message: template,
    html: template,
  })
}