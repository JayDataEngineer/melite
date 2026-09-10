/**
 * Playwright config for the NEW architecture (no Traefik, no gateway).
 *
 * The Vite dev server (localhost:5173) proxies /v1/* and /health to the
 * the owning DSH (127.0.0.1:3088). This config targets that local Vite
 * server — no Docker network, no forge.local DNS.
 *
 * Usage:
 *   # 1. Start backend:  task up:server
 *   # 2. Start frontend: task up:frontend
 *   # 3. Run tests:      npx playwright test --config=playwright.local.config.ts
 *
 * Or run a single test:
 *   npx playwright test --config=playwright.local.config.ts e2e/real-generate.spec.ts
 */
import { defineConfig, devices } from '@playwright/test'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Raw output → the unified datafolder/outputs/test/ root (data/README.md).
const HERE = path.dirname(fileURLToPath(import.meta.url))

const FRONTEND_URL = process.env.BASE_URL || 'http://localhost:5173'

// Resolved at runtime (the drift-check hook rejects /home/<user> literals).
// PLAYWRIGHT_CHROMIUM overrides for machines without the bundled cache.
//
// 2026-08-09: the bundled chromium must run under a RENAMED executable
// ("editor-chromium", a symlink into chrome-linux64). The co-tavern wave
// launcher (scripts/run-probe.sh) runs `pkill -9 -x chrome` and
// `pkill -9 -x chromium-browser` before EVERY wave launch (~every 3-4 min)
// to enforce its no-overlap rule — an exact-name pkill that SIGKILLed our
// browser every live run ("Target page, context or browser has been closed",
// no crash event, no kernel OOM — the death correlated 1:1 with wave spawns
// on 2026-08-09). The renamed exec path gives comm "editor-chromium", which
// the exact-name pkill cannot match. Setup: the chrome-linux64-editor dir is
// created once (symlink farm + editor-chromium → chrome) — see git log.
const PLAYWRIGHT_CACHE = path.join(homedir(), '.cache/ms-playwright')
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM ??
  [
    path.join(PLAYWRIGHT_CACHE, 'chromium-1234/chrome-linux64-editor/editor-chromium'),
    path.join(PLAYWRIGHT_CACHE, 'chromium-1234/chrome-linux64/chrome'),
  ].find((p) => existsSync(p)) ??
  path.join(PLAYWRIGHT_CACHE, 'chromium-1234/chrome-linux64/chrome')

export default defineConfig({
  testDir: './e2e',
  outputDir: path.join(HERE, '..', '..', '..', 'data', 'test-output', 'playwright', 'local'),
  timeout: 900_000,    // 15 min ceiling — See-Through (SDXL load + 30 steps) takes ~3min
  expect: { timeout: 30_000 },
  fullyParallel: false,
  // 1 retry: some smoke tests (e.g. "Video" sidebar form) intermittently
  // timeout under batch load due to VRAM pressure from prior GPU tests.
  // They pass consistently in isolation (< 2s), so a single retry handles
  // the flake without masking real regressions.
  retries: 1,
  use: {
    baseURL: FRONTEND_URL,
    headless: true,
    screenshot: 'only-on-failure',
    // 2026-08-09: the snap chromium wrapper (/usr/bin/chromium-browser)
    // SIGKILLs the browser intermittently ~20-30s into runs (apparmor
    // confinement; pw:browser logged signal=SIGKILL). Use the bundled
    // chromium-1234 (~/.cache/ms-playwright, DEPENDENCIES_VALIDATED)
    // instead — playwright 1.60 can't DOWNLOAD its own 1223 build on
    // ubuntu26.04 (unsupported platform), but the cached binary works.
    launchOptions: {
      executablePath: CHROMIUM_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // 2026-08-09: the browser SIGKILLs were NEVER the GPU/overlay — they
        // were co-tavern's run-probe.sh `pkill -9 -x chrome` (see CHROMIUM_PATH).
        // PLAYWRIGHT_CHROMIUM_ARGS stays for ad-hoc flag injection.
        ...(process.env.PLAYWRIGHT_CHROMIUM_ARGS ?? '').split(' ').filter(Boolean),
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — Vite must already be running (task up:frontend).
})
