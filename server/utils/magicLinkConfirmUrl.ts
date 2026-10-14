export { parseMagicLinkConfirmHash } from '../../shared/magicLinkConfirmHash'

/**
 * Rewrite better-auth's one-shot verify GET URL into a confirmation page URL.
 *
 * Email scanners (Safe Links, Gmail, Mimecast, etc.) prefetch hyperlinks with
 * GET and would otherwise consume the single-use token before the user clicks.
 * The confirm page only verifies after an explicit button click (POST).
 *
 * The token lives in the URL fragment. Browsers do not send fragments to the
 * server, and they are omitted from Referer headers.
 */
export function toMagicLinkConfirmUrl(verifyUrl: string, token: string): string {
  const source = new URL(verifyUrl)
  const confirm = new URL('/auth/confirm', source.origin)
  const fragment = new URLSearchParams()

  fragment.set('token', token)

  for (const key of ['callbackURL', 'newUserCallbackURL', 'errorCallbackURL'] as const) {
    const value = source.searchParams.get(key)
    if (value)
      fragment.set(key, value)
  }

  confirm.hash = fragment.toString()
  return confirm.toString()
}
