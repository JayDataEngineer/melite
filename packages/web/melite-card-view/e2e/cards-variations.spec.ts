// cards-variations.spec.ts — THE LAW PINS at the browser plane
// (2026-10-12): the operator's three named breaks, each now held
// against the REAL lane UI — the image-edit cap face (2511 admits 3,
// 2.1 admits 16 — never a stated 18 on a 3-cap lane), the ONE
// lane-warn strip (a refusal voiced once, not doubled), and krea-2's
// variant envelopes served on the browser's own wire (turbo 4–8/1–2,
// raw 30–60/2–6 — the envelope-blind form's cure). Every assertion
// reads the drill's own DOM or the form-spec the page itself fetched.
import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, expectNoPageErrors, openAConversation, settle, STUDIO_URL } from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-plane wall needs a live host')

/** Board one stage on the mint's bench (CAS via bench/get). */
async function board(page: Page, sessionKey: string, card: string, params: Record<string, unknown>): Promise<void> {
  const get = await callBench(page, 'bench/get', { sessionKey }).catch(() => null) as { rev?: number; doc?: { rev?: number } } | null
  const rev = (get?.doc ?? get)?.rev ?? 0
  await callBench(page, 'bench/add-stage', { sessionKey, doc: { card, author: 'user', expect_rev: rev, params } })
}

/** Mint, board the given stages, open the Cards tab. Returns the
 *  bench key and the tile rail locator. */
async function openBench(page: Page, stages: Array<{ card: string; params: Record<string, unknown> }>): Promise<{ key: string; rail: ReturnType<Page['locator']> }> {
  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  for (const s of stages) await board(page, mint.sessionKey, s.card, s.params)
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 })
  await page.waitForTimeout(3_000)
  await page.getByRole('button', { name: /Media Flow/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(4_000)
  const rail = page.locator('button[class*="tileInner"]:not([aria-label="Add a card"])')
  await expect(rail).toHaveCount(stages.length, { timeout: 30_000 })
  return { key: mint.sessionKey, rail }
}

/** The variant axis' offered option ids, from the drilled form. */
async function variantOptions(page: Page): Promise<string[]> {
  return await page.locator('select[data-axis="Variant"]').first().locator('option').evaluateAll(
    (opts) => opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== ''))
}

/** The served form-spec for a family, fetched on the page's own wire
 *  (the same origin, same auth, same door the drill reads). */
async function servedSpec(page: Page, model: string): Promise<Record<string, unknown>> {
  return await page.evaluate(async (m) => {
    return await (await fetch(`/v1/form-spec?model=${encodeURIComponent(m)}`)).json() as Record<string, unknown>
  }, model)
}

/** The input_images stack cap a family's served spec declares — the
 *  schema refs' own meta.max_stack (the door's narrowed truth). */
async function servedImageCap(page: Page, model: string): Promise<number> {
  const spec = await servedSpec(page, model)
  return await page.evaluate((doc) => {
    const caps: number[] = []
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) { for (const x of o) walk(x); return }
      if (o === null || typeof o !== 'object') return
      const row = o as Record<string, unknown>
      if (row['wtype'] === 'image[]' || typeof row['max_stack'] === 'number') {
        const cap = row['max_stack']
        if (typeof cap === 'number') caps.push(cap)
      }
      for (const v of Object.values(row)) walk(v)
    }
    walk(doc)
    return caps.length > 0 ? Math.max(...caps) : -1
  }, spec)
}

test.describe("the variation law pins (the operator's three breaks, held at the browser)", () => {
  test('image-edit: 2511 admits 3, 2.1 admits 16, the fresh face is clean, the variant axis reseeds', async ({ page }) => {
    const errors = collectPageErrors(page)
    await settle(page)
    const specUrls: string[] = []
    page.on('request', (r) => { if (r.url().includes('/v1/form-spec')) specUrls.push(r.url()) })
    // SEQUENTIAL BOARDING: the tile's own text carries the CARD id
    // (both image-edit tiles read "image-edit"), so the variations
    // board one at a time — each drive opens the bench's newest
    // tile, and the drilled Model value is the face receipt.
    const { key, rail } = await openBench(page, [
      { card: 'image-edit', params: { model: 'qwen-img-edit-2511' } },
    ])
    expect(await rail.count(), 'the 2511 variation boarded').toBe(1)

    // —— THE 2511 FACE ——————————————————————————————
    await rail.first().click({ timeout: 15_000, force: true })
    await page.waitForTimeout(3_500)
    await expect(page.locator('select[aria-label="Model"]')).toHaveValue('qwen-img-edit-2511')
    // the variant axis is THIS family's own (lightning/standard —
    // never 2.1's int8/bf16)
    expect(await variantOptions(page), '2511 offers its own variants').toEqual(['lightning', 'standard'])
    // THE CAP TRUTH, served on the browser's own wire: 2511 admits 3
    expect(await servedImageCap(page, 'qwen-img-edit-2511'), 'the 2511 lane admits exactly 3 images').toBe(3)
    // THE FRESH FACE IS CLEAN (2026-10-18, the operator's law): the
    // prompt law AND the anchor law are the UNSTATED class — bench
    // state under construction, voiced only at the Run press, never
    // as an open-time strip (fresh-open.spec.ts holds the same wall)
    await expect(page.locator('[data-lane-warn]'), '2511: no lane-warn strip on a fresh open').toHaveCount(0)
    await page.getByRole('button', { name: 'Collapse card' }).click({ timeout: 10_000 })

    // —— THE 2.1 FACE ————————————————————————————————
    await board(page, key, 'image-edit', { model: 'qwen-img-edit-21' })
    await expect(rail, 'the 2.1 variation boarded').toHaveCount(2, { timeout: 20_000 })
    await rail.nth(1).click({ timeout: 15_000, force: true })
    await page.waitForTimeout(3_500)
    await expect(page.locator('select[aria-label="Model"]')).toHaveValue('qwen-img-edit-21')
    // THE VARIANT RESEED (the stale-variant cure): a model switch
    // hands the new family's own variant rows — int8/bf16 now
    expect(await variantOptions(page), '2.1 offers its own variants (reseeded, never carried over)').toEqual(['int8', 'bf16'])
    expect(await servedImageCap(page, 'qwen-img-edit-21'), 'the 2.1 lane admits 16 images').toBe(16)
    await expect(page.locator('[data-lane-warn]'), '2.1: no lane-warn strip on a fresh open').toHaveCount(0)

    // —— THE MODEL SWITCH, ON THE OPEN 2.1 DRILL ————————
    const before = specUrls.length
    await page.locator('select[aria-label="Model"]').selectOption('qwen-img-edit-2511')
    await page.waitForTimeout(4_000)
    expect(specUrls.slice(before).some((u) => u.includes('model=qwen-img-edit-2511')),
      'switching 2.1 → 2511 refetches the 2511 form-spec').toBe(true)
    await expect(page.locator('select[aria-label="Model"]')).toHaveValue('qwen-img-edit-2511')
    expect(await variantOptions(page), 'the switch reseeds the variant axis back to 2511\'s rows').toEqual(['lightning', 'standard'])
    expect(await servedImageCap(page, 'qwen-img-edit-2511'), 'the served cap followed the switch: 3').toBe(3)
    await page.getByRole('button', { name: 'Collapse card' }).click({ timeout: 10_000 })
    await expectNoPageErrors(page, errors)
  })

  test('image-gen krea-2: the variant envelopes are served on the wire the browser reads', async ({ page }) => {
    const errors = collectPageErrors(page)
    await settle(page)
    const { key, rail } = await openBench(page, [{ card: 'image-gen', params: { model: 'krea-2' } }])
    expect(await rail.count(), 'the krea-2 lane boarded').toBe(1)

    await rail.first().click({ timeout: 15_000, force: true })
    await page.waitForTimeout(3_500)
    await expect(page.locator('select[aria-label="Model"]')).toHaveValue('krea-2')
    expect(await variantOptions(page), 'krea-2 offers exactly its two declared routes').toEqual(['turbo', 'raw'])
    // THE ENVELOPE, served to the browser: turbo 4–8 steps / 1–2 cfg,
    // raw 30–60 / 2–6 — the projection (bounds) and the verbatim
    // envelope both, per the lane's own door
    const spec = await servedSpec(page, 'krea-2')
    const lanes = spec['lanes'] as { variants?: Record<string, { bounds?: Record<string, { min?: number; max?: number }>; sampler_envelope?: Record<string, [number, number]> }> }
    const served = lanes.variants ?? {}
    expect(served['turbo']?.bounds, 'turbo bounds: steps 4–8, cfg 1–2').toEqual({
      steps: { min: 4, max: 8 }, cfg: { min: 1, max: 2 },
    })
    expect(served['turbo']?.sampler_envelope, 'turbo envelope verbatim').toEqual({ steps: [4, 8], cfg: [1, 2] })
    expect(served['raw']?.bounds, 'raw bounds: steps 30–60, cfg 2–6').toEqual({
      steps: { min: 30, max: 60 }, cfg: { min: 2, max: 6 },
    })
    expect(served['raw']?.sampler_envelope, 'raw envelope verbatim').toEqual({ steps: [30, 60], cfg: [2, 6] })
    // krea-2 declares no base — the envelope IS the lane's face
    expect(spec['base'], 'krea-2 serves no base contract').toBeUndefined()
    // the prompt law is the UNSTATED class — no strip on a fresh
    // open (the operator's law; fresh-open.spec.ts holds the wall)
    await expect(page.locator('[data-lane-warn]'), 'krea-2: no lane-warn strip on a fresh open').toHaveCount(0)

    // —— THE VARIANT SWITCH: turbo → raw — the axis reseeds in place
    // (the served doc carries BOTH routes' envelopes — one fetch, the
    // patch needs no second), and the drilled axis HOLDS the pick
    await page.locator('select[data-axis="Variant"]').first().selectOption('raw')
    await page.waitForTimeout(3_000)
    await expect(page.locator('select[data-axis="Variant"]').first(), 'the raw route is held').toHaveValue('raw')
    await expect(page.locator('[data-lane-warn]'), 'raw: still no lane-warn strip').toHaveCount(0)

    // —— THE MARRIAGE WRITE (2026-10-12, the operator's live break:
    // 'THE WRITE DID NOT LAND — card_compose: stated cfg 3.5 is
    // OUTSIDE the route envelope for variant "turbo" ... The studio
    // shows your edit; the bench does not'). A pick is ONE contract —
    // the variant key AND its defaults land in the SAME write, judged
    // against the NEW variant's envelope. The UI axis alone is NOT
    // the truth: the BENCH row is. Read it fresh off the wire.
    await expect(page.locator('text=THE WRITE DID NOT LAND'), 'no refused write face').toHaveCount(0)
    const benchValue = await callBench(page, 'bench/get', { sessionKey: key }) as { stages?: Array<{ params?: Record<string, unknown> }>; doc?: { stages?: Array<{ params?: Record<string, unknown> }> } }
    // the wire's own shape (tour.ts's seed law): the value may be
    // flat {draft_id, rev, stages} or doc-wrapped — read both, never
    // a silent {} that would fake a missing write
    const benchDoc = benchValue?.doc ?? benchValue ?? {}
    const params = benchDoc.stages?.at(-1)?.params ?? {}
    expect(params['variant'], 'the bench row holds the raw pick').toBe('raw')
    const cfg = Number(params['cfg'])
    const steps = Number(params['steps'])
    expect(cfg, `the landed cfg sits INSIDE raw's envelope [2, 6] (got ${String(params['cfg'])})`).toBeGreaterThanOrEqual(2)
    expect(cfg).toBeLessThanOrEqual(6)
    expect(steps, `the landed steps sit INSIDE raw's envelope [30, 60] (got ${String(params['steps'])})`).toBeGreaterThanOrEqual(30)
    expect(steps).toBeLessThanOrEqual(60)
    await page.getByRole('button', { name: 'Collapse card' }).click({ timeout: 10_000 })
    await expectNoPageErrors(page, errors)
  })

  // THE STATED-WRONG HALF (the test-integrity audit cure, 2026-10-18):
  // the fresh-open law silenced the UNSTATED class at open — its
  // counterpart must stay LOUD. A STATED value the lane refuses is a
  // real complaint and rides the warn strip the moment the drill
  // opens. This is the browser tier's only stated-wrong pin; the
  // unit tier (cards-tab-lane-red) holds the same law against fakes.
  test('krea-2: a stated-wrong value still warns at open (the fresh-open law silences only the unstated class)', async ({ page }) => {
    const errors = collectPageErrors(page)
    await settle(page)
    // turbo's declared envelope is cfg [1, 2] — a stated 3.5 is a
    // refused value, carried on the row the operator wrote
    const { rail } = await openBench(page, [{ card: 'image-gen', params: { model: 'krea-2', variant: 'turbo', cfg: 3.5 } }])
    await rail.first().click({ timeout: 15_000, force: true })
    await page.waitForTimeout(3_500)
    const warn = page.locator('[data-lane-warn]')
    await expect(warn, 'the stated-wrong law renders exactly one strip').toHaveCount(1)
    const voiced = await warn.first().textContent()
    expect(voiced, 'the strip speaks the envelope refusal in the judge\'s own words').toContain('stated cfg 3.5 is OUTSIDE the route envelope for variant "turbo"')
    // and ONLY the stated-wrong class voices: no unstated stem rides
    // beside it (the fresh-open filter is precise, not a blanket)
    expect(voiced, 'no unstated voice rides the stated-wrong strip').not.toContain('this lane requires')
    await page.getByRole('button', { name: 'Collapse card' }).click({ timeout: 10_000 })
    await expectNoPageErrors(page, errors)
  })
})
