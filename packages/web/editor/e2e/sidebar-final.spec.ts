/**
 * FINAL verification — both operator complaints fixed (2026-08-09):
 *   1. "THE LEFT SLIDE GOES OVER THE APP RAIL" → ActivityBar z-30.
 *   2. "RIGHT SIDERAIL HAS NO HIDE ANIMATION, IT JUST TELEPORTS" →
 *      AnimatePresence exit slide.
 *   3. "drawer on the left is at 10% height" → flex h-full on motion wrapper.
 *
 * No-teleport checks are WIDTH-based (2026-08-11): the slide animation is
 * collapseWidth (1937242e, 2026-08-10) — it animates `width` 0→auto, never
 * a transform, so the old `transform !== "none"` assertions could never
 * pass. The no-teleport proof is now: the rail must pass through a width
 * strictly between 0 and its natural width mid-slide (an instant mount or
 * unmount never does).
 */
import { test, expect, type Page } from "@playwright/test"
const BASE = process.env.BASE_URL ?? "http://localhost:5173"

async function railNaturalWidth(page: Page, sel: string): Promise<number> {
  return page.locator(sel).first().evaluate((el) =>
    Math.round((el as HTMLElement).getBoundingClientRect().width),
  )
}

/** No-teleport proof for the width slide: the element must be observed at a
 *  width strictly between 0 and its natural (settled) width. */
async function expectWidthMidFlight(page: Page, sel: string, natural: number): Promise<void> {
  await page.waitForFunction(
    ({ sel, natural }: { sel: string; natural: number }) => {
      const el = document.querySelector(sel)
      if (!el) return false
      const w = el.getBoundingClientRect().width
      return w > 0 && w < natural - 1
    },
    { sel, natural },
    { timeout: 2000 },
  )
}

/** The slide settles back at the natural width (not overshot / not stuck). */
async function expectWidthSettled(page: Page, sel: string, natural: number): Promise<void> {
  await page.waitForFunction(
    ({ sel, natural }: { sel: string; natural: number }) => {
      const el = document.querySelector(sel)
      if (!el) return false
      return Math.abs(el.getBoundingClientRect().width - natural) < 2
    },
    { sel, natural },
    { timeout: 2000 },
  )
}

test.describe("Sidebar fixes — final verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/editor/`, { waitUntil: "domcontentloaded" })
    await page.locator("header").first().waitFor({ state: "visible" })
  })

  test("LEFT drawer does NOT cover the ActivityBar (z-30)", async ({ page }) => {
    // Media drawer is open by default. Click the ActivityBar's Chat History
    // button — if the drawer covered the rail, this click would be
    // swallowed. A successful switch proves the rail is on top. (The
    // "Flow Nodes" drawer merged into the Library rail, ONE_SURFACE
    // Phase 4 — Chat History is the remaining sibling drawer.)
    await page.getByRole("button", { name: "Chat History" }).click()
    await expect(page.locator('[data-drawer="history"]')).toBeVisible()
    await expect(page.locator('[data-drawer="media"]')).toHaveCount(0, { timeout: 5000 })
  })

  test("LEFT drawer fills full viewport height (not 10%)", async ({ page }) => {
    await page.waitForTimeout(400)
    const vp = await page.viewportSize()
    const box = await page.locator('[data-drawer="media"]').boundingBox()
    expect(box!.height).toBeGreaterThan(vp!.height * 0.9)
  })

  test("RIGHT rail (Library) slides OUT — no teleport", async ({ page }) => {
    await page.getByRole("button", { name: "Library", exact: true }).click()
    if ((await page.locator('button[aria-label="Show right panel"]').count()) > 0) {
      await page.getByRole("button", { name: "Show right panel" }).click()
    }
    const rail = page.locator('[data-rail="right"]')
    await expect(rail).toBeVisible()
    await page.waitForTimeout(300) // settle at natural width
    const natural = await railNaturalWidth(page, '[data-rail="right"]')

    await page.getByRole("button", { name: "Hide right panel" }).click()
    // 40ms after close: still mounted + mid-shrink (NO TELEPORT).
    await page.waitForTimeout(40)
    await expect(rail).toHaveCount(1)
    await expectWidthMidFlight(page, '[data-rail="right"]', natural)
    // After exit animation: gone.
    await expect(rail).toHaveCount(0, { timeout: 5000 })
  })

  test("RIGHT rail (Library) slides IN from the right", async ({ page }) => {
    await page.getByRole("button", { name: "Library", exact: true }).click()
    // Capture the natural width BEFORE closing, so the re-open can be
    // checked mid-flight against it.
    let natural = 0
    if ((await page.locator('button[aria-label="Hide right panel"]').count()) > 0) {
      await page.waitForTimeout(300) // settle at natural width
      natural = await railNaturalWidth(page, '[data-rail="right"]')
      await page.getByRole("button", { name: "Hide right panel" }).click()
      await expect(page.locator('[data-rail="right"]')).toHaveCount(0, { timeout: 5000 })
    }
    await page.getByRole("button", { name: "Show right panel" }).click()
    const rail = page.locator('[data-rail="right"]')
    await expect(rail).toBeVisible()
    if (natural === 0) {
      await page.waitForTimeout(300)
      natural = await railNaturalWidth(page, '[data-rail="right"]')
    }
    // Mid-flight 40ms after open: width strictly between 0 and natural —
    // still sliding in, NO TELEPORT. Then settles at natural.
    await expectWidthMidFlight(page, '[data-rail="right"]', natural)
    await expectWidthSettled(page, '[data-rail="right"]', natural)
  })

  test("RIGHT rail (Pose tab — TwoPaneLayout) slides OUT, no teleport", async ({ page }) => {
    // The Body Studio surface has NO ActivityBar item (2026-08-08 — it's
    // card-drilldown only; the rail's studio items are video/pose/animate).
    // The Pose studio (TextToPoseTab) is the TwoPaneLayout surface this
    // no-teleport proof drives — its right rail defaults open (rightPanel
    // store pose: true), unlike the Director zero-state which mounts no
    // TwoPaneLayout until shots exist. Scope to the rail (class tn-seam).
    await page.locator(".tn-seam").getByRole("button", { name: "Pose", exact: true }).click()
    if ((await page.locator('button[aria-label="Show right panel"]').count()) > 0) {
      await page.getByRole("button", { name: "Show right panel" }).click()
    }
    const rail = page.locator('[data-rail="right"]')
    await expect(rail).toBeVisible()
    await page.waitForTimeout(300) // settle at natural width
    const natural = await railNaturalWidth(page, '[data-rail="right"]')

    await page.getByRole("button", { name: "Hide right panel" }).click()
    await page.waitForTimeout(40)
    // Still mounted mid-exit — NO TELEPORT.
    await expect(rail).toHaveCount(1)
    await expectWidthMidFlight(page, '[data-rail="right"]', natural)
    await expect(rail).toHaveCount(0, { timeout: 5000 })
  })
})
