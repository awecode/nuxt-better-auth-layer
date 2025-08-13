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
        loginCallbackURL: '/',
        newUserCallbackURL: '/',
        errorCallbackURL: '/auth/error',
      },
    },
  }, alias: {
    '#layers/auth': fileURLToPath(new URL('.', import.meta.url)),
  },

})
