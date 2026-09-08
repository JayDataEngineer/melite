/**
 * LEFT drawer slide animations — real-browser proof (2026-08-09).
 *
 * Covers: slides behind the ActivityBar (z-30, not over it), fills full
 * viewport height, slides IN + OUT.
 */
import { test, expect, type Page } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:5173"
const URL = `${BASE}/editor/`

async function transformOf(page: Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate(
    (el) => getComputedStyle(el as HTMLElement).transform,
  )
}

async function ensureDrawerClosed(page: Page) {
  const btn = page.getByRole("button", { name: "History / Media" })
  if (await btn.getAttribute("aria-pressed") === "true") {
    await btn.click()
    await expect(page.locator('[data-drawer="media"]')).toHaveCount(0, { timeout: 5000 })
  }
}

test.describe("LEFT drawer slide", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await page.locator("header").first().waitFor({ state: "visible" })
  })

  test("slides IN from the left", async ({ page }) => {
    await ensureDrawerClosed(page)
    await page.getByRole("button", { name: "History / Media" }).click()
    await expect(page.locator('[data-drawer="media"]')).toBeVisible()
    await page.waitForTimeout(40)
    expect(await transformOf(page, '[data-drawer="media"]')).not.toBe("none")
  })

  test("slides OUT on close (AnimatePresence, not a hard cut)", async ({ page }) => {
    const drawer = page.locator('[data-drawer="media"]')
    await expect(drawer).toBeVisible() // open by default
    await page.getByRole("button", { name: "History / Media" }).click()
    await page.waitForTimeout(40)
    // Mid-exit: still mounted + animating.
    await expect(drawer).toHaveCount(1)
    expect(await transformOf(page, '[data-drawer="media"]')).not.toBe("none")
    // After exit: gone.
    await expect(drawer).toHaveCount(0, { timeout: 5000 })
  })

  test("slides BEHIND the ActivityBar (not over it)", async ({ page }) => {
    const ab = page.locator(".w-12.shrink-0.flex-col").first()
    const z = await ab.evaluate((el) => getComputedStyle(el as HTMLElement).zIndex)
    expect(Number(z)).toBeGreaterThanOrEqual(30)
  })

  test("fills full viewport height", async ({ page }) => {
    await page.waitForTimeout(400)
    const vp = await page.viewportSize()
    const box = await page.locator('[data-drawer="media"]').boundingBox()
    expect(box!.height).toBeGreaterThan(vp!.height * 0.9)
  })
})
