/**
 * E2E: the ComfyUI Manager tab in the live deck shell.
 *
 * The tour (read-only — this spec never mutates the estate):
 *   1. Sidebar → New tab → ComfyUI Manager mounts the NATIVE manager
 *      (the stroke-1 regression was an iframe falling through to the
 *      card studio — the manager root must contain zero iframes).
 *   2. Status renders against the live gateway (endpoint + version).
 *   3. Installed packs renders REAL rows off the manager rail
 *      ({name, version} objects as "name \u2014 sha" rows).
 *   4. List snapshots renders REAL rows.
 *   5. Refresh is silent — the result pane keeps the last EXPLICIT
 *      dispatch (no status reply overwrites it).
 *   6. Zero console errors / page errors across the tour.
 *
 * Save/restore mutate the estate and are pinned at the unit layer
 * (tests/unit/estate/test_manage_handlers.py) and the live-door
 * layer (tests/routes/control/test_manage_route.py).
 *
 * Run: E2E_DECK_URL='http://127.0.0.1:3909/?token=…' pnpm exec
 *   playwright test --config=playwright.config.ts
 * (deck :3909 is the dsh-deck.service systemd host — already up,
 * never booted here).
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

/** The token-bearing deck URL (stroke 83): DSH's connection fence has
 * NO empty-open arm (that was the retired estate gateway's E5 law) —
 * every DSH process mints a random launch token. The tour rides the
 * same gate the card-view tier rides: a full E2E_DECK_URL carrying
 * the process token (the service prints it to its log), landing the
 * auth cookie on first goto; later navigation reuses it.
 * Self-skips without it — same law as E2E_STUDIO_URL. */
const DECK_URL = process.env.E2E_DECK_URL ?? ''

test.skip(!DECK_URL, 'E2E_DECK_URL (token-authenticated deck URL) is not set — the tour needs the live deck host (:3909, dsh-deck.service)')

async function settleHost(page: Page): Promise<void> {
  await page.goto(DECK_URL, { waitUntil: 'domcontentloaded' })
  // A FRESH deck home (dsh-harness-home carries no UI state) opens
  // behind the first-run NOTICE dialog — its mask intercepts every
  // pointer until Continue. It renders DURING the settle, so dismiss
  // after the boot wait, not before.
  await page.waitForTimeout(8_000)
  // THE NOTICE CLASS, NOT A BAKED TITLE (the tour spine's law,
  // li-bu): the shells retitle the first-run notice mid-arc
  // ("Preview Notice" -> "Internal Testing Notice", 2026-10-10), so
  // a baked dialog name rots on the next retitle. The filter matches
  // any dialog heading /Notice/ with a Continue button, and the
  // dismissal is RETRIED — a click merely attempted is not a click.
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try {
      await notice.click({ timeout: 10_000 })
      await page.waitForTimeout(1_000)
    } catch { /* round again — a cold host can re-mask mid-settle */ }
  }
}

async function expectNoHorizontalOverflow(manager: Locator): Promise<void> {
  const overflow = await manager.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }))
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1)
}

async function openManager(page: Page): Promise<void> {
  // The strip's toggle seat hides until a conversation is REALLY
  // open (the card-view tier's law). A fresh host sits on the hero
  // screen: START one — send one line through the hero input (the
  // GUI's own door), then the header carries the expand seat.
  const expandSeat = page.locator('[data-sidebar-right-expand]').first()
  if ((await expandSeat.count()) === 0) {
    // the HERO composer (its placeholder names it — the sessions
    // search box is another textbox entirely)
    const hero = page.getByRole('textbox', { name: /Describe what you want to build/ })
    await hero.fill('browser tier: opening the shell for the manager tour', { timeout: 15_000 })
    await hero.press('Enter')
    await page.waitForTimeout(8_000)
  }
  await expandSeat.click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  // The strip's START tab carries the registered tab types as GUIDE
  // entries — the card-deck registers the manager there ("The
  // estate's ComfyUI manager — packs, snapshots, status."). The
  // guide entry IS the door; the picker never needs opening.
  const guideEntry = page.getByRole('button', { name: /ComfyUI Manager/ }).first()
  await guideEntry.click({ timeout: 30_000 })
  await page
    .locator('[data-comfy-manager]')
    .waitFor({ state: 'visible', timeout: 30_000 })
}

test('comfy manager tab tours the live manager without errors', async ({
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
  const manager = page.locator('[data-comfy-manager]')
  await expect(manager).toBeVisible()
  await expect(manager.locator('iframe')).toHaveCount(0)

  // 2. live status: the endpoint URL, a version, the runs chip.
  // (the endpoint probe can take 10s+ on a cold gateway — wait long).
  // The estate collapse (2026-09-10) killed the :18466 gateway — the
  // status now names the ENGINE's own endpoint (ComfyUI :8188).
  await expect(
    manager.getByText('http://127.0.0.1:8188'),
  ).toBeVisible({ timeout: 60_000 })
  await expect(manager.getByText(/^(idle|\d+ active) · \d+ active · \d+\/\d+ complete$/)).toBeVisible()
  await expect(manager.getByLabel('provision catalog id')).toHaveAttribute('list', /.+/)
  await expect(manager.getByLabel('provision catalog id')).toHaveAttribute('type', 'search')

  // 3. installed packs: real rows off the manager rail — the rail's
  // rows are {name, version: commit-sha} objects rendered
  // "name — sha" (the [object Object] regression stays dead).
  await manager.getByRole('button', { name: 'Installed packs' }).click()
  const extList = manager.getByTestId('ext-list')
  await extList.waitFor({ state: 'visible', timeout: 60_000 })
  const extRows = extList.locator('li')
  expect(await extRows.count()).toBeGreaterThan(0)
  const firstExt = (await extRows.first().innerText()).trim()
  expect(firstExt).toMatch(/.+ \u2014 [0-9a-f]{7,}/)
  expect(firstExt).not.toContain('[object Object]')
  // the explicit dispatch owns the result pane.
  const result = manager.getByTestId('manage-result')
  await expect(result).toBeVisible()
  await expect(result.getByText('list_extensions')).toBeVisible()
  await expect(result.locator('pre')).toBeVisible()
  await expectNoHorizontalOverflow(manager)

  // 4. snapshots: real rows.
  await manager.getByRole('button', { name: 'List snapshots' }).click()
  const snapList = manager.getByTestId('snap-list')
  await snapList.waitFor({ state: 'visible', timeout: 60_000 })
  expect(await snapList.locator('li').count()).toBeGreaterThan(0)

  // 5. Refresh is silent — the result pane keeps the last EXPLICIT
  // dispatch (snapshot_list), no status reply overwrites it.
  const before = await result.innerText()
  expect(before).toContain('snapshot_list')
  await manager.getByRole('button', { name: 'Refresh', exact: true }).click()
  await page.waitForTimeout(3_000)
  expect(await result.innerText()).toBe(before)

  await page.setViewportSize({ width: 300, height: 900 })
  await expect(manager).toBeVisible()
  await expect(result).toBeVisible()
  await expect(result.locator('pre')).toBeVisible()
  await expectNoHorizontalOverflow(manager)

  // 6. the tour adds no NEW console noise to its host — the shell
  // has its own boot 404s; those are the host's business. Anything
  // the MANAGER tour introduces (a failed fetch, a render throw)
  // fails here.
  const fresh = [...new Set([...pageErrors, ...consoleErrors])].filter(
    (m) => !baseline.has(m),
  )
  expect(fresh).toEqual([])
})
