import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  $meta: {
    name: 'auth',
  },
  alias: {
    '#layers/auth': fileURLToPath(new URL('.', import.meta.url)),
  },
})
