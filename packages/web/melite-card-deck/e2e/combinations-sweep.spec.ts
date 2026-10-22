/**
 * E2E: THE REAL-USAGE COMBINATION SWEEP (operator 2026-11-08 —
 * ROADMAP "THE REAL-USAGE COMBINATION SWEEP"): an OPT-IN long gate
 * that drives the REAL melite estate 1:1 with what a user does,
 * across combinations/configurations, surfacing SILENT errors the
 * unit walls cannot see. The operator's words: "literally use what
 * the user does 1:1 and thus see whatever unintended and silent
 * error occur, for example model / recipe switching."
 *
 * SWEPT TODAY (each gesture fail-loud — a silent skip is itself a
 * lie for a silent-error hunt, the journey re-run's E): add card by
 * catalog label, Serving-family model switch (+ ghost census),
 * recipe SELECT + blank round-trip, drill teardown.
 * NOT SWEPT YET (owed, named — never claimed): variant/quant knob
 * switches, attach/detach of file inputs, re-switch after attach,
 * and RUNS (runs start at the user's press by the estate law; an
 * in-run silent-error rider is its own later opt-in).
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

/** Open the cards bench (the Melite Bench tab is the bench face). */
async function openBench(page: Page): Promise<void> {
  await page.getByText('Melite Bench', { exact: true }).first().click({ timeout: 30_000 })
  await expect
    .poll(async () => (await page.locator('body').innerText()).includes('Add'), { timeout: 30_000 })
    .toBe(true)
}

/** The DERIVED roster, read in the page's own context (the page's
 * fetch carries the lane's auth — never a second client). Cards
 * from /v1/forms; labels per card from /v1/model-catalog; THE
 * SWITCHABLE MODELS from each card's own form-spec envelope (the
 * `families` array — id + DECL label + present — the menus the user
 * actually switches). The schema envelope's root dict carries NO
 * model key and the catalog's cards[].models is empty — both dead
 * ends; this read is the seat. */
async function deriveRoster(page: Page): Promise<Array<{
  card: string
  label: string
  models: Array<{ id: string, label: string }>
  recipes: string[]
}>> {
  return await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, unknown>
    const catalog = await (await fetch('/v1/model-catalog')).json() as {
      cards?: Record<string, { label?: string, models?: string[] }>
    }
    const families = Object.keys(forms)
    const out: Array<{ card: string, label: string, models: Array<{ id: string, label: string }>, recipes: string[] }> = []
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
      let models: Array<{ id: string, label: string }> = []
      try {
        const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(card))).json() as {
          families?: Array<{ id?: unknown, label?: unknown, present?: unknown }>
        }
        if (Array.isArray(spec.families)) {
          models = spec.families
            .filter((f) => typeof f?.id === 'string' && f.id !== '' && f.present !== false)
            .map((f) => ({ id: f.id as string, label: typeof f.label === 'string' && f.label !== '' ? f.label : f.id as string }))
        }
      } catch { /* a card with no served envelope keeps an empty model axis — the sweep still walks its add */ }
      out.push({ card, label, models, recipes: [] })
    }
    return out
  })
}

/** The ghost-knob census (assert class (c)): after a switch, every
 * rendered field key must belong to the ARRIVAL family's served
 * surface — a departed key that still renders is a ghost (the P4
 * class). Read from the open drill's pure KEY spans (the label's
 * first child — never the face-bearing control text), judged
 * against the arrival spec's own served surface: schema dict keys
 * (+ their titled faces), the served axis groups (Recipe never
 * rides), the Model rail, the Recipe pills seat (allowed only when
 * the arrival serves a stamped row — a stamp-less family renders
 * no seat), and the boarded modifier labels/param_keys. */
async function ghostKnobs(page: Page, arrivalFamily: string): Promise<string[]> {
  return await page.evaluate(async (family: string) => {
    const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    const title = (id: string): string =>
      id.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const spec = await (await fetch(`/v1/form-spec?model=${encodeURIComponent(family)}`)).json() as {
      schema?: { refs?: Record<string | number, { dict?: Record<string, number | string> }>, uid: number }
      variants?: Array<{ id?: unknown, group?: unknown, defaults?: Record<string, unknown> }>
      families?: Array<{ id?: unknown }>
      features?: { modifiers?: Array<{ label?: unknown, param_key?: unknown }> }
    }
    const root = spec.schema?.refs?.[spec.schema?.uid ?? 0]
    const dict = root?.dict ?? {}
    const allowed = new Set<string>()
    for (const key of Object.keys(dict)) { allowed.add(norm(key)); allowed.add(norm(title(key))) }
    // the served axis groups (the recipe-axis yield: Recipe never rides)
    const groups = [...new Set((spec.variants ?? []).map((v) => typeof v.group === 'string' ? v.group : ''))].filter((g) => g !== '' && g !== 'Recipe')
    for (const g of groups) { allowed.add(norm(g)); allowed.add(norm(title(g))) }
    // the Model rail (the render contract: families or groups seat it)
    if (groups.length > 0 || (spec.families ?? []).length > 0) { allowed.add('model') }
    // the Recipe pills seat — only when the arrival serves a stamped row
    const stamped = (spec.variants ?? []).some((v) =>
      v.group === 'Recipe' && Object.keys(v.defaults ?? {}).some((k) => k !== 'model'))
    if (stamped) allowed.add('recipe')
    // the boarded modifier seats (labels + bag keys + faces)
    for (const m of spec.features?.modifiers ?? []) {
      if (typeof m.label === 'string' && m.label !== '') allowed.add(norm(m.label))
      if (typeof m.param_key === 'string' && m.param_key !== '') { allowed.add(norm(m.param_key)); allowed.add(norm(title(m.param_key))) }
    }
    const keys = Array.from(document.querySelectorAll('label')).map((el) => {
      // THE PURE KEY (the atoms' own shape: the key span rides first,
      // the face-bearing control after — never the control's text)
      const first = el.firstElementChild
      const pure = (first !== null && first.tagName === 'SPAN' ? first.textContent : el.textContent)?.trim() ?? ''
      return pure
    }).filter((s) => s !== '')
    const ghosts: string[] = []
    for (const key of keys) {
      if (key.length >= 40 || key.includes(':')) continue // prose notes, never knob keys
      if (!allowed.has(norm(key))) ghosts.push(key)
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
    const combos: Array<{ model?: { id: string, label: string } }> = [{}, ...row.models.slice(0, maxCombos - 1).map((model) => ({ model }))]
    for (const combo of combos) {
      silent.length = 0
      wireFailures.length = 0
      const tag = `${row.card}${combo.model === undefined ? '' : ` :: ${combo.model.id}`}`

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
        // FAIL LOUD, never silently skip (the journey re-run's E: a
        // silent-error hunt whose own gestures no-op is a liar).
        // THE TWO SEATS (caught live 2026-11-08 — the committed
        // sweep's `if count > 0` guard skipped EVERY switch: an
        // axis card's family switch is the Model AXIS seat (the
        // Model+Variant pair's own menu, modelSwitchPatch verb), not
        // the Serving-family FIELD knob — the field renders only
        // where the model is a plain param). The user's burn rides
        // whichever seat the drill serves; a multi-family card with
        // NEITHER seat is the finding. A single-family card states
        // its face (the static seat — never a picker) and the
        // self-switch is a no-op round-trip.
        const fieldKnob = page.getByRole('button', { name: /Serving family/ }).first()
        // THE AXIS SEAT (the lane's own spelling — cards-catalog
        // e2e's family axis: the Model menu trigger, exact name)
        const axisSeat = page.getByRole('button', { name: 'Model', exact: true }).first()
        const seat = (await fieldKnob.count()) > 0 ? fieldKnob
          : (await axisSeat.count()) > 0 ? axisSeat : null
        if (seat === null) {
          expect(row.models.length, `${tag}: no model switch seat on a multi-family card (a single-family card states its static face — the sweep's roster derived ${combo.model.id} from this card's own families)`).toBe(1)
        } else {
          await seat.click({ timeout: 15_000 })
          // THE ID↔LABEL MATCH (the menus speak DECL labels — 'Krea
          // 2', 'Qwen Image Edit 2.1' — while the roster carries ids
          // — 'krea-2', 'qwen-img-edit-21'; compare separator-blind
          // against BOTH the family id and its DECL label, never a
          // substring guess. The id-only spelling went blind live
          // 2026-11-08: 'qwen-img-edit-21' never equals the served
          // 'Qwen Image Edit 2.1' — the menu spoke, the matcher was
          // deaf, and the switch failed loud on a present family.)
          const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')
          const wants = [norm(combo.model.id), norm(combo.model.label)]
          const items = page.getByRole('menuitem')
          const count = await items.count()
          expect(count, `${tag}: the model menu opens with rows (the seat that never opens is a silent drop)`).toBeGreaterThan(0)
          let picked = -1
          for (let i = 0; i < count; i++) {
            const text = norm((await items.nth(i).textContent())?.trim() ?? '')
            if (wants.some((w) => text === w || text.startsWith(w))) { picked = i; break }
          }
          expect(picked, `${tag}: the arrival family ${combo.model.id} is on the menu (roster derived it from this card's own served families)`).toBeGreaterThan(-1)
          const arrivalLabel = (await items.nth(picked).textContent())?.trim() ?? ''
          await items.nth(picked).click({ timeout: 15_000 })
          // THE ARRIVAL WINDOW: the fence lifts with the settle —
          // wait past it, then judge the rendered set
          await page.waitForTimeout(3_000)
          // THE FACE CARRIES THE ARRIVAL (a switch the face does not
          // show is the recipe-drop's own class — a silent drop).
          // The face speaks the DECL label — accept id or label.
          const face = (await seat.textContent())?.trim() ?? ''
          expect(wants.some((w) => norm(face).includes(w)), `${tag}: the model seat's face carries the arrival family (face ${JSON.stringify(face)}, arrival ${JSON.stringify(arrivalLabel)})`).toBe(true)
          const ghosts = await ghostKnobs(page, combo.model.id)
          expect(ghosts, `${tag}: ghost knobs after the switch (the P4 class — the UI did not follow the arrival)`).toEqual([])
        }
      }

      // THE RECIPE AXIS (the directive's verbatim example: "model /
      // recipe switching"): census AND SELECT — pick the first
      // declared row, verify the trigger's face carries it, then
      // round-trip the blank (the (k) law: the blank is a selectable
      // WRITE, the active row's departure — never a persisted key)
      const recipeSelect = page.locator('[data-recipe-select]').first()
      if ((await recipeSelect.count()) > 0) {
        // THE PRE-PICK FACE (the diagnosis anchor): what the card
        // landed with — a D12-seeded default reads its row, a blank
        // reads the '-- recipe --' write
        const preFace = (await recipeSelect.textContent())?.trim() ?? ''
        await recipeSelect.click({ timeout: 15_000 })
        await page.waitForTimeout(500)
        const menuItems = page.getByRole('menuitem')
        const count = await menuItems.count()
        expect(count, `${tag}: the recipe menu carries the blank + declared rows (the (k) law)`).toBeGreaterThan(0)
        if (count > 1) {
          // THE DECLARED PICK (2026-11-08): the menu's row 0 is the
          // blank WRITE, row 1 the first declared row — positional,
          // never a text heuristic (a hint like 'the realism recipe'
          // contains the blank's word and a text filter skips live
          // rows). The stamp-less family default renders NO row (the
          // own-stamp gate) — row 1 always stamps something real.
          const declaredRow = menuItems.nth(1)
          const rowLabel = (await declaredRow.textContent())?.trim() ?? ''
          const allRows: string[] = []
          for (let i = 0; i < count; i++) allRows.push((await menuItems.nth(i).textContent())?.trim() ?? '')
          await declaredRow.click({ timeout: 15_000 })
          await page.waitForTimeout(500)
          const face = (await recipeSelect.textContent())?.trim() ?? ''
          expect(face, `${tag}: the recipe trigger's face carries the picked row (a pick that does not land is a silent drop) — pre-pick face ${JSON.stringify(preFace)}, picked row ${JSON.stringify(rowLabel)}, menu rows ${JSON.stringify(allRows)}`).toContain(rowLabel)
          // THE BLANK ROUND-TRIP: reopen, pick row 0 (the blank
          // WRITE), the face returns to the '-- recipe --' write
          await recipeSelect.click({ timeout: 15_000 })
          await page.waitForTimeout(500)
          const blankRow = page.getByRole('menuitem').nth(0)
          await blankRow.click({ timeout: 15_000 })
          await page.waitForTimeout(500)
          const blankFace = (await recipeSelect.textContent())?.trim() ?? ''
          expect(blankFace, `${tag}: the blank round-trip returns the '-- recipe --' write (the departure, never a stuck row)`).toMatch(/--\s*recipe\s*--/)
        } else {
          await page.keyboard.press('Escape')
        }
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
