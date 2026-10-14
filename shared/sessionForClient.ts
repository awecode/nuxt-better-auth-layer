/** Drop the bearer token before the session is stored for the browser. */
export function sessionForClient<T extends object>(session: T | null | undefined) {
  if (!session)
    return null

  const copy = { ...session } as T & { token?: unknown }
  delete copy.token
  return copy
}

/** Sanitize get-session style payloads (useState, fetchSession return, customSession). */
export function authDataForClient<T extends { session?: object | null }>(
  data: T | null | undefined,
): T | null {
  if (!data)
    return null

  return {
    ...data,
    session: sessionForClient(data.session),
  }
}
