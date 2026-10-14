export function resolveAuthBaseURL(configured: Array<string | undefined>) {
  const baseURL = configured.find(value => typeof value === 'string' && value.length > 0)
  if (!baseURL) {
    throw new Error('Set BETTER_AUTH_URL or NUXT_PUBLIC_BASE_URL. Magic links must not use the request host.')
  }
  return baseURL
}

export function getAuthBaseURL() {
  let runtimeBaseURL: string | undefined
  try {
    const value = (useRuntimeConfig().public as { baseURL?: unknown }).baseURL
    if (typeof value === 'string')
      runtimeBaseURL = value
  }
  catch {
    // Nuxt runtime is unavailable, for example during the auth schema CLI.
  }

  return resolveAuthBaseURL([
    process.env.BETTER_AUTH_URL,
    process.env.NUXT_PUBLIC_BASE_URL,
    runtimeBaseURL,
  ])
}
