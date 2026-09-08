// right-panel-host.spec.ts — the H-RIGHT lane's REAL-BROWSER gate:
// mode coupling (the right sidebar changes content when entering
// workspace mode; the chat input goes away), the host's toggle, and
// the third-party pane coexisting in the internal tab strip.
import { test, expect } from '@playwright/test'

const rail = (page: any) => page.locator('[data-rail="right"]')

test('agent mode: settings pane in the rail', async ({ page }) => {
  await page.goto('/editor/')
  await page.waitForTimeout(2500)
  await expect(rail(page)).toContainText('Model, parameters, tools')
  // The demo plugin pane rides BOTH modes → the internal tab strip
  // shows TWO tabs in agent mode.
  await expect(rail(page).getByRole('tab', { name: 'Gateway health' })).toBeVisible()
})

test('workspace mode: rail swaps + chat composer GONE', async ({ page }) => {
  await page.goto('/editor/')
  await page.waitForTimeout(2500)
  await page.locator('[title*="Library" i], [aria-label*="Library" i]').first().click()
  await page.waitForTimeout(1500)
  // The rail now hosts the Library pane; the agent settings are GONE.
  await expect(rail(page)).not.toContainText('Model, parameters, tools')
  await expect(page.getByText('Author a flow')).toBeVisible()
  // The chat composer lives only in the chat surface — not in the DOM.
  const composer = await page.locator('textarea:visible, [contenteditable="true"]:visible').count()
  expect(composer).toBe(0)
  // Plugin pane still rides along.
  await expect(rail(page).getByRole('tab', { name: 'Gateway health' })).toBeVisible()
})

test('the toggle hides + restores the rail', async ({ page }) => {
  await page.goto('/editor/')
  await page.waitForTimeout(2500)
  const toggle = page.getByRole('button', { name: /right panel/i }).last()
  await toggle.click()
  await page.waitForTimeout(800)
  await expect(rail(page)).toHaveCount(0)
  await page.getByRole('button', { name: /right panel/i }).last().click()
  await page.waitForTimeout(800)
  await expect(rail(page).first()).toBeVisible()
})

test('back to agent mode: settings pane restored', async ({ page }) => {
  await page.goto('/editor/')
  await page.waitForTimeout(2500)
  await page.locator('[title*="Library" i], [aria-label*="Library" i]').first().click()
  await page.waitForTimeout(1200)
  await page.locator('[title*="Agent" i], [aria-label*="Agent" i]').first().click()
  await page.waitForTimeout(1500)
  await expect(rail(page)).toContainText('Model, parameters, tools')
})
