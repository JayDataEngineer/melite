/**
 * LoRA-specific helpers for Playwright tests.
 *
 * These extend generateFlow.ts with utilities for interacting with the
 * LoraPicker component (shadcn Select), verifying per-model LoRA listing,
 * and asserting LoRA selection made it into the POST /v1/flows/start
 * payload (the ONE run-start door — flat shape).
 *
 * THE PATTERN: LoRAs are always per-model. The backend resolves the family's
 * lora_dir, lists files from that folder, and the frontend receives — never
 * declares. These helpers prove that contract from the browser side.
 */
import { Page, expect } from '@playwright/test'

/**
 * Wait for the LoraPicker to finish loading.
 *
 * The picker fetches /v1/loras?model=<model> on mount. Until that resolves,
 * it shows "Loading…". When done, it shows either "Add adapter…" (has
 * options) or "No LoRAs installed" (empty).
 *
 * Scrolls the LoRAs section into view first (it's usually below the fold).
 */
export async function waitForLoraPickerReady(page: Page, timeout = 20_000): Promise<void> {
  // Scroll the LoRAs group into view
  const loraHeader = page.locator('text=LoRAs').first()
  await loraHeader.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(500)

  // Wait for loading to clear
  await page.locator('text=Add adapter').or(page.locator('text=No LoRAs installed'))
    .first().waitFor({ state: 'visible', timeout })
}

/**
 * Get the available LoRA options from the picker.
 *
 * Opens the dropdown and reads the option texts. Returns empty array if
 * the picker shows "No LoRAs installed".
 */
export async function getLoraOptions(page: Page): Promise<string[]> {
  await waitForLoraPickerReady(page)

  const noLoras = await page.locator('text=No LoRAs installed for this model.').count()
  if (noLoras > 0) return []

  const trigger = page.locator('button[role="combobox"]').filter({ hasText: /Add adapter/i }).first()
  if (await trigger.count() === 0) return []
  await trigger.click()
  await page.waitForTimeout(500)

  const options = await page.getByRole('option').allInnerTexts()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  return options.map(s => s.trim()).filter(Boolean)
}

/**
 * Select a LoRA from the picker by clicking the "Add adapter…" dropdown
 * and picking the option whose text contains `substring`.
 */
export async function selectLora(page: Page, substring: string): Promise<void> {
  await waitForLoraPickerReady(page)

  const trigger = page.locator('button[role="combobox"]').filter({ hasText: /Add adapter/i }).first()
  await trigger.waitFor({ state: 'visible', timeout: 15_000 })
  await trigger.click()
  await page.waitForTimeout(500)

  const opts = page.getByRole('option')
  const count = await opts.count()
  expect(count, 'LoRA dropdown should have at least one option').toBeGreaterThan(0)

  let picked = false
  for (let i = 0; i < count; i++) {
    const text = await opts.nth(i).innerText()
    if (text.toLowerCase().includes(substring.toLowerCase())) {
      await opts.nth(i).click()
      picked = true
      console.log(`  ✓ Selected LoRA matching "${substring}"`)
      break
    }
  }
  expect(picked, `No LoRA option matching "${substring}" found in dropdown`).toBeTruthy()
}

/**
 * Assert that a LoRA entry is visible in the picker's selected list.
 */
export async function expectLoraSelected(page: Page, substring: string): Promise<void> {
  const loraRow = page.locator('input[type="range"]').first()
  await loraRow.waitFor({ state: 'visible', timeout: 5_000 })

  const label = page.locator('span').filter({ hasText: substring }).first()
  await expect(label, `LoRA "${substring}" should be visible in the selected list`)
    .toBeVisible({ timeout: 5_000 })
  console.log(`  ✓ LoRA "${substring}" is selected in the picker`)
}

/**
 * Expand a schema group by clicking its header.
 */
export async function expandGroup(page: Page, groupLabel: string): Promise<void> {
  const header = page.locator(`text=${groupLabel}`).first()
  await header.click().catch(() => {})
  await page.waitForTimeout(300)
}

/**
 * Capture the POST body of the next non-metadata /v1/flows/start request.
 */
export async function captureRunPayload(
  page: Page,
  timeoutMs = 300_000,
): Promise<Record<string, unknown>> {
  const METADATA_SERVICES = new Set([
    'get_model_preset', 'enhance_prompt', 'enhance',
    'music_meta', 'list_emotions',
  ])

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('captureRunPayload timed out')), timeoutMs)

    page.on('response', async (resp) => {
      if (!resp.url().includes('/v1/flows/start')) return
      if (resp.request().method() !== 'POST') return
      try {
        const postBody = resp.request().postData()
        if (!postBody) return
        const body = JSON.parse(postBody)
        const service = String(body.service || body._service || '')
        if (METADATA_SERVICES.has(service)) return
        clearTimeout(timer)
        resolve(body)
      } catch {}
    })
  })
}

/**
 * Verify the POST /v1/flows/start payload contains a LoRA with the
 * expected name.
 */
export function expectLoraInPayload(
  payload: Record<string, unknown>,
  substring: string,
): void {
  const loras = payload.loras
  expect(loras, 'payload must have a "loras" field').toBeDefined()

  const loraArray = Array.isArray(loras) ? loras : []
  expect(loraArray.length, 'payload must have at least one LoRA selected').toBeGreaterThan(0)

  const found = loraArray.some((entry: unknown) => {
    const obj = entry as Record<string, unknown>
    return String(obj.name || '').toLowerCase().includes(substring.toLowerCase())
  })
  expect(found, `payload.loras must contain an entry matching "${substring}"`).toBeTruthy()
  console.log(`  ✓ LoRA "${substring}" found in POST /v1/flows/start payload`)
}
