import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['*/test/**/*.test.{ts,tsx}'],
    // Orphaned bun:test files predate the vitest wiring — exclude until
    // they're converted (gateway.test.ts, provision-model.test.ts,
    // host-routes.test.ts, ideo-field.test.ts).
    exclude: [
      '**/node_modules/**',
      '**/media-plugin/test/*.test.mjs',
      '**/melite-card-deck/test/host-routes.test.ts',
      '**/melite-card-deck/test/ideo-field.test.ts',
    ],
    css: false,
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'happy-dom'],
    ],
    pool: 'threads',
  },
})
