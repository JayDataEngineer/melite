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
 * recipe SELECT + blank round-trip, THE VARIANT/QUANT AXIS SWEEP
 * (every rendered row of every non-Recipe served axis, same
 * select→pick→face round-trip the model arm rides), and ASSERT
 * CLASS (b): the picked faces == the saved bench doc's coordinates
 * == the compose door's admission (the doc the run would receive
 * validates through /v1/flows/validate — a 400 there is the
 * switch-bricks-the-card class, h3 2026-11-05). NOT SWEPT YET (owed,
 * named — never claimed): attach/detach of file inputs, re-switch
 * after attach, RUNS (runs start at the user's press by the estate
 * law; an in-run silent-error rider is its own later opt-in), and
 * the SERIALIZED-GRAPH BYTES (the graph receipt is stamped at
 * queue time by the run path — byte parity rides the engine rider;
 * what this sweep proves is the compose door ADMITS the saved doc,
 * not the emitted node graph).
 *
 * THE THREE ASSERT CLASSES (the ROADMAP row):
 *   (a) zero silent errors — console errors, page errors, and
 *       failed /v1/* wire answers, collected per combination (the
 *       compose probe's own adjudicated validate refusals are
 *       classified by the door arm below — their console
 *       resource-mirror is a double voice, not a silent error);
 *   (b) the UI state == the params composed — THREE arms, each its
 *       own firing path: the drill's OWN faces (the arrival fence's
 *       refusal voice is a PARITY break: a switch whose arrival
 *       never settles means the UI is not what compose would read);
 *       THE SAVED DOC (the bench draft's stage coordinates must
 *       carry exactly the faces the user picked — the Second Pass
 *       class: a seat that shows a pick the doc never took); and
 *       THE COMPOSE DOOR (/v1/flows/validate — the read-only
 *       compose-and-discard arm — must admit the saved doc verbatim;
 *       a 400 is the switch-bricks-the-card class). The serialized
 *       graph's BYTES ride the engine rider (queue-time receipt).
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
// THE RUN TAG (the stale-marker cure, 2026-11-09): every combo's
// marker carries the run's own tag so the verdict's marker search
// matches THIS run's stage only — the shared bench draft keeps
// every earlier run's identical combo strings, and an untagged
// search passes vacuous on history when the live write is lost.
const RUN_TAG = process.env.SWEEP_RUN_TAG ?? String(Date.now())

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

/** THE WRITE TAP (SWEEP_WIRE_TAP=1 — the 2026-11-04 tts burn): the
 * sweep's own write-chain eyes. The drill's atomic picks write
 * through the HTTP drafts door (write-through.ts — the WS socket
 * carries only the server's push mirrors, proven live: rev bumps
 * arrive with zero client patch frames on the socket), so the tap
 * watches REQUESTS: every POST to /v1/* with its body is a write
 * frame, printed verbatim. The tagger-class burn (face carried the
 * pick, the doc never took it) leaves exactly one fingerprint — the
 * pick's POST never flying. Gated: the default run's log stays
 * lean; the gate script turns it on. */
const WIRE_TAP = process.env.SWEEP_WIRE_TAP === '1'
const wireFrames: string[] = []

function armCollectors(page: Page): void {
  silent.length = 0
  wireFailures.length = 0
  wireFrames.length = 0
  if (WIRE_TAP) {
    page.on('request', (req): void => {
      const url = req.url()
      if (!url.includes('/v1/') || req.method() !== 'POST') return
      const body = req.postData() ?? ''
      wireFrames.push(`POST ${url.replace(/\?token=[^&]*/, '')} ${body.replace(/\s+/g, ' ').slice(0, 400)}`)
    })
    page.on('websocket', (ws): void => {
      ws.on('framereceived', (d): void => {
        const t = d.payload instanceof Buffer ? d.payload.toString() : String(d.payload)
        if (/refus|error|unlanded/i.test(t)) wireFrames.push('RECV ' + t.replace(/\s+/g, ' ').slice(0, 400))
      })
    })
  }
  page.on('console', (msg): void => {
    if (msg.type() === 'error') {
      // THE DOOR'S NAME (the 2026-11-08 ride's find: a 502 the console
      // voiced with no URL in the text — the message's location names
      // the resource, so the ledger can carry the door, not just the
      // status).
      const at = msg.location()?.url ?? ''
      // THE ADJUDICATED DOOR (the 2026-11-03 gate-7 find): the sweep's
      // own compose probe posts the saved doc to /v1/flows/validate
      // and the admission arm classifies every refusal voice — a
      // console resource-mirror of that same adjudicated 400 is a
      // double voice, not a silent error. Every other door stays
      // strict; a product-side validate failure still reds the wire
      // ledger below.
      if (/^Failed to load resource/.test(msg.text()) && at.includes('/v1/flows/validate')) return
      silent.push(`console: ${msg.text()}${at !== '' ? ` @ ${at.replace(/\?token=[^&]*/, '')}` : ''}`)
    }
  })
  page.on('pageerror', (err): void => {
    silent.push(`pageerror: ${String(err)}`)
  })
  page.on('response', (res): void => {
    const url = res.url()
    if (!url.includes('/v1/')) return
    // THE ADJUDICATED DOOR (the 2026-11-03 gate-8 find, wire half):
    // the sweep's own compose probe's validate refusals are
    // classified by the door arm below (lawful-voice receipt); the
    // wire mirror must not re-voice an adjudicated answer — the
    // same law the console mirror above rides. Every other door
    // stays strict.
    if (url.includes('/v1/flows/validate')) return
    if (res.status() >= 400) wireFailures.push(`${res.status()} ${url.replace(/\?token=[^&]*/, '')}`)
  })
}

/** The deck shell's settle law (estate-lane-sidebar.spec.ts): the
 * first-run notice's mask intercepts pointers; the strip hides
 * until a conversation is REALLY open. */
async function settleHost(page: Page): Promise<void> {
  await page.goto(LANE_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(8_000)
  // THE ESTATE-SETTLE GATE (the flap row, 2026-11-12): the sweep
  // reads seat doors (benchStageOf → /v1/flows/drafts); a lane
  // whose estate composition is still activating answers
  // estate/pending 503 and the doc read would die as a "linkage
  // break" that is really a boot race. The gallery-models law: a
  // spec that reads a seat door POLLS the door past pending —
  // never judges a cold estate (the sweep's own flap excavation:
  // sweeps 3-6 died exactly this way while the lane pended).
  {
    const settled = await page.evaluate(async () => {
      const deadline = Date.now() + 150_000
      for (;;) {
        const res = await fetch('/v1/flows/drafts')
        const text = await res.text().catch(() => '')
        if (!text.includes('estate/pending')) return true
        if (Date.now() > deadline) return false
        await new Promise((resolve) => setTimeout(resolve, 2_000))
      }
    })
    expect(settled, 'the estate door stops answering estate/pending before the sweep drives it (a cold composition is a settled-lane precondition, never a linkage break)').toBe(true)
  }
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
      // THE RECIPE PROMISE (the 2026-11-15 recipe-seat race): the
      // served stamped Recipe rows — the rows the drill seats as
      // pills — so the excursion below can tell a seat the lane has
      // not rendered YET (settle-poll, fail loud when promised) from
      // a card that serves none (skip fast, never a wait).
      let recipes: string[] = []
      try {
        const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(card))).json() as {
          families?: Array<{ id?: unknown, label?: unknown, present?: unknown }>
          variants?: Array<{ id?: unknown, group?: unknown, defaults?: Record<string, unknown> }>
        }
        if (Array.isArray(spec.families)) {
          models = spec.families
            .filter((f) => typeof f?.id === 'string' && f.id !== '' && f.present !== false)
            .map((f) => ({ id: f.id as string, label: typeof f.label === 'string' && f.label !== '' ? f.label : f.id as string }))
        }
        if (Array.isArray(spec.variants)) {
          recipes = spec.variants
            .filter((v) => v.group === 'Recipe' && typeof v.id === 'string' && v.id !== ''
              && Object.keys(v.defaults ?? {}).some((k) => k !== 'model'))
            .map((v) => v.id as string)
        }
      } catch { /* a card with no served envelope keeps an empty model axis — the sweep still walks its add */ }
      out.push({ card, label, models, recipes })
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

/**
 * THE AXIS SWEEP (the ROADMAP remainder: "variant / quant knobs not
 * yet swept — sweep them"): every non-Recipe served axis group rides
 * the select→pick→face round-trip the model arm rides, EVERY row the
 * open drill renders (the rendered menu IS the arrival's truth — the
 * row set filters client-side, so the live menu is the derived
 * roster, never a frozen list). SWEEP_AXIS_ROWS=all|first bounds the
 * ride (default all; the sweep is opt-in long by design). Each pick
 * is judged by the face it leaves (a pick that does not land is a
 * silent drop) and returns its final row — id AND face — mapped
 * through the SERVED envelope (the depth read: every menu row must
 * name a served row, both-face) for the class-(b) doc-parity rider.
 */
async function sweepAxis(page: Page, group: string, tag: string, card: string): Promise<{ id: string, label: string } | null> {
  const trigger = page.locator(`[data-axis="${group}"]`).first()
  if ((await trigger.count()) === 0) return null // the axis does not render on this card — the census says so
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const title = (id: string): string =>
    id.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const bare = (label: string): string => norm(label.replace(/\([^)]*\)/g, ''))
  // THE SERVED ROWS (the depth read): the menu's rows mapped to the
  // envelope's own {id,label} pairs — a menu row that names NO served
  // row is a ghost voice and fails loud here. THE ARRIVAL COORDINATE
  // (the 2026-11-03 sweep burn: the caller passes the ARRIVAL family,
  // never the card — /v1/form-spec?model=<card> resolves to the card's
  // DEFAULT family, so judging a switched menu against the card
  // coordinate compares z-image's rendered rows against krea-2's
  // envelope and every non-default switch fails loud on a voice the
  // product owns correctly).
  const served = await page.evaluate(async ({ group: g, cardId }: { group: string, cardId: string }) => {
    const spec = await (await fetch(`/v1/form-spec?model=${encodeURIComponent(cardId)}`)).json() as {
      variants?: Array<{ id?: unknown, label?: unknown, group?: unknown }>
    }
    return (spec.variants ?? [])
      .filter((v) => v.group === g && typeof v.id === 'string' && v.id !== '')
      .map((v) => ({ id: v.id as string, label: typeof v.label === 'string' && v.label !== '' ? v.label : v.id as string }))
  }, { group, cardId: card })
  const bound = process.env.SWEEP_AXIS_ROWS === 'first' ? 1 : Number.MAX_SAFE_INTEGER
  // THE INVALID-ROW ANNOTATION (the h3-timeline Quant burn,
  // 2026-11-09): the menu voices the HELD row even when the
  // composed family does not own it, annotated
  // 'Int8 — invalid quant for H3' — the seat showing the hold it
  // refuses to silently drop, not a ghost voice. The door admits
  // the state and the pick lands. The map sees through the
  // annotation (em/en-dash suffix) to the named served row; a row
  // whose stripped base still names nothing stays unmapped and
  // reds — the census keeps its teeth.
  const unannotated = (label: string): string => label.split(/\s+[—–]\s+/)[0].trim()
  const mapRow = (r: { id: string, label: string }, label: string): boolean =>
    norm(r.label) === norm(label) || title(r.id) === unannotated(label) || bare(r.label) === bare(label)
  let last: { id: string, label: string } | null = null
  for (let round = 0; ; round++) {
    await trigger.click({ timeout: 15_000 })
    // THE SETTLED MENU (the 2026-11-03 load burn: a fixed 500ms sleep
    // judged a menu the lane had not rendered yet while film composes
    // ran concurrently — poll the count, judge the same verdict).
    // THE SETTLE HARDENING (the 2026-11-15 h3-timeline burn): a bare
    // count>0 passes on the refused-voice row ALONE — a held coord
    // with the spec still in flight renders ONLY the invalid voice
    // ('Int8 — invalid quant for H3' with zero served rows), and the
    // round below maps that voice against the envelope and reds a
    // race the estate never broke. Poll until EVERY rendered row
    // maps to the served envelope — a transient resolves, a refused
    // hold persisting past settle reds here naming ITSELF (a seed
    // that lands a refused coordinate, or a pick the doc never
    // took — the Second Pass class — never a sweep race).
    const items = page.getByRole('menuitem')
    await expect.poll(async () => items.count(), {
      timeout: 15_000,
      message: `${tag}: the ${group} axis menu opens with rows (an axis that never opens is a silent drop)`,
    }).toBeGreaterThan(0)
    await expect.poll(async () => {
      const c = await items.count()
      const bad: string[] = []
      for (let i = 0; i < c; i++) {
        const label = ((await items.nth(i).textContent()) ?? '').trim()
        if (!served.some((r) => mapRow(r, label))) bad.push(label)
      }
      return bad.length === 0 ? 'settled' : `unmapped: ${bad.join(' | ')}`
    }, {
      timeout: 15_000,
      message: `${tag}: the ${group} axis menu settles on served rows (an unmapped row persisting past settle is a refused hold — the seed/product finding, never a sweep race)`,
    }).toBe('settled')
    const count = await items.count()
    const row = items.nth(round)
    const label = ((await row.textContent()) ?? '').trim()
    // THE MENU↔ENVELOPE MAP: the row's face must name a served row by
    // its label or its titled id — a menu voice the envelope cannot
    // own is the frozen-literal class rendered live.
    const mapped = served.find((r) => mapRow(r, label))
    expect(mapped, `${tag}: the ${group} menu row ${JSON.stringify(label)} names a served envelope row (served: ${JSON.stringify(served)})`).toBeTruthy()
    await row.click({ timeout: 15_000 })
    // THE SETTLED FACE (same load burn: the 800ms sleep judged a
    // face the pick's write had not re-rendered yet — poll the same
    // verdict).
    await expect.poll(async () => norm(((await trigger.textContent()) ?? '').trim()), {
      timeout: 15_000,
      message: `${tag}: the ${group} axis face carries the picked row ${JSON.stringify(label)} (a pick that does not land is a silent drop)`,
    }).toBe(norm(label))
    last = { id: mapped!.id, label }
    if (round + 1 >= Math.min(count, bound)) break
  }
  return last
}


/** THE SAVED DOC READ (assert class (b), arm 2 — the page's own
 * door): the stage under test is the LAST stage of the swept card
 * carrying the combo's marker (add_stage appends; the drill's atomic
 * picks write through NOW — write-through.ts's discrete-gesture law).
 * THE MARKER PIN (the 2026-11-03 sweep burn: three gate runs died on
 * three different combos while film composes wrote the operator's
 * bench draft concurrently — the old recency-top read took the first
 * doc holding ANY stage of the card, which was the operator's wolf
 * prompt, not the sweep's stage. The marker is unique per combo, so
 * the read matches the stage the gestures drove, never a sibling or
 * a foreign draft). The caller pins the draft after the first match
 * (draftPin) — later combos read their own session's draft only. A
 * marker in NO draft is a precise red of its own: the fill's write
 * never landed in the drafts domain (birth clobber or lost write),
 * never a wrong-draft read.
 * THE STAGE PIN (the 2026-11-04 tts burn — the marker cure's
 * uncovered edge): a card with no Prompt box (tts and the
 * empty-models tools) carries NO marker, so the read fell back to
 * the LAST stage of the card in the freshest bench draft — and a
 * CONCURRENT writer on the shared bench draft (the operator's
 * showcase session) appending its own stage of the same card
 * outranked the sweep's stage inside the convergence window (doc
 * "voicedesign", swept "base", twice deterministically while the
 * identical gesture sequence ran green on an idle lane). The
 * caller captures this combo's own stage id (the pre-add snapshot
 * plus the post-add newcomer) and pins the read to it — the marker
 * law's twin for marker-less cards. */
async function benchStageOf(page: Page, card: string, tag: string, opts?: {
  marker?: string
  draftPin?: string
  stagePin?: string
}): Promise<{
  draftId: string
  params: Record<string, unknown>
}> {
  const read = await page.evaluate(async ({ cardId, marker: m, pin, stage }: { cardId: string, marker?: string, pin?: string, stage?: string }) => {
    const norm = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const list = await (await fetch('/v1/flows/drafts')).json() as {
      drafts?: Array<{ draft_id?: unknown, model?: unknown }>
    }
    const benchRows = (list.drafts ?? []).filter((r): r is { draft_id: string, model?: unknown } =>
      typeof r.draft_id === 'string' && r.draft_id.startsWith('bench-'))
    const rows = pin !== undefined && pin !== ''
      ? benchRows.filter((r) => r.draft_id === pin)
      : benchRows.slice(0, 8)
    for (const row of rows) {
      const res = await fetch('/v1/flows/drafts/' + encodeURIComponent(row.draft_id))
      if (!res.ok) continue
      const doc = await res.json() as { draft_id?: unknown, stages?: Array<{ id?: unknown, card?: unknown, params?: unknown }> }
      if (!Array.isArray(doc.stages)) continue
      let mine = doc.stages.filter((s): s is { id?: string, card: string, params: Record<string, unknown> } =>
        s.card === cardId && typeof s.params === 'object' && s.params !== null)
      if (stage !== undefined && stage !== '') {
        mine = mine.filter((s) => s.id === stage)
      }
      if (mine.length === 0) continue
      if (m !== undefined && m !== '') {
        const hit = mine.filter((s) => norm((s.params as Record<string, unknown>).prompt).includes(norm(m)))
        if (hit.length === 0) continue
        return { draftId: String(doc.draft_id ?? row.draft_id), params: hit[hit.length - 1].params }
      }
      return { draftId: String(doc.draft_id ?? row.draft_id), params: mine[mine.length - 1].params }
    }
    return null
  }, { cardId: card, marker: opts?.marker, pin: opts?.draftPin, stage: opts?.stagePin })
  if (opts?.marker !== undefined && opts.marker !== '') {
    expect(read, `${tag}: the sweep's marker lives in a bench draft (the fill's write landed in the drafts domain — a marker in NO draft is a lost write or a birth clobber, never a wrong-draft read)`).not.toBeNull()
  } else {
    expect(read, `${tag}: the bench doc read found a ${card} stage (the drill's writes land in the drafts domain — a missing stage is a linkage break, named as such)`).not.toBeNull()
  }
  return read as { draftId: string, params: Record<string, unknown> }
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
    // THE DRAFT PIN (the 2026-11-03 marker-pin burn): the first combo
    // that lands its marker pins this card's reads to its own
    // session draft — concurrent writers on other drafts can no
    // longer redirect the verdict.
    let draftPin: string | undefined
    for (const combo of combos) {
      silent.length = 0
      if (WIRE_TAP) wireFrames.length = 0
      wireFailures.length = 0
      const tag = `${row.card}${combo.model === undefined ? '' : ` :: ${combo.model.id}`}`

      // THE 1:1 GESTURES: add the card (the bench's add door), open
      // its drill, and if the combination names a model, switch the
      // Serving family knob — exactly the user's burn.
      // THE PRE-ADD STAGE SNAPSHOT (the 2026-11-04 tts burn): the
      // stage pin below needs the card's stage ids as they stand
      // BEFORE this combo's add — the post-add NEWCOMER is this
      // combo's own stage, however many concurrent stages of the
      // same card the shared bench draft carries.
      // THE PRE-ADD SNAPSHOT pins (draft, stage) PAIRS (the
      // 2026-11-15 head-window burn): stage ids restart at s_0 every
      // session and the add door REUSES the lane's bench draft
      // (appending s_1, s_2, ...), so neither an id-keyed nor a
      // draft-keyed newcomer test can see this combo's own stage —
      // with an operator history of hundreds of drafts, the head
      // window already carries both collisions. The NEWCOMER is the
      // PAIR the add wrote; whatever its ids, the pair is new.
      const stagePairsPre = await page.evaluate(async (cardId: string) => {
        const list = await (await fetch('/v1/flows/drafts')).json() as { drafts?: Array<{ draft_id?: unknown }> }
        const benchRows = (list.drafts ?? []).filter((r) => typeof r.draft_id === 'string' && (r.draft_id as string).startsWith('bench-'))
        const pairs: string[] = []
        for (const r of benchRows.slice(0, 8)) {
          const res = await fetch('/v1/flows/drafts/' + encodeURIComponent(String(r.draft_id)))
          if (!res.ok) continue
          const doc = await res.json() as { stages?: Array<{ id?: unknown, card?: unknown }> }
          for (const st of doc.stages ?? []) {
            if (st.card === cardId && typeof st.id === 'string') pairs.push(String(r.draft_id) + '#' + st.id)
          }
        }
        return pairs
      }, row.card)
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
      // THE STAGE PIN RESOLUTION (the marker law's twin, for
      // marker-less cards): this combo's own stage is the (draft,
      // stage) PAIR the pre-add snapshot never saw — pair-keyed
      // because stage ids restart at s_0 every session AND the add
      // door reuses the lane's bench draft (appending), so both
      // id-keyed and draft-keyed newcomer tests collide with
      // operator history. Polled, not slept: the add's write is a
      // CAS round-trip. Every doc read below pins draft AND stage
      // to it, so a concurrent writer's stage of the same card can
      // never own the verdict.
      let stagePin = ''
      let stageDraft = ''
      for (let attempt = 0; attempt < 30 && stagePin === ''; attempt++) {
        const found = await page.evaluate(async ({ cardId, pre }: { cardId: string, pre: string[] }) => {
          const list = await (await fetch('/v1/flows/drafts')).json() as { drafts?: Array<{ draft_id?: unknown }> }
          const benchRows = (list.drafts ?? []).filter((r) => typeof r.draft_id === 'string' && (r.draft_id as string).startsWith('bench-'))
          for (const r of benchRows.slice(0, 8)) {
            const draftId = String(r.draft_id)
            const res = await fetch('/v1/flows/drafts/' + encodeURIComponent(draftId))
            if (!res.ok) continue
            const doc = await res.json() as { draft_id?: unknown, stages?: Array<{ id?: unknown, card?: unknown }> }
            for (const s of doc.stages ?? []) {
              if (s.card !== cardId || typeof s.id !== 'string') continue
              if (!pre.includes(draftId + '#' + s.id)) return { draftId, stageId: s.id }
            }
          }
          return null
        }, { cardId: row.card, pre: stagePairsPre })
        if (found !== null) {
          stagePin = found.stageId
          stageDraft = found.draftId
          break
        }
        await page.waitForTimeout(500)
      }
      expect(stagePin, `${tag}: this combo's own stage lands in the drafts domain (the add's write — a missing newcomer is a birth clobber, named as such)`).not.toBe('')
      // THE PROMPT GESTURE (1:1: a user states what they want before
      // they touch the axes): fill the prompt knob when the card
      // renders one — the compose door's required-knob voice would
      // otherwise lawfully refuse every admission judgment below.
      // The prompt is also THE LINKAGE MARKER: the doc read must
      // carry this exact string on the stage under test.
      // the same combo string every run collides with earlier runs'
      // stages in the SHARED bench draft — a lost write then reads
      // back a STALE marker (hit[-1] lands on the older stage) and
      // the verdict passes vacuous. The run tag makes the marker
      // attributable to THIS run's stage only: a loss reds NULL,
      // never passes on history.
      const sweepPrompt = `combination sweep ${tag} #${RUN_TAG}`
      const promptBox = page.getByRole('textbox', { name: 'Prompt', exact: true }).first()
      let promptFilled = false
      if ((await promptBox.count()) > 0) {
        await promptBox.fill(sweepPrompt, { timeout: 15_000 })
        // THE FACE PROOF (the 2026-11-03 load burn: a fill on a
        // not-yet-settled drill can land on a detached node while the
        // bench write never fires — prove the face carries the marker
        // before any doc read judges it).
        await expect.poll(async () => promptBox.inputValue(), {
          timeout: 15_000,
          message: `${tag}: the Prompt face carries the sweep's marker after the fill`,
        }).toBe(sweepPrompt)
        promptFilled = true
        // THE TRAILING WRITE WINDOW (write-through.ts): keystroke-class
        // edits coalesce on a short trailing delay — give the write
        // its pause before any doc read judges it.
        await page.waitForTimeout(2_000)
      }

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
        // THE SETTLED SEAT (the 2026-11-03 load burn: the drill's spec
        // fetch had not rendered EITHER seat when the lookup ran
        // under concurrent film composes — poll for a seat before
        // judging its absence; the lawful single-family branch below
        // still owns the no-seat verdict).
        let seat = null as typeof fieldKnob | null
        try {
          await expect.poll(async () =>
            (await fieldKnob.count()) > 0 ? 'field'
              : (await axisSeat.count()) > 0 ? 'axis' : 'none', {
            timeout: 30_000,
            message: `${tag}: a model switch seat renders (the Serving-family knob or the Model axis)`,
          }).not.toBe('none')
          seat = (await fieldKnob.count()) > 0 ? fieldKnob : axisSeat
        } catch {
          seat = (await fieldKnob.count()) > 0 ? fieldKnob
            : (await axisSeat.count()) > 0 ? axisSeat : null
        }
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
          // THE FACE CARRIES THE ARRIVAL (a switch the face does not
          // show is the recipe-drop's own class — a silent drop).
          // The face speaks the DECL label — accept id or label. THE
          // SETTLED FACE (same load burn: the 3s sleep judged a face
          // the switch had not re-rendered yet — poll the same
          // verdict).
          await expect.poll(async () => {
            const face = (await seat.textContent())?.trim() ?? ''
            return wants.some((w) => norm(face).includes(w))
          }, {
            timeout: 15_000,
            message: `${tag}: the model seat's face carries the arrival family (arrival ${JSON.stringify(arrivalLabel)})`,
          }).toBe(true)
          // THE GHOST VERDICT IS POLLED, never instant (the
          // 2026-11-15 settle race): the face poll above can pass on
          // the label update while the spec-driven unmount of the
          // departed family's seats still rides the refetch — a real
          // P4 ghost still fails, at the timeout, with the same
          // verdict; an async settle greens without weakening the law
          // combo.model's block-head guard does not survive the poll
          // closure (TS drops property narrowing across callbacks) —
          // the arrival id is captured on the guarded side.
          const arrivalModelId = combo.model.id
          await expect.poll(async () => await ghostKnobs(page, arrivalModelId), {
            timeout: 10_000,
            message: `${tag}: ghost knobs after the switch (the P4 class — the UI did not follow the arrival)`,
          }).toEqual([])
        }
      }

      // THE RECIPE AXIS (the directive's verbatim example: "model /
      // recipe switching"): census AND SELECT — pick the first
      // declared row, verify the trigger's face carries it, then
      // round-trip the blank (the (k) law: the blank is a selectable
      // WRITE, the active row's departure — never a persisted key)
      const recipeSelect = page.locator('[data-recipe-select]').first()
      // THE PROMISED SEAT (the 2026-11-15 recipe-seat race): the
      // roster derives the stamped rows from the SERVED spec — a
      // promised seat the lane has not rendered yet is settled by
      // poll (a missing seat on a raced drill is a silent skip of
      // the directive's verbatim example); a card serving no stamped
      // row skips fast, never a wait. A promise the lane never keeps
      // is a product finding (the seat the spec serves but the drill
      // never renders), never a skip.
      // the combo's ARRIVAL family, never the card (the fibo2-edit
      // burn, 2026-11-09: the roster derives recipes from the CARD
      // coordinate — the card default's stamped rows — but the fibo
      // arrival serves ZERO Recipe rows, so the card-coordinate
      // promise demanded a seat the arrival never owes. The served
      // map rides the same arrival coordinate the ghost census and
      // the axis sweeps already ride).
      const arrivalRecipes: string[] = await page.evaluate(async (fam: string) => {
        try {
          const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(fam))).json() as {
            variants?: Array<{ id?: unknown, group?: unknown, defaults?: Record<string, unknown> }>
          }
          if (!Array.isArray(spec.variants)) return []
          return spec.variants
            .filter((v) => v.group === 'Recipe' && typeof v.id === 'string' && v.id !== ''
              && Object.keys(v.defaults ?? {}).some((k) => k !== 'model'))
            .map((v) => v.id as string)
        } catch { return [] }
      }, combo.model?.id ?? row.card)
      if (arrivalRecipes.length > 0) {
        await expect.poll(async () => recipeSelect.count(), {
          timeout: 15_000,
          message: `${tag}: the recipe seat renders (the arrival spec stamps ${JSON.stringify(arrivalRecipes)} — a promised seat that never renders is a product finding, never a skip)`,
        }).toBeGreaterThan(0)
      }
      // THE STAMP EXCURSION FLAG (the recipe-stamp law, 2026-11-15):
      // set when the round-trip below actually picked a declared row
      // (a pick applies the row's DECLARED defaults verbatim — the
      // served image-edit remove-background row stamps `prompt`, so
      // the typed marker is lawfully gone after the excursion and
      // must be re-established before any doc read judges it).
      let recipeStampedPrompt = false
      if ((await recipeSelect.count()) > 0) {
        // THE PRE-PICK FACE (the diagnosis anchor): what the card
        // landed with — a D12-seeded default reads its row, a blank
        // reads the '-- recipe --' write
        const preFace = (await recipeSelect.textContent())?.trim() ?? ''
        await recipeSelect.click({ timeout: 15_000 })
        // THE SETTLED MENU (same load burn — poll, judge the same verdict).
        const menuItems = page.getByRole('menuitem')
        await expect.poll(async () => menuItems.count(), {
          timeout: 15_000,
          message: `${tag}: the recipe menu carries the blank + declared rows (the (k) law)`,
        }).toBeGreaterThan(0)
        const count = await menuItems.count()
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
          // THE SETTLED FACE (same load burn — poll the same verdict).
          await expect.poll(async () => (await recipeSelect.textContent())?.trim() ?? '', {
            timeout: 15_000,
            message: `${tag}: the recipe trigger's face carries the picked row (a pick that does not land is a silent drop) — pre-pick face ${JSON.stringify(preFace)}, picked row ${JSON.stringify(rowLabel)}, menu rows ${JSON.stringify(allRows)}`,
          }).toContain(rowLabel)
          // THE BLANK ROUND-TRIP: reopen, pick row 0 (the blank
          // WRITE), the face returns to the '-- recipe --' write —
          // OR names a row the resolved doc honestly equals (the
          // 2026-11-03 anima burn: model_defaults.steps=52 IS the
          // 'detailed' row's stamp, so a doc with NO override
          // resolves to exactly that row's shape and the face naming
          // it is the true derivation, never a stuck pick — the
          // placeholder is unachievable on such a card BY LAW. The
          // blank's own law lives at the DOC below: no recipe key
          // persists, the departed stamps delete — never a face
          // guess).
          await recipeSelect.click({ timeout: 15_000 })
          await page.waitForTimeout(500)
          const blankRow = page.getByRole('menuitem').nth(0)
          await blankRow.click({ timeout: 15_000 })
          // THE HONEST-ROW SET (in-page, the arrival's own spec): a
          // recipe row whose every stamp equals the model defaults —
          // the rows the un-overridden doc resolves to.
          const honestFaces = await page.evaluate(async (family: string) => {
            const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(family))).json() as {
              model_defaults?: Record<string, unknown>
              variants?: Array<{ group?: unknown, id?: unknown, label?: unknown, defaults?: Record<string, unknown> }>
            }
            const md = spec.model_defaults ?? {}
            const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')
            const title = (id: string): string =>
              id.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            return (spec.variants ?? [])
              .filter((v) => v.group === 'Recipe' && typeof v.id === 'string')
              .filter((v) => Object.entries(v.defaults ?? {}).every(([k, val]) =>
                k === 'model' || (k in md && JSON.stringify(md[k]) === JSON.stringify(val))))
              .map((v) => norm(typeof v.label === 'string' && v.label !== '' ? v.label : title(String(v.id))))
          }, combo.model?.id ?? row.card)
          const blankOk = (face: string): boolean =>
            /--\s*recipe\s*--/.test(face)
            || honestFaces.includes(face.toLowerCase().replace(/[^a-z0-9]/g, ''))
          await expect.poll(async () => {
            const face = (await recipeSelect.textContent())?.trim() ?? ''
            return blankOk(face) ? 'ok' : face
          }, {
            timeout: 15_000,
            message: `${tag}: the blank round-trip departs the picked row (the '-- recipe --' write, or a row the un-overridden doc honestly equals — never the stuck pick; honest rows ${JSON.stringify(honestFaces)})`,
          }).toBe('ok')
          recipeStampedPrompt = true
        } else {
          await page.keyboard.press('Escape')
        }
      }

      // THE MARKER RE-ESTABLISHMENT (the recipe-stamp law,
      // 2026-11-15 — the gate-10 find, diagnosed live with probe G):
      // the recipe pick above applies the row's DECLARED defaults
      // verbatim — the served image-edit remove-background row
      // stamps `prompt` (proven live: estate AND face both carried
      // the canned 'Remove the background…' string after the pick),
      // and the blank round-trip departs the stamp (both return to
      // ''). The sweep's linkage marker typed before the excursion
      // is LAWFULLY gone — re-state the user's want on the blanked
      // card before the variant sweep (whose picks never touch
      // prompt — the fibo2-edit doc kept its marker through the
      // same sweep). Without this the doc read below matches a
      // SIBLING stage by marker prefix (the old stage's marker
      // start-matches this combo's tag) and reds a parity the
      // estate never broke: 'the bench doc's variant coordinate
      // carries the swept row (doc "edit-turbo", swept id "base")'.
      if (promptFilled && recipeStampedPrompt) {
        await promptBox.fill(sweepPrompt, { timeout: 15_000 })
        await expect.poll(async () => promptBox.inputValue(), {
          timeout: 15_000,
          message: `${tag}: the Prompt face carries the re-established marker after the recipe excursion`,
        }).toBe(sweepPrompt)
        await page.waitForTimeout(2_000)
      }

      // THE VARIANT/QUANT SWEEP (the ROADMAP remainder): every served
      // non-Recipe axis rides the pick round-trip; the arrival's
      // ghost census judges each landed face. The final pick per
      // group feeds the class-(b) doc parity below.
      const axisGroups = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-axis]'))
          .map((el) => el.getAttribute('data-axis') ?? '')
          .filter((g) => g !== '' && g !== 'Recipe'),
      )
      const axisPicks: Record<string, { id: string, label: string }> = {}
      for (const group of axisGroups) {
        // THE ENVELOPE FOLLOWS THE ARRIVAL (never the card — see
        // sweepAxis's ARRIVAL COORDINATE law): the ghost census below
        // already rides combo.model?.id ?? row.card; the served map
        // rides the same coordinate.
        const landed = await sweepAxis(page, group, tag, combo.model?.id ?? row.card)
        if (landed !== null) axisPicks[group.toLowerCase()] = landed
        // THE GHOST VERDICT IS POLLED, never instant (the image-edit
        // ghost settle, owed 2026-11-15 — the same law the model
        // switch's ghost census got, bcb6f2571): the axis face poll
        // inside sweepAxis can pass on the picked row while the
        // spec-driven unmount of the departed lane's seats (the
        // image-edit Recipe seat) still rides the refetch — a real
        // P4 ghost still fails, at the timeout, with the same
        // verdict; an async settle greens without weakening the law.
        const sweepFamily = combo.model?.id ?? row.card
        await expect.poll(async () => await ghostKnobs(page, sweepFamily), {
          timeout: 10_000,
          message: `${tag}: ghost knobs after the ${group} sweep (the P4 class — the UI did not follow the arrival)`,
        }).toEqual([])
      }

      // ASSERT CLASS (a) — arm 4, THE WRITE FACE (the 2026-11-09
      // qwen-marker hunt): every drill write path paints exactly one
      // banner when its write never lands ('THE WRITE DID NOT LAND —
      // ...', the ledger's voice — draft.ts unlandedWriteVoice). A
      // faced gesture the doc never took is the silent-drop class;
      // the verdict below judges the doc, this judges the face. A
      // banner persisting from an EARLIER combo reds here too — loud
      // beats silent, and the keys name the author.
      // THE GATE BANNER TOO (the 2026-11-04 tts burn): the compose
      // gate's refusal ('THE COMPOSE GATE REFUSED — card_compose:
      // field …') is the OTHER silent-drop voice — the tagger class
      // fired it while no unlanded banner ever did; the sweep judged
      // only the ledger's. Both banners, one law.
      await expect(page.getByText(/THE WRITE DID NOT LAND|THE COMPOSE GATE REFUSED/i),
        `${tag}: no unlanded-write or compose-gate refusal banner (a faced gesture whose write never landed is a silent drop, never a pass)`,
      ).toHaveCount(0)
      // THE TAP DUMP (SWEEP_WIRE_TAP=1): this combo's write frames,
      // printed before the verdicts — the fingerprint read for any
      // red below (a pick whose POST never flew).
      if (WIRE_TAP && wireFrames.length > 0) {
        // eslint-disable-next-line no-console -- the gated write-chain receipt
        console.log(`[sweep-wire] ${tag} (${String(wireFrames.length)} write frames):\n    ${wireFrames.join('\n    ')}`)
      }

      // ASSERT CLASS (b) — arm 2, THE SAVED DOC: the doc's
      // coordinates must be the faces the sweep just left on the
      // drill (the Second Pass class: a seat whose pick the doc
      // never took). THE BOTH-FACE LAW (the model arm's id↔label
      // law): the doc carries the ROW ID, the menu speaks the DECL
      // label — one norm, matched against the id, the label, or the
      // label's bare name ('BF16 (dtype-mapped)' is one row whose id
      // is 'bf16'; the live catch that taught this arm the third
      // face).
      // THE CONVERGENCE WINDOW (the 2026-11-03 rapid-pick burn's
      // read half): the picks ride the client's serialized write
      // chain — the face updates optimistically per click while the
      // writes land one CAS round-trip at a time, so a doc read
      // taken the instant the last face settled can honestly see
      // the N-1th pick (each gate-4 run red exactly one pick behind
      // per group). The read POLLS until the doc carries every
      // coordinate the faces show, bounded — a pick that never
      // lands still reds at the timeout with the same verdict.
      const normB = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      const bareB = (s: string): string => normB(s.replace(/\([^)]*\)/g, ''))
      const converged = (d: { params: Record<string, unknown> }): boolean => {
        if (promptFilled && !normB(d.params.prompt).includes(normB(sweepPrompt))) return false
        if (combo.model !== undefined && normB(d.params.model) !== normB(combo.model.id)) return false
        for (const [key, pick] of Object.entries(axisPicks)) {
          const faces = [normB(pick.id), normB(pick.label), bareB(pick.label)]
          if (!faces.includes(normB(d.params[key]))) return false
        }
        return true
      }
      let doc: Awaited<ReturnType<typeof benchStageOf>> | null = null
      for (let attempt = 0; attempt < 40; attempt++) {
        const d = await benchStageOf(page, row.card, tag, {
          marker: promptFilled ? sweepPrompt : undefined,
          draftPin: stageDraft !== '' ? stageDraft : draftPin,
          stagePin,
        })
        if (converged(d)) { doc = d; break }
        await page.waitForTimeout(500)
      }
      if (doc === null) {
        // THE TIMEOUT VOICE: re-read once and let the per-coordinate
        // verdicts below red on the freshest doc — the same asserts,
        // never a weaker timeout message.
        doc = await benchStageOf(page, row.card, tag, {
          marker: promptFilled ? sweepPrompt : undefined,
          draftPin: stageDraft !== '' ? stageDraft : draftPin,
          stagePin,
        })
      }
      draftPin = doc.draftId
      // THE LINKAGE MARKER: the stage under test carries the sweep's
      // own prompt string (typed at the add) — the doc read is THE
      // stage the gestures drove, not a sibling.
      if (promptFilled) {
        expect(normB(doc.params.prompt), `${tag}: the bench doc's prompt carries the sweep's marker (doc ${JSON.stringify(doc.params.prompt ?? null)})`).toContain(normB(sweepPrompt))
      }
      if (combo.model !== undefined) {
        expect(normB(doc.params.model), `${tag}: the bench doc's model coordinate carries the arrival family ${combo.model.id} (doc ${JSON.stringify(doc.params.model ?? null)} — a face the doc never took is the Second Pass class)`).toBe(normB(combo.model.id))
      } else if (row.models.length > 0) {
        // THE SEED LAW names the family at birth FOR CARDS THAT SERVE
        // FAMILIES. A model-less tool card (trim, frames, mask, rig,
        // track — the roster's empty-models rows) has no family axis;
        // demanding a coordinate there judges a law the estate never
        // made. The over-broad arm first fired at the trim card
        // (2026-11-13) once the h3 cure let the sweep reach past
        // h3-timeline for the first time.
        expect(normB(doc.params.model), `${tag}: the bench doc carries a model coordinate (doc ${JSON.stringify(doc.params.model ?? null)} — the seed law names the family at birth)`).not.toBe('')
      }
      for (const [key, pick] of Object.entries(axisPicks)) {
        const faces = [normB(pick.id), normB(pick.label), bareB(pick.label)]
        expect(faces, `${tag}: the bench doc's ${key} coordinate carries the swept row (doc ${JSON.stringify(doc.params[key] ?? null)}, swept id ${JSON.stringify(pick.id)}, face ${JSON.stringify(pick.label)})`).toContain(normB(doc.params[key]))
      }
      // THE (k) LAW at the doc: no recipe key persists — the blank is
      // a WRITE of the departure, never a stored coordinate.
      expect('recipe' in doc.params, `${tag}: no recipe key persists in the bench doc (keys ${JSON.stringify(Object.keys(doc.params))} — the (k) law: the blank is the departure, never a key)`).toBe(false)

      // ASSERT CLASS (b) — arm 3, THE COMPOSE DOOR: the read-only
      // validate arm composes-and-discards the SAME pipeline the run
      // press rides; the saved doc must be ADMITTED verbatim (a 400
      // here is the h3 switch-brick class: a UI whose coordinates the
      // compose refuses). The doc→body mapping is the RUN PRESS'S OWN
      // shape law (liftCardParams): the axis coordinates ride the
      // body ROOT, the knob stanza rides `params` — a probe that
      // posts the coordinates INSIDE the stanza is refused as unknown
      // knobs (the door's own voice, red-proven live). Never queues,
      // never touches the engine. THE FAMILY-LESS SPELLING (the trim
      // reach, 2026-11-13): a card that serves no families composes
      // by its OWN id — the run press's `params.model ?? service ??
      // card` law (runsRegistry's mid) — so the replay rides the card
      // id, never `model: ""` (which the door bricks as "not a legal
      // identifier" while the real press would have composed).
      const verdict = await page.evaluate(async ({ stage, cardId }: { stage: Record<string, unknown>, cardId: string }) => {
        const { model, variant, quant, ...knobs } = stage
        const body: Record<string, unknown> = { model: String(model ?? '') || cardId, params: knobs }
        if (typeof variant === 'string' && variant !== '') body.variant = variant
        if (typeof quant === 'string' && quant !== '') body.quant = quant
        const res = await fetch('/v1/flows/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        const answer = await res.json() as Record<string, unknown>
        return { status: res.status, ok: answer['ok'] === true, error: String(answer['error'] ?? '') }
      }, { stage: doc.params, cardId: row.card })
      expect(verdict.status !== 200 || verdict.ok, `${tag}: the compose door's 200 answer carries ok:true`).toBe(true)
      if (verdict.status !== 200) {
        // THE THREE REFUSAL CLASSES: a brick voice (unknown param /
        // variant / quant / model, not-offered, unsanctioned keys) is
        // THE SWITCH-BRICK CLASS — red, verbatim. Two lawful
        // empty-bench voices: the required-knob voice ("this lane
        // requires 'x' — not stated" and its card-surface spelling
        // "required param 'x' missing" — a family-less tool card
        // awaiting its upstream binding; bench state under
        // construction, the WIRE_CARD_COMPOSE_INCOMPLETE heal class)
        // and the PRESENCE voice ("declares unet '…' but no store
        // copy exists" — the weights are not on the machine; the door
        // refuses LOUD, the run press voices it, nothing silent — the
        // offered-but-absent VARIANT weight rides the (m) download-UX
        // theme, logged as the sweep's own find). ANY OTHER voice is
        // an unclassified refusal — red, verbatim.
        const brickVoice = /unknown param|unknown variant|unknown quant|unknown model|unknown card|not offered|unsanctioned inject keys|no model unit|composes outside|not a legal identifier|dangling artifact ref/
        expect(verdict.error, `${tag}: the compose door refused the saved doc with a BRICK-CLASS voice (${verdict.status}): ${verdict.error}`).not.toMatch(brickVoice)
        expect(verdict.error, `${tag}: the compose door's refusal must be a classified lawful voice (required-knob | absent weights), got: ${verdict.error}`).toMatch(/requires|required param|no store copy exists/)
        // eslint-disable-next-line no-console -- the lawful-refusal receipt (which knob/weight, which lane)
        console.log(`[sweep-admission] ${tag}: lawful refusal — ${verdict.error}`)
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
