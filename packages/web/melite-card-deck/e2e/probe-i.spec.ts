import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// probe (i): the input-prep card's UI journey — the crop + model-choice
// seats RENDER on :3088 (the disposition owed this hop: the card serves
// crop_x/scale_model; the operator saw a stale serve). Read-only probe.
test('probe (i): input-prep renders the crop + model-choice seats', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try { await notice.click({ timeout: 10_000 }); await page.waitForTimeout(1_000) } catch { /* again */ }
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  await page.getByText('Melite Bench', { exact: true }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  // the served spec, read in-page (the shell gets 401 — the estate's own law)
  const served = await page.evaluate(async () => {
    const spec = await (await fetch('/v1/form-spec?model=input-prep')).json() as { params?: unknown }
    const p = spec.params
    const names: string[] = Array.isArray(p) ? (p as unknown[]).map((r) => typeof r === 'string' ? r : String((r as Record<string, unknown>).key ?? (r as Record<string, unknown>).name ?? (r as Record<string, unknown>).id ?? '?')) : Object.keys(p as Record<string, unknown>)
    return { names }
  })
  console.log('SERVED=' + JSON.stringify(served))
  expect(served.names.includes('crop_x') && served.names.includes('scale_model'), 'the serve carries crop_x + scale_model: ' + served.names.join(',')).toBe(true)
  // the card tile → its drill
  const tile = page.getByText('Input Prep', { exact: true }).first()
  await tile.click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  // THE CURRENT ANATOMY (the 2026-10-22 ride): the crop + scale seats
  // render FLAT on the drill — the Transform tab is gone (the older
  // anatomy's hop; the flat form is the drill's own face now). The
  // crop leaf carries its clear verb; the model-choice seat speaks
  // 'scale model' (UpscaleModelLoader → ImageUpscaleWithModel).
  const body = await page.evaluate(() => document.body.innerText)
  const found = {
    cropX: /crop/i.test(body) && /clear crop/i.test(body),
    scaleModel: /scale\s*model/i.test(body),
    widthHeight: /crop\s*width|crop\s*height/i.test(body) || /scale \(optional\)/i.test(body),
  }
  console.log('DRILL_SEATS=' + JSON.stringify(found))
  await page.screenshot({ path: '/tmp/probe-i-inputprep.png', fullPage: false })
  expect(found.cropX && found.scaleModel, 'the drill renders the crop + model-choice seats').toBe(true)
})
