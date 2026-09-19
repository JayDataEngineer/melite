/**
 * E2E: the estate-lane sidebar audit (:3088) — the tour the
 * operator's 2026-09-19 order demanded: "zero UI is available
 * right now… you have no validation." The lane had booted a bare
 * shell (composition seam: the profile's dsh.profile.bundles must
 * carry the sidebar trio) and every earlier "verification" was a
 * status code, never the rendered sidebar.
 *
 * THE AUDIT (read-only, the deck shell's own law — same settle as
 * comfy-manager.spec.ts):
 *   1. Settle: dismiss the first-run notice, open a session
 *      through the hero input (the strip hides until a
 *      conversation is REALLY open), expand the right sidebar.
 *   2. The sidebar CENSUS: every registered tab (guide entry) is
 *      enumerated to stdout — the human-readable proof of what
 *      the lane serves.
 *   3. The estate trio is PRESENT: a Media entry (the gallery's
 *      media + flows faces) and a cards entry (the deck bench).
 *   4. The Media tab OPENS and paints its panel.
 *   5. Zero console errors / page errors across the tour.
 *   6. A screenshot lands at /tmp/estate-lane-sidebar.png — the
 *      receipt a status code can never give.
 *
 * Run: E2E_LANE_URL='http://127.0.0.1:3088/?token=…' pnpm --filter
 *   @melite-plugin/dsh-card-deck exec playwright test e2e/estate-lane-sidebar.spec.ts
 * (the :3088 lane is dsh-estate-3088.service — already up).
 */
import { expect, test, type Page } from '@playwright/test'

/** The token-bearing lane URL — DSH's connection fence mints a
 * random launch token per process (the service prints it to its
 * journal). Self-skips without it, same law as E2E_DECK_URL. */
const LANE_URL = process.env.E2E_LANE_URL ?? ''

test.skip(!LANE_URL, 'E2E_LANE_URL (token-authenticated lane URL) is not set — the audit needs the live estate lane (:3088, dsh-estate-3088.service)')

const consoleErrors: string[] = []

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0
  page.on('console', (msg): void => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err): void => {
    consoleErrors.push(String(err))
  })
})

/** The deck shell's settle law (comfy-manager.spec.ts): the
 * first-run notice's mask intercepts pointers; the strip hides
 * until a conversation is REALLY open. */
async function settleHost(page: Page): Promise<void> {
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8_000)
  const notice = page.getByRole('dialog', { name: 'Internal Testing Notice' }).getByRole('button', { name: 'Continue' })
  if ((await notice.count()) > 0) {
    await notice.click({ timeout: 10_000 })
    await page.waitForTimeout(1_000)
  }
  const expandSeat = page.locator('[data-sidebar-right-expand]').first()
  if ((await expandSeat.count()) === 0) {
    const hero = page.getByRole('textbox', { name: /Describe what you want to build/ })
    await hero.fill('lane audit: opening the shell for the sidebar census', { timeout: 15_000 })
    await hero.press('Enter')
    await page.waitForTimeout(8_000)
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
}

test('the estate lane renders the sidebar with Media + cards (the operator census)', async ({ page }) => {
  await settleHost(page)

  // THE CENSUS: the strip's START tab carries the registered tab
  // types as GUIDE entries — visible text rows (the Start face is
  // the strip's default once expanded, no picker click needed).
  const strip = page.locator('[data-sidebar-right-panel], [data-sidebar-right], aside').first()
  await expect(strip, 'the right strip renders').toBeVisible({ timeout: 30_000 })
  const raw = (await strip.innerText()).replace(/\n/g, ' ')
  const census = raw.split(/(?=Media|ComfyUI|Workspace|Chat|Trajectory|Start|Flow)/).map((t) => t.trim()).filter(Boolean)
  // eslint-disable-next-line no-console -- THE CENSUS (the audit's human-readable receipt)
  console.log('[lane-sidebar-census]', JSON.stringify(raw))

  // THE ESTATE TRIO: the media faces (Media Flow — the shared
  // bench; Media — the archive) and the deck's manager — the tabs
  // the bare-shell lane lost.
  expect(raw, 'strip carries the Media Flow guide').toMatch(/Media Flow/)
  expect(raw, 'strip carries the Media guide').toMatch(/Media/)
  expect(raw, 'strip carries the ComfyUI Manager guide').toMatch(/ComfyUI Manager/)

  // The Media tab OPENS and paints (the gallery's panel mounts:
  // any body-text change beyond the strip itself)
  const before = await page.locator('body').innerText()
  await page.getByText('Media Flow', { exact: true }).first().click({ timeout: 30_000 })
  await expect
    .poll(async () => (await page.locator('body').innerText()) !== before, { timeout: 30_000 })
    .toBe(true)

  // THE ARCHIVE PROOF: the Media panel renders REAL run rows (the
  // estate's runs face through the gallery — the 500-run window).
  // A lane whose queue seat silently deferred serves an empty
  // panel: the gallery's 502 becomes an empty list, not an error.
  // (From the open Media Flow bench: New tab → the Media guide.)
  await page.getByRole('button', { name: 'New tab' }).click({ timeout: 30_000 })
  await page.getByText('Media', { exact: true }).first().click({ timeout: 30_000 })
  // the archive's visible signature: the stat line (N runs · M
  // artifacts) — rows render by intent + artifact names, not ids
  await expect
    .poll(async () => /runs · /.test(await page.locator('body').innerText()), { timeout: 45_000 })
    .toBe(true)

  // ZERO console errors across the tour (a bundle that serves but
  // dies in the browser fails the audit)
  expect(consoleErrors, `console errors: ${consoleErrors.join(' ;; ')}`).toEqual([])

  await page.screenshot({ path: '/tmp/estate-lane-sidebar.png', fullPage: false })
})

