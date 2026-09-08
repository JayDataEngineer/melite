/**
 * E2E: Library card ZOOM OVERLAY — the sole-focus drilldown (2026-08-08).
 *
 * The operator's policy (verbatim): "WHEN I ZOOM IN ON A CARD, ALL OTHER
 * CARDS SHOULD GO AWAY. CHAT INPUT SHOULD GO AWAY. THE ONLY THING SHOULD BE
 * THE ONE DRILLDOWN CARD. THE SHRINK ANIMATION [REDACTED 2026-11-05], IT'S BUGGY. I NEED
 * SMOOTH EXPAND SMOOTH SHRINK."
 *
 * Clicking a tile opens a zoom overlay (CardZoomOverlay), portaled into the
 * workspace content area (sidebars + header stay visible), whose
 * solid backdrop covers the resting grid + chat + chat input, with the single
 * detail card centered on top — the drilldown is the only thing on screen.
 * The open/close is a framer-motion SHARED ELEMENT (layoutId): the tile and
 * the zoomed card share the same key, so framer projects the card FROM the
 * tile (grow) and BACK into it (shrink) — transform-only, compositor-only,
 * zero reflow. The shrink is the SAME morph reversed (binding policy,
 * verbatim: "LITERALLY JUST REVERSE THE ANIMATION THAT DOES THE DRILLDOWN").
 * The old in-place flex-basis expansion (which animated layout during a
 * content swap — the literal jank source) is dead: the resting grid never
 * re-flows, it just hides behind the backdrop.
 *
 * This spec walks the user's exact flow and pins the invariant:
 *   - after loading an old flow, every card wrapper is compact (~200px);
 *   - after clicking a card, a content-area-scoped zoom overlay mounts (sidebars
 *     + header stay visible), the detail
 *     is centered + bounded, and every resting wrapper stays at 200px (no
 *     in-place growth, no sibling shrink) behind the solid backdrop;
 *   - Escape collapses the overlay (it detaches after the close animation);
 *   - click-drag still reorders the resting grid (zoom never interferes).
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/library-one-card-surface.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
// The app boots to the AGENT tab (startup default, user 2026-08-06) — the
  // Library button is the reliable "app is up" signal (TECH NOIR only exists
  // on the Library surface, which is not the landing tab).
  await page.getByRole('button', { name: /^Library$/ }).first().waitFor({ state: 'visible', timeout: 30_000 })
    }
    
// The app boots to the AGENT tab (startup default, user 2026-08-06) — the
// Library card canvas is a header tab, not the landing surface.
async function gotoLibrary(page: Page): Promise<void> {
  await gotoEditor(page)
  await page.getByRole('button', { name: /^Library$/ }).first().click()
  await page.locator('text=Author a flow').first().waitFor({ state: 'visible', timeout: 15_000 })
    }
    
/** Wait for the flow template rows in the Library rail (ONE_SURFACE
 *  Phase 4, 2026-08-11): the "Flow Nodes" drawer merged INTO this rail,
 *  which is open by default — there is no toggle to click. The rows
 *  (data-flow-row) hydrate after the chain-list fetch lands, so wait
 *  for the hydrated rows themselves, never a body-text snapshot. */
async function openFlowNodes(page: Page): Promise<void> {
  try {
    await page.locator('[data-flow-row]').first().waitFor({ state: 'visible', timeout: 15_000 })
  } catch {
    throw new Error('Library rail did not show flow spec rows')
  }
}

/** Load "an old flow": click a spec row in the rail (first row by
 *  default, or the row whose name includes `name`). */
async function loadFlow(page: Page, name?: string): Promise<void> {
  const rows = page.locator('[data-flow-row]')
  const count = await rows.count()
  expect(count, 'flow spec rows listed in the rail').toBeGreaterThan(0)
  if (name) {
    const wanted = page.locator(`[data-flow-row]:has-text('${name}')`)
    await wanted.first().waitFor({ state: 'visible', timeout: 10_000 })
    await wanted.first().click()
  } else {
    await rows.first().click()
  }
  // The loaded flow hydrates the canvas as cards.
  await page.waitForFunction(() => document.querySelectorAll('[data-card-wrap]').length > 0, undefined, { timeout: 20_000 })
}
    
async function loadFirstFlow(page: Page): Promise<void> {
  await loadFlow(page)
    }
    
test.describe('Library — zoom overlay (sole-focus drilldown, 2026-08-08)', () => {
  test('loading an old flow renders compact rectangle cards — never a full-width surface', async ({ page }) => {
    await gotoLibrary(page)
    await openFlowNodes(page)
    await loadFirstFlow(page)
    await page.waitForTimeout(500) // let any load animation settle
    
    // Every card wrapper is a compact tile (~200px basis) — the dense
    // rectangle format. The resting grid never renders a full-width card.
    const widths = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-wrap]')).map((w) => Math.round(w.getBoundingClientRect().width)),
    )
    expect(widths.length).toBeGreaterThan(0)
    for (const w of widths) {
      expect(w, 'every card wrapper stays compact after loading a flow').toBeLessThanOrEqual(260)
    }
    console.log(`  + loaded flow -> ${widths.length} compact card(s) (max width ${Math.max(...widths)}px)`)
})

  test('clicking a card opens a full-focus ZOOM OVERLAY — the drilldown is the sole thing on screen', async ({ page }) => {
    await gotoLibrary(page)
    await openFlowNodes(page)
    await loadFirstFlow(page)
    await page.waitForTimeout(500)
    
    const tilesBefore = await page.locator('[data-card-tile]').count()
    expect(tilesBefore).toBeGreaterThan(0)
    
    // Click a card — the user's "zoom in" action.
    await page.locator('[data-card-tile]').first().click()
    // The zoom overlay mounts: portaled into [data-workspace-content] (the
    // tab-content region), absolute inset-0, solid backdrop. The single
    // detail card inside it is the focus; sidebars + header stay visible.
    const overlay = page.locator('[data-card-zoom-overlay]')
    await overlay.waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('[data-card-expanded]').first().waitFor({ state: 'visible', timeout: 15_000 })
    await page.waitForTimeout(450) // open animation (transform/opacity) settles
    
    // The overlay is scoped to the CONTENT AREA — sidebars + header stay
    // visible + interactive (2026-08-08 revision: "keep the sidebars and
    // stuff, but NOT the other cards or chat"). It no longer eats the whole
    // viewport; it covers the in-surface content (grid + chat) only.
    const overlayBox = await overlay.boundingBox()
    const viewportW = await page.evaluate(() => window.innerWidth)
    const viewportH = await page.evaluate(() => window.innerHeight)
    expect(overlayBox, 'the overlay has geometry').toBeTruthy()
    // The overlay aligns EXACTLY with the workspace content area — NOT the
    // full viewport. Chrome (left rail + header) is preserved around it.
    const contentBox = await page.locator('[data-workspace-content]').boundingBox()
    expect(contentBox, 'the workspace content area has geometry').toBeTruthy()
    expect(Math.abs(overlayBox!.x - contentBox!.x), 'overlay left-aligns with the content area').toBeLessThan(2)
    expect(Math.abs(overlayBox!.y - contentBox!.y), 'overlay top-aligns with the content area').toBeLessThan(2)
    expect(Math.abs(overlayBox!.width - contentBox!.width), 'overlay spans the content area width').toBeLessThan(2)
    expect(Math.abs(overlayBox!.height - contentBox!.height), 'overlay spans the content area height').toBeLessThan(2)
    // And that content area is inset from the viewport edges — the left rail
    // lives on, visible + clickable, outside the overlay. (No header bar in
    // the current shell — WorkspaceLayout: the status cluster overlays the
    // content directly, so the content area top-aligns with the viewport.)
    expect(contentBox!.x, 'left rail stays visible (content area inset from the left)').toBeGreaterThan(0)
    expect(contentBox!.width, 'content area does NOT span the full viewport width').toBeLessThan(viewportW)
    expect(contentBox!.height, 'no header bar: the content area spans the full viewport height').toBe(viewportH)
    
    // The detail card is centered + bounded (~680px) — never a thin band,
    // never the full canvas.
    const detailBox = await page.locator('[data-card-expanded]').first().boundingBox()
    expect(detailBox, 'the detail card has geometry').toBeTruthy()
    expect(detailBox!.width).toBeGreaterThanOrEqual(400)
    expect(detailBox!.width).toBeLessThanOrEqual(820)
    expect(detailBox!.width, 'detail stays under 75% of the viewport').toBeLessThan(viewportW * 0.75)
    
    // The resting grid NEVER re-flows: every wrapper stays at its compact
    // 200px basis (the old in-place flex-basis expansion is dead). The
    // siblings are still in the DOM, covered by the backdrop — not unmounted,
    // not shrunk to 160px, not hidden.
    const basis = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-wrap]')).map((w) => getComputedStyle(w).flexBasis),
    )
    expect(basis.length).toBeGreaterThan(0)
    for (const b of basis) {
      expect(b, 'resting wrappers stay at 200px (no in-place growth, no shrink)').toBe('200px')
    }
    expect(await page.locator('[data-card-tile]').count(), 'all tiles stay mounted behind the backdrop').toBe(tilesBefore)
    console.log(`  + click -> zoom overlay ${Math.round(overlayBox!.width)}x${Math.round(overlayBox!.height)} (sole focus), detail ${Math.round(detailBox!.width)}px; grid stays compact behind backdrop`)
    
    // Escape collapses the overlay — after the close animation it detaches.
    // verbatim: "LITERALLY JUST REVERSE THE ANIMATION THAT DOES THE
    // DRILLDOWN"). The SAME layoutId morph that grew the card FROM the tile
    // projects it BACK into the tile on exit. The box is ALWAYS visible —
    // it shrinks on every frame, never disappears, never teleports.
    await page.keyboard.press('Escape')
    // The box is mid-shrink — prove it's actually shrinking (the layoutId
    // projection is driving the box back toward the tile), not sitting at
    // full size waiting for a timer cut. Sample the width at ~120ms in: it
    // must be SMALLER than the open width.
    await page.waitForTimeout(120)
    const shrinkingBox = await page.locator('[data-card-expanded]').first().boundingBox()
    expect(shrinkingBox, 'the box is still mounted mid-shrink (always visible)').toBeTruthy()
    expect(shrinkingBox!.width, 'the box SHRINKS (width drops below its 680px open size)').toBeLessThan(detailBox!.width - 40)
    // The overlay detaches after the morph lands → safeToRemove → unmount.
    await page.locator('[data-card-zoom-overlay]').waitFor({ state: 'detached', timeout: 5_000 })
    expect(await page.locator('[data-card-expanded]').count()).toBe(0)
    console.log(`  + Escape -> box shrinks ${Math.round(detailBox!.width)}px → ${Math.round(shrinkingBox!.width)}px (always visible), projects back into tile, overlay gone`)
})

  test('multi-stage flow: clicking a card opens the zoom overlay — all cards stay mounted behind the backdrop', async ({ page }) => {
    await gotoLibrary(page)
    await openFlowNodes(page)
    // video_weave is the 4-step B3 weave (generate -> edit -> edit -> concat).
    await loadFlow(page, 'video_weave')
    await page.waitForTimeout(500)
    
    const wrapsBefore = await page.locator('[data-card-wrap]').count()
    const tilesBefore = await page.locator('[data-card-tile]').count()
    expect(wrapsBefore, 'multi-stage flow loads several cards').toBeGreaterThanOrEqual(2)
    expect(tilesBefore).toBe(wrapsBefore)
    
    await page.locator('[data-card-tile]').first().click()
    await page.locator('[data-card-zoom-overlay]').waitFor({ state: 'visible', timeout: 15_000 })
    await page.waitForTimeout(450)
    
    // The zoom overlay is the sole focus; the resting grid stays mounted
    // behind the backdrop (no card unmounts, no card reflows). Every
    // wrapper stays at its compact 200px basis.
    expect(await page.locator('[data-card-wrap]').count(), 'no wrapper unmounts').toBe(wrapsBefore)
    expect(await page.locator('[data-card-tile]').count(), 'no tile unmounts - grid covered, not removed').toBe(tilesBefore)
    const basis = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-wrap]')).map((w) => getComputedStyle(w).flexBasis),
    )
    for (const b of basis) expect(b, 'every wrapper stays at 200px').toBe('200px')
    console.log(`  + multi-stage: zoom overlay open, ${wrapsBefore} cards stay mounted behind backdrop`)
})

  test('click-drag reorders the cards — drag order = flow order (2026-08-08)', async ({ page }) => {
    await gotoLibrary(page)
    await openFlowNodes(page)
    await loadFlow(page, 'video_weave')
    await page.waitForTimeout(500)
    
    const wraps = page.locator('[data-card-wrap]')
    const before = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-wrap]')).map((w) => w.getAttribute('data-card-wrap')),
    )
    expect(before.length, 'a real multi-stage flow for the drag').toBeGreaterThanOrEqual(3)
    
    // Physical drag (dnd-kit PointerSensor — trusted pointer events): press
    // on the FIRST card, glide onto the second card's center, release. The
    // 4px activation distance separates this from a click (click-to-zoom
    // must still work — proven above).
    const boxA = await wraps.nth(0).boundingBox()
    const boxB = await wraps.nth(1).boundingBox()
    expect(boxA && boxB, 'first two cards have geometry').toBeTruthy()
    await page.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2)
    await page.mouse.down()
    await page.mouse.move(boxB!.x + boxB!.width / 2, boxB!.y + boxB!.height / 2, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(400) // drop animation settles
    
    const after = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-wrap]')).map((w) => w.getAttribute('data-card-wrap')),
    )
    expect(after[0], 'dragged card takes the first slot').toBe(before[1])
    expect(after[1]).toBe(before[0])
    expect(after.slice(2)).toEqual(before.slice(2))
    // The drag was NOT a click: no zoom overlay opened (dnd-kit suppresses
    // the trailing click after a real drag — click-to-zoom is preserved).
    expect(await page.locator('[data-card-zoom-overlay]').count()).toBe(0)
    expect(await page.locator('[data-card-expanded]').count()).toBe(0)
    
    // Drag the cards back home.
    const boxA2 = await wraps.nth(0).boundingBox()
    const boxB2 = await wraps.nth(1).boundingBox()
    await page.mouse.move(boxA2!.x + boxA2!.width / 2, boxA2!.y + boxA2!.height / 2)
    await page.mouse.down()
    await page.mouse.move(boxB2!.x + boxB2!.width / 2, boxB2!.y + boxB2!.height / 2, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    const restored = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-card-wrap]')).map((w) => w.getAttribute('data-card-wrap')),
    )
    expect(restored).toEqual(before)
    console.log(`  + click-drag reorders ${before.length} cards and back`)
})
})
