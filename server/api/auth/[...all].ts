import { useServerAuth } from '../../utils/auth'
import { isMagicLinkAutoVerifyPath } from '../../utils/magicLinkVerifyRequest'

export default defineEventHandler((event) => {
  if (isMagicLinkAutoVerifyPath(getRequestURL(event).pathname)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  return useServerAuth().handler(toWebRequest(event))
})
