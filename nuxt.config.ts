import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'auth',
  },
  runtimeConfig: {
    ses: {
      region: 'us-east-1',
      accessKeyId: '',
      secretKey: '',
      fromEmail: '',
    },
    public: {
      auth: {
        redirectUserTo: '/',
        redirectNewUserTo: undefined,
        redirectErrorTo: '/auth/error',
        authRequiredByDefault: true,
        loginPage: '/login',
      },
    },
  }, alias: {
    '#layers/auth': fileURLToPath(new URL('.', import.meta.url)),
  },

})
