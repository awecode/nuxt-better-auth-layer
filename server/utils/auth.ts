import { betterAuth } from 'better-auth'
import { betterAuthConfig } from './auth.config'
// import { runtime } from 'std-env'

const authConfig = {
  ...betterAuthConfig,
  baseURL: getBaseURL(),
}

export const createBetterAuth = () => betterAuth(authConfig)

let _auth: ReturnType<typeof createBetterAuth>
// For better-auth cli to generate schema
const isAuthSchemaCommand = process.argv.some(arg => arg.includes('cli')) && process.argv.some(arg => arg == 'generate')
if (isAuthSchemaCommand) {
  _auth = createBetterAuth()
}
export const auth = _auth!

// export const useServerAuth = () => {
//   if (runtime === 'node') {
//     if (!_auth) {
//       _auth = createBetterAuth()
//     }
//     return _auth
//   }
//   else {
//     return createBetterAuth()
//   }
// }

export const useServerAuth = () => {
  return createBetterAuth()
}

function getBaseURL() {
  let baseURL = process.env.BETTER_AUTH_URL
  if (!baseURL) {
    try {
      baseURL = getRequestURL(useEvent()).origin
    }
    catch {
      // ignore
    }
  }
  return baseURL
}
