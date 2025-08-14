import { auth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body.email
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required',
      data: { field: 'email' },
    })
  }
  try {
    const data = await auth.api.signInMagicLink({
      body: {
        email,
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
        statusMessage: 'Failed to send magic link',
        data: { field: 'email' },
      })
    }
  }
  catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to send magic link',
      data: { field: 'email' },
    })
  }
})
