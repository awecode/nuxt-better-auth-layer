import { useServerAuth } from '../../utils/auth'

export default defineEventHandler((event) => {
  return useServerAuth().handler(toWebRequest(event))
})
