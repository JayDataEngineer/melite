/**
 * FOCUSED proof: the RIGHT rail slides OUT (no teleport) on close.
 * (2026-08-09: the operator's standing complaint — "RIGHT SIDERAIL HAS NO
 * HIDE ANIMATION, IT JUST TELEPORTS.")
 *
 * Library tab now wraps LibrarySidebar in AnimatePresence + motion.div with
 * slideFromRight (exit: x:"100%"). This spec proves the exit is a real
 * animation: the rail stays mounted mid-exit with an active transform, then
 * unmounts after the slide completes.
 */
import { test, expect } from "@playwright/test"
import path from "node:path"
import { artifactRoot } from "./helpers/artifactRoot"

const BASE = process.env.BASE_URL ?? "http://localhost:5173"

test("RIGHT rail exit — AnimatePresence holds it for the slide, no teleport", async ({ page }) => {
  await page.goto(`${BASE}/editor/`, { waitUntil: "domcontentloaded" })
  await page.locator("header").first().waitFor({ state: "visible" })
  await page.getByRole("button", { name: "Library", exact: true }).click()

  // Ensure the rail is open.
  if ((await page.locator('button[aria-label="Show right panel"]').count()) > 0) {
    await page.getByRole("button", { name: "Show right panel" }).click()
  }
  const rail = page.locator('[data-rail="right"]')
  await expect(rail).toBeVisible()
  await page.waitForTimeout(400) // let enter settle

  // Close it.
  await page.getByRole("button", { name: "Hide right panel" }).click()

  // PROOF #1: 40ms after close, the rail is STILL mounted (AnimatePresence
  // holds it). A teleport would be count=0 immediately.
  await page.waitForTimeout(40)
  await expect(rail).toHaveCount(1)

  // PROOF #2: it's actively animating — an ancestor has a transform matrix.
  const t = await rail.evaluate((el) => {
    let node = el as HTMLElement | null
    while (node) {
      const tr = getComputedStyle(node).transform
      if (tr !== "none") return tr
      node = node.parentElement
    }
    return "none"
  })
  expect(t).not.toBe("none")

  // PROOF #3: after the exit animation (0.22s) completes, it unmounts.
  await expect(rail).toHaveCount(0, { timeout: 5000 })

  await page.screenshot({ path: path.join(artifactRoot("manual"), "sidebar-right-no-teleport.png"), fullPage: true })
})

test("RIGHT rail enter — slides in from the right (transform matrix on mount)", async ({ page }) => {
  await page.goto(`${BASE}/editor/`, { waitUntil: "domcontentloaded" })
  await page.locator("header").first().waitFor({ state: "visible" })
  await page.getByRole("button", { name: "Library", exact: true }).click()

  // Ensure closed first.
  if ((await page.locator('button[aria-label="Hide right panel"]').count()) > 0) {
    await page.getByRole("button", { name: "Hide right panel" }).click()
    await expect(page.locator('[data-rail="right"]')).toHaveCount(0, { timeout: 5000 })
  }

  // Open — catch the enter slide.
  await page.getByRole("button", { name: "Show right panel" }).click()
  const rail = page.locator('[data-rail="right"]')
  await expect(rail).toBeVisible()
  await page.waitForTimeout(40)
  const t = await rail.evaluate((el) => {
    let node = el as HTMLElement | null
    while (node) {
      const tr = getComputedStyle(node).transform
      if (tr !== "none") return tr
      node = node.parentElement
    }
    return "none"
  })
  expect(t).not.toBe("none")
})
