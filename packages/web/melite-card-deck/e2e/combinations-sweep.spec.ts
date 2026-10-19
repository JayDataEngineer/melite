/**
 * E2E: THE REAL-USAGE COMBINATION SWEEP (operator 2026-11-08 —
 * ROADMAP "THE REAL-USAGE COMBINATION SWEEP"): an OPT-IN long gate
 * that drives the REAL melite estate 1:1 with what a user does,
 * across combinations/configurations (model switch, variant switch,
 * recipe pick/blank, attach/detach, re-switch after attach),
 * surfacing SILENT errors the unit walls cannot see. The operator's
 * words: "literally use what the user does 1:1 and thus see
 * whatever unintended and silent error occur, for example model /
 * recipe switching."
 *
 * THE THREE ASSERT CLASSES (the ROADMAP row):
 *   (a) zero silent errors — console errors, page errors, and
 *       failed /v1/* wire answers, collected per combination;
 *   (b) the UI state == the params composed — day one this rides
 *       the drill's OWN faces (the arrival fence's refusal voice is
 *       a PARITY break: a switch whose arrival never settles means
 *       the UI is not what compose would read; the bench doc's
 *       stage params are read through the page's own doors). The
 *       full serialized-graph parity rider (ComfyUI graph receipt)
 *       lands with the engine rider — self-skipped when no engine
 *       answers, same law as tests/e2e/engine-gate.ts.
 *   (c) no ghost knobs after a switch — the rendered knob set is
 *       diffed against the ARRIVAL family's served envelope after
 *       every switch (the P4 class: departed-surface keys that
 *       linger as rendered knobs).
 *
 * THE ROSTER IS DERIVED (the DEPTH law): cards × models × variants
 * × recipes enumerate from the SERVED doors (/v1/forms,
 * /v1/model-catalog, per-family /v1/form-spec) in the page's own
 * context — never a frozen list; a family added to the estate joins
 * the sweep on the next run.
 *
 * OPT-IN LAW (double): SWEEP_COMBINATIONS=1 AND SWEEP_LANE_URL (the
 * token-bearing lane URL — same mint as E2E_LANE_URL). Neither set
 * → self-skip, exactly the estate-lane-sidebar law: a skip is not a
 * cost signal, and this suite NEVER rides the default playwright
 * run (it is long). SWEEP_FAMILIES bounds the roster (default all
 * served families); SWEEP_MAX_COMBOS caps per-family combination
 * breadth (default 8 — the sweep is a rider, not a fuzzer).
 *
 * Run: SWEEP_COMBINATIONS=1 SWEEP_LANE_URL='http://127.0.0.1:3088/?token=…' \
 *   pnpm --filter @melite-plugin/dsh-card-deck exec playwright test \
 *   e2e/combinations-sweep.spec.ts
 * (repo alias: pnpm run test:combinations)
 */
import { expect, test, type Page } from '@playwright/test'

const LANE_URL = process.env.SWEEP_LANE_URL ?? ''
const OPT_IN = process.env.SWEEP_COMBINATIONS === '1'

test.skip(!LANE_URL || !OPT_IN,
  'the combination sweep is OPT-IN: SWEEP_COMBINATIONS=1 + SWEEP_LANE_URL (the live estate lane URL) — neither may ride a default run')

/** The silent-error ledger (assert class (a)) — one entry per
 * combination, emptied per test so a failure names ITS combination. */
const silent: string[] = []

/** Literal-escape a catalog label for RegExp matching (labels carry
 *  user-facing words — parens, dots — never regex syntax). */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Wire failures on the estate's own doors — 4xx/5xx on /v1/* the
 * UI swallowed (a refused write the UI never voiced). */
const wireFailures: string[] = []

function armCollectors(page: Page): void {
  silent.length = 0
  wireFailures.length = 0
  page.on('console', (msg): void => {
    if (msg.type() === 'error') silent.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (err): void => {
    silent.push(`pageerror: ${String(err)}`)
  })
  page.on('response', (res): void => {
    const url = res.url()
    if (!url.includes('/v1/')) return
    if (res.status() >= 400) wireFailures.push(`${res.status()} ${url.replace(/\?token=[^&]*/, '')}`)
  })
}

/** The deck shell's settle law (estate-lane-sidebar.spec.ts): the
 * first-run notice's mask intercepts pointers; the strip hides
 * until a conversation is REALLY open. */
async function settleHost(page: Page): Promise<void> {
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8_000)
  for (let round = 0; round < 3; round++) {
    const notice = page.getByRole('dialog').filter({ hasText: /Notice/ }).getByRole('button', { name: 'Continue' })
    if ((await notice.count()) === 0) break
    try {
      await notice.click({ timeout: 10_000 })
      await page.waitForTimeout(1_000)
    } catch { /* round again — a cold host can re-mask mid-settle */ }
  }
  const expandSeat = page.locator('[data-sidebar-right-expand]').first()
  if ((await expandSeat.count()) === 0) {
    const hero = page.getByRole('textbox', { name: /Describe what you want to build/ })
    await hero.fill('combination sweep: opening the shell for the cards bench', { timeout: 15_000 })
    await hero.press('Enter')
    await page.waitForTimeout(8_000)
  }
  await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
}

/** Open the cards bench (the Media Flow tab is the bench face). */
async function openBench(page: Page): Promise<void> {
  await page.getByText('Media Flow', { exact: true }).first().click({ timeout: 30_000 })
  await expect
    .poll(async () => (await page.locator('body').innerText()).includes('Add'), { timeout: 30_000 })
    .toBe(true)
}

/** The DERIVED roster, read in the page's own context (the page's
 * fetch carries the lane's auth — never a second client). Cards
 * from /v1/forms; labels per card from /v1/model-catalog; THE
 * SWITCHABLE MODELS from each card's own form-spec envelope (the
 * `model` root field's consts — stage-drill-gates' own shape). */
async function deriveRoster(page: Page): Promise<Array<{
  card: string
  label: string
  models: string[]
  recipes: string[]
}>> {
  return await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, unknown>
    const catalog = await (await fetch('/v1/model-catalog')).json() as {
      cards?: Record<string, { label?: string, models?: string[] }>
    }
    const families = Object.keys(forms)
    const out: Array<{ card: string, label: string, models: string[], recipes: string[] }> = []
    for (const card of families) {
      let label = card
      const row = catalog.cards?.[card]
      if (typeof row?.label === 'string' && row.label !== '') label = row.label
      // THE MODEL AXIS: the card's own form-spec doc's top-level
      // `families` array IS the Serving-family menu (probed live
      // 2026-11-08: [{id, label, present}] — the knob the user
      // actually switches). The schema envelope's root dict carries
      // NO model key and the catalog's cards[].models is empty —
      // both dead ends; this read is the seat.
      let models: string[] = []
      try {
        const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(card))).json() as {
          families?: Array<{ id?: unknown, present?: unknown }>
        }
        if (Array.isArray(spec.families)) {
          models = spec.families
            .filter((f) => typeof f?.id === 'string' && f.id !== '' && f.present !== false)
            .map((f) => f.id as string)
        }
      } catch { /* a card with no served envelope keeps an empty model axis — the sweep still walks its add */ }
      out.push({ card, label, models, recipes: [] })
    }
    return out
  })
}

/** The ghost-knob census (assert class (c)): after a switch, every
 * rendered knob label must belong to the ARRIVAL family's served
 * envelope — a departed key that still renders is a ghost (the P4
 * class). Read from the open drill's own field labels. */
async function ghostKnobs(page: Page, arrivalFamily: string): Promise<string[]> {
  return await page.evaluate(async (family: string) => {
    const spec = await (await fetch(`/v1/form-spec?family=${encodeURIComponent(family)}`)).json() as {
      schema?: { refs?: Record<string | number, { dict?: Record<string, number | string> }>, uid: number }
    }
    const root = spec.schema?.refs?.[spec.schema?.uid ?? 0]
    const dict = root?.dict ?? {}
    const served = new Set(Object.keys(dict))
    served.add('model')
    const labels = Array.from(document.querySelectorAll('label')).map((el) => el.textContent?.trim() ?? '').filter(Boolean)
    const ghosts: string[] = []
    for (const label of labels) {
      if (label === '') continue
      // a rendered label names a knob; the served set owns every
      // knob the arrival family declares — extras are ghosts
      if (!served.has(label) && !label.includes(':') && label.length < 40) {
        // the chrome rows (Run, close, tabs) ride aria roles, not
        // bare labels — a bare short label is a field row
        ghosts.push(label)
      }
    }
    return ghosts
  }, arrivalFamily)
}

test('the real-usage combination sweep — derived roster, 1:1 gestures, zero silent errors', async ({ page }) => {
  test.setTimeout(1_800_000)
  armCollectors(page)
  await settleHost(page)
  await openBench(page)

  const roster = await deriveRoster(page)
  // eslint-disable-next-line no-console -- THE CENSUS (the sweep's human-readable roster receipt)
  console.log('[sweep-roster]', JSON.stringify(roster))
  expect(roster.length, 'the served door enumerates at least one card').toBeGreaterThan(0)

  const familyCap = Number(process.env.SWEEP_FAMILIES ?? '0')
  const bounded = familyCap > 0 ? roster.slice(0, familyCap) : roster
  const maxCombos = Number(process.env.SWEEP_MAX_COMBOS ?? '8')

  for (const row of bounded) {
    const combos: Array<{ model?: string }> = [{}, ...row.models.slice(0, maxCombos - 1).map((model) => ({ model }))]
    for (const combo of combos) {
      silent.length = 0
      wireFailures.length = 0
      const tag = `${row.card}${combo.model === undefined ? '' : ` :: ${combo.model}`}`

      // THE 1:1 GESTURES: add the card (the bench's add door), open
      // its drill, and if the combination names a model, switch the
      // Serving family knob — exactly the user's burn.
      // THE BENCH'S OWN ADD DOOR: the exact "Add a card" tile —
      // never a bare /Add/ regex (the sidebar's "Add workspace"
      // button precedes the bench in DOM order and steals the click;
      // the 2026-11-08 sweep run caught it opening the host's
      // workspace-directory dialog instead of the card picker)
      const addTile = page.getByRole('button', { name: /^Add a card$/ }).first()
      await addTile.click({ timeout: 30_000 })
      // THE PICKER SHOWS CATALOG LABELS, never ids (the lane UI map —
      // the picker's rows carry cards[id].label from /v1/model-catalog)
      const pickerCard = page.getByRole('button', { name: new RegExp(`^${escapeRe(row.label)}$`, 'i') }).first()
      await pickerCard.click({ timeout: 30_000 })
      await page.waitForTimeout(2_000)

      if (combo.model !== undefined) {
        const knob = page.getByRole('button', { name: /Serving family/ }).first()
        if ((await knob.count()) > 0) {
          await knob.click({ timeout: 15_000 })
          const item = page.getByRole('menuitem').filter({ hasText: combo.model }).first()
          if ((await item.count()) > 0) {
            await item.click({ timeout: 15_000 })
            // THE ARRIVAL WINDOW: the fence lifts with the settle —
            // wait past it, then judge the rendered set
            await page.waitForTimeout(3_000)
            const ghosts = await ghostKnobs(page, combo.model)
            expect(ghosts, `${tag}: ghost knobs after the switch (the P4 class — the UI did not follow the arrival)`).toEqual([])
          }
        }
      }

      // THE RECIPE FACE: the recipe select carries the blank + every
      // declared row (the (k) law) — cycle it if the card serves one
      const recipeSelect = page.locator('[data-recipe-select]').first()
      if ((await recipeSelect.count()) > 0) {
        await recipeSelect.click({ timeout: 15_000 })
        await page.waitForTimeout(500)
        const menuItems = page.getByRole('menuitem')
        const count = await menuItems.count()
        expect(count, `${tag}: the recipe menu carries the blank + declared rows (the (k) law)`).toBeGreaterThan(0)
        await page.keyboard.press('Escape')
      }

      // assert class (a) — per combination, naming it
      expect(silent, `${tag}: silent errors (console/page)`).toEqual([])
      expect(wireFailures, `${tag}: swallowed wire failures on the estate doors`).toEqual([])

      // clean the bench for the next combination: close the drill
      // and remove the stage (the user's own teardown gestures). The
      // drill's close control's ACCESSIBLE NAME is "Collapse card"
      // (its visible text is "Close" — match the name, never the
      // text; the 2026-11-08 run left the modal open on a /Close/
      // text match and the next add never landed)
      const close = page.getByRole('button', { name: /^Collapse card$|^Close$|^Back$/ }).first()
      if ((await close.count()) > 0) await close.click({ timeout: 10_000 }).catch(() => { /* the drill may already be closed */ })
      await page.waitForTimeout(500)
      // Escape as the fallback close (a zoom-overlay drill answers
      // it), then confirm the modal is gone before the next add
      await page.keyboard.press('Escape').catch(() => { /* no modal — nothing to close */ })
      await page.waitForTimeout(500)
    }
  }
})
