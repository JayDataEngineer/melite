/**
 * card-preview-fill.spec.ts — the CARD PREVIEW-FILL LAW, end-to-end.
 *
 * Operator report (2026-08-26): "in the preview there is a massive square
 * below the preview when generated — I want the ENTIRE card to be the
 * preview, not that blank space below." Root cause was anatomical: the
 * visual card frame carried h-full while the caption body was its flex-1
 * SIBLING, so the body resolved to zero height (its text painted outside
 * the frame) and every stretched pixel rendered as dead background under
 * the artifact.
 *
 * The fixed anatomy (flowCardTile.tsx LAYOUT LAW) gives the frame two
 * flow children: the PREVIEW CELL (flex-1 min-h-0 — owns everything above
 * the caption; media fills it object-cover) and the CAPTION STRIP
 * (shrink-0 — flush at the bottom, inside the frame).
 *
 * SUPERSEDED in part by the SQUARE LAW (2026-08-23, "Action Cards need a
 * more square shape, they are too tall"): the preview cell carries
 * aspect-square, so the resting card is ≈square and a portrait artifact
 * CROPS (object-cover) instead of stretching its row. The fill guarantees
 * below (no gap, media fills cell, caption inside frame) all still hold;
 * the "cell preserves the artifact's natural aspect" reading is gone.
 *
 * These tests drive the REAL chat surface (/editor/?meliteCards=<draftId> —
 * the same FlowTileGrid the Library canvas renders), seeded through
 * the gateway drafts API via helpers/draftCards.ts. Artifacts ride SVG
 * DATA URLs with declared dimensions: decodable <img>s with exact
 * naturalWidth/Height, zero dependency on run artifacts on disk, GPU-free.
 *
 * Needs the live stack (vite :5173 proxying the owning DSH) like every
 * other e2e — no webServer stanza in playwright.config.ts.
 */
import { expect, test, type Page } from '@playwright/test'
import {
  markDone, openCards, openCardsIdle, seedDraft, svgUrl,
} from './helpers/draftCards'

interface TileGeom {
  title: string
  wrapH: number
  cellTop: number
  cellH: number
  cellW: number
  /** null when the card has no artifact yet (idle/running placeholder). */
  imgH: number | null
  gapCellToStrip: number
  stripInsideCard: boolean
  stripText: string
}

/** Measure EVERY tile's anatomy: the preview cell, its media, the caption
 * strip, and the three numbers the law is made of (gap, containment, fill). */
async function measureTiles(page: Page): Promise<TileGeom[]> {
  return page.evaluate(() => {
    const round = (v: number) => Math.round(v * 10) / 10
    return Array.from(document.querySelectorAll('[data-card-tile]')).map(
      (tile) => {
        const el = tile as HTMLElement
        const inner = el.firstElementChild as HTMLElement
        // Flow children of the frame: [preview cell, …top overlays…, caption].
        const cell = inner.children[0] as HTMLElement
        const strip = inner.children[inner.children.length - 1] as HTMLElement
        const img = cell.querySelector('img') as HTMLImageElement | null
        const cb = cell.getBoundingClientRect()
        const sb = strip.getBoundingClientRect()
        return {
          title: strip.querySelector('h3')?.textContent ?? '',
          wrapH: round(el.parentElement!.getBoundingClientRect().height),
          cellTop: round(cb.top),
          cellH: round(cb.height),
          cellW: round(cb.width),
          imgH: img ? round(img.getBoundingClientRect().height) : null,
          gapCellToStrip: round(sb.top - cb.bottom),
          stripInsideCard: sb.bottom <= inner.getBoundingClientRect().bottom + 0.5,
          stripText: (strip.textContent ?? '').trim(),
        }
      },
    )
  })
}

test.describe('CardTile preview-fill law (2026-08-26 "the entire card IS the preview")', () => {

  test('a done card shows its artifact EDGE TO EDGE — caption flush beneath, nothing blank between', async ({ page, request }) => {
    // Solo landscape artifact (5:4): alone in its row the card defines its
    // own height, so the cell must be SQUARE (SQUARE LAW) — fill with
    // cover-crop — and the caption must start exactly where the image ends.
    const { draftId, stages } = await seedDraft(request, [{ title: 'Solo gen' }])
    await markDone(request, draftId, stages[0].id, svgUrl(1000, 800))
    await openCards(page, draftId)

    const tiles = await measureTiles(page)
    expect(tiles).toHaveLength(1)
    const t = tiles[0]

    // THE LAW: media bottom == caption top. Zero blank band, ever.
    expect(Math.abs(t.gapCellToStrip)).toBeLessThanOrEqual(1)
    // Media FILLS its cell horizontally AND vertically.
    expect(Math.abs(t.imgH! - t.cellH)).toBeLessThanOrEqual(1)
    // Caption sits INSIDE the frame (the old bug painted it outside).
    expect(t.stripInsideCard).toBe(true)
    // SQUARE LAW: the resting cell is width×1 (~198px at the 200px basis),
    // regardless of the artifact's native ratio (5:4 here crops slightly).
    expect(Math.abs(t.cellH - t.cellW)).toBeLessThanOrEqual(2)
    // The declared summary really renders IN the strip.
    expect(t.stripText).toContain('Solo gen')
  })

  test('a TALLER sibling stretches the row: both artifacts fill their cells — no massive square under the short one', async ({ page, request }) => {
    // The reported bug, reproduced: a portrait output makes the ROW tall;
    // the square card next to it used to show its image + a huge dead
    // background slab. Now its image GROWS (object-cover) to meet the
    // caption — both tiles uniform, both gaps zero.
    const { draftId, stages } = await seedDraft(request, [
      { title: 'Square gen' },
      { title: 'Portrait gen' },
    ])
    await markDone(request, draftId, stages[0].id, svgUrl(1000, 1000))
    await markDone(request, draftId, stages[1].id, svgUrl(1000, 1800))
    await openCards(page, draftId)

    const tiles = await measureTiles(page)
    expect(tiles).toHaveLength(2)
    const [square, portrait] = tiles

    // Uniform row (items-stretch): same wrapper heights.
    expect(Math.abs(square.wrapH - portrait.wrapH)).toBeLessThanOrEqual(1)
    // THE LAW holds for BOTH cards: image meets caption with NO gap.
    for (const t of tiles) {
      expect(Math.abs(t.gapCellToStrip)).toBeLessThanOrEqual(1)
      expect(Math.abs(t.imgH! - t.cellH)).toBeLessThanOrEqual(1)
      expect(t.stripInsideCard).toBe(true)
      expect(t.stripText).toContain('gen')
    }
    // SQUARE LAW: BOTH cells land width×1 — the portrait artifact crops
    // instead of stretching the row, and the square one fills without
    // dead background. (The pre-square reading — "the short card's media
    // GROWS past its natural aspect" — is gone: nothing in a resting row
    // is taller than square anymore.)
    for (const t of tiles) {
      expect(Math.abs(t.cellH - t.cellW)).toBeLessThanOrEqual(2)
    }
  })

  test('an IDLE card keeps its floor: the preview cell never collapses (min-h-28)', async ({ page, request }) => {
    // No result yet: the icon-placeholder branch rides the same flex cell.
    // It is SQUARE like every other resting cell; min-h-28 remains purely
    // as the collapse floor for a lone empty row.
    const { draftId } = await seedDraft(request, [{ title: 'Pending gen' }])
    await openCardsIdle(page, draftId)

    const tiles = await measureTiles(page)
    expect(tiles).toHaveLength(1)
    expect(tiles[0].cellH).toBeGreaterThanOrEqual(110)
    expect(Math.abs(tiles[0].cellH - tiles[0].cellW)).toBeLessThanOrEqual(2)
    expect(tiles[0].stripInsideCard).toBe(true)
  })

  test('the restructured tile still opens the ZOOM drilldown on click', async ({ page, request }) => {
    // Regression guard for the anatomy rewrite: click-to-expand is the ONE
    // drilldown contract (no modal); the shared-element morph targets
    // [data-card-zoom-overlay]. Escape closes it through the exit morph.
    const { draftId, stages } = await seedDraft(request, [{ title: 'Zoom gen' }])
    await markDone(request, draftId, stages[0].id, svgUrl(1000, 1000))
    await openCards(page, draftId)

    await page.click('[data-card-tile]')
    const overlay = page.locator('[data-card-zoom-overlay]')
    await expect(overlay).toHaveCount(1, { timeout: 15_000 })

    await page.keyboard.press('Escape')
    // AnimatePresence HOLDS the overlay through the exit shrink (documented
    // in flowCardGrid) — give the morph time to finish, then it MUST go.
    await expect(overlay).toHaveCount(0, { timeout: 8_000 })
  })
})
