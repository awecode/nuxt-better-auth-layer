import { auth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = body.token
  try {
    const data = await auth.api.magicLinkVerify({
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
      setResponseStatus(event, 400)
      return 'Invalid or expired token'
    }
  }
  catch {
    setResponseStatus(event, 400)
    return 'Invalid or expired token'
  }
})
