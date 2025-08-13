import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'auth',
  },
  runtimeConfig: {
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
