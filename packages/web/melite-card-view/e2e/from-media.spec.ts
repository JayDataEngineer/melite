/**
 * from-media.spec — THE LIVE REPRODUCTION (#41 report: "the 'From
 * media' on input cards is BROKEN"), reshaped 2026-09-21 from an
 * exploratory repro into a real wall: it rides the SAME fresh-host
 * spine as studio-render (tour.ts — mint a conversation, birth its
 * bench, seed the h3 stage, open the estate's guide tab), zooms the
 * studio, opens an input square's source menu, and picks From media.
 * The modal must serve the runs library — the card-base picker
 * contract: title 'From media', description 'The runs library', and
 * either pick rows (source-pick-row) or the honest empty state, with
 * zero page errors across the whole flow.
 */
import { expect, test } from '@playwright/test'
import { openAConversation, openCardsWithBench, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

test('From media on an input card: menu opens, modal lists the runs library, a pick lands', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 150)}`) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 150)}`) })

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open (the source menu lives inside the studio)').toBe(true)
  await openCardsWithBench(page, sessionKey)

  // the h3-timeline tile (seeded by the spine) — the studio door
  const tile = page.locator('button', { hasText: 'h3-timeline' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })
  await tile.click({ timeout: 10_000 })
  // the studio must claim the view before its input squares exist
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })

  // an input square (card-base's SourceRow grammar: aria-label
  // '<seat> source'). The FirstFrameSlot squares live INSIDE the
  // call editor — click the seeded call's row (the left panel's
  // '#0 …' button) to open it, then the square stands visible.
  const callRow = page.locator('button', { hasText: /#0/ }).first()
  await callRow.click({ timeout: 10_000 })
  await page.waitForTimeout(1_500)
  const square = page.locator('[aria-label*="source"i]').locator('visible=true').first()
  await expect(square, 'an input source square in the studio').toBeVisible({ timeout: 20_000 })
  await square.click({ timeout: 10_000 })
  await page.waitForTimeout(1_000)
  await page.getByText('From media', { exact: true }).first().click({ timeout: 10_000 })

  // THE PICKER CONTRACT (card-base square-provider): the modal is
  // titled 'From media', described 'The runs library', and serves
  // either pick rows or the honest empty state — never a dead pane.
  await expect(page.locator('[role="dialog"]'), 'the picker modal opens').toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('The runs library').first()).toBeVisible({ timeout: 10_000 })
  const rows = page.locator('[data-testid="source-pick-row"]')
  const rowCount = await rows.count()
  if (rowCount === 0) {
    await expect(page.getByText('nothing to pick yet'), 'the honest empty state when the runs library is empty').toBeVisible()
  } else {
    // a pick lands: clicking a row closes the modal and writes the
    // source (the square gains a thumb — its aria flips to detach)
    await rows.first().click({ timeout: 5_000 })
    await page.waitForTimeout(1_000)
    await expect(page.locator('[aria-label*="detach"i]').first(), 'the picked source lands (detach affordance appears)').toBeVisible({ timeout: 10_000 })
  }

  expect(errors, errors.join('\n')).toEqual([])
})
