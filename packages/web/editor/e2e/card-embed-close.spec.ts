// E2E: embed close-fold honest landing (2026-09-06).
//
// The bug: in the DSH embed the toolview PROMOTES the card iframe to a
// fixed full-viewport slab while the zoom overlay is open. The close
// (shrink-back) morph played while the frame was still promoted, so framer
// targeted the tile's PROMOTED full-viewport rect — the card folded toward
// the top-left of the screen, ignoring the DSH sidebars. The fix keeps the
// viewport STATIC through the exit (motion-dom kills live projections on
// any innerWidth change) and rides the frame home instead: at close-start
// the machine WAAPI-glides the fixed frame (translate + clip, never a
// resize) onto the captured resting box while the resting grid stays pinned
// to its column width, so the fold converges onto the tile's real spot and
// the unmount bake changes zero pixels. Unit tests cannot prove the
// landing — happy-dom has no layout engine. This spec drives
// card-embed-shell.html (DSH-like chrome + the REAL zoom-promotion
// machine) and pins the landing: the last live shrink frame must sit where
// the tile actually rests.
//
// Run:
//   npx playwright test --config=playwright.local.config.ts e2e/card-embed-close.spec.ts
import { test, expect } from '@playwright/test'

test.describe('embed close-fold honest landing (2026-09-06 fix)', () => {
  test('the shrink-back lands on the tile\'s column spot, not the promoted rect', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/editor/card-embed-shell.html?scenario=chain', { waitUntil: 'domcontentloaded' })
    // The shell sets the iframe src from its module script — wait for it.
    await page.waitForFunction(() => {
      const f = document.getElementById('toolf') as HTMLIFrameElement | null
      return !!f && f.src.includes('card-harness')
    })
    const frame = page.frame({ url: /card-harness\.html/ })
    expect(frame, 'the embed iframe mounted the harness').toBeTruthy()
    await frame!.locator('[data-agent-cards-embed]').waitFor({ state: 'visible', timeout: 60_000 })
    await page.waitForTimeout(1200)

    // The tile must be clickable: scroll the tool row into view first.
    await page.evaluate(() => {
      document.getElementById('toolf')!.scrollIntoView({ block: 'center' })
    })
    await page.waitForTimeout(400)
    await frame!.locator('[data-card-tile]').first().click()
    await frame!.locator('[data-card-zoom-overlay]').waitFor({ state: 'attached', timeout: 15_000 })
    await frame!.locator('[data-card-ready="true"]').waitFor({ state: 'attached', timeout: 15_000 })
    await page.waitForTimeout(400)

    // Promotion engaged: the machine saw the overlay and slabbed the frame.
    const promoted = await page.evaluate(() => {
      const f = document.getElementById('toolf') as HTMLIFrameElement
      const r = f.getBoundingClientRect()
      const shell = (window as unknown as { __embedShell: { isZoomOpen(): boolean } }).__embedShell
      return { pos: f.style.position, open: shell.isZoomOpen(), x: Math.round(r.x), w: Math.round(r.width) }
    })
    expect(promoted.open, 'promotion engaged while the overlay is open').toBe(true)
    expect(promoted.pos, 'frame slabbed fullscreen').toBe('fixed')
    expect(promoted.w, 'slab spans the viewport, sidebars covered').toBeGreaterThan(1500)

    // Per-frame recorder INSIDE the iframe: card + resting-tile boxes in
    // SCREEN coords (frame offset applied), until the overlay unmounts.
    await frame!.evaluate(() => {
      const frames: { t: number; card: { x: number; y: number; w: number } | null }[] = []
      const start = performance.now()
      const ifr = window.frameElement as HTMLIFrameElement
      ;(function tick(now: number) {
        const fr = ifr.getBoundingClientRect()
        const el = document.querySelector('[data-card-expanded]')
        if (!el) {
          frames.push({ t: Math.round(now - start), card: null })
          ;(window as unknown as { __embedCloseFrames: unknown }).__embedCloseFrames = frames
          return
        }
        const r = el.getBoundingClientRect()
        frames.push({
          t: Math.round(now - start),
          card: { x: Math.round(fr.x + r.x), y: Math.round(fr.y + r.y), w: Math.round(r.width) },
        })
        if (now - start < 3000) requestAnimationFrame(tick)
        else (window as unknown as { __embedCloseFrames: unknown }).__embedCloseFrames = frames
      })(performance.now())
    })

    await frame!.evaluate(() =>
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    await frame!.locator('[data-card-zoom-overlay]').waitFor({ state: 'detached', timeout: 15_000 })
    await page.waitForTimeout(600) // let the demote + fit settle

    const track = await frame!.evaluate(
      () => (window as unknown as { __embedCloseFrames: { t: number; card: { x: number; y: number; w: number } | null }[] }).__embedCloseFrames)
    const live = track.filter((f) => f.card !== null)
    expect(live.length, 'the exit morph played over live frames (no snap-unmount)').toBeGreaterThan(3)

    // The tile's RESTING screen rect, captured after the demote.
    const tile = await page.evaluate(() => {
      const f = document.getElementById('toolf') as HTMLIFrameElement
      const fr = f.getBoundingClientRect()
      const t = f.contentDocument!.querySelector('[data-card-tile]')!
      const r = t.getBoundingClientRect()
      return {
        x: Math.round(fr.x + r.x), y: Math.round(fr.y + r.y), w: Math.round(r.width),
        framePos: f.style.position || '(flow)',
        frameX: Math.round(fr.x), frameW: Math.round(fr.width),
      }
    })
    expect(tile.framePos, 'the frame demoted back into the column').toBe('(flow)')
    expect(tile.frameX, 'the column sits right of the left sidebar').toBeGreaterThan(200)

    const last = live[live.length - 1]!.card!
    const dist = Math.abs(last.x - tile.x) + Math.abs(last.y - tile.y)
    console.log(`  + last live ${last.w}px at (${last.x},${last.y}) vs resting tile ${tile.w}px at (${tile.x},${tile.y}) — dist ${dist}, ${live.length} live frames`)
    // The fold must converge onto the tile's real column spot. Pre-fix this
    // lands ~500px off (the promoted full-viewport rect, x≈32: the sidebars
    // unaccounted); post-fix the glide carries the frame home first.
    expect(dist, `the shrink must land on the tile's column spot (got ${dist}px off)`).toBeLessThan(120)
    expect(Math.abs(last.w - tile.w), 'the box shrinks to tile size').toBeLessThan(60)
  })
})
