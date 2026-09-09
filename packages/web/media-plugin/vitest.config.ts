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
    // 2026-09-10: the lightbox now rides @deepseek-ai/dsh-client-ui-primitives'
    // Modal, whose prebuilt lib imports internal .module.css at runtime —
    // Node cannot import css. css:true lets vitest process stylesheets, and
    // inlining the primitive runs it through vite's transform so those
    // imports resolve (instead of reaching Node raw).
    css: true,
    server: { deps: { inline: [/dsh-client-ui-primitives/] } },
  },
})
