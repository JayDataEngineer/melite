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
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

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
/** THE MENU AXES (S7e): the Variant select is a DSH Menu — the
 * trigger Button carries the data-axis marker + the row face; the
 * offers live in the OPEN menu's menuitem rows. The regexes match
 * the served rows case-insensitively (label OR titleCaseId face). */
async function variantOptions(page: Page): Promise<string[]> {
  const trigger = page.locator('button[data-axis="Variant"]').first()
  await trigger.click()
  const rows = await page.getByRole('menuitem').allTextContents()
  await trigger.click() // owner bit toggles closed
  return rows.map((r) => r.trim()).filter((r) => r !== '')
}
async function pickVariant(page: Page, face: RegExp): Promise<void> {
  await page.locator('button[data-axis="Variant"]').first().click()
  await page.getByRole('menuitem', { name: face }).click()
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
    const variants = await variantOptions(page)
    expect(variants.length, '2511 offers exactly its two variants').toBe(2)
    expect(variants.some((v) => /lightning/i.test(v)), 'lightning is offered').toBe(true)
    expect(variants.some((v) => /standard/i.test(v)), 'standard is offered').toBe(true)
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
    const variants21 = await variantOptions(page)
    expect(variants21.length, '2.1 offers exactly its two variants (reseeded, never carried over)').toBe(2)
    expect(variants21.some((v) => /int8/i.test(v)), '2.1 int8 tier is offered').toBe(true)
    expect(variants21.some((v) => /bf16/i.test(v)), '2.1 bf16 tier is offered').toBe(true)
    expect(await servedImageCap(page, 'qwen-img-edit-21'), 'the 2.1 lane admits 16 images').toBe(16)
    await expect(page.locator('[data-lane-warn]'), '2.1: no lane-warn strip on a fresh open').toHaveCount(0)

    // —— THE MODEL SWITCH, ON THE OPEN 2.1 DRILL ————————
    const before = specUrls.length
    await page.getByRole('button', { name: 'Model', exact: true }).click()
    await page.getByRole('menuitem', { name: /Qwen Image Edit 2511/ }).click()
    await page.waitForTimeout(4_000)
    expect(specUrls.slice(before).some((u) => u.includes('model=qwen-img-edit-2511')),
      'switching 2.1 → 2511 refetches the 2511 form-spec').toBe(true)
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toContainText('Qwen Image Edit 2511')
    const variantsBack = await variantOptions(page)
    expect(variantsBack.length, 'the switch reseeds the variant axis back to 2511\'s rows').toBe(2)
    expect(variantsBack.some((v) => /lightning/i.test(v)), '2511 lightning reseeded').toBe(true)
    expect(variantsBack.some((v) => /standard/i.test(v)), '2511 standard reseeded').toBe(true)
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
    await pickVariant(page, /^Raw/)
    await page.waitForTimeout(3_000)
    await expect(page.locator('button[data-axis="Variant"]').first(), 'the raw route is held').toContainText('Raw')
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

  // THE STATED-WRONG HALF (the test-integrity audit cure, 2026-10-18,
  // recut 2026-10-19 against the pinned compose guard): the fresh-open
  // law silenced the UNSTATED class at open — its counterpart stays
  // LOUD one seat earlier. A STATED value outside the route envelope
  // never boards: the compose guard (cards-variant.spec.ts, THE ROUTE
  // ENVELOPE — "outside is refusal, the garbage marriage never
  // reaches the queue") refuses bench/add-stage with the judge's own
  // voice, and the refusal writes NOTHING. There is no row for a
  // drill to warn about — the refusal IS the loud voice. (The drill's
  // one-strip law still owns stated-wrong rows carried by other
  // paths — stored/healed rows the unit tier pins.)
  test('krea-2: a stated-wrong value refuses loud at compose — nothing boards, the envelope voice is verbatim', async ({ page }) => {
    const errors = collectPageErrors(page)
    await settle(page)
    // turbo's declared envelope is cfg [1, 2] — a stated 3.5 is a
    // refused marriage, not a carried row
    const mint = await openAConversation(page)
    expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
    const stagesOf = (doc: unknown): number => {
      if (doc === null || doc === undefined) return 0
      const stages = ((doc as { doc?: unknown }).doc ?? doc) as { stages?: unknown }
      return Array.isArray(stages.stages) ? stages.stages.length : 0
    }
    const before = await callBench(page, 'bench/get', { sessionKey: mint.sessionKey }).catch(() => null)
    await expect(
      board(page, mint.sessionKey, 'image-gen', { model: 'krea-2', variant: 'turbo', cfg: 3.5 }),
      'compose refuses the out-of-envelope marriage loud',
    ).rejects.toThrow('stated cfg 3.5 is OUTSIDE the route envelope for variant "turbo"')
    const after = await callBench(page, 'bench/get', { sessionKey: mint.sessionKey }).catch(() => null)
    // The refusal may ensure the empty bench shell — what it must
    // never do is board the refused stage.
    expect(stagesOf(after), 'the refused write boarded no stage').toBe(stagesOf(before))
    await expectNoPageErrors(page, errors)
  })
})
