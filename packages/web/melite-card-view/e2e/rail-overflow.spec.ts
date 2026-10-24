import { expect, test } from '@playwright/test'
import { openAConversation, openCardsWithBench, seedBenchH3, settle } from './tour'

test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

/**
 * THE OVERFLOW HUNT (operator 2026-09-23, the too-wide rail): instead
 * of theorizing about which element forces the params column past its
 * track, MEASURE — every element inside the studio tenant whose
 * scrollWidth exceeds its clientWidth is the culprit, named with its
 * selector and dimensions. Measurement only (soft expects); the log
 * names the fix target.
 */
test('NAME the too-wide element: every overflowing node in the studio', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 150)}`))

  await settle(page)
  const { opened, sessionKey } = await openAConversation(page)
  expect.soft(opened, 'a conversation to open').toBe(true)
  if (sessionKey !== '') await seedBenchH3(page, sessionKey)
  await page.waitForTimeout(6_000)
  await openCardsWithBench(page, sessionKey)

  const tile = page.locator('[class*="tileInner"][role="button"]').filter({ hasText: 'Generate Video' }).first()
  await expect(tile).toBeVisible({ timeout: 20_000 })
  await tile.click({ timeout: 10_000 })
  await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(2_000)

  // THE OPERATOR'S STATE: select the call and OPEN the knob fold —
  // the 26-row minmax grid only lays out once open. Measure again.
  // Select via the TIMELINE CLIP (the same gesture the hint teaches);
  // verify selected + open in the report, never assume the click.
  const clip = page.locator('[data-prompt-clip]').first()
  if (await clip.isVisible().catch(() => false)) await clip.click({ timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(1_500)
  const knobSummary = page.locator('details.lTRlka_knobFold > summary').first()
  if (await knobSummary.isVisible().catch(() => false)) await knobSummary.click({ timeout: 5_000 }).catch(() => {})
  await page.waitForTimeout(1_500)

  const report = await page.evaluate(() => {
    const state = {
      selected: !!document.querySelector('[data-selected="true"]'),
      knobOpen: !!document.querySelector('details.lTRlka_knobFold[open]'),
    }
    const tenant = document.querySelector('[data-testid="h3-studio-tenant"]') as HTMLElement | null
    if (!tenant) return { tenant: null, overflow: [] }
    const t = tenant.getBoundingClientRect().toJSON()
    const out: Array<{ tag: string; id: string; cls: string; cw: number; sw: number }> = []
    for (const el of tenant.querySelectorAll('*')) {
      const h = el as HTMLElement
      if (h.scrollWidth > h.clientWidth + 2 && h.clientWidth > 0) {
        out.push({
          tag: el.tagName.toLowerCase(),
          id: (el.getAttribute('data-testid') ?? el.getAttribute('data-slot') ?? '').slice(0, 40),
          cls: (h.className && typeof h.className === 'string' ? h.className : '').slice(0, 100),
          cw: h.clientWidth,
          sw: h.scrollWidth,
        })
      }
    }
    out.sort((a, b) => (b.sw - b.cw) - (a.sw - a.cw))
    return { tenant: { w: t.width, x: t.x }, state, overflow: out.slice(0, 15) }
  })
  console.log('[overflow-hunt] tenant: ' + JSON.stringify(report.tenant) + ' state: ' + JSON.stringify((report as { state?: unknown }).state))
  for (const o of report.overflow) console.log('[overflow-hunt] ' + JSON.stringify(o))

  await page.screenshot({ path: 'e2e/rail-overflow.png', fullPage: false })
  expect(errors, errors.join('\n')).toEqual([])
})
