import { defineEventHandler, createError } from 'h3'
import { auth } from './auth'
import type { EventHandler } from 'h3'

export function defineAuthenticatedHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
      headers: event.headers,
    })
    if (!session)
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      })
    event.context.auth = session
    return handler(event)
  })
}

export function defineAdminHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
      headers: event.headers,
    })
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
    event.context.auth = session
    return handler(event)
  })
}
