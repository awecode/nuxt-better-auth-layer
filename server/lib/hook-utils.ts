import { APIError } from 'better-auth/api'
import type { MiddlewareContext, MiddlewareOptions } from 'better-auth'

type Ctx = MiddlewareContext<MiddlewareOptions>

const { auth } = useRuntimeConfig()

export const allowDomains = (ctx: Ctx) => {
  const signupPaths = ['/sign-up/email', '/sign-in/magic-link']
  if (signupPaths.includes(ctx.path)) {
    const allowedDomains = auth.allowedDomains?.split(',') || []
    if (!allowedDomains.includes('*') && !allowedDomains.some(domain => ctx.body?.email.endsWith(`@${domain}`))) {
      throw new APIError('BAD_REQUEST', {
        message: 'You are not authorized to log in with this email.',
      })
    }
  }
}

export const allowEmails = (ctx: Ctx) => {
  const signupPaths = ['/sign-up/email', '/sign-in/magic-link']
  if (signupPaths.includes(ctx.path)) {
    const allowedEmails = auth.allowedEmails?.split(',') || []
    if (!allowedEmails.includes('*') && !allowedEmails.includes(ctx.body?.email))
      throw new APIError('BAD_REQUEST', {
        message: 'You are not authorized to log in with this email.',
      })
  }
}
