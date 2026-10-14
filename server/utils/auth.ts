import { betterAuth } from 'better-auth'
import { getAuthBaseURL } from './authBaseUrl'
import { createAuthConfig } from './auth.config'
// import { runtime } from 'std-env'

function getAuthOptions() {
  return {
    ...createAuthConfig(),
    baseURL: getAuthBaseURL(),
  }
}

export const createBetterAuth = () => betterAuth(getAuthOptions())

let _auth: ReturnType<typeof createBetterAuth>
// For better-auth cli to generate schema
const isAuthSchemaCommand = process.argv.some(arg => arg == 'generate')
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

