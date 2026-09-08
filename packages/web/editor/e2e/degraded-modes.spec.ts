/**
 * E2E: degraded backend modes — the app must tell the operator something
 * actionable, never silently swallow or crash.
 *
 * Two operator-reported failure modes, both first-class now that Melite runs
 * from a git clone with ComfyUI as a pluggable URL (docker decoupled):
 *
 *   1. "Can't reach comfyui"   — gateway UP, ComfyUI DOWN. /health returns
 *      200 {comfyui:"down"}. The header ComfyStatus badge must flip red
 *      ("ComfyUI backend: unreachable") and NOT show a false green dot.
 *   2. "Catalog unavailable …" — /v1/model-catalog returns 5xx. The Library
 *      sidebar must render the operator-facing error string, not an empty
 *      rail that hides the failure.
 *
 * Both tests also assert the app stayed mounted (header brand visible) and
 * threw no uncaught page error — i.e. degraded, not broken.
 *
 * Deterministic: page.route() mocks only the failing endpoint; the rest of
 * the live stack (gateway :33081 + Vite :5173) serves normally.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/degraded-modes.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

const BOOT = 'text=TECH NOIR'

/** Collect uncaught page errors so each test can assert "no crash". */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  return errors
}

test.describe('Degraded backend modes — graceful, loud, actionable', () => {

  test('ComfyUI unreachable (gateway up) → red badge, no false green, app usable', async ({ page }) => {
    const errors = trackPageErrors(page)

    // Gateway UP, ComfyUI DOWN — the exact state `task up` now allows
    // (docker decoupled). /health is 200 with comfyui:"down".
    await page.route('**/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'degraded',
          comfyui: 'down',
          comfyui_url: 'http://localhost:18465',
        }),
      })
    })

    await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(BOOT, { timeout: 30_000 })

    // The header ComfyStatus badge polls /health → data.comfyui !== "up"
    // → state "down" → aria-label "ComfyUI backend: unreachable" + text-red-400.
    const downBtn = page.locator('button[aria-label="ComfyUI backend: unreachable"]')
    await expect(downBtn, 'ComfyUI-down badge must appear').toBeVisible({ timeout: 15_000 })

    // It must NOT falsely report connected — no green-dot span is rendered
    // in the down state (the dot is gated behind state === "up").
    await expect(page.locator('button[aria-label="ComfyUI backend: connected"]')).toHaveCount(0)
    await expect(downBtn.locator('span.bg-emerald-400')).toHaveCount(0)

    // The app did not crash — the header brand is still mounted.
    await expect(page.locator(BOOT).first()).toBeVisible()
    expect(errors, 'no uncaught page errors under ComfyUI-down').toEqual([])
  })

  test('Catalog rejected (500) → Library shows the operator error, app usable', async ({ page }) => {
    const errors = trackPageErrors(page)

    // The backend rejected the model catalog — e.g. a schema-validation
    // failure on a catalog YAML. loadCatalog() THROWS on non-2xx (no silent
    // empty {}); LibrarySidebar catches and sets `errored`.
    await page.route('**/v1/model-catalog', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'catalog_schema: unknown field "bogus"' }),
      })
    })

    await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector(BOOT, { timeout: 30_000 })

    // Open the Library tab — retry the click until it activates. A click
    // during the SPA's pre-hydration window (right after load, before React
    // wires onClick) silently no-ops; verify-via-aria-pressed absorbs that
    // race. Target the NAV Library button specifically (a "Character
    // Library" drawer toggle also exists and must not be confused with it).
    const libraryTab = page.locator('nav').getByRole('button', { name: 'Library' }).first()
    for (let attempt = 0; attempt < 4; attempt++) {
      await libraryTab.click({ timeout: 5_000 }).catch(() => {})
      await page.waitForTimeout(1200)
      if ((await libraryTab.getAttribute('aria-pressed')) === 'true') break
    }
    expect(await libraryTab.getAttribute('aria-pressed'), 'Library tab must activate').toBe('true')

    // The Library right rail defaults to open (rightPanelStore
    // open.library === true), so LibrarySidebar mounts and immediately calls
    // loadCatalog() → throws on the 500 → renders the operator error copy.
    // The operator-facing error must appear (not a silent empty rail that
    // hides the failure — the bug class this string exists to prevent).
    await expect(
      page.getByText('Catalog unavailable — the backend rejected the model catalog.'),
    ).toBeVisible({ timeout: 15_000 })

    // The app did not crash — the header brand is still mounted.
    await expect(page.locator(BOOT).first()).toBeVisible()
    expect(errors, 'no uncaught page errors under catalog-rejected').toEqual([])
  })
})
