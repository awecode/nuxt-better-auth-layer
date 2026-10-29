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

// Comma-separated env list, lowercased: better-auth stores and looks up
// emails in lowercase, so matching ignores case too.
function list(value: string | undefined) {
  return (value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
}

/**
 * Throws unless the email is in NUXT_AUTH_ALLOWED_EMAILS or on a domain in
 * NUXT_AUTH_ALLOWED_DOMAINS. `*` in either allows everyone. With both unset,
 * nobody can log in: each app must choose. Pass the hook context so OAuth
 * callbacks redirect to the error page.
 */
export const allowListedEmail = (email: unknown, ctx?: GenericEndpointContext | null) => {
  const auth = authConfig()
  const emails = list(auth.allowedEmails)
  const domains = list(auth.allowedDomains)
  if (emails.includes('*') || domains.includes('*'))
    return
  if (typeof email === 'string') {
    const lower = email.toLowerCase()
    if (emails.includes(lower) || domains.some(domain => lower.endsWith(`@${domain}`)))
      return
  }
  throw notAuthorized(ctx)
}

// Request hook: rejects magic-link and email sign-up requests early, so no
// email is sent to an address that is not allowed.
export const allowListedSignup = (ctx: Ctx) => {
  if (signupPaths.includes(ctx.path))
    allowListedEmail(ctx.body?.email)
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
  if (list(authConfig().adminEmails).includes(user.email.toLowerCase())) {
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
