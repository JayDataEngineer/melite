import { defineConfig, devices } from '@playwright/test'

/**
 * Ray ComfyUI tab, live in the deck shell — the proof no unit test
 * can give: the REAL tab, the REAL gateway, the REAL cm_cli rail.
 * READ-ONLY by design (status / installed packs / list snapshots) —
 * save/restore mutate the estate and are pinned at the unit layer
 * (tests/unit/estate/test_manage_handlers.py) and the live-door
 * layer (tests/routes/control/test_manage_route.py).
 *
 * The deck host (:3909) and the gateway (:33081) are estate
 * infrastructure — already up, never booted here.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3909',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
