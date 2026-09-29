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
  // THE TIMEOUT COVERS THE HOST'S ACTIVATION GRACE, not the spec's own
  // work: a freshly booted lane answers every seat door 503
  // `estate/pending` until doors.ts's ESTATE_PENDING_GRACE_MS (120s)
  // expires — measured holding the full window on a cold throwaway
  // home, 2026-09-29. The first spec on a cold lane therefore spends
  // ~2 minutes waiting for the host to be SERVED before its own steps
  // begin, and 180s failed it at the wait, not at the contract. The
  // budget is the grace plus the tour's own worst case; a spec that
  // hangs still fails, just no longer before the host is ready.
  timeout: 420_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_STUDIO_URL ?? 'http://127.0.0.1:3907',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
