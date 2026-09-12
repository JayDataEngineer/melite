import { defineConfig, devices } from '@playwright/test'

/**
 * Browser-plane wall for the card studios — the hole that hid the
 * 2026-09-12 h3-timeline regression (TEST-7's happy-dom wall kept the
 * studios honest in-process, but NO wall drove real Chromium, so a
 * host booted before a studio-bundle rebuild silently served the
 * generic form and nothing failed).
 *
 * The host is live lane infrastructure, never booted here (the deck
 * pattern): point E2E_STUDIO_URL at an authenticated shell URL of a
 * host whose state carries the seeded bench (e2e/README.md owns the
 * seed recipe — bench/ensure + bench/add-stage card h3-timeline over
 * the /api wire).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_STUDIO_URL ?? 'http://127.0.0.1:3907',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
