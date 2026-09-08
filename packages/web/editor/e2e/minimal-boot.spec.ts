import { test, expect } from '@playwright/test'
import { artifactRoot } from './helpers/artifactRoot'

test('minimal boot check', async ({ page }) => {
  await page.goto('/editor/', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const title = await page.title()
  console.log('page title:', title)

  // Wait for React to hydrate (the root app element)
  await page.waitForTimeout(3000)

  const bodyText = await page.textContent('body')
  console.log('body text (first 500):', bodyText?.slice(0, 500))

  // Check for JS errors via console logs
  const consoleLogs: string[] = []
  page.on('console', msg => consoleLogs.push(msg.text()))

  await page.screenshot({
    path: artifactRoot('minimal-boot.png'),
    fullPage: true,
  })
  console.log('screenshot saved, console logs:', consoleLogs.slice(0, 5))

  // The Library button should be visible if the app booted
  const libBtn = page.getByRole('button', { name: /^Library$/ }).first()
  await expect(libBtn).toBeVisible({ timeout: 15_000 })
})
