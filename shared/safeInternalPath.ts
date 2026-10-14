/**
 * Allow only same-origin relative paths. Rejects absolute URLs,
 * protocol-relative URLs, and backslash tricks used in open redirects.
 */
export function safeInternalPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string')
    return fallback

  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\'))
    return fallback

  return trimmed
}
