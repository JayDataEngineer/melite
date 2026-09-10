/**
 * E2E: the Ray ComfyUI tab in the live deck shell.
 *
 * The tour (read-only — this spec never mutates the estate):
 *   1. Sidebar → New tab → Ray ComfyUI mounts the NATIVE manager
 *      (the stroke-1 regression was an iframe falling through to the
 *      card studio — the manager root must contain zero iframes).
 *   2. Status renders against the live gateway (endpoint + version).
 *   3. Installed packs renders REAL rows off the cm_cli rail.
 *   4. List snapshots renders REAL rows.
 *   5. Refresh is silent — the result pane keeps the last EXPLICIT
 *      dispatch (no status reply overwrites it).
 *   6. Zero console errors / page errors across the tour.
 *
 * Save/restore mutate the estate and are pinned at the unit layer
 * (tests/unit/estate/test_manage_handlers.py) and the live-door
 * layer (tests/routes/control/test_manage_route.py).
 *
 * Run: pnpm exec playwright test --config=playwright.config.ts
 * (deck :3909 + the estate lanes are in-process infrastructure — already
 * up, never booted here).
 */
import { expect, test, type Page } from '@playwright/test'

async function settleHost(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // let the host settle so its OWN boot noise lands in the
  // baseline, not the tour's ledger (see step 6).
  await page.waitForTimeout(8_000)
}

async function openManager(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: 'Expand sidebar' })
    .click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByRole('button', { name: 'New tab' }).click()
  // the shell keeps a SECOND, off-viewport Ray ComfyUI node (a
  // collapsed overflow entry) — .first() grabs the WRONG one.
  // Filter VISIBLE: the surviving node is either the open picker's
  // item (opens the tab) or the strip tab itself (selects it) —
  // both land the manager.
  const entry = page
    .getByText('Ray ComfyUI')
    .filter({ visible: true })
    .first()
  await entry.waitFor({ state: 'visible', timeout: 15_000 })
  await entry.dispatchEvent('click')
  await page
    .locator('[data-ray-comfy-manager]')
    .waitFor({ state: 'visible', timeout: 30_000 })
}

test('ray comfyui tab tours the live manager without errors', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => {
    pageErrors.push(String(err))
  })

  // 1. the native manager, never an iframe.
  // (settle the host FIRST so its boot noise lands in the baseline;
  // the ledger below only sees what the TOUR introduces.)
  await settleHost(page)
  const baseline = new Set([...consoleErrors, ...pageErrors])
  await openManager(page)
  const manager = page.locator('[data-ray-comfy-manager]')
  await expect(manager).toBeVisible()
  await expect(manager.locator('iframe')).toHaveCount(0)

  // 2. live status: the endpoint URL, a version, the runs chip.
  // (the endpoint probe can take 10s+ on a cold gateway — wait long).
  await expect(
    manager.getByText('http://127.0.0.1:18466'),
  ).toBeVisible({ timeout: 60_000 })
  await expect(manager.getByText(/active runs: \d+/)).toBeVisible()

  // 3. installed packs: real rows off the cm_cli rail.
  await manager.getByRole('button', { name: 'Installed packs' }).click()
  const extList = manager.getByTestId('ext-list')
  await extList.waitFor({ state: 'visible', timeout: 60_000 })
  const extRows = extList.locator('li')
  expect(await extRows.count()).toBeGreaterThan(0)
  const firstExt = (await extRows.first().innerText()).trim()
  expect(firstExt).toMatch(/.+@.+/)
  // the explicit dispatch owns the result pane.
  const result = manager.getByTestId('manage-result')
  await expect(result).toBeVisible()
  await expect(result.getByText('list_extensions')).toBeVisible()

  // 4. snapshots: real rows.
  await manager.getByRole('button', { name: 'List snapshots' }).click()
  const snapList = manager.getByTestId('snap-list')
  await snapList.waitFor({ state: 'visible', timeout: 60_000 })
  expect(await snapList.locator('li').count()).toBeGreaterThan(0)

  // 5. Refresh is silent — the result pane keeps the last EXPLICIT
  // dispatch (snapshot_list), no status reply overwrites it.
  const before = await result.innerText()
  expect(before).toContain('snapshot_list')
  await manager.getByRole('button', { name: 'Refresh' }).click()
  await page.waitForTimeout(3_000)
  expect(await result.innerText()).toBe(before)

  // 6. the tour adds no NEW console noise to its host — the shell
  // has its own boot 404s; those are the host's business. Anything
  // the MANAGER tour introduces (a failed fetch, a render throw)
  // fails here.
  const fresh = [...new Set([...pageErrors, ...consoleErrors])].filter(
    (m) => !baseline.has(m),
  )
  expect(fresh).toEqual([])
})
