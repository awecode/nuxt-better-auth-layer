type GoogleCredentials = { clientId?: string, clientSecret?: string }

export function resolveSocialProviders(google: GoogleCredentials) {
  if (!google.clientId && !google.clientSecret)
    return {}
  if (!google.clientId || !google.clientSecret)
    throw new Error('Set both NUXT_AUTH_GOOGLE_CLIENT_ID and NUXT_AUTH_GOOGLE_CLIENT_SECRET to enable Google login.')
  return { google: { clientId: google.clientId, clientSecret: google.clientSecret } }
}

export function getSocialProviders() {
  let auth: { googleClientId?: string, googleClientSecret?: string }
  try {
    auth = useRuntimeConfig().auth
  }
  catch {
    // Nuxt runtime is unavailable, for example during the auth schema CLI.
    // Social providers do not change the schema.
    return {}
  }
  return resolveSocialProviders({ clientId: auth.googleClientId, clientSecret: auth.googleClientSecret })
}
