import { defineConfig, devices } from '@playwright/test'

/**
 * THE GPU TIER'S OWN CONFIG (dev_docs/plans/gpu-playwright-tier-
 * 2026-10-12.md): the both-angles browser walls that do REAL
 * inference — (a) the automotive (the LLM run doors) and (b) the
 * human path (every card, configuration changes, Run press).
 *
 * Keyless law: the DEFAULT studio config (playwright.config.ts)
 * ignores e2e/gpu/ entirely — the studio lane stays GPUless and
 * CI-true; this config is the only door that runs them, and
 * scripts/e2e-gpu-lane.sh (test:e2e:gpu) is the only sanctioned
 * boot (engine gate + cuda check + throwaway home + bench seed).
 * Every spec here additionally self-skips without E2E_GPU=1 (the
 * launcher's own export — a stray manual run against any other
 * lane skips, never touches a real tree).
 *
 * The timeout covers the host's activation grace (120s,
 * ESTATE_PENDING_GRACE_MS — the cold-lane law the studio config
 * documents) PLUS a real GPU render (z-image turbo on a 4090:
 * seconds warm, minutes behind a cold load of the int8 weights).
 */
export default defineConfig({
  testDir: './e2e/gpu',
  timeout: 600_000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_STUDIO_URL ?? 'http://127.0.0.1:3917',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
