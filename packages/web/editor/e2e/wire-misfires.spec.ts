/**
 * wire-misfires.spec.ts — the junction lane: what the page EMITS vs what
 * the backend SERVES.
 *
 * The misfire class (operator report, 2026-10-02): "you press the generate
 * button, or go to the media sidebar, and it says 502 or 404 — I see these
 * a lot." Static half: tests/test_wire_surface.py pins the frontend wire
 * ⊆ gateway arms. This is the live half, on the card-harness page:
 *
 *   1. boot + picker walk — the wire must be clean of NEW drift (the
 *      KNOWN_ABSENT census from the 2026-10-02 audit is counted, printed,
 *      and tolerated; anything else fails).
 *   2. the Run-button probe (GPU-free) — press Run all on a card whose
 *      service cannot resolve. INFERENCE LAW honored: the button is the
 *      user-owned door, and the absent service dies at CLIENT-side
 *      compose (a resolvable service would register a real GPU run —
 *      a test must never trigger that; the gateway's own admission door
 *      is pinned server-side by tests/test_http_parity). Assert: zero
 *      start posts, zero misfires, and the card SURFACES the exact
 *      error (RESILIENCE LAW's UI face) instead of swallowing it.
 */
import { test, expect } from '@playwright/test'
import { attachWireMonitor } from './helpers/wire'

const BASE = process.env.BASE_URL ?? ''

test.use({ viewport: { width: 1280, height: 900 } })

test.describe('wire misfires — card harness', () => {
  test('boot + picker walk: no NEW drift on the wire', async ({ page }) => {
    const monitor = attachWireMonitor(page)
    await page.goto(`${BASE}/editor/card-harness.html?scenario=chain`, { waitUntil: 'domcontentloaded' })
    await page.locator('[data-card-tile="s_1"]').waitFor({ state: 'attached', timeout: 90_000 })

    // Walk the picker: open the ServicePicker dialog (the card-tools
    // fetch rides the wire). The picker's ONE surface since 2026-09-04
    // is the ACTION CARDS (data-action-card) — the capability grid that
    // used to live here (data-capability-tile) was removed as a
    // duplicate of the same lanes; asserting it went stale with it.
    await page.getByRole('button', { name: /add a card/i }).first().click()
    await page.getByRole('dialog').locator('[data-action-card]').first().waitFor({ state: 'visible', timeout: 30_000 })
    await page.keyboard.press('Escape')

    // Known-absent census may be non-empty (documented REVIEWING drift);
    // anything NOT known is a live misfire and fails here.
    expect(monitor.misfires(), `wire misfires:\n${monitor.report()}`).toEqual([])
    test.info().annotations.push({
      type: 'wire-census',
      description: `${monitor.census().length} known-absent door(s) seen: ${
        monitor.census().map((k) => `${k.status} ${k.method} ${new URL(k.url).pathname}`).join(', ') || '(none)'
      }`,
    })
  })

  test('Run-button probe: absent service is caught before the wire, surfaced', async ({ page }) => {
    // A service that is not in the catalog dies at CLIENT-side compose —
    // before any wire call. (A catalog-resolvable service would register a
    // REAL GPU run, which a test must never trigger — INFERENCE LAW — so
    // the absent-service shape is the only GPU-safe probe. The gateway's
    // own admission door is pinned server-side by tests/test_http_parity.)
    // The contract here: the failure is SURFACED on the card with the
    // exact reason (RESILIENCE LAW's UI face) and the wire stays clean —
    // no 404 drift, no 5xx, no half-fired start.
    const monitor = attachWireMonitor(page)
    const startCalls: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/v1/flows/start')) startCalls.push(req.method())
    })

    await page.goto(`${BASE}/editor/card-harness.html?scenario=misfire`, { waitUntil: 'domcontentloaded' })
    const tile = page.locator('[data-card-tile]').first()
    await tile.waitFor({ state: 'attached', timeout: 90_000 })

    await page.getByRole('button', { name: /run all/i }).first().click()

    // RESILIENCE LAW, UI face: the failure is DOCUMENTED on the card —
    // never swallowed, never a bare "failed".
    const errorLine = page.locator('[data-card-error]').first()
    await expect(errorLine).toBeVisible({ timeout: 30_000 })
    await expect(errorLine).toContainText(/harness-unresolvable-model|no such|not found|unresolv|unknown/i)

    // The compose gate caught it BEFORE the wire: zero start posts, and
    // nothing else misfired either.
    expect(startCalls, 'start door must not be called for an absent service').toEqual([])
    expect(monitor.misfires(), `wire misfires:\n${monitor.report()}`).toEqual([])
  })
})
