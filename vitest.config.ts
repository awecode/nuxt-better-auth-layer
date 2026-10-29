import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#auth-options': fileURLToPath(new URL('./server/auth.options.ts', import.meta.url)),
      '~~/server/utils/db': fileURLToPath(new URL('./test/fixtures/db.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
