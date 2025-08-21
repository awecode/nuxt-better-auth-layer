import { useServerAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = body.token
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token is required',
      data: { field: 'token' },
    })
  }
  try {
    const data = await useServerAuth().api.magicLinkVerify({
      query: {
        token: token,
      },
      headers: event.headers,
      asResponse: true,
    })
    if (data.ok) {
      return data
    }
    else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired token',
        data: { field: 'token' },
      })
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 400,
      statusMessage: error.message || 'Invalid or expired token',
      data: { field: 'token' },
    })
  }
})
