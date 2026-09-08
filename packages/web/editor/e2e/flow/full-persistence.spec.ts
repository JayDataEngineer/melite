/* PROOF: a card authored on the Library canvas SURVIVES a full page
 * reload — the ALWAYS-ON localStorage persistence (storePersistence.ts,
 * LIB_FLOW_KEY = melite:flow:v2:library).
 *
 * (2026-08-26 rewrite: the native-agent chat that used to build the
 * flow via build_flow died 2026-08-21 — the assistant lives in
 * the DSH plugins now. The authoring surface is the Library card canvas;
 * the persistence property under proof is the STORE mirror, not the
 * chat, so the card is authored with the real picker flow instead.)
 *
 * "SAVE TO DISK. ALL EVERYTHING. ALWAYS. NONE OF THIS EPHEMERAL LOST ON
 * BROWSER REFRESH EVER." localStorage (not sessionStorage) survives tab
 * close + browser restart.
 */
import { test, expect, type Page, type Locator } from '@playwright/test'
import { gotoLibrary, openPicker, switchCardModel } from '../helpers/r1Card'

async function waitForCanvasCard(page: Page, timeout = 30_000): Promise<Locator> {
  const card = page.locator('[data-card-detail], [data-card-tile], [data-card-wrap]').first()
  await card.waitFor({ state: 'visible', timeout })
  return card
}

test('FULL persistence: author → reload → card survives', async ({ page }) => {
  test.setTimeout(120_000)

  // ── 1. AUTHOR: pick a card through the real picker ────────────────
  await gotoLibrary(page)
  const dialog = await openPicker(page)
  // Models are not entries (2026-09-04): land the Image capability, then
  // switch the card's Model select to z-image.
  await dialog.getByRole('button', { name: 'Image', exact: true }).click()
  const authored = page.locator('[data-card-detail], [data-card-tile], [data-card-wrap]').first()
  await authored.waitFor({ state: 'visible', timeout: 30_000 })
  await switchCardModel(authored, 'z-image')
  const card = await waitForCanvasCard(page)
  await expect(card).toContainText(/z-image/i)
  console.log('  ✓ AUTHOR: z-image card landed on the canvas')

  // ── 2. The ALWAYS-ON mirror fired (localStorage, not memory) ─────
  const hasSnapshot = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('melite:flow:v2:')) return true
    }
    return false
  })
  expect(hasSnapshot, 'localStorage should hold the flow snapshot').toBeTruthy()
  console.log('  ✓ localStorage snapshot written')

  // ── 3. RELOAD: the card must reappear WITHOUT re-authoring ───────
  await page.reload({ waitUntil: 'domcontentloaded' })
  const revived = await waitForCanvasCard(page)
  await expect(revived).toContainText(/z-image/i)
  console.log('  ✓ RELOAD: card survived the refresh')
})
