import { defineEventHandler, createError } from 'h3'
import { auth } from './auth'
import type { EventHandler } from 'h3'

type Session = Awaited<ReturnType<typeof auth.api.getSession>>

export function defineAuthenticatedHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    let session: Session | null = event.context.auth
    if (!session) {
      session = await auth.api.getSession({
        headers: event.headers,
      })
      event.context.auth = session
    }
    if (!session)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    return handler(event)
  })
}

export function defineAdminHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    let session: Session | null = event.context.auth
    if (!session) {
      session = await auth.api.getSession({
        headers: event.headers,
      })
      event.context.auth = session
    }
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
    return handler(event)
  })
}
