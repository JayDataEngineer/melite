// journey-e2-arms.spec.ts — THE BROWSER-TIER ARMS (journey-closure plan
// E2, 2026-10-17): the three arms the plan owes the browser plane,
// ridden on the LIVE served lane (E2E_STUDIO_URL — never a mocked
// estate), mirroring this suite's tour harness (tour.ts).
//
//   ARM 1  THE KEYFRAME DOOR IN THE DRILL (D9/E7): the keyframe seat's
//          pick door refuses LOUD — the refusal renders in the drill
//          (tl-strip-kf-error, role=alert), never a silent write and
//          never a silent 400 — and the happy path still commits (the
//          atomic pin+image write lands on the bench).
//   ARM 2  THE FINAL-CUT SCENARIO (B2): the Final Cut recipe pick
//          stamps the T4_ONLY pair (second_pass_enabled + sr_switch)
//          on a t4_open doc; the strip's keyframe commit then flips
//          the derived family to t4r and the FLIP WRITER unstamps the
//          residue in the SAME onSave — the commit lands, and the
//          reopen (a real reload, a real drill re-open) shows it.
//   ARM 3  THE MOTION RAIL LAW (motion-params-dry F1's browser half):
//          MotionRail's mounted rail keeps scrollWidth <= clientWidth
//          on the REAL layout — the jsdom census pins the CSS, this
//          arm proves the served layout keeps the law.
//
// THE SHARED-BENCH LAW (the live lane's own shape, learned on the
// first ride 2026-10-17): the minted conversation's bench INHERITS the
// workspace's stages — the arms never assume a pinless or h3-only
// bench. Every arm boards its OWN stage through the estate's add
// door, keeps the returned stage id, clicks the tile by
// [data-stage-id] (the tile caption renders human labels, never the
// card id), and reads the bench BY STAGE ID. The operator's own
// stages are never touched.
//
// The hop map crossed: [1] UI seat → [2] saved doc (bench/get), in a
// real Chromium against the lane's served bundles. A red arm is a
// FINDING: the failures are captured verbatim, never papered over.
import { expect, test, type Page } from '@playwright/test'
import {
  callBench, collectPageErrors, dismissOnboarding, expectNoPageErrors,
  openAConversation, openCardsWithBench, settle, STUDIO_URL, waitForEstate,
} from './tour.ts'

test.skip(!STUDIO_URL, 'E2E_STUDIO_URL (token-authenticated shell URL) is not set — the browser-tier arms ride the LIVE lane')
test.skip(process.env.MELITE_E2E_AI !== '1', 'THE MINT IS AN ACTUAL AI CALL — one real model turn per ride (tokens burned, keyed lane required); opt in with MELITE_E2E_AI=1')

// THE KEYFRAME SEAT'S DOOR (StudioStripPane.onTrackAdd → the provider's
// three-entry source menu): exactly one keyframes track renders
// (VIDEO_TIMELINE_TRACKS), so the door button is unique.
const KF_DOOR = 'button[data-track-upload]'
// The door's refusal face (the D9 spine's one seat) and the pick gate's
// face (RunRecipeEngine's compose gate) — the loud voices this tier
// exists to see.
const KF_REFUSAL_FACE = '[data-testid="tl-strip-kf-error"]'
const PICK_GATE_FACE = '[data-gate-face="1"]'
// The settled chip aria (studioCopy.keyframeLaneChipAria); the PENDING
// face appends " — PENDING: …" so the exact-match regex tells them apart.
const SETTLED_CHIP_ARIA = /^Image pin at frame \d+$/
// The upload gate's voices (refUtils.refUploadError — image kind).
const OVERSIZE_VOICE = 'file too large (max 20 MB)'
// A real 1×1 PNG — decodes instantly, so the fit rider's 700ms courtesy
// window never races the commit.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
// One byte over the image gate's 20 MB cap — the oversize refusal's shape.
const PNG_OVERSIZE = Buffer.alloc(21 * 1024 * 1024)

interface BenchDocShape {
  rev?: number
  stages?: Array<{ id?: unknown; card?: unknown; params?: Record<string, unknown> }>
  doc?: BenchDocShape
}

/** The bench doc, parsed the tour's way (flat rev, stages; the value
 *  may ride bare or under doc). */
function parseBench(value: unknown): BenchDocShape {
  const parsed = value as BenchDocShape | undefined
  return parsed?.doc ?? parsed ?? {}
}

/** The bench's current rev (the CAS token) — birthing the bench first
 *  when the conversation has none yet (the tour's ensure door). */
async function benchRev(page: Page, sessionKey: string): Promise<number> {
  let value: unknown
  try {
    value = await callBench(page, 'bench/get', { sessionKey })
  } catch {
    await callBench(page, 'bench/ensure', { doc: { session: sessionKey } })
    value = await callBench(page, 'bench/get', { sessionKey })
  }
  const rev = parseBench(value).rev
  return typeof rev === 'number' ? rev : 0
}

/** Board the arm's OWN stage through the estate's add door (CAS-retried
 *  once on a stream race, the every-card wall's grammar) and return the
 *  door's stage id — the arms' one coordinate on the shared bench. */
async function addOwnStage(
  page: Page,
  sessionKey: string,
  card: string,
  params: Record<string, unknown>,
): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const rev = await benchRev(page, sessionKey)
    try {
      const row = await callBench(page, 'bench/add-stage', {
        sessionKey,
        doc: { card, author: 'user', expect_rev: rev, params },
      }) as { stage?: unknown }
      expect(typeof row?.stage, `${card}: the add door answers the stage id`).toBe('string')
      return row!.stage as string
    } catch (e) {
      if (attempt === 1) throw e
      await page.waitForTimeout(1_000)
    }
  }
  throw new Error(`${card}: the add door never answered`) // unreachable
}

/** The arm's own stage's settled params off the bench — read BY STAGE
 *  ID, never by card (the shared bench carries other riders' stages). */
async function readStageParams(
  page: Page,
  sessionKey: string,
  stageId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const doc = parseBench(await callBench(page, 'bench/get', { sessionKey }))
    const stages = Array.isArray(doc.stages) ? doc.stages : []
    for (const s of stages) {
      if (s?.id === stageId) return s.params ?? {}
    }
    return null
  } catch {
    return null
  }
}

/** Poll the bench until the stage's params satisfy the predicate — a
 *  settlement wait, never a sleep-and-hope. Fails with the LAST read
 *  embedded (the diagnosis law: a bare timeout hides which half). */
async function waitForBench(
  page: Page,
  sessionKey: string,
  stageId: string,
  what: string,
  predicate: (p: Record<string, unknown>) => boolean,
  budgetMs = 60_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + budgetMs
  let last: Record<string, unknown> | null = null
  for (;;) {
    last = await readStageParams(page, sessionKey, stageId)
    if (last !== null && predicate(last)) return last
    if (Date.now() > deadline) {
      throw new Error(
        `bench never settled: ${what} — last params: ${JSON.stringify(last)?.slice(0, 800) ?? 'none'}`,
      )
    }
    await page.waitForTimeout(1_500)
  }
}

/** Drive one file through the keyframe door's REAL grammar: the door
 *  button → the source menu's From file row → the OS dialog (caught as
 *  a filechooser) → the file. Every pick the drill can really ride. */
async function pickFileThroughKfDoor(page: Page, file: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
  const door = page.locator(KF_DOOR).first()
  await expect(door, 'the keyframe door renders (the lane-head upload icon)').toBeVisible({ timeout: 20_000 })
  await door.click()
  const fromFile = page.getByRole('menuitem', { name: 'From file' })
  await expect(fromFile, 'the source menu opens (From flow / From media / From file)').toBeVisible({ timeout: 10_000 })
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15_000 }),
    fromFile.click(),
  ])
  await chooser.setFiles(file)
}

/** The arm's tile, by stage id — the caption renders human labels, so
 *  the id attribute is the only exact seat. */
function tileOf(page: Page, stageId: string) {
  return page.locator(`[data-stage-id="${stageId}"] button[class*="tileInner"]`).first()
}

/** Settle, mint, open the Cards tab (the tour's order law: the tab
 *  rides the stream, adds after open render). */
async function mintAndOpenCards(page: Page): Promise<string> {
  await settle(page)
  const mint = await openAConversation(page)
  expect(mint.sessionKey, 'the mint named the bench key').not.toBe('')
  await openCardsWithBench(page, mint.sessionKey)
  return mint.sessionKey
}

/** Open the drill on the arm's own stage. */
async function openDrill(page: Page, stageId: string, label: string): Promise<void> {
  const tile = tileOf(page, stageId)
  await expect(tile, `${label}: the stage tile renders`).toBeVisible({ timeout: 30_000 })
  await tile.click({ timeout: 15_000, force: true })
  await expect(page.locator('div[class*="zoomCard"]').first(), `${label}: the drill opens`).toBeVisible({ timeout: 30_000 })
}

test.describe('journey-closure E2 — the browser-tier arms (the live lane)', () => {
  // ── ARM 1 ──────────────────────────────────────────────────────────
  test('E2 ARM 1 — the keyframe door: the refusal renders in the drill, the happy path commits', async ({ page }) => {
    const errors = collectPageErrors(page)
    const sessionKey = await mintAndOpenCards(page)
    const stageId = await addOwnStage(page, sessionKey, 'h3-timeline', {
      variant: 'h3', quant: 'int8', model: 'h3',
      calls: [{ text: 'A single shot — describe the action, camera, and mood.', start_frame: 0, end_frame: 175 }],
    })
    await openDrill(page, stageId, 'the arm stage')
    await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the h3 studio tenant mounts').toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(2_000)

    // THE KEYFRAME SEAT IS EMPTY at arm start (the arm's own stage):
    // the refusal must write NOTHING.
    const before = await readStageParams(page, sessionKey, stageId)
    expect(before?.keyframes, 'the seat starts pinless').toBeFalsy()

    // THE REFUSAL RIDE: an oversized image through the REAL door — the
    // gate's own voice must RENDER in the drill (role=alert), and the
    // write must never land (never a silent anything).
    await pickFileThroughKfDoor(page, { name: 'too-big.png', mimeType: 'image/png', buffer: PNG_OVERSIZE })
    const face = page.locator(KF_REFUSAL_FACE)
    await expect(face, 'the door refusal renders in the drill').toBeVisible({ timeout: 15_000 })
    await expect(face).toHaveAttribute('role', 'alert')
    await expect(face, 'the refusal names the gate (the one-spelling voice)').toHaveText(OVERSIZE_VOICE)
    // THE WRITE NEVER LEFT: the bench still holds no pins after the
    // refused gesture settles.
    await page.waitForTimeout(2_500)
    const afterRefusal = await readStageParams(page, sessionKey, stageId)
    expect(afterRefusal?.keyframes, 'a refused pick writes nothing to the doc').toBeFalsy()
    expect(await page.locator('[aria-label^="Image pin at frame"]').count(), 'no chip renders for a refused pick').toBe(0)

    // THE HAPPY PATH: a real PNG through the SAME door — the atomic
    // pin+image commit lands, the chip renders SETTLED (not pending),
    // and the bench doc holds the pin with its image.
    await pickFileThroughKfDoor(page, { name: 'pin.png', mimeType: 'image/png', buffer: PNG_1X1 })
    const chip = page.locator('[aria-label^="Image pin at frame"]').first()
    await expect(chip, 'the pin commits — the chip renders').toBeVisible({ timeout: 30_000 })
    const aria = await chip.getAttribute('aria-label')
    expect(aria ?? '', 'the chip is the SETTLED face, never the pending one').toMatch(SETTLED_CHIP_ARIA)
    await expect(page.locator(KF_REFUSAL_FACE), 'the refusal face cleared with the lawful commit').toHaveCount(0)
    const after = await waitForBench(page, sessionKey, stageId, 'the atomic pin+image write', (p) =>
      Array.isArray(p.keyframes) && (p.keyframes as unknown[]).length === 1)
    const pin = (after.keyframes as Array<{ image?: unknown; frame?: unknown }>)[0] ?? {}
    expect(typeof pin.image, 'the pin carries its image').toBe('string')
    expect(String(pin.image), 'the image is commit-currency (data: or media), never a refusal string').toMatch(
      /^(data:image\/|\/melite-media\/)/,
    )
    expect(typeof pin.frame, 'the pin carries its frame').toBe('number')
    await expectNoPageErrors(page, errors)
  })

  // ── ARM 2 ──────────────────────────────────────────────────────────
  test('E2 ARM 2 — the Final-Cut ride: the flip-writer reseat survives the real roundtrip', async ({ page }) => {
    const errors = collectPageErrors(page)
    const sessionKey = await mintAndOpenCards(page)
    const stageId = await addOwnStage(page, sessionKey, 'h3-timeline', {
      variant: 'h3', quant: 'int8', model: 'h3',
      calls: [{ text: 'A single shot — describe the action, camera, and mood.', start_frame: 0, end_frame: 175 }],
    })
    await openDrill(page, stageId, 'the arm stage')
    await expect(page.locator('[data-testid="h3-studio-tenant"]'), 'the h3 studio tenant mounts').toBeVisible({ timeout: 30_000 })

    // THE PICK DOOR: the Run panel rides the global view at open — the
    // Recipe select is the served spec's recipe trio. Final Cut stamps
    // second_pass_enabled + sr_switch (both T4_ONLY keys).
    const recipe = page.getByRole('button', { name: 'Recipe', exact: true })
    await expect(recipe, 'the Recipe axis renders in the run panel').toBeVisible({ timeout: 30_000 })
    await recipe.click()
    const finalCut = page.getByRole('menuitem', { name: /^Final Cut/ })
    await expect(finalCut, 'the Final Cut pill is offered on the t4_open lane').toBeVisible({ timeout: 10_000 })
    await finalCut.click()
    // THE PICK GATE DID NOT REFUSE: the gate face stays silent — the
    // t4_open lane honors the stamp.
    await expect(page.locator(PICK_GATE_FACE), 'no gate refusal on a lawful pick').toHaveCount(0, { timeout: 10_000 })
    // THE STAMP LANDS: the bench doc carries the T4_ONLY pair.
    await waitForBench(page, sessionKey, stageId, 'the Final-Cut stamp', (p) =>
      p.second_pass_enabled === true && p.sr_switch === true)

    // THE STRIP'S COMMIT SEAM: a keyframe pin through the SAME atomic
    // door as arm 1 — the write that flips the derived family to t4r
    // (keyframes present ⇒ the reference lane).
    await pickFileThroughKfDoor(page, { name: 'pin.png', mimeType: 'image/png', buffer: PNG_1X1 })
    await expect(page.locator('[aria-label^="Image pin at frame"]').first(), 'the pin commits').toBeVisible({ timeout: 30_000 })

    // THE FLIP WRITER (B2): the reseat unstamps the T4_ONLY residue in
    // the SAME onSave that landed the pin — the saved doc composes on
    // its derived lane (the walk refuses those keys on t4r).
    const reseated = await waitForBench(page, sessionKey, stageId, 'the B2 reseat (pin present, residue unstamped)', (p) =>
      Array.isArray(p.keyframes) && (p.keyframes as unknown[]).length === 1
      && p.second_pass_enabled === undefined && p.sr_switch === undefined)
    const pin = (reseated.keyframes as Array<{ image?: unknown }>)[0] ?? {}
    expect(String(pin.image ?? ''), 'the pin survived the flip with its image').toMatch(/^(data:image\/|\/melite-media\/)/)
    await expect(page.locator(PICK_GATE_FACE), 'no gate refusal rode the flip').toHaveCount(0)
    await expect(page.locator(KF_REFUSAL_FACE), 'no door refusal rode the flip').toHaveCount(0)

    // THE REOPEN: a real reload, a real tab re-open, a real drill
    // re-open — the commit survived the roundtrip. THE SHELL HAS NO
    // SESSION URL (the served client bundle holds zero history-API
    // calls; session selection is in-memory): a reload auto-restores
    // the last-ACTIVE session, which on a shared lane can be ANOTHER
    // session's face — the right sidebar this arm drove never mounts
    // there and the expand seat never renders (the 2026-10-17 red).
    // Re-entry is therefore the arm's OWN tree row, clicked by the
    // mint's captured key: the sessions tree renders every session as
    // role=treeitem with data-row-key="session:<id>", and the bench
    // session key IS that id verbatim (benchSessionOf admits a
    // well-formed sessionId unchanged — benchStage.ts:371). A CLICK,
    // never a re-mint: each mint is a real model turn.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await dismissOnboarding(page)
    await waitForEstate(page)
    const ownRow = page.locator(`[data-row-key="session:${sessionKey}"]`)
    await expect(ownRow, 'the arm\'s own session row renders in the tree after reload').toBeVisible({ timeout: 30_000 })
    await ownRow.click({ timeout: 15_000 })
    // The sidebar re-enters exactly as openCardsWithBench enters it,
    // with one tolerance the reopen owns: the sidebar's expanded state
    // survives the reload client-side, so the reopened face may render
    // the tab row already — and never the collapse-state expand seat.
    // The seat hop is tried and skipped when the face is already
    // expanded; the tab hop matches BOTH faces — the collapsed rail's
    // guide pill renders role=button, the expanded strip's tab renders
    // role=tab with the close affordance in its accessible name
    // ("Melite Bench Close"). Which face greets the reopen is the
    // survived expanded state, not the test's choice (the 2026-10-17
    // ride-3 red: the role=button-only locator timed out against an
    // already-expanded, already-selected Melite Bench tab).
    const expand = page.locator('[data-sidebar-right-expand]').first()
    await expect(expand, 'the right sidebar offers its expand seat (or is already expanded)')
      .toBeVisible({ timeout: 15_000 }).catch(() => {})
    if (await expand.isVisible().catch(() => false)) {
      await expand.click({ timeout: 10_000 })
      await page.waitForTimeout(3_000)
    }
    await page.getByRole('button', { name: /Melite Bench/ })
      .or(page.getByRole('tab', { name: /Melite Bench/ }))
      .first().click({ timeout: 20_000 })
    await page.waitForTimeout(5_000)
    await openDrill(page, stageId, 'the reopened arm stage')
    await expect(page.locator('[data-testid="h3-studio-tenant"]')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(2_000)
    const chip = page.locator('[aria-label^="Image pin at frame"]').first()
    await expect(chip, 'THE REOPEN SHOWS IT: the pin renders after the real roundtrip').toBeVisible({ timeout: 30_000 })
    expect(await chip.getAttribute('aria-label') ?? '', 'the reopened chip is the settled face').toMatch(SETTLED_CHIP_ARIA)
    // The wire truth after the reopen: the pin with its image, the
    // residue still unstamped — the saved doc IS the t4r-legal doc.
    await waitForBench(page, sessionKey, stageId, 'the reopened doc holds the reseated state', (p) =>
      Array.isArray(p.keyframes) && (p.keyframes as unknown[]).length === 1
      && p.second_pass_enabled === undefined && p.sr_switch === undefined)
    // THE ROW GATE'S LIVE FACE (the D-cure's rail half): on the t4r
    // lane the Recipe select stops OFFERING Final Cut — the rail never
    // serves a stamp the family cannot honor.
    const recipe2 = page.getByRole('button', { name: 'Recipe', exact: true })
    if (await recipe2.isVisible().catch(() => false)) {
      await recipe2.click()
      const offered = (await page.getByRole('menuitem').allTextContents()).map((t) => t.trim())
      expect(offered.some((t) => t.startsWith('Final Cut')), 'the t4r rail refuses to offer the Final Cut stamp').toBe(false)
      await recipe2.click().catch(() => {})
    }
    await expectNoPageErrors(page, errors)
  })

  // ── ARM 3 ──────────────────────────────────────────────────────────
  test('E2 ARM 3 — the motion rail law: scrollWidth <= clientWidth on the real mounted rail', async ({ page }) => {
    const errors = collectPageErrors(page)
    const sessionKey = await mintAndOpenCards(page)
    // THE FAMILY IS DERIVED (never a hand literal): the motion card's
    // family comes off the lane's own catalog door — and the card id
    // is the catalog's own spelling ('motion'; 'kimodo' is the family,
    // not the card — the first ride's refusal, verbatim in the audit).
    const motion = await page.evaluate(async () => {
      const cat = await (await fetch('/v1/model-catalog')).json() as { cards?: Record<string, unknown> }
      const row = cat.cards?.motion
      if (Array.isArray(row)) return row.find((f): f is string => typeof f === 'string')
      const maybe = (row as { families?: unknown } | null)?.families
      return Array.isArray(maybe) ? maybe.find((f): f is string => typeof f === 'string') : undefined
    })
    expect(motion, 'the catalog names the motion card a family (the rail rides the served DECL)').toBeDefined()
    const stageId = await addOwnStage(page, sessionKey, 'motion', motion !== undefined ? { model: motion } : {})
    await openDrill(page, stageId, 'the motion stage')

    // THE REAL MOUNTED RAIL: the params rail the census wall pins in
    // jsdom, here judged on the served layout.
    const rail = page.locator('[data-testid="mo-rail-panel"]')
    await expect(rail, 'the motion rail mounts').toBeVisible({ timeout: 30_000 })
    // THE SEAT FACES RENDER (the rail is not measured empty): the
    // derived sections the census wall seats.
    await expect(page.locator('[data-testid="mo-gen-panel"]').first(), 'the generation section renders').toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(3_000)

    // THE LAW, one line: the rail never h-scrolls. No tolerance, no
    // slack — the law's own spelling. A breach is a FINDING, captured
    // verbatim with the numbers.
    const law = await rail.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }))
    expect(
      law.scrollWidth <= law.clientWidth,
      `MotionRail scrollWidth (${law.scrollWidth}) <= clientWidth (${law.clientWidth}) — the D-rail law on the real layout`,
    ).toBe(true)

    // THE CENSUS, REPORTED NOT JUDGED (the overflow-hunt discipline):
    // any descendant that overflows names itself in the log for the
    // audit receipt — the LAW's subject is the rail itself.
    const census = await rail.evaluate((el) => {
      const out: Array<{ sel: string; cw: number; sw: number }> = []
      for (const node of el.querySelectorAll('*')) {
        const h = node as HTMLElement
        if (h.scrollWidth > h.clientWidth + 2 && h.clientWidth > 0) {
          out.push({
            sel: (h.getAttribute('data-testid') ?? h.tagName.toLowerCase()).slice(0, 40),
            cw: h.clientWidth,
            sw: h.scrollWidth,
          })
        }
      }
      return out.sort((a, b) => (b.sw - b.cw) - (a.sw - a.cw)).slice(0, 10)
    })
    console.log(`[e2-motion-rail] rail ${law.clientWidth}×${law.scrollWidth}; overflowing descendants: ` + JSON.stringify(census))

    // THE UNPROVISIONED-MODEL STATE IS NOT A PAGE ERROR (the
    // every-card wall's waiver): the kimodo studio probes its
    // provision doors on open; a lane without the model answers 502 —
    // the DECLARED state. Every other ≥400 stays loud.
    const unprovisioned = /http 502: \S*\/v1\/models\/[^/]+\/provisions\//
    await expectNoPageErrors(page, errors.filter((e) => !unprovisioned.test(e)))
  })
})
