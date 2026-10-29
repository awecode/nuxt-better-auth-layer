import { APIError } from 'better-auth/api'
import type { GenericEndpointContext, MiddlewareContext, MiddlewareOptions, Session, User } from 'better-auth'

type Ctx = MiddlewareContext<MiddlewareOptions>

function authConfig() {
  return useRuntimeConfig().auth
}

const signupPaths = ['/sign-up/email', '/sign-in/magic-link']

const oauthCallbackPaths = ['/callback/', '/oauth2/callback/']

function notAuthorized(ctx?: GenericEndpointContext | null) {
  // An OAuth callback is a browser navigation back from the provider, so send
  // the user to the error page instead of answering with JSON.
  if (ctx && oauthCallbackPaths.some(path => ctx.path?.startsWith(path))) {
    const errorPage = useRuntimeConfig().public.auth?.redirectErrorTo || '/auth/error'
    return ctx.redirect(`${errorPage}?error=NOT_AUTHORIZED`)
  }
  return new APIError('BAD_REQUEST', {
    message: 'You are not authorized to log in with this email.',
  })
}

/**
 * Throws unless the email is on a domain in NUXT_AUTH_ALLOWED_DOMAINS (`*` allows all).
 * Pass the hook context so OAuth callbacks redirect to the error page.
 */
export const allowDomainForEmail = (email: unknown, ctx?: GenericEndpointContext | null) => {
  const allowedDomains = authConfig().allowedDomains?.split(',') || []
  if (allowedDomains.includes('*'))
    return
  if (typeof email !== 'string' || !allowedDomains.some(domain => email.endsWith(`@${domain}`)))
    throw notAuthorized(ctx)
}

/**
 * Throws unless the email is listed in NUXT_AUTH_ALLOWED_EMAILS (`*` allows all).
 * Pass the hook context so OAuth callbacks redirect to the error page.
 */
export const allowEmailForEmail = (email: unknown, ctx?: GenericEndpointContext | null) => {
  const allowedEmails = authConfig().allowedEmails?.split(',') || []
  if (allowedEmails.includes('*'))
    return
  if (typeof email !== 'string' || !allowedEmails.includes(email))
    throw notAuthorized(ctx)
}

// Request hooks: reject magic-link and email sign-up requests before an email is sent.
export const allowDomains = (ctx: Ctx) => {
  if (signupPaths.includes(ctx.path))
    allowDomainForEmail(ctx.body?.email)
}

export const allowEmails = (ctx: Ctx) => {
  if (signupPaths.includes(ctx.path))
    allowEmailForEmail(ctx.body?.email)
}

/**
 * Email of the user a new session belongs to, for allowlist checks in
 * `databaseHooks.session.create.before`. Session hooks run for every sign-in
 * method (magic link, Google, OAuth), so an email removed from the allowlist
 * cannot start a new session. Throws when the user cannot be found.
 */
export const sessionUserEmail = async (session: Session, ctx: GenericEndpointContext | null) => {
  const user = await ctx?.context.internalAdapter.findUserById(session.userId)
  if (!user)
    throw notAuthorized(ctx)
  return user.email
}

/**
 * Set admin role for email if email is in NUXT_AUTH_ADMIN_EMAILS environment variable
 * This only works for user create databaseHooks
 * @param user - User object
 * @returns User object with admin role set if email is in NUXT_AUTH_ADMIN_EMAILS environment variable
 */
export const setAdminForEmail = (user: User) => {
  const adminEmails = authConfig().adminEmails?.split(',') || []
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
