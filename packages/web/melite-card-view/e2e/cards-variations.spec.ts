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
  await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
  await page.waitForTimeout(4_000)
  const rail = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])')
  await expect(rail).toHaveCount(stages.length, { timeout: 30_000 })
  return { key: mint.sessionKey, rail }
}

/** THE MENU AXES (S7e): the Variant select is a DSH Menu — the
 * trigger Button carries the data-axis marker + the row face; the
 * offers live in the OPEN menu's menuitem rows. The regexes match
 * the served rows case-insensitively (label OR titleCaseId face). */
async function variantOptions(page: Page): Promise<string[]> {
  const trigger = page.locator('button[data-axis="Variant"]').first()
  await trigger.click()
  // THE PORTAL MOUNT IS ASYNC (Menu portal: true — the rows render a
  // React tick after the anchor's click; an immediate allTextContents
  // reads an empty DOM). The first row's visibility gates the read.
  await expect(page.getByRole('menuitem').first(), 'the variant menu opens').toBeVisible({ timeout: 5_000 })
  const rows = await page.getByRole('menuitem').allTextContents()
  await trigger.click() // owner bit toggles closed
  return rows.map((r) => r.trim()).filter((r) => r !== '')
}
async function pickVariant(page: Page, face: RegExp): Promise<void> {
  await page.locator('button[data-axis="Variant"]').first().click()
  await expect(page.getByRole('menuitem').first(), 'the variant menu reopens').toBeVisible({ timeout: 5_000 })
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
    // THE MENU AXES (S7e): the Model select is a DSH Menu — the
    // trigger's accessible name is 'Model' (aria-label; the
    // AxisMenuSelect carries NO data-axis marker — only the
    // axes-field groups Variant/Quant/Recipe do, axes.tsx:330) —
    // the value assert reads the trigger's face by role, never a
    // <select> that no longer rides.
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toContainText('Qwen Image Edit 2511')
    // THE SOFT-RETIRED FACE (drive-12→14's standing #3 red, named):
    // BOTH 2511 variants carry hide_from_dropdown (the survivor arc,
    // 2026-11-08 — "the 2.1 lane won: addressable, not offered") so
    // the drill's Variant group renders NOTHING (axisField returns
    // null on zero visible rows, card-base axes.tsx). The old asserts
    // (two offered variants lightning/standard) pinned a retired
    // truth; the LIVE law is the retire itself — the axis is absent,
    // addressability rides the 2.1 face below.
    await expect(page.locator('button[data-axis="Variant"]'), '2511 offers no variant axis (both rows soft-retired)').toHaveCount(0)
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
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toContainText('Qwen Image Edit 2.1')
    // THE VARIANT RESEED (the stale-variant cure), re-pinned to the
    // LIVE axis vocabulary (drive-15's receipt): the 2026-11-09
    // quant-pool restructure moved the int8/bf16 TIERS off the
    // Variant axis onto the QUANT axis (trigger face 'INT8 ConvRot')
    // — 2.1's Variant rows are now [Base, …]. The reseed law itself
    // is STRONGER under the soft-retire above: the switch 2511→2.1
    // goes ABSENCE → PRESENCE, so any row here is 2.1's own — a
    // carried-over 2511 row (lightning/standard) is the named break.
    const variants21 = await variantOptions(page)
    expect(variants21.length, '2.1 offers its own variant rows (the axis appears on the switch)').toBeGreaterThan(0)
    expect(variants21.some((v) => /base/i.test(v)), '2.1 base variant is offered').toBe(true)
    expect(variants21.some((v) => /lightning|standard/i.test(v)), 'no soft-retired 2511 row carried over').toBe(false)
    await expect(page.getByRole('button', { name: 'Quant', exact: true }), 'the tier vocabulary lives on the Quant axis now').toContainText('INT8')
    expect(await servedImageCap(page, 'qwen-img-edit-21'), 'the 2.1 lane admits 16 images').toBe(16)
    await expect(page.locator('[data-lane-warn]'), '2.1: no lane-warn strip on a fresh open').toHaveCount(0)

    // —— THE MODEL SWITCH, ON THE OPEN 2.1 DRILL ————————
    const before = specUrls.length
    await page.getByRole('button', { name: 'Model', exact: true }).click()
    await expect(page.getByRole('menuitem').first(), 'the model menu opens on the open drill').toBeVisible({ timeout: 5_000 })
    await page.getByRole('menuitem', { name: /Qwen Image Edit 2511/ }).click()
    await page.waitForTimeout(4_000)
    expect(specUrls.slice(before).some((u) => u.includes('model=qwen-img-edit-2511')),
      'switching 2.1 → 2511 refetches the 2511 form-spec').toBe(true)
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toContainText('Qwen Image Edit 2511')
    // THE RESEED BACK, under the soft-retire: the axis VANISHES again
    // (both 2511 rows hidden from the dropdown) — the reseed law
    // judged in BOTH directions: absence→presence→absence across
    // switches, never a carried-over row in either direction.
    await expect(page.locator('button[data-axis="Variant"]'), 'the switch back retires the axis again (no carried-over 2.1 row)').toHaveCount(0)
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
    await expect(page.getByRole('button', { name: 'Model', exact: true })).toContainText('Krea 2')
    // THE SERVED TRUTH IS THE EXPECTATION (drive-13: the frozen
    // ['turbo','raw'] literal reddened when krea-2's DECL grew
    // kroma + kroma-base — a FROZEN-LITERAL wall judges a copy and
    // passes while the truth moves; the menu must offer exactly the
    // lanes the wire serves, derived live, never baked).
    const spec = await servedSpec(page, 'krea-2')
    const lanes = spec['lanes'] as { variants?: Record<string, { bounds?: Record<string, { min?: number; max?: number }>; sampler_envelope?: Record<string, [number, number]> }> }
    const served = lanes.variants ?? {}
    const servedNames = Object.keys(served).map((k) => k.split(/[-_]/).map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1)).join(' '))
    expect(await variantOptions(page), `krea-2 offers exactly its served routes (${servedNames.join(', ')})`).toEqual(servedNames)
    // THE ENVELOPE, served to the browser: turbo 4–8 steps / 1–2 cfg,
    // raw 30–60 / 2–6 — the projection (bounds) and the verbatim
    // envelope both, per the lane's own door
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
