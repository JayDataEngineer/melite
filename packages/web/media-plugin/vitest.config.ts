import { defineConfig } from 'vitest/config'

/**
 * Client component tests for the media family (jsdom + Testing
 * Library). fetch is stubbed per-test — no gateway, no live estate.
 * React 18.3.1 matches the DSH shell that hosts this client.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/client/__tests__/**/*.test.{ts,tsx}'],
  },
})
