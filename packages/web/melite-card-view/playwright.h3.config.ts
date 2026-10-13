// playwright.h3.config.ts — THE H3 ADVANCED GPU TIER's own config
// (the operator's 2026-10-27 order: "an advanced playwrite suite…
// test the H3, advanced ways, on the gpu").
//
// THE LAWS (all inherited from playwright.gpu.config.ts, the GPU
// seat's own — this file narrows NOTHING but the spec set):
//   - testDir stays ./e2e/gpu (the specs live beside their tier's
//     kin); testMatch narrows to h3-*.spec.ts so the H3 lane runs
//     ONLY the H3 suite — the z-image/automotive tiers stay the
//     gpu seat's own, never re-run here.
//   - The DEFAULT playwright config keeps ignoring e2e/gpu/
//     entirely (the keyless law): this config is reachable only
//     through scripts/e2e-h3-gpu-lane.sh, which boots the host,
//     gates the engine + the h3 weights, and exports the gates
//     (E2E_STUDIO_URL + E2E_GPU=1 + E2E_H3=1). Every spec
//     self-skips without all three — a bare `playwright test -c
//     playwright.h3.config.ts` on a keyless host is a clean skip,
//     never a red.
//   - workers: 1, timeout 600_000 — one real GPU render at a time;
//     h3 film passes are minutes each (the 4090 window), never
//     parallelizable.
import { defineConfig } from '@playwright/test'

const STUDIO_URL = process.env.E2E_STUDIO_URL ?? 'http://127.0.0.1:3927'

export default defineConfig({
  testDir: './e2e/gpu',
  testMatch: /h3-.*\.spec\.ts/,
  timeout: 600_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: STUDIO_URL,
    headless: true,
    viewport: { width: 1680, height: 1050 },
  },
  reporter: [['list']],
})
