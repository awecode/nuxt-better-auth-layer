// Magic link lifetime in seconds: NUXT_AUTH_MAGIC_LINK_EXPIRES_IN, default 300
// (better-auth's default). An env var arrives as a string.
export const DEFAULT_MAGIC_LINK_EXPIRES_IN = 300

export function resolveMagicLinkExpiresIn(value: unknown) {
  if (value === undefined || value === null || value === '')
    return DEFAULT_MAGIC_LINK_EXPIRES_IN
  const seconds = Number(value)
  if (!Number.isInteger(seconds) || seconds <= 0)
    throw new Error(`NUXT_AUTH_MAGIC_LINK_EXPIRES_IN must be a whole number of seconds, got "${value}".`)
  return seconds
}

export function getMagicLinkExpiresIn() {
  let value: unknown
  try {
    value = useRuntimeConfig().auth.magicLinkExpiresIn
  }
  catch {
    // Nuxt runtime is unavailable, for example during the auth schema CLI.
    // The lifetime does not change the schema.
  }
  return resolveMagicLinkExpiresIn(value)
}
