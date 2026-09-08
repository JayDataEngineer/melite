// E2E: close-after-arrow-nav morph verification (2026-08-10).
//
// The bug: collapsing the zoomed card AFTER walking the side arrows plays the
// wrong animation (snap / no morph / pulse). Unit tests cannot prove the
// morph — jsdom has no layout engine, so framer-motion's projection never
// runs. This spec drives the exact repro in a real browser and samples the
// box rect frame-by-frame across the exit: it must shrink PROGRESSIVELY
// (a spring morph over many frames), never jump once (snap) or sit static
// then vanish (no exit morph).
//
// Run:
//   npx playwright test --config=playwright.local.config.ts e2e/card-close-morph.spec.ts
import { test, expect, type Page, type Locator } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
}

async function gotoLibrary(page: Page): Promise<void> {
  await gotoEditor(page)
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
}

/** Wait for the flow template rows in the Library rail (ONE_SURFACE
 *  Phase 4, 2026-08-11): the "Flow Nodes" drawer merged INTO this rail,
 *  open by default — no toggle. The rows (data-flow-row) hydrate after
 *  the chain-list fetch lands. */
async function openFlowNodes(page: Page): Promise<void> {
  await page.locator('[data-flow-row]').first().waitFor({ state: 'visible', timeout: 15_000 })
}

const ROWS = '[data-flow-row]'

/** Open a flow with >= min cards (the arrow walk needs neighbors).
 *  Change-aware: waits until the tile id set CHANGES and reaches the minimum
 *  (a blind [data-card-wrap] wait races the previous flow's stale wraps). */
async function loadFlowWithAtLeast(page: Page, min: number): Promise<void> {
  const rows = page.locator(ROWS)
  await rows.first().waitFor({ state: 'visible', timeout: 15_000 })
  // Prefer the flagship character flow (known many-card) — else row 0.
  const names = await rows.allTextContents()
  let index = names.findIndex((t) => t.includes('character_cards'))
  if (index < 0) index = 0
  for (let attempt = 0; attempt < 5; attempt++) {
    const before = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-tile]')).map((t) => t.getAttribute('data-card-tile')).join(','))
    await rows.nth(index).click()
    try {
      await page.waitForFunction(({ before, min }) => {
        const ids = Array.from(document.querySelectorAll('[data-card-tile]')).map((t) => t.getAttribute('data-card-tile')).join(',')
        return ids.length > 0 && ids !== before && ids.split(',').length >= min
      }, { before, min }, { timeout: 20_000 })
      return
    } catch {
      // Hydration race — retry the load.
    }
  }
  throw new Error(`flow did not hydrate >= ${min} cards (rail rows: ${names.join(' | ')})`)
}

/** Wait for the overlay content to settle (skeleton phase → real detail). */
async function waitSettled(page: Page, box: Locator): Promise<void> {
  // Nav swaps the content to the skeleton for ZOOM_SKELETON_MS, then back.
  await box.locator('[data-card-skeleton]').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  await page.waitForFunction(
    () => !!document.querySelector('[data-card-ready]') && !!document.querySelector('[data-card-detail]'),
    undefined, { timeout: 15_000 },
  )
  await page.waitForTimeout(150) // let the spring settle
}

test.describe('Close-after-arrow-nav morph (2026-08-10 fix)', () => {
  test('collapsing after arrow-nav runs the spring shrink — frame-sampled', async ({ page }) => {
    await gotoLibrary(page)
    await openFlowNodes(page)
    await loadFlowWithAtLeast(page, 3)

    // Record the opened card's id + the CURRENT card's id (the arrow-walk
    // target). Their RESTING rects are captured AFTER the close — the grid
    // is revealed and every tile is back in its slot (the honest landing
    // comparison: the box must land where the tile actually sits).
    const openedTileId = (await page.locator('[data-card-tile]').first().getAttribute('data-card-tile'))!
    await page.locator('[data-card-tile]').first().click()
    const box = page.locator('[data-card-expanded]').first()
    await box.waitFor({ state: 'visible', timeout: 15_000 })
    await waitSettled(page, box)
    const detailRect = (await box.boundingBox())!

    // Arrow-walk: a → b → c (the reported repro). The honest shrink must
    // land on the CURRENT card's tile, not the opened one.
    await page.getByLabel('Next card (→)').click()
    await waitSettled(page, box)
    await page.getByLabel('Next card (→)').click()
    await waitSettled(page, box)
    const currentTileId = (await page.locator('[data-card-tile]').nth(2).getAttribute('data-card-tile'))!

    // Install the per-frame rect recorder BEFORE the exit.
    await page.evaluate(() => {
      const frames: { t: number; w: number; h: number; x: number; y: number; closing: boolean; gone: boolean }[] = []
      const start = performance.now()
      ;(function tick(now: number) {
        const el = document.querySelector('[data-card-expanded]')
        if (!el) {
          frames.push({ t: Math.round(now - start), w: 0, h: 0, x: 0, y: 0, closing: false, gone: true })
          return
        }
        const r = el.getBoundingClientRect()
        frames.push({
          t: Math.round(now - start),
          w: Math.round(r.width), h: Math.round(r.height),
          x: Math.round(r.x), y: Math.round(r.y),
          closing: el.getAttribute('data-card-closing') !== null,
          gone: false,
        })
        if (now - start < 2000) requestAnimationFrame(tick)
      })(performance.now())
      ;(window as any).__closeFrames = frames
    })

    await page.keyboard.press('Escape')
    await page.waitForTimeout(1800)

    const frames = await page.evaluate(() => (window as any).__closeFrames as any[])
    const live = frames.filter((f) => !f.gone && f.w > 0)
    const detailW = Math.round(detailRect.width)
    // The tiles' RESTING rects, captured after the close (the grid is
    // revealed; every tile is back in its slot).
    const tileMap = await page.evaluate(() => {
      const m: Record<string, { x: number; y: number; w: number }> = {}
      for (const t of Array.from(document.querySelectorAll('[data-card-tile]'))) {
        const r = t.getBoundingClientRect()
        m[t.getAttribute('data-card-tile')!] = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }
      }
      return m
    })
    const currentTileRect = tileMap[currentTileId] ?? { x: 0, y: 0, w: 0 }
    const openedTileRect = tileMap[openedTileId] ?? { x: 0, y: 0, w: 0 }
    const tileW = Math.round(currentTileRect.w)
    const lastFrame = live.length ? live[live.length - 1] : { w: 0, x: 0, y: 0, t: 0 }
    console.log(`  + open ${detailW}px → last live ${Math.round(lastFrame.w)}px at t=${lastFrame.t}ms vs tile ${tileW}px (tile x,y=${Math.round(currentTileRect.x)},${Math.round(currentTileRect.y)} opened x,y=${Math.round(openedTileRect.x)},${Math.round(openedTileRect.y)} last x,y=${Math.round(lastFrame.x)},${Math.round(lastFrame.y)}), ${live.length} live frames`)

    // 1. The exit actually began: the box shrinks at some point.
    const firstShrink = live.findIndex((f) => f.w < detailW - 2)
    expect(firstShrink, `box must begin shrinking (not snap-unmount); frames=${JSON.stringify(live.slice(0, 8).map((f) => f.w))}`).toBeGreaterThanOrEqual(0)

    // 2. Progressive spring: many distinct widths strictly between tile and detail.
    const during = live.slice(firstShrink)
    const widths = [...new Set(during.map((f) => f.w))]
    const mid = widths.filter((w) => w > tileW + 4 && w < detailW - 4)
    expect(mid.length, `progressive shrink: ${widths.length} distinct widths (${JSON.stringify(widths.slice(0, 12))})`).toBeGreaterThanOrEqual(6)

    // 3. No re-grow / pulse once the shrink starts.
    let reGrow = false
    for (let i = 1; i < during.length; i++) if (during[i].w > during[i - 1].w + 2) reGrow = true
    expect(reGrow, 'no re-grow / pulse during the exit').toBe(false)

    // 4. HONEST LANDING: the morph lands on the CURRENT card's tile (the one
    //    the user is on when collapsing), NOT the stale opened tile. And the
    //    overlay unmounts.
    const lastLive = during[during.length - 1]
    const dCurrent = Math.abs(lastLive.x - currentTileRect.x) + Math.abs(lastLive.y - currentTileRect.y)
    const dOpened = Math.abs(lastLive.x - openedTileRect.x) + Math.abs(lastLive.y - openedTileRect.y)
    console.log(`  + open ${detailW}px → shrink starts t=${live[firstShrink].t}ms, lands ${lastLive.w}px vs tile ${tileW}px (dist to CURRENT tile ${Math.round(dCurrent)}, dist to OPENED tile ${Math.round(dOpened)}), ${during.length} shrink frames`)
    expect(lastLive.w).toBeLessThan(tileW + Math.max(24, tileW / 2))
    expect(dCurrent, `the shrink must land on the CURRENT card's tile (opened dist ${Math.round(dOpened)})`).toBeLessThan(Math.max(80, tileW))
    expect(dOpened - dCurrent, 'the landing must be much closer to the CURRENT tile than the stale opened one').toBeGreaterThan(200)
    expect(frames[frames.length - 1].gone, 'overlay unmounted after the exit').toBe(true)
  })
})
