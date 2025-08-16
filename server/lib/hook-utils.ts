import { APIError } from 'better-auth/api'
import type { MiddlewareContext, MiddlewareOptions, User } from 'better-auth'

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

/**
 * Set admin role for email if email is in NUXT_AUTH_ADMIN_EMAILS environment variable
 * This only works for user create databaseHooks
 * @param user - User object
 * @returns User object with admin role set if email is in NUXT_AUTH_ADMIN_EMAILS environment variable
 */
export const setAdminForEmail = (user: User) => {
  const config = useRuntimeConfig()
  const adminEmails = config.auth.adminEmails?.split(',') || []
  if (adminEmails.includes(user.email)) {
    return {
      data: {
        ...user,
        role: 'admin',
      },
    }
  }
  return {
    data: user,
  }
}
