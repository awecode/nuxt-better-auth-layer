import { defineEventHandler, createError } from 'h3'
import { auth } from './auth'
import type { EventHandler } from 'h3'

export function defineProtectedHandler(handler: EventHandler) {
  return defineEventHandler(async (event) => {
    const headers = event.headers

    const session = await auth.api.getSession({
      headers: headers,
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
