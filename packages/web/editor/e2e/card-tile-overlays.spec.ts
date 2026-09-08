/**
 * card-tile-overlays.spec.ts — the TILE OVERLAY laws, end-to-end.
 *
 * The 2026-08-26 preview-fill restructure (flowCardTile LAYOUT LAW)
 * moved the IMAGE-ANCHORED overlays (tile Run/play, tile Stop, select
 * check, upstream badge) INSIDE the preview cell so their bottom anchors
 * ride the ARTIFACT's corner — the documented "thumbnail's bottom-right"
 * contract — while the top overlays (status dot, save, remove) stayed on
 * the frame. These tests pin what a hand on the tile can actually SEE and
 * PRESS, on the real chat surface (/editor/?meliteCards=<draftId>):
 *
 *   1. the SEED LAW for the reroll affordance — done + seed:-1 rerolls,
 *      a fixed seed renders NOTHING (a reroll on fixed bytes is a
 *      deceptive no-op) — and the button anchors to the image corner even
 *      when a taller sibling stretched the row;
 *   2. the pending Start affordance + the NO-LIE contract: no WS frames
 *      → no progress bar, no activity text, ever;
 *   3. the upstream wire badge rides the artifact's bottom-left corner;
 *   4. the remove affordance removes the card from the grid;
 *   5. the zoom drilldown's LARGE preview stays bounded (max-h-72).
 *
 * Honest-state note: the drafts API can only seed done/pending render
 * state (flowRunSlice hydrates everything else to pending) — running/
 * error overlays stay with the live-run specs. GPU-free throughout.
 */
import { expect, test, type Page } from '@playwright/test'
import {
  markDone, markInput, openCards, openCardsIdle, seedDraft, svgUrl,
} from './helpers/draftCards'

interface OverlayGeom {
  playCount: number
  playVerb: string | null
  /** |button.bottom − cell.bottom| — the image-corner anchor distance. */
  playBottomToCellBottom: number | null
  playRightToCellRight: number | null
  badgeText: string | null
  badgeLeftToCellLeft: number | null
  badgeBottomToCellBottom: number | null
  stripText: string
}

/** Measure one tile's overlays (scoped by its caption title) relative to
 * its PREVIEW CELL — the anchor contract lives against the IMAGE, not the
 * card frame. */
async function measureOverlays(page: Page, title: string): Promise<OverlayGeom> {
  return page.evaluate((want) => {
    const round = (v: number) => Math.round(v * 10) / 10
    const tiles = Array.from(document.querySelectorAll('[data-card-tile]'))
    const tile = tiles.find((t) =>
      (t.querySelector('h3')?.textContent ?? '').includes(want),
    ) as HTMLElement | undefined
    if (!tile) throw new Error('tile not found: ' + want)
    const inner = tile.firstElementChild as HTMLElement
    const cell = inner.children[0] as HTMLElement
    const strip = inner.children[inner.children.length - 1] as HTMLElement
    const cb = cell.getBoundingClientRect()
    const play = tile.querySelector<HTMLElement>('[data-tile-play]')
    const pb = play?.getBoundingClientRect()
    const badge = Array.from(tile.querySelectorAll('span')).find((s) =>
      (s.textContent ?? '').length > 0 &&
      s.querySelector('svg') &&
      s.className.includes('bottom-1.5'),
    )
    const bb = badge?.getBoundingClientRect()
    return {
      playCount: play ? 1 : 0,
      playVerb: play?.getAttribute('data-tile-play') ?? null,
      playBottomToCellBottom: pb ? round(cb.bottom - pb.bottom) : null,
      playRightToCellRight: pb ? round(cb.right - pb.right) : null,
      badgeText: badge?.textContent ?? null,
      badgeLeftToCellLeft: bb ? round(bb.left - cb.left) : null,
      badgeBottomToCellBottom: bb ? round(cb.bottom - bb.bottom) : null,
      stripText: (strip.textContent ?? '').trim(),
    }
  }, title)
}

test.describe('CardTile overlay laws (seed gate · no-lie feedback · image-anchored overlays)', () => {

  test('the reroll affordance obeys the SEED LAW and anchors to the image corner', async ({ page, request }) => {
    // Two DONE cards in a stretched row: the square card carries seed:-1
    // (random mode → Reroll is honest), the portrait card a fixed seed
    // (rerunning produces identical bytes → NO affordance, ever).
    const { draftId, stages } = await seedDraft(request, [
      { title: 'Reroll gen', params: { seed: -1, width: 1024, height: 1024 } },
      { title: 'Fixed gen', params: { seed: 42 } },
    ])
    await markDone(request, draftId, stages[0].id, svgUrl(1000, 1000))
    await markDone(request, draftId, stages[1].id, svgUrl(1000, 1800))
    await openCards(page, draftId)

    // Exactly ONE play affordance on the surface, and it is the reroll.
    await expect(page.locator('[data-tile-play]')).toHaveCount(1)
    const reroll = await measureOverlays(page, 'Reroll gen')
    expect(reroll.playVerb).toBe('reroll')
    // …anchored to the ARTIFACT corner (bottom-1 right-1.5 inside the cell),
    // not the caption strip or the frame — the documented contract.
    expect(Math.abs(reroll.playBottomToCellBottom!)).toBeLessThanOrEqual(8)
    expect(Math.abs(reroll.playRightToCellRight!)).toBeLessThanOrEqual(8)
    // The fixed-seed card renders NO affordance at all.
    const fixed = await measureOverlays(page, 'Fixed gen')
    expect(fixed.playCount).toBe(0)
    // The declared summary rides the caption: W×H from the params + seconds.
    expect(reroll.stripText).toContain('1024×1024')
    expect(reroll.stripText).toContain('9.4s')
  })

  test('a PENDING card offers Start and NEVER fakes run feedback', async ({ page, request }) => {
    // No result, no run: the honest tile shows a Start affordance (tapping
    // it would DO something) and zero live-run chrome — no frames exist to
    // report, so a progress bar or activity line would be a LIE.
    const { draftId } = await seedDraft(request, [
      { title: 'Pending gen', params: { seed: -1 } },
    ])
    await openCardsIdle(page, draftId)

    const g = await measureOverlays(page, 'Pending gen')
    expect(g.playVerb).toBe('start')
    await expect(page.locator('[data-card-progress]')).toHaveCount(0)
    await expect(page.locator('[data-card-activity]')).toHaveCount(0)
  })

  test('the upstream wire badge rides the artifact corner of the DOWNSTREAM card', async ({ page, request }) => {
    // gen → edit wired: the edit tile shows a chip naming its upstream at
    // the image's bottom-left; the source card shows nothing.
    const { draftId, stages } = await seedDraft(request, [
      { title: 'Source gen' },
      { title: 'Wired edit' },
    ])
    await markDone(request, draftId, stages[0].id, svgUrl(800, 800))
    await markInput(request, draftId, stages[1].id, stages[0].id)
    await markDone(request, draftId, stages[1].id, svgUrl(800, 800))
    await openCards(page, draftId)

    const source = await measureOverlays(page, 'Source gen')
    expect(source.badgeText).toBeNull()
    const wired = await measureOverlays(page, 'Wired edit')
    expect(wired.badgeText).toContain('Source gen')
    // Anchored INSIDE the cell, bottom-left (left-1.5 bottom-1.5).
    expect(wired.badgeLeftToCellLeft!).toBeGreaterThanOrEqual(0)
    expect(wired.badgeLeftToCellLeft!).toBeLessThanOrEqual(12)
    expect(Math.abs(wired.badgeBottomToCellBottom!)).toBeLessThanOrEqual(10)
  })

  test('the remove affordance removes the card from the grid', async ({ page, request }) => {
    const { draftId } = await seedDraft(request, [
      { title: 'Doomed gen' },
      { title: 'Survivor gen' },
    ])
    await openCardsIdle(page, draftId)
    await expect(page.locator('[data-card-tile]')).toHaveCount(2)

    const doomed = page
      .locator('[data-card-tile]')
      .filter({ hasText: 'Doomed gen' })
    await doomed.hover()
    await doomed.getByRole('button', { name: 'Remove card' }).click()
    await expect(page.locator('[data-card-tile]')).toHaveCount(1)
    // The RIGHT card died: the survivor is still on the surface.
    await expect(page.locator('[data-card-tile]')).toContainText('Survivor gen')
    await expect(page.locator('[data-card-tile]')).not.toContainText('Doomed gen')
  })

  test('the zoom drilldown LARGE preview stays bounded (SQUARE LAW column)', async ({ page, request }) => {
    // A tall portrait output: the drilldown hero LETTERBOXES it inside the
    // OUTPUT COLUMN of the ≈square card (object-contain) — never a
    // page-tall image, and never the old 288px strip either. The bound is
    // the card's own height (aspect-square panel, 86vh cap), so assert the
    // img stays inside [data-card-expanded] and leaves room for controls.
    const { draftId, stages } = await seedDraft(request, [{ title: 'Tall gen' }])
    await markDone(request, draftId, stages[0].id, svgUrl(800, 2000))
    await openCards(page, draftId)

    await page.click('[data-card-tile]')
    const overlay = page.locator('[data-card-zoom-overlay]')
    await expect(overlay).toBeVisible({ timeout: 15_000 })
    const hero = overlay.locator('img').first()
    await expect(hero).toBeVisible()
    const box = await hero.boundingBox()
    expect(box).not.toBeNull()
    const card = await page.locator('[data-card-expanded]').boundingBox()
    expect(card).not.toBeNull()
    // Inside the bounded ≈square card (no page-tall hero):
    expect(box!.height).toBeLessThanOrEqual(card!.height + 1)
    expect(box!.width).toBeGreaterThan(50)
    // And the CONTROLS share the row — the body is side-by-side at md+.
    const body = page.locator('[data-card-detail-body]')
    await expect(body).toHaveCSS('flex-direction', 'row')
  })
})
