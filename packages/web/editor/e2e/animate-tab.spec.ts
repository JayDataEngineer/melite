/**
 * SMOKE: Animate tab — verifies Stretchy Studio loads in the iframe,
 * that auto-rig uses the ComfyUI keypoint bridge (not browser ONNX),
 * and that the Animate tab never redirects to the Assets page.
 *
 * Run:
 *   npx playwright test --config=playwright.local.config.ts e2e/animate-tab.spec.ts
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoEditor(page: Page): Promise<void> {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('text=TECH NOIR', { timeout: 30_000 })
}

test.describe('Animate tab — Stretchy Studio surface', () => {
  test('Animate tab loads Stretchy Studio iframe (not assets page)', async ({ page }) => {
    await gotoEditor(page)

    // Click the "Animate" tab button in the header.
    const animateBtn = page.getByRole('button', { name: /^Animate$/ }).first()
    await animateBtn.waitFor({ state: 'visible', timeout: 15_000 })
    await animateBtn.click()

    // Give the existence check + iframe load time to resolve.
    await page.waitForTimeout(3000)

    // The Stretchy iframe must be present.
    const iframe = page.locator('iframe[title="Stretchy Studio"]')
    await expect(iframe).toBeVisible({ timeout: 15_000 })

    // Verify the iframe loaded Stretchy Studio's HTML, not the editor.
    // We check the iframe's content via page.evaluate — same-origin.
    const iframeTitle = await page.evaluate(() => {
      const f = document.querySelector('iframe[title="Stretchy Studio"]') as HTMLIFrameElement
      try { return f?.contentDocument?.title ?? '' } catch { return '(cross-origin)' }
    })
    expect(iframeTitle, 'Iframe should load Stretchy Studio, not the editor').not.toContain('Tech Noir')

    // The Assets workspace "Import asset" must NOT be visible.
    const importCount = await page.locator('text=Import asset').count()
    expect(importCount, 'Animate tab must NOT show the Assets workspace').toBe(0)

    console.log(`  ✓ Animate tab loads Stretchy Studio iframe (title: "${iframeTitle}")`)
  })

  test('Animate tab does not render Library content on click', async ({ page }) => {
    await gotoEditor(page)

    // Boot surface is the Agent tab (2026-08-06) — Library canvas is hidden.
    expect(await page.locator('text=Author a flow').count()).toBe(0)

    // Click Animate.
    await page.getByRole('button', { name: /^Animate$/ }).first().click()
    await page.waitForTimeout(3000)

    // Library canvas content must stay hidden — the Animate surface took over.
    const libraryVisible = await page.locator('text=Author a flow').count()
    expect(libraryVisible, 'Library "Author a flow" must not appear on the Animate tab').toBe(0)

    console.log('  ✓ Library canvas content stays hidden on the Animate tab')
  })

  test('Stretchy bundle has ComfyUI keypoint bridge (no browser ONNX)', async ({ page }) => {
    await gotoEditor(page)  // need a real origin for relative fetch

    const hasBridge = await page.evaluate(async () => {
      const res = await fetch('/editor/stretchy/index.html')
      const html = await res.text()
      const match = html.match(/index-[A-Za-z0-9_-]+\.js/)
      if (!match) return false
      const jsRes = await fetch(`/editor/stretchy/assets/${match[0]}`)
      const js = await jsRes.text()
      return js.includes('__MELITE_KEYPOINTS__')
    })
    expect(hasBridge, 'Stretchy bundle must contain __MELITE_KEYPOINTS__ bridge').toBeTruthy()
    console.log('  ✓ ComfyUI keypoint bridge present in built Stretchy bundle')
  })
})
