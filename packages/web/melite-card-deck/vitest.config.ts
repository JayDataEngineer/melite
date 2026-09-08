import { defineConfig } from 'vitest/config'

/**
 * Component tests for the Ray ComfyUI manager panel (jsdom + Testing
 * Library). fetch is stubbed per-test — no gateway, no workspace.
 * React 18.3.1 matches the DSH shell that hosts this client.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/client/__tests__/**/*.test.{ts,tsx}'],
  },
})
