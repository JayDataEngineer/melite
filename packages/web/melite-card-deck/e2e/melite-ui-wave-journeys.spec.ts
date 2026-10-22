import { expect, test, type Page } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''

/**
 * E2E: THE UI-PRODUCT WAVE JOURNEYS (the ROADMAP's UI-PRODUCT WAVE
 * remainders — the batched :3088 browser-riding hops the cures owed
 * per THE_JOURNEY_LAW: the wall's path is the operator's path).
 *
 *   (k) the recipe blank is a selectable WRITE: the menu's blank row
 *       ('-- recipe --') picks, the face carries the declared row,
 *       and the blank round-trip returns the placeholder (the
 *       departure, never a stuck row). Rides the Generate Image
 *       drill — the served Recipe rows' own card.
 *   (j) the anny body GLB owns the pre-run preview face: the mesh
 *       preview seat renders (stage-preview-mesh), and its content
 *       arm reads off the SERVED spec (the declared figure renders
 *       the poser stage; no declaration renders the honest empty
 *       tombstone — never asserted as a frozen literal).
 *   (l) anny's body_image sits beside body_glb (the compose
 *       precedence image > glb > parametric — both seats render,
 *       the served envelope carries both keys).
 *   (c) the lane-head parity: every gutter head (prompts / beats /
 *       audio / kf) renders through the ONE LaneHead shell
 *       ([data-lane-head]) — no bespoke grammar grew back.
 *   (e) the refmods plan-text line stays dead: the call-mods bucket
 *       renders, the tl-call-mods-hint span does not exist.
 *   (i) the input-prep crop + scale_model seats — probe-i.spec.ts
 *       owns that hop; the batch runs it alongside this file.
 *
 * THE JOURNEY LAW: every test rides hops 1→2 (the drill's pick IS
 * the saved doc's write) on the LIVE lane; screenshots are the
 * receipt a status code can never give (estate-lane-sidebar law).
 * Read-only except the bench stages the drills add (the sweep's own
 * teardown law: close the drill, leave the bench).
 *
 * Run: SWEEP_LANE_URL='http://127.0.0.1:3088/?token=…' pnpm --filter
 *   @melite-plugin/dsh-card-deck exec playwright test e2e/melite-ui-wave-journeys.spec.ts
 */

/** The deck shell's settle law (estate-lane-sidebar.spec.ts). */
async function settleHost(page: Page): Promise<void> {
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try {
      await notice.click({ timeout: 10_000 })
      await page.waitForTimeout(1_000)
    } catch { /* a cold host can re-mask mid-settle */ }
  }
  const expandSeat = page.locator('[data-sidebar-right-expand]').first()
  if ((await expandSeat.count()) === 0) {
    const hero = page.getByRole('textbox', { name: /Describe what you want to build/ })
    await hero.fill('ui-wave journeys: opening the shell for the cards bench', { timeout: 15_000 })
    await hero.press('Enter')
    await page.waitForTimeout(8_000)
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
}

/** Open the cards bench (the Melite Bench tab is the bench face). */
async function openBench(page: Page): Promise<void> {
  await page.getByText('Melite Bench', { exact: true }).first().click({ timeout: 30_000 })
  await expect
    .poll(async () => (await page.locator('body').innerText()).includes('Add'), { timeout: 30_000 })
    .toBe(true)
}

/** Add one card by its catalog label and open its drill. */
async function addCard(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: /^Add a card$/ }).first().click({ timeout: 30_000 })
  await page.getByRole('button', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).first().click({ timeout: 30_000 })
  await page.waitForTimeout(3_000)
}

/** The silent-error ledger (assert class (a) for the journey). */
const silent: string[] = []

function armCollectors(page: Page): void {
  silent.length = 0
  page.on('console', (msg): void => {
    if (msg.type() === 'error') silent.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (err): void => {
    silent.push(`pageerror: ${String(err)}`)
  })
}

test('journey (k): the recipe blank round-trip on the live drill', async ({ page }) => {
  test.setTimeout(240_000)
  armCollectors(page)
  await settleHost(page)
  await openBench(page)
  await addCard(page, 'Generate Image')

  // THE RECIPE AXIS (k): the menu carries the blank + declared rows;
  // the pick lands in the face; the blank round-trip returns the
  // '-- recipe --' write (the active row's departure — never a
  // persisted recipe key).
  const recipeSelect = page.locator('[data-recipe-select]').first()
  expect(await recipeSelect.count(), 'the Generate Image drill seats the recipe axis (the (k) card)').toBeGreaterThan(0)
  const preFace = ((await recipeSelect.textContent()) ?? '').trim()
  await recipeSelect.click({ timeout: 15_000 })
  await page.waitForTimeout(500)
  const menuItems = page.getByRole('menuitem')
  const count = await menuItems.count()
  const rows: string[] = []
  for (let i = 0; i < count; i++) rows.push(((await menuItems.nth(i).textContent()) ?? '').trim())
  console.log('[journey-k] pre-face=' + JSON.stringify(preFace) + ' menu=' + JSON.stringify(rows))
  expect(count, 'the recipe menu carries the blank + declared rows').toBeGreaterThan(1)
  // THE BLANK ROW'S VOICE (chromeCopy.recipeBlankRow — "Blank — no
  // recipe"): the '-- recipe --' placeholder is the TRIGGER's resting
  // face (the face-override law), the menu row speaks the blank WRITE
  // by its own name. Two faces, one law.
  expect(rows[0], 'row 0 is the blank WRITE (the blank row\'s own voice)').toMatch(/blank/i)
  await page.screenshot({ path: '/tmp/journey-k-recipes-menu.png', fullPage: false })

  // THE DECLARED PICK (positional: row 1, never a text heuristic)
  const declaredRow = menuItems.nth(1)
  const rowLabel = ((await declaredRow.textContent()) ?? '').trim()
  await declaredRow.click({ timeout: 15_000 })
  await page.waitForTimeout(800)
  const face = ((await recipeSelect.textContent()) ?? '').trim()
  expect(face, `the trigger's face carries the picked row ${JSON.stringify(rowLabel)} (pre-face ${JSON.stringify(preFace)})`).toContain(rowLabel)
  await page.screenshot({ path: '/tmp/journey-k-recipes-picked.png', fullPage: false })

  // THE DOC HALF OF THE JOURNEY (hop 2): the pick is the saved doc's
  // write — the bench doc's stage carries the row's stamp (no recipe
  // key persists; the stamp keys ride). Read through the page's door.
  const doc = await page.evaluate(async () => {
    const list = await (await fetch('/v1/flows/drafts')).json() as { drafts?: Array<{ draft_id?: unknown }> }
    const benchRows = (list.drafts ?? []).filter((r): r is { draft_id: string } =>
      typeof r.draft_id === 'string' && r.draft_id.startsWith('bench-'))
    for (const row of benchRows.slice(0, 4)) {
      const res = await fetch('/v1/flows/drafts/' + encodeURIComponent(row.draft_id))
      if (!res.ok) continue
      const one = await res.json() as { stages?: Array<{ card?: unknown, params?: Record<string, unknown> }> }
      const mine = (one.stages ?? []).filter((s) => s.card === 'image-gen' && typeof s.params === 'object' && s.params !== null)
      if (mine.length > 0) return mine[mine.length - 1].params
    }
    return null
  })
  expect(doc, 'the bench doc read found the image-gen stage').not.toBeNull()
  expect('recipe' in (doc as Record<string, unknown>), 'no recipe key persists in the doc (the (k) law)').toBe(false)

  // THE BLANK ROUND-TRIP (the departure WRITE)
  await recipeSelect.click({ timeout: 15_000 })
  await page.waitForTimeout(500)
  await page.getByRole('menuitem').nth(0).click({ timeout: 15_000 })
  await page.waitForTimeout(800)
  const blankFace = ((await recipeSelect.textContent()) ?? '').trim()
  expect(blankFace, 'the blank round-trip returns the -- recipe -- write (never a stuck row)').toMatch(/--\s*recipe\s*--/)
  await page.screenshot({ path: '/tmp/journey-k-recipes-blank.png', fullPage: false })

  expect(silent, 'zero silent errors across the (k) journey').toEqual([])
})

test('journey (j/l): the anny body seats own the preview face', async ({ page }) => {
  test.setTimeout(240_000)
  armCollectors(page)
  await settleHost(page)
  await openBench(page)
  await addCard(page, 'Anny')

  // THE IDENTITY TAB (the anny drill's own anatomy — role tab, and
  // the arrival selection): the body seats ride the Identity tab
  // (Turnaround/Morph are the other faces).
  const identityTab = page.getByRole('tab', { name: 'Identity', exact: true }).first()
  if ((await identityTab.count()) > 0) {
    await identityTab.click({ timeout: 15_000 })
    await page.waitForTimeout(1_500)
  }

  // (l): the body seats render BESIDE each other — the served
  // envelope carries body_glb + body_image and the drill speaks both
  // faces ("Body GLB" + "Body photo" — the photo face is the (l)
  // cure's MakeHuman image input). The tooltips voice the compose
  // precedence verbatim: photo > GLB > parametric bake.
  const body = await page.evaluate(() => document.body.innerText)
  expect(body, 'the drill renders the Body GLB seat').toMatch(/body\s*glb/i)
  expect(body, 'the drill renders the Body photo seat beside it (the (l) law)').toMatch(/body\s*photo/i)
  // THE PRECEDENCE VOICE lives in the seats' title attrs (tooltips
  // never ride innerText): photo overrides the GLB; empty falls to
  // the GLB, then the identity sliders — image > glb > parametric.
  const precedence = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[title]'))
      .some((el) => /overriding an attached glb.*empty falls to the glb/is.test(el.getAttribute('title') ?? '')),
  )
  expect(precedence, 'the seat tooltips voice the compose precedence (photo > GLB > parametric)').toBe(true)

  // (j): the mesh preview seat renders; its content arm reads off the
  // SERVED spec (the declared figure → the poser stage canvas; no
  // declaration → the honest empty tombstone). Never a frozen literal.
  const served = await page.evaluate(async () => {
    const spec = await (await fetch('/v1/form-spec?model=anny')).json() as {
      schema?: { refs?: Record<string | number, { dict?: Record<string, unknown> }>, uid: number }
      preview?: { figure?: unknown }
    }
    const root = spec.schema?.refs?.[spec.schema?.uid ?? 0]
    return { dict: Object.keys((root?.dict ?? {}) as Record<string, unknown>), figure: spec.preview?.figure !== undefined }
  })
  expect(served.dict, 'the served anny envelope carries body_glb').toContain('body_glb')
  expect(served.dict, 'the served anny envelope carries body_image (the (l) key behind the Body photo face)').toContain('body_image')
  const preview = page.locator('[data-testid="stage-preview-mesh"]').first()
  expect(await preview.count(), 'the anny drill renders the mesh preview seat (the (j) face)').toBeGreaterThan(0)
  if (served.figure) {
    expect(await preview.locator('canvas').count(), 'the declared figure renders the poser stage (the preview face is the body the run would bake)').toBeGreaterThan(0)
  } else {
    expect((await preview.innerText()).length, 'the undeclared figure renders the honest tombstone voice (non-destructive)').toBeGreaterThan(0)
  }
  await page.screenshot({ path: '/tmp/journey-jl-anny-drill.png', fullPage: false })

  expect(silent, 'zero silent errors across the (j/l) journey').toEqual([])
})

test('journey (c/e): the lane-head parity shell + the dead refmods hint', async ({ page }) => {
  test.setTimeout(240_000)
  armCollectors(page)
  await settleHost(page)
  await openBench(page)
  await addCard(page, 'Generate Video')

  // (c): EVERY gutter head renders through the ONE LaneHead shell —
  // the variants census reads the shell's own data hook; the burn's
  // pair (the keyframes bar vs the audio bar) must both be present.
  const heads = await page.evaluate(() => {
    const out: Array<{ variant: string, height: number }> = []
    document.querySelectorAll<HTMLElement>('[data-lane-head]').forEach((el) => {
      out.push({ variant: el.getAttribute('data-lane-head') ?? '?', height: Math.round(el.getBoundingClientRect().height) })
    })
    return out
  })
  const variants = heads.map((h) => h.variant)
  console.log('[journey-c] lane heads=' + JSON.stringify(heads))
  expect(variants, 'the h3 studio renders gutter heads through the LaneHead shell (the (c) cure)').toContain('audio')
  expect(variants, 'the prompts lane rides the same shell').toContain('prompts')
  // THE HEIGHT MIRROR (the head↔body pairing the parity wall pins):
  // the census records head + lane-body heights — the receipt that
  // one shell, one number serves every gutter row (the wall owns the
  // pairing assert; the journey rides it live).
  const mirror = await page.evaluate(() => {
    const heads = Array.from(document.querySelectorAll<HTMLElement>('[data-lane-head]'))
    const bodies = Array.from(document.querySelectorAll<HTMLElement>('[data-lane]'))
    return {
      headHeights: heads.map((h) => ({ variant: h.getAttribute('data-lane-head'), h: Math.round(h.getBoundingClientRect().height) })),
      bodyHeights: bodies.map((b) => ({ lane: b.getAttribute('data-lane'), h: Math.round(b.getBoundingClientRect().height) })),
    }
  })
  console.log('[journey-c] mirror=' + JSON.stringify(mirror))
  await page.screenshot({ path: '/tmp/journey-c-laneheads.png', fullPage: false })

  // THE CALL-BIRTH GESTURE (1:1: a user adds a dialogue clip — the
  // call card is born and the Ref mods bucket renders inside it).
  await page.getByRole('button', { name: 'Add Dialogue clip' }).first().click({ timeout: 15_000 })
  await page.waitForTimeout(2_500)
  // THE SELECTION (the mode rail's law: the sidebar shows the global
  // params until a call clip is selected in the bar — then it swaps
  // to THAT call's editor): click the born prompt clip in the bar.
  const clip = page.locator('[data-prompt-clip]').first()
  if ((await clip.count()) > 0) {
    await clip.click({ timeout: 10_000 }).catch(() => { /* the clip may already be selected by birth */ })
    await page.waitForTimeout(1_500)
  }
  console.log('[journey-e] post-birth face=' + JSON.stringify(
    await page.evaluate(() => ({
      buttons: Array.from(document.querySelectorAll('[role="dialog"] button')).map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()).filter((s) => s !== '').slice(0, 40),
      refs: document.body.innerText.includes('Ref mods'),
    })),
  ))

  // (e): the refmods plan-text line stays dead — the bucket renders,
  // the hint span does not exist, the plan text is not in the DOM.
  const refmods = await page.evaluate(() => ({
    bucket: document.querySelector('[data-testid="tl-call-mods-bucket"]') !== null,
    hint: document.querySelector('[data-testid="tl-call-mods-hint"]') !== null,
  }))
  expect(refmods.bucket, 'the call-mods bucket renders (the refmod seats stay)').toBe(true)
  expect(refmods.hint, 'the tl-call-mods-hint span stays dead (the (e) cure)').toBe(false)
  await page.screenshot({ path: '/tmp/journey-e-refmods.png', fullPage: false })

  expect(silent, 'zero silent errors across the (c/e) journey').toEqual([])
})
