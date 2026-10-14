import { useServerAuth } from '../../utils/auth'
import { getAuthBaseURL } from '../../utils/authBaseUrl'
import { assertMagicLinkVerifyOrigin, magicLinkVerifyCookies, MagicLinkVerifyOriginError } from '../../utils/magicLinkVerifyRequest'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Token is required',
      data: { field: 'token' },
    })
  }

  try {
    assertMagicLinkVerifyOrigin(event.headers, getAuthBaseURL())
  }
  catch (error) {
    if (error instanceof MagicLinkVerifyOriginError) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cross-site login is not allowed.',
      })
    }
    throw error
  }

  try {
    const data = await useServerAuth().api.magicLinkVerify({
      query: {
        token,
      },
      headers: event.headers,
      asResponse: true,
    })
    if (!data.ok) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid or expired token',
        data: { field: 'token' },
      })
    }

    for (const cookie of magicLinkVerifyCookies(data))
      appendResponseHeader(event, 'set-cookie', cookie)

    return { ok: true }
  }
  catch (error: any) {
    if (error?.data?.field === 'token')
      throw error

    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid or expired token',
      data: { field: 'token' },
    })
  }
})
