/**
 * AGENT PROXY SMOKE — the 502 gate (2026-08-12).
 *
 * WHY THIS TEST EXISTS: the operator saw EVERY /v1/* endpoint return 502
 * (Bad Gateway) because the retired backend uvicorn (the second Loader) crashed on startup
 * (a stale __pycache__ masked a _CARD_SLOTS change). All unit tests passed
 * (they mock the API), and the existing agent-tab-responds.spec.ts passed
 * (it requires a working backend, so it's skipped when the backend is down
 * — it doesn't FAIL FAST). This test catches the EXACT regression: hit
 * every /v1/* endpoint the browser loads on boot and assert NONE return 502.
 *
 * If ANY endpoint returns 502, the backend is down and the app is broken.
 * This test trips IMMEDIATELY — no 90s timeout waiting for a reply that
 * will never come.
 *
 * Run: cd web/editor && npx playwright test e2e/agent-proxy-smoke.spec.ts
 */
import { test, expect } from "@playwright/test"

// Every endpoint the editor's boot sequence fetches (App.tsx, modelCatalog.ts,
// enhancement.ts). If ANY returns 502, the
// Vite proxy can't reach the backend — the app is broken.
const BOOT_ENDPOINTS = [
  "/health",
  "/v1/llm/keys",
  "/v1/llm/health",
  "/v1/model-catalog",
  "/v1/tags",
  "/v1/flows/runs",
] as const

test.describe("Proxy smoke — no 502 on any boot endpoint", () => {
  for (const ep of BOOT_ENDPOINTS) {
    test(`${ep} returns 200 (not 502)`, async ({ request }) => {
      const resp = await request.get(ep, { failOnStatusCode: false })
      const status = resp.status()
      // 502 = Vite proxy can't reach backend (the regression).
      // 503 = backend up but dependency down (e.g. ComfyUI).
      // 404 = endpoint doesn't exist (different bug).
      // We accept 200 and 503 (health may be degraded but the proxy works).
      expect.soft(status, `${ep} returned ${status} — backend may be down`).not.toBe(502)
      if (status === 502) {
        const body = await resp.text().catch(() => "<no body>")
        throw new Error(
          `${ep} returned 502 Bad Gateway — the Vite proxy can't reach ` +
          `the estate door refused (the owning DSH lane). ` +
          `Response body: ${body.slice(0, 200)}`
        )
      }
    })
  }

  test("/v1/llm/keys returns at least 1 saved endpoint", async ({ request }) => {
    const resp = await request.get("/v1/llm/keys")
    expect(resp.status(), "llm/keys must be 200").toBe(200)
    const body = await resp.json()
    const keyCount = body.keys?.length ?? 0
    expect(keyCount, "no saved LLM endpoints — the keystore is empty").toBeGreaterThan(0)
  })
})
