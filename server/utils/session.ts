import { defineEventHandler, createError } from 'h3'
import { auth } from './auth'
import type { EventHandler, H3Event } from 'h3'

type Session = Awaited<ReturnType<typeof auth.api.getSession>>

export async function getAuthSession(event: H3Event) {
  let session: Session | null = event.context.auth
  if (!session) {
    session = await auth.api.getSession({
      headers: event.headers,
    })
    event.context.auth = session
  }
  return session
}

export async function getUser(event: H3Event) {
  const session = await getAuthSession(event)
  return session?.user
}

export async function requireAuthenticated(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
}

export async function requireAdmin(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session)
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  if (session.user.role !== 'admin')
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
}

export function defineAuthenticatedHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    await requireAuthenticated(event)
    return handler(event)
  })
}

export function defineAdminHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    await requireAdmin(event)
    return handler(event)
  })
}
