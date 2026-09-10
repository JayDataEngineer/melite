import { defineConfig, devices } from '@playwright/test'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Playwright raw output (traces, error contexts) lands in the repo's ONE
// generated-state root: data/test-output/ (see data/README.md) — never in
// a package-local test-results/ dir.
const HERE = path.dirname(fileURLToPath(import.meta.url))

// The old Traefik / "forge" deployment is dead — all inference runs through
// the Bun+Hono gateway (server-js). Default to the Vite dev server, which
// proxies /v1/* to the owning DSH (127.0.0.1:3088). Override via BASE_URL.
const FRONTEND_URL = process.env.BASE_URL || 'http://127.0.0.1:5173'

// Resolved at runtime (the drift-check hook rejects /home/<user> literals).
// PLAYWRIGHT_CHROMIUM overrides for machines without the bundled cache.
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM ??
  path.join(homedir(), '.cache/ms-playwright/chromium-1234/chrome-linux64/chrome')

export default defineConfig({
  testDir: './e2e',
  // THREE ups to the REPO root — two lands in packages/ (the misplaced
  // packages/data/test-output litter, swept 2026-09-04). data/ is the
  // generated-state root; data/README.md is the map.
  outputDir: path.join(HERE, '..', '..', '..', 'data', 'test-output', 'playwright', 'editor'),
  timeout: 900000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: FRONTEND_URL,
    headless: true,
    // 2026-08-09: the snap chromium wrapper (/usr/bin/chromium-browser)
    // SIGKILLs the browser intermittently ~20-30s into runs (apparmor
    // confinement; pw:browser logged signal=SIGKILL). Use the bundled
    // chromium-1234 instead — playwright 1.60 can't download its own
    // 1223 build on ubuntu26.04, but the cached binary works.
    launchOptions: {
      executablePath: CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — the editor container is managed by docker-compose + Traefik.
})
