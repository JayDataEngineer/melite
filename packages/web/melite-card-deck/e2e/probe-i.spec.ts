import { expect, test } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

// the shared three-pass settle law (the 2026-11-17 deck-leg mask burn)
import { settleLane } from './settle.ts'

// probe (i): the input-prep card's UI journey — the crop + model-choice
// seats RENDER on :3088 (the disposition owed this hop: the card serves
// crop_x/scale_model; the operator saw a stale serve). Read-only probe.
test('probe (i): input-prep renders the crop + model-choice seats', async ({ page }) => {
  expect(LANE_URL !== '', 'needs SWEEP_LANE_URL').toBe(true)
  await settleLane(page, LANE_URL)
  // THE ONBOARDING MASK (the 2026-11-14 fresh-lane find, the sweep's
  // settleHost law): a throwaway home seats the "Get started" modal
  // whose mask intercepts every pointer event — close it before any
  // seat click, or the click times out against the mask.
  for (let round = 0; round < 3; round++) {
    const started = page.getByRole('dialog', { name: 'Get started' }).getByRole('button', { name: 'Close' })
    if ((await started.count()) === 0) break
    try { await started.click({ timeout: 10_000 }); await page.waitForTimeout(500) } catch { /* again */ }
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
  // the card tile → its drill. THE SELF-SEATED STAGE (the 2026-11-14
  // bench-clear find): the probe once leaned on a leftover Input Prep
  // tile from earlier runs — a cleared bench has none. The probe adds
  // its own card first (the journeys' own addCard law).
  await page.getByRole('button', { name: /^Add a card$/ }).first().click({ timeout: 30_000 })
  await page.getByRole('button', { name: /^Input Prep$/i }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
  // THE DRILL MOUNT POLL (the shared-bench law, the journeys' own):
  // the add opens the drill directly (its zoomOverlay owns the
  // pointer) — poll the drill's own face, never click the tile under
  // the overlay, never a fixed sleep.
  await expect
    .poll(async () => /crop/i.test(await page.evaluate(() => document.body.innerText)), { timeout: 30_000 })
    .toBe(true)
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
