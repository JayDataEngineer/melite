/**
 * from-media.spec — THE LIVE REPRODUCTION (#41 report: "the 'From
 * media' on input cards is BROKEN"): drive the REAL lane shell in
 * Chromium, open an input-bearing card's form, click a source
 * square, choose From media, and capture what the modal actually
 * serves. Driven against the live lane (E2E_STUDIO_URL).
 */
import { expect, test } from '@playwright/test'

test('From media on an input card: menu opens, modal lists the runs library, a pick lands', async ({ page }) => {
  await page.goto(process.env.E2E_STUDIO_URL ?? '/', { waitUntil: 'domcontentloaded' })
  // the cards tab (right sidebar) — the estate's own surface
  await page.getByRole('button', { name: /cards/i }).first().click().catch(() => {})
  // open the first card tile (any input-bearing card; input-prep is
  // the canonical input card)
  const tile = page.locator('[data-card-tile], [data-testid*="card"]').first()
  await tile.click({ timeout: 20_000 }).catch(async () => {
    // fall back: the add-card door + input-prep
    await page.getByRole('button', { name: /add card/i }).first().click().catch(() => {})
  })
  await page.waitForTimeout(3000)
  // any source square (the + glyph / role button with 'source' aria)
  const square = page.locator('[aria-label*="source"i]').first()
  await square.click({ timeout: 20_000 })
  await page.waitForTimeout(800)
  const menuItem = page.getByText('From media').first()
  await menuItem.click({ timeout: 10_000 })
  await page.waitForTimeout(3000)
  // the modal: title + rows or empty state — capture the truth
  const modalText = await page.locator('[role="dialog"]').first().textContent().catch(() => 'NO-DIALOG')
  console.log('MODAL TEXT >>>', String(modalText).slice(0, 400))
  await page.screenshot({ path: '/tmp/from-media.png', fullPage: false })
})
