import { useServerAuth } from '../../utils/auth'
import { magicLinkSignInRequest } from '../../utils/magicLinkSendRequest'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body?.email
  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required',
      data: { field: 'email' },
    })
  }

  const response = await useServerAuth().handler(magicLinkSignInRequest(toWebRequest(event), email))
  if (response.status === 429)
    return response
  if (!response.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Failed to send magic link',
      data: { field: 'email' },
    })
  }
  return response
})
