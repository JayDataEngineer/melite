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
 * select→pick→face round-trip the model arm rides), THE ATTACH/
 * DETACH SWEEP ( setInputFiles a real fixture on every served
 * SLOT field — wtype image|file|mesh, derived from the served
 * envelope's own field kinds, never a hand-list — then assert the
 * three classes on the attached state, detach through the square's
 * own ✕ and assert the departure law (the doc carries no bytes —
 * absent, null, or the persisted empty; two dialects, one contract),
 * and RE-SWITCH AFTER ATTACH:
 * the Model family switch or an axis round-trip with the attachment
 * held, the doc judged against the arrival envelope's own declared
 * field set — carried when the arrival still renders the field,
 * dropped when the departure lost it), and ASSERT CLASS (b): the
 * picked faces == the saved bench doc's coordinates == the compose
 * door's admission (the doc the run would receive validates through
 * /v1/flows/validate — a 400 there is the
 * switch-bricks-the-card class, h3 2026-11-05). NOT SWEPT YET (owed,
 * named — never claimed): the IMAGE_LIST STACK CELLS (the multi-entry
 * add-cell grammar rides the same squares but writes array
 * coordinates — its own arm), the bespoke-studio-local seats bound
 * to studio state rather than served params (motion's background
 * inject, h3's per-call refs — the doc plane they write is not the
 * bench stage), RUNS (runs start at the user's press by the estate
 * law; an in-run silent-error rider is its own later opt-in), and
 * the SERIALIZED-GRAPH BYTES (the graph receipt is stamped at
 * queue time by the run path — byte parity rides the engine rider;
 * what this sweep proves is the compose door ADMITS the saved doc,
 * not the emitted node graph). Also receipted, never claimed: the
 * VARIANT-GATED slot rows (a served variant names the field — the
 * tts ref_audio class; the seat opens when that Variant is picked,
 * its own arm) and the STUDIO-LOCAL / DECL-GATED slot rows the
 * arrival census still declares (no served variant defaults name
 * them — a DECL variant-params gate or a bespoke studio's own state
 * binding; the same h3 per-call-refs class).
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
import { readFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'

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

/** THE VOICED-DEFECT LEDGER (the ledger's charter is SILENT errors —
 *  errors the UI never chose): a console error the estate's own
 *  contract-toast seat rendered ('[toast] …') is a LOUD defect the UI
 *  voiced, not a swallowed one — receipted here, never in the silent
 *  ledger, and judged at visit end by the same law as the compose
 *  door's voices: a KNOWN catalog-integrity voice receipts (the run
 *  log carries it verbatim every ride until the product cures it),
 *  an unknown voiced error reds the visit (a new defect must never
 *  pass because it is loud). */
const voiced: string[] = []
const VOICED_KNOWN = /not in the catalog/

/** Literal-escape a catalog label for RegExp matching (labels carry
 *  user-facing words — parens, dots — never regex syntax). */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** THE DOC NORMS (one home — the main sweep and the attach/detach
 *  sweep judge the same doc plane with the same id↔label law). */
const normB = (s: unknown): string => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const bareB = (s: string): string => normB(s.replace(/\([^)]*\)/g, ''))

/** THE DOOR'S VOICE CLASSES (one home): a brick voice is red,
 *  verbatim; an empty-bench lawful voice is receipted. The attach/
 *  detach sweep classifies its detach/flip admissions with the same
 *  pair — one law, two riders. The required-source voice (the mask
 *  card's "no mask sources … add at least one modifier (…)",
 *  caught live 2026-11-12) is the empty-bench class's composition-
 *  precondition spelling: the state under construction is missing a
 *  SOURCE the card composes from, the refusal names the cure — the
 *  same loud-under-construction law the required-knob voice rides,
 *  never a brick (the h3 brick class refuses a COMPLETE state). The
 *  paired-lane voice (img-to-mesh transfer-rig's "rigged_glb and
 *  target_glb are one paired transfer lane … set both … or neither",
 *  caught live 2026-11-12) is the same class for a PAIR: the sweep's
 *  per-seat attach lands one half of a two-seat lane, and the door
 *  refuses the half-state loudly with the cure — a lawful
 *  under-construction voice, not a brick. */
const BRICK_VOICE = /unknown param|unknown variant|unknown quant|unknown model|unknown card|not offered|unsanctioned inject keys|no model unit|composes outside|not a legal identifier|dangling artifact ref/
const LAWFUL_VOICE = /requires|required param|no store copy exists|add at least one |paired transfer lane|set both for the/

/** THE ATTACH FIXTURES (tests/fixtures/card-deck-sweep — the
 *  repo's sanctioned fixture home; real bytes, one per seat
 *  kind the served census can name): the image triad seat takes a
 *  real PNG; the video-hinted file seat a real MP4; the mesh wire
 *  type a real GLB (glTF 2.0 binary, one triangle — the square's
 *  inline viewport parses it); the flip arm a real WAV (the
 *  audio-file judge rides untyped kinds — fileKindRefusal's '' arm).
 *  Playwright's buffer form pins the MIME the File carries, which is
 *  what both the seat judge and the upload door read. */
const FIXTURES = {
  png: { path: 'sweep-attach.png', name: 'sweep-attach.png', mimeType: 'image/png' },
  mp4: { path: 'sweep-attach.mp4', name: 'sweep-attach.mp4', mimeType: 'video/mp4' },
  glb: { path: 'sweep-attach.glb', name: 'sweep-attach.glb', mimeType: 'model/gltf-binary' },
  wav: { path: 'sweep-attach.wav', name: 'sweep-attach.wav', mimeType: 'audio/wav' },
} as const
const fixtureBytes = (rel: string): Buffer =>
  readFileSync(new URL('../../../../tests/fixtures/card-deck-sweep/' + rel, import.meta.url))

/** THE SEAT'S OWN FIXTURE (derived, never hand-listed per family):
 *  the field's served wtype + media hint name the bytes — image
 *  seats take the PNG, video-hinted seats the MP4, audio-hinted
 *  seats the WAV, mesh seats the GLB, everything else (an unhinted
 *  file seat takes the library) the PNG. THE SERVED LABEL IS A HINT
 *  TOO (the motion ride, 2026-11-12): preview_glb serves as
 *  wtype 'file' + media null, and the studio's own judge refuses a
 *  non-GLB with a loud toast — so when the SERVED LABEL names a
 *  model format, the seat takes the GLB. Derivation stays on the
 *  served plane: the label is the spec's own voice next to the
 *  field, never a hand-listed card name. THE RUN-STAMPED NAME (the
 *  birth-carry probe, 2026-11-12): the add door seeds a NEW stage
 *  with a PRIOR stage's params — a bench history that already holds
 *  `data/input/sweep-attach.png` from an earlier ride would arm the
 *  doc law VACUOUSLY on a stage born carrying it, so the upload name
 *  (and the estate path it mints) is unique per run. The data-URL
 *  side carries the same uniqueness by LENGTH: the law demands the
 *  exact prefix + base64 length of THIS run's bytes, never any data
 *  URL. */
const MODEL_LABEL = /\bglb\b|\bgltf\b|\bmesh\b|\bmodel\b|\bcharacter\b/i
function fixtureFor(slot: { label: string, wtype: string, media: string | null }, pick?: { path: string, name: string, mimeType: string }): { name: string, mimeType: string, buffer: Buffer, dataUrlPrefix: string, dataUrlLen: number } {
  const chosen = pick ?? (slot.wtype === 'mesh' ? FIXTURES.glb
    : slot.wtype === 'file' && slot.media === 'video' ? FIXTURES.mp4
      : slot.wtype === 'file' && slot.media === 'audio' ? FIXTURES.wav
        : MODEL_LABEL.test(slot.label) ? FIXTURES.glb
          : FIXTURES.png)
  const buffer = fixtureBytes(chosen.path)
  const stamp = chosen.name.replace(/(\.[a-z0-9]+)$/i, `-stamp-${RUN_TAG}$1`)
  return {
    name: stamp,
    mimeType: chosen.mimeType,
    buffer,
    dataUrlPrefix: 'data:' + chosen.mimeType + ';base64,',
    dataUrlLen: ('data:' + chosen.mimeType + ';base64,').length + buffer.toString('base64').length,
  }
}

/** THE GRAMMAR'S CARRY LAW (one home — attach, detach and re-switch
 *  judge the SAME predicate): the estate-path coordinate carries
 *  when the doc holds the upload door's exact RUN-STAMPED path; the
 *  data-URL coordinate carries when the doc holds a data URL with
 *  THIS run's own prefix and encoded length — a stale base64 blob
 *  from a birth-carried prior stage is as much a false carry as an
 *  empty seat (and a bare `data:` probe cannot tell blobs apart). */
function carryLaw(grammar: 'estate-path' | 'data-url', slotName: string, fixture: { name: string, dataUrlPrefix: string, dataUrlLen: number }): (params: Record<string, unknown>) => boolean {
  return grammar === 'estate-path'
    ? (p: Record<string, unknown>) => p[slotName] === 'data/input/' + fixture.name
    : (p: Record<string, unknown>) => {
      const v = p[slotName]
      return typeof v === 'string' && v.startsWith(fixture.dataUrlPrefix) && v.length === fixture.dataUrlLen
    }
}

/** A served slot field (the walker's inputs face — one row of the
 *  derived file-input census). */
interface SlotFace {
  name: string
  label: string
  wtype: string
  media: string | null
  /** the DECL's own family scoping, verbatim (null = served on every
   *  family of the card) — the re-switch arm reads the ARRIVAL
   *  envelope's declared set against it. */
  families: string[] | null
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
  voiced.length = 0
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
      // THE VOICED DEFECT (the motion probe, 2026-11-12): the estate's
      // contract-toast seat mirrors its own loud voice into the
      // console with a '[toast]' prefix — a defect the UI CHOSE to
      // surface is the voiced ledger's entry, never the silent one.
      if (msg.text().startsWith('[toast]')) {
        voiced.push(msg.text())
        return
      }
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
  /** THE INPUTS FACE (the walker's row model): the served
   *  envelope's own SLOT fields (wtype image|file|mesh, hidden rows
   *  skipped) — the file-input census the attach/detach sweep rides.
   *  Derived from the same fetch the roster already paid, never a
   *  hand-list; a family that gains a file input joins on the next
   *  run. Family-scoped rows keep their scoping verbatim. */
  slots: SlotFace[]
}>> {
  return await page.evaluate(async () => {
    const forms = await (await fetch('/v1/forms')).json() as Record<string, unknown>
    const catalog = await (await fetch('/v1/model-catalog')).json() as {
      cards?: Record<string, { label?: string, models?: string[] }>
    }
    const families = Object.keys(forms)
    const out: Array<{ card: string, label: string, models: Array<{ id: string, label: string }>, recipes: string[], slots: Array<{ name: string, label: string, wtype: string, media: string | null, families: string[] | null }> }> = []
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
      // THE INPUTS FACE: the envelope's root dict walked for SLOT
      // wire types — the same meta.extra.wtype read every renderer
      // face narrows through, never a second vocabulary.
      let slots: Array<{ name: string, label: string, wtype: string, media: string | null, families: string[] | null }> = []
      try {
        const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(card))).json() as {
          families?: Array<{ id?: unknown, label?: unknown, present?: unknown }>
          variants?: Array<{ id?: unknown, group?: unknown, defaults?: Record<string, unknown> }>
          schema?: { refs?: Record<string | number, { dict?: Record<string, number | string>, meta?: Record<string, unknown>, type?: unknown }>, uid: number }
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
        const env = spec.schema
        const root = env?.refs?.[env?.uid ?? -1]
        if (root !== undefined && root.dict !== undefined) {
          for (const [name, id] of Object.entries(root.dict)) {
            const node = env?.refs?.[id]
            if (node === undefined) continue
            const meta = (node.meta ?? {}) as Record<string, unknown>
            const extra = (typeof meta['extra'] === 'object' && meta['extra'] !== null ? meta['extra'] : {}) as Record<string, unknown>
            const wtype = typeof extra['wtype'] === 'string' ? extra['wtype'] : ''
            if (wtype !== 'image' && wtype !== 'file' && wtype !== 'mesh') continue
            if (extra['hidden'] === true) continue
            slots.push({
              name,
              label: typeof meta['description'] === 'string' && meta['description'] !== '' ? meta['description'] as string : name,
              wtype,
              media: typeof extra['media'] === 'string' ? extra['media'] as string : null,
              families: Array.isArray(extra['families'])
                ? (extra['families'] as unknown[]).filter((f): f is string => typeof f === 'string')
                : null,
            })
          }
        }
      } catch { /* a card with no served envelope keeps an empty model axis — the sweep still walks its add */ }
      out.push({ card, label, models, recipes, slots })
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
async function sweepAxis(page: Page, group: string, tag: string, card: string, opts?: {
  /** ride at most this many rendered rows (the re-switch arm rides
   *  ONE round-trip; the env bound stays the default for sweeps) */
  maxRows?: number
}): Promise<{ id: string, label: string } | null> {
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
  const bound = opts?.maxRows ?? (process.env.SWEEP_AXIS_ROWS === 'first' ? 1 : Number.MAX_SAFE_INTEGER)
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

/** THE MODEL-SWITCH GESTURE (one home — the main sweep's per-combo
 *  arrival and the attach/detach sweep's re-switch-after-attach ride
 *  the same law). FAIL LOUD, never silently skip (the journey
 *  re-run's E: a silent-error hunt whose own gestures no-op is a
 *  liar). THE TWO SEATS (caught live 2026-11-08 — the committed
 *  sweep's `if count > 0` guard skipped EVERY switch: an axis card's
 *  family switch is the Model AXIS seat (the Model+Variant pair's
 *  own menu, modelSwitchPatch verb), not the Serving-family FIELD
 *  knob — the field renders only where the model is a plain param).
 *  The user's burn rides whichever seat the drill serves; a
 *  multi-family card with NEITHER seat is the finding. A
 *  single-family card states its face (the static seat — never a
 *  picker) and the self-switch is a no-op round-trip.
 * @param familiesServed the roster's derived family count for the
 *  card (the no-seat verdict is lawful exactly when it is 1). */
async function switchModelSeat(page: Page, tag: string, want: { id: string, label: string }, familiesServed: number): Promise<void> {
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
    expect(familiesServed, `${tag}: no model switch seat on a multi-family card (a single-family card states its static face — the sweep's roster derived ${want.id} from this card's own families)`).toBe(1)
    return
  }
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
  const wants = [norm(want.id), norm(want.label)]
  const items = page.getByRole('menuitem')
  const count = await items.count()
  expect(count, `${tag}: the model menu opens with rows (the seat that never opens is a silent drop)`).toBeGreaterThan(0)
  let picked = -1
  for (let i = 0; i < count; i++) {
    const text = norm((await items.nth(i).textContent())?.trim() ?? '')
    if (wants.some((w) => text === w || text.startsWith(w))) { picked = i; break }
  }
  expect(picked, `${tag}: the arrival family ${want.id} is on the menu (roster derived it from this card's own served families)`).toBeGreaterThan(-1)
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
  // verdict; an async settle greens without weakening the law.
  await expect.poll(async () => await ghostKnobs(page, want.id), {
    timeout: 10_000,
    message: `${tag}: ghost knobs after the switch (the P4 class — the UI did not follow the arrival)`,
  }).toEqual([])
}

/** THE COMPOSE-DOOR VERDICT (one home — assert class (b), arm 3):
 *  the read-only validate arm composes-and-discards the SAME
 *  pipeline the run press rides; the saved doc must be ADMITTED
 *  verbatim (a 400 here is the h3 switch-brick class: a UI whose
 *  coordinates the compose refuses). The doc→body mapping is the RUN
 *  PRESS'S OWN shape law (liftCardParams): the axis coordinates ride
 *  the body ROOT, the knob stanza rides `params` — a probe that
 *  posts the coordinates INSIDE the stanza is refused as unknown
 *  knobs (the door's own voice, red-proven live). Never queues,
 *  never touches the engine. THE FAMILY-LESS SPELLING (the trim
 *  reach, 2026-11-13): a card that serves no families composes
 *  by its OWN id — the run press's `params.model ?? service ??
 *  card` law (runsRegistry's mid) — so the replay rides the card
 *  id, never `model: ""` (which the door bricks as "not a legal
 *  identifier" while the real press would have composed). */
async function composeVerdict(page: Page, stage: Record<string, unknown>, cardId: string): Promise<{ status: number, ok: boolean, error: string }> {
  return await page.evaluate(async ({ stage, cardId }: { stage: Record<string, unknown>, cardId: string }) => {
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
  }, { stage, cardId })
}

/** THE THREE REFUSAL CLASSES judged on one verdict (one home — both
 *  sweeps ride it): a brick voice (unknown param / variant / quant /
 *  model, not-offered, unsanctioned keys) is THE SWITCH-BRICK CLASS
 *  — red, verbatim. Three lawful empty-bench voices: the required-knob
 *  voice ("this lane requires 'x' — not stated" and its card-surface
 *  spelling "required param 'x' missing" — a family-less tool card
 *  awaiting its upstream binding; bench state under construction, the
 *  WIRE_CARD_COMPOSE_INCOMPLETE heal class), the required-source
 *  voice ("no mask sources on the mask card — add at least one
 *  modifier (…)" — the card composes FROM a source the empty bench
 *  has not stated; the refusal names the cure, live-caught
 *  2026-11-12), and the PRESENCE voice ("declares unet '…' but no
 *  store copy exists" — the weights are not on the machine; the door
 *  refuses LOUD, the run press voices it, nothing silent — the
 *  offered-but-absent VARIANT weight rides the (m) download-UX theme,
 *  logged as the sweep's own find). ANY OTHER voice is an
 *  unclassified refusal — red, verbatim. */
function expectVerdictLawful(verdict: { status: number, ok: boolean, error: string }, tag: string): void {
  expect(verdict.status !== 200 || verdict.ok, `${tag}: the compose door's 200 answer carries ok:true`).toBe(true)
  if (verdict.status !== 200) {
    expect(verdict.error, `${tag}: the compose door refused the saved doc with a BRICK-CLASS voice (${verdict.status}): ${verdict.error}`).not.toMatch(BRICK_VOICE)
    expect(verdict.error, `${tag}: the compose door's refusal must be a classified lawful voice (required-knob | absent weights), got: ${verdict.error}`).toMatch(LAWFUL_VOICE)
    // eslint-disable-next-line no-console -- the lawful-refusal receipt (which knob/weight, which lane)
    console.log(`[sweep-admission] ${tag}: lawful refusal — ${verdict.error}`)
  }
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
  // SWEEP_CARD (substring on the card id): a bounded ride for the
  // cure-verifying press — one card's arms without the full census
  // (the switch-brick cure's live red-green rode img-to-mesh alone).
  const cardNeedle = process.env.SWEEP_CARD ?? ''
  const bounded = (familyCap > 0 ? roster.slice(0, familyCap) : roster)
    .filter((r) => cardNeedle === '' || r.card.includes(cardNeedle))
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
        await switchModelSeat(page, tag, combo.model, row.models.length)
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
      // (normB/bareB are the module-level consts — the separator-blind
      // voice this sweep and the attach sweep's re-switch arm share.)
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

      // ASSERT CLASS (b) — arm 3, THE COMPOSE DOOR (composeVerdict's
      // own law, one home above): the saved doc must be ADMITTED
      // verbatim, brick voices red, lawful voices receipted.
      expectVerdictLawful(await composeVerdict(page, doc.params, row.card), tag)

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

/** THE RUN-PRESS MODEL COORDINATE (the compose door's own admission
 *  spelling, probed live 2026-11-12: `model: 'input-prep'` refuses
 *  "not offered … (boards: input)" — the card id is not a family;
 *  the door wants the FAMILY id the stage-run press derives from the
 *  card's default family). Read from the served envelope's families
 *  array, first present row — the same read the drill's own arrival
 *  rides. Null = a family-less card: the run press composes it by
 *  its OWN id (the trim reach's spelling, cardsCompose's card-unit
 *  arm) and the caller passes the card id. */
async function defaultFamilyOf(page: Page, card: string): Promise<string | null> {
  return await page.evaluate(async (cardId: string) => {
    try {
      const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(cardId))).json() as {
        families?: Array<{ id?: unknown, present?: unknown }>
      }
      const first = (spec.families ?? []).find((f) => typeof f?.id === 'string' && f.id !== '' && f.present !== false)
      return typeof first?.id === 'string' ? first.id : null
    } catch { return null }
  }, card)
}

/** THE ARRIVAL SLOT CENSUS (the attach sweep's declared set): the
 *  family's served envelope walked exactly like deriveRoster's
 *  inputs face — the walk re-reads the ARRIVAL family (never the
 *  card default) so a family-scoped field's declaration is judged on
 *  the envelope the switch landed on. `slots` is every declared slot
 *  row verbatim (the caller applies the families scoping); `fields`
 *  is the whole root dict — the flip arm reads its transform keys
 *  from this set, never a literal. */
async function arrivalSlots(page: Page, family: string): Promise<{ slots: SlotFace[], fields: string[] }> {
  return await page.evaluate(async (fam: string) => {
    const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(fam))).json() as {
      schema?: { refs?: Record<string | number, { dict?: Record<string, number | string>, meta?: Record<string, unknown>, type?: unknown }>, uid: number }
    }
    const env = spec.schema
    const root = env?.refs?.[env?.uid ?? -1]
    const slots: Array<{ name: string, label: string, wtype: string, media: string | null, families: string[] | null }> = []
    const fields: string[] = []
    if (root === undefined || root.dict === undefined) return { slots, fields }
    for (const [name, id] of Object.entries(root.dict)) {
      fields.push(name)
      const node = env?.refs?.[id]
      if (node === undefined) continue
      const meta = (node.meta ?? {}) as Record<string, unknown>
      const extra = (typeof meta['extra'] === 'object' && meta['extra'] !== null ? meta['extra'] : {}) as Record<string, unknown>
      const wtype = typeof extra['wtype'] === 'string' ? extra['wtype'] : ''
      if (wtype !== 'image' && wtype !== 'file' && wtype !== 'mesh') continue
      if (extra['hidden'] === true) continue
      slots.push({
        name,
        label: typeof meta['description'] === 'string' && meta['description'] !== '' ? meta['description'] as string : name,
        wtype,
        media: typeof extra['media'] === 'string' ? extra['media'] as string : null,
        families: Array.isArray(extra['families'])
          ? (extra['families'] as unknown[]).filter((f): f is string => typeof f === 'string')
          : null,
      })
    }
    return { slots, fields }
  }, family)
}

/** THE SLOT SEAT RESOLVER (derived, never hand-listed — three
 *  grammars the render contract serves, tried PRECISE-BEFORE-
 *  POSITIONAL):
 *  1. THE GENERIC ROW (atoms.tsx:405 — the declarative form renders
 *     `data-source-row: f.name` for every emitted slot field): the
 *     estate-path grammar — attach persists the upload door's
 *     `data/input/<file>` path, detach writes the null DELETE.
 *  2. THE BARE SQUARE (InputSquare mounted without a row wrapper —
 *     the motion rail's body seat passes the param NAME as the
 *     square's label, so the accessible seat is `<name> source`):
 *     the data-URL grammar (the studio's onSave data URL). TRIED
 *     BEFORE THE POSITIONAL ROW: the single-row fallback matches
 *     ANY data-source-row on the page, and a bespoke studio may
 *     carry an unrelated one beside the slot (the motion ride,
 *     2026-11-12: the rail's Background SourceRow shares the drill
 *     with the preview body square — the positional grab drove the
 *     background seat and the served slot never took the bytes).
 *  3. THE SINGLE-ROW STUDIO (SourceRow, atoms.tsx:55 — a bespoke
 *     single-slot studio spells the row with its LABEL, and the flip
 *     studio relabels Image↔Audio with the lane): the data-URL
 *     grammar. Only when the precise grammars miss — the input-prep
 *     class, whose square speaks 'Image source' (the lane label,
 *     never the field name), so only the row locator can find it.
 *  Null = the declared field renders NO seat — the caller receipts
 *  it and judges it in the re-switch law only, never drives it. THE
 *  SETTLED RESOLUTION (the mask ride, 2026-11-12: the row rendered on
 *  one run and not the next — the drill's spec settle decides, so an
 *  instant count judges a race): the grammar walk is POLLED across a
 *  bounded window before the null — a seat the drill opens late
 *  joins, a genuinely closed seat still nulls after the window. */
async function slotSeat(page: Page, slot: SlotFace, census: number): Promise<{ scope: Locator, grammar: 'estate-path' | 'data-url' } | null> {
  for (let round = 0; round < 20; round++) {
    const exact = page.locator(`[data-source-row="${slot.name}"]`).first()
    if ((await exact.count()) > 0) return { scope: exact, grammar: 'estate-path' }
    for (const seat of [slot.name, slot.label]) {
      const square = page.getByRole('button', { name: `${seat} source`, exact: true }).first()
      if ((await square.count()) > 0) return { scope: square.locator('..'), grammar: 'data-url' }
    }
    if (census === 1) {
      const single = page.locator('[data-source-row]').first()
      if ((await single.count()) > 0) return { scope: single, grammar: 'data-url' }
    }
    await page.waitForTimeout(500)
  }
  return null
}

/** THE PINNED ADD (one home for the newcomer law both sweeps ride —
 *  the main sweep carries the settled inline copy; this helper is
 *  the attach sweep's read of the same block): the pre-add (draft,
 *  stage) PAIR snapshot, the catalog-label pick, and the polled
 *  newcomer resolution — this visit's own stage, never a sibling's
 *  or an operator-history stage (the head-window burn, 2026-11-15). */
async function addStagePinned(page: Page, card: string, label: string, tag: string): Promise<{ stageId: string, draftId: string }> {
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
  }, card)
  const addTile = page.getByRole('button', { name: /^Add a card$/ }).first()
  await addTile.click({ timeout: 30_000 })
  const pickerCard = page.getByRole('button', { name: new RegExp(`^${escapeRe(label)}$`, 'i') }).first()
  await pickerCard.click({ timeout: 30_000 })
  await page.waitForTimeout(2_000)
  let stageId = ''
  let draftId = ''
  for (let attempt = 0; attempt < 30 && stageId === ''; attempt++) {
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
    }, { cardId: card, pre: stagePairsPre })
    if (found !== null) {
      stageId = found.stageId
      draftId = found.draftId
      break
    }
    await page.waitForTimeout(500)
  }
  expect(stageId, `${tag}: this visit's own stage lands in the drafts domain (the add's write — a missing newcomer is a birth clobber, named as such)`).not.toBe('')
  return { stageId, draftId }
}

/** THE CLOSURE VOICE (the receipt's derived half): a declared slot
 *  row with no rendered seat is closed by one of two laws —
 *  variant-gated (a served variant row's DEFAULTS name the field:
 *  the drill opens the seat when that Variant is picked) or
 *  unspellable-on-the-served-plane (no served variant row names it —
 *  the served envelope carries defaults only, so a DECL variant's
 *  params list gating, the tts ref_audio class, and a studio-local
 *  seat's own binding, the h3 per-call-refs class, both land here).
 *  Derived from the same envelope, never a card list; the receipt
 *  says exactly which half was derivable. */
async function closureVoice(page: Page, family: string, fieldName: string): Promise<string> {
  return await page.evaluate(async ({ fam, field }: { fam: string, field: string }) => {
    const spec = await (await fetch('/v1/form-spec?model=' + encodeURIComponent(fam))).json() as {
      variants?: Array<{ id?: unknown, defaults?: Record<string, unknown> }>
    }
    for (const v of spec.variants ?? []) {
      if (Object.keys(v.defaults ?? {}).includes(field)) return `variant-gated (the served variant ${String(v.id ?? '?')} defaults name ${field} — the seat opens when that Variant is picked)`
    }
    return 'closed on this arrival, not spelled by the served plane (no served variant defaults name it — a DECL variant-params gate or a studio-local seat)'
  }, { fam: family, field: fieldName })
}

/** THE POLLED DOC LAW (the attach sweep's class-(b) arm 2): the
 *  pinned stage read POLLS until the doc's coordinates hold the law
 *  the arm names — an upload is a write chain (POST /v1/uploads,
 *  then the param patch), and a read taken the instant the face
 *  settled can honestly see the pre-write doc. A coordinate that
 *  never lands reds at the deadline naming ITS law. */
async function pollStageDoc(page: Page, card: string, tag: string, law: string, holds: (params: Record<string, unknown>) => boolean, opts?: {
  marker?: string
  draftPin?: string
  stagePin?: string
}): Promise<Record<string, unknown>> {
  await expect.poll(async () => {
    try {
      const read = await benchStageOf(page, card, tag, opts)
      return holds(read.params) ? 'held' : 'pending'
    } catch { return 'pending' }
  }, {
    timeout: 30_000,
    message: `${tag}: ${law}`,
  }).toBe('held')
  return (await benchStageOf(page, card, tag, opts)).params
}

/** THE FACE POLL WITH ITS CORPUS (one home for both arms): poll the
 *  seat's ✕ count to its law; on a miss, read the pinned doc and
 *  name BOTH planes in the red — a face that never armed while the
 *  doc took the bytes is the studio's silent drop, a face that never
 *  armed while the doc stayed empty is the write that never landed.
 *  Two planes, one verdict, no theory. */
async function pollFaceVerdict(page: Page, scope: Locator, card: string, tag: string, slotName: string, wantCount: number, opts?: {
  marker?: string
  draftPin?: string
  stagePin?: string
}): Promise<void> {
  let face = -1
  for (let i = 0; i < 40; i++) {
    face = await scope.getByRole('button', { name: /^Detach / }).count()
    if (face === wantCount) return
    await page.waitForTimeout(500)
  }
  const read = await benchStageOf(page, card, tag, opts).catch(() => null)
  const docVoice = read === null
    ? 'the pinned doc read found no stage'
    : `the pinned doc's ${slotName} = ${JSON.stringify(String(read.params[slotName] ?? '').slice(0, 60))}`
  // THE SIBLING CENSUS (wrong-drill vs lost-write, named in the same
  // red): the bench draft is SHARED and the add door birth-carries a
  // prior stage's params (probe-proven 2026-11-12 — a newcomer motion
  // stage was born holding an earlier stage's GLB data URL), so a
  // face that never armed needs its second plane: does ANY stage of
  // this card carry the attachment? None → the write never landed;
  // another stage → the drill drove a stage the pin does not own.
  const siblings = await page.evaluate(async ({ cardId, field, probe }: { cardId: string, field: string, probe: string }) => {
    const list = await (await fetch('/v1/flows/drafts')).json() as { drafts?: Array<{ draft_id?: unknown }> }
    const hits: string[] = []
    for (const r of (list.drafts ?? []).filter((d) => typeof d.draft_id === 'string' && d.draft_id.startsWith('bench-')).slice(0, 8)) {
      const res = await fetch('/v1/flows/drafts/' + encodeURIComponent(String(r.draft_id)))
      if (!res.ok) continue
      const doc = await res.json() as { stages?: Array<{ id?: unknown, card?: unknown, params?: Record<string, unknown> }> }
      for (const s of doc.stages ?? []) {
        if (s.card !== cardId || typeof s.id !== 'string') continue
        const v = (s.params ?? {})[field]
        if (typeof v === 'string' && v.includes(probe)) hits.push(String(s.id))
      }
    }
    return hits
  }, { cardId: card, field: slotName, probe: 'sweep-attach' })
  const siblingVoice = siblings.length === 0
    ? 'no stage of the card carries the attachment (the write never landed)'
    : `stages ${JSON.stringify(siblings)} carry the attachment (the drill drove a stage the pin does not own)`
  const frameVoice = WIRE_TAP && wireFrames.length > 0
    ? `; the last wire frames: ${JSON.stringify(wireFrames.slice(-2))}`
    : ''
  expect(face, `${tag} · ${slotName}: the seat's face ${wantCount > 0 ? 'holds' : 'drops'} the attachment (${docVoice}; ${siblingVoice}${frameVoice} — the ✕ rides HELD, both planes named together)`).toBe(wantCount)
}

/** THE ATTACH ARM (one home — every seat grammar rides it):
 *  setInputFiles the seat's own fixture (derived from the field's
 *  served wtype + media hint), prove the FACE holds the attachment
 *  (the ✕ rides HELD — the square's own durable-fact law,
 *  square.tsx's detach law: the verb belongs to the fact, never the
 *  view), and poll the DOC until the coordinate holds the grammar's
 *  law. Returns the doc params the attach left. */
async function attachTo(page: Page, seat: { scope: Locator, grammar: 'estate-path' | 'data-url' }, card: string, tag: string, slot: SlotFace, opts?: {
  marker?: string
  draftPin?: string
  stagePin?: string
  /** the flip studio's second call hands its own fixture (the wav)
   *  and its own doc law — the flip arm IS a second attach */
  fixture?: { name: string, mimeType: string, buffer: Buffer, dataUrlPrefix: string, dataUrlLen: number }
  holds?: (params: Record<string, unknown>) => boolean
  law?: string
}): Promise<Record<string, unknown>> {
  const fixture = opts?.fixture ?? fixtureFor(slot)
  // THE SQUARE'S OWN INPUT (the input-prep ride, 2026-11-12): the
  // drill's row scope can carry more than one file input (the
  // SourceRow wraps the square beside the provider's own plumbing),
  // and the first-match set landed on an input whose handler never
  // wrote — the square's own control carries data-slot-input
  // (square.tsx's upload seat), so the set names it directly and
  // falls back to the bare type filter only for a seat that renders
  // none.
  const precise = seat.scope.locator('input[type="file"][data-slot-input]')
  const input = (await precise.count()) > 0
    ? precise.first()
    : seat.scope.locator('input[type="file"]').first()
  // THE STUDIO SETTLE GATE (the motion probe, 2026-11-12): a bespoke
  // studio's heavy mount (three ctx, npz data) churns its write chain
  // after the add — an attach fired mid-mount lands on a mount the
  // data-load replaces and the state write is lost (the face never
  // arms while the doc stays empty). The write chain's own quiet is
  // the derived settle signal: wait for network idle, best-effort,
  // bounded — a chatty lane never blocks the write, and the face
  // verdict stays the judge. Probe-proven: a settled studio accepts
  // the identical attach at t+1s.
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => { /* the face verdict stays the judge */ })
  await input.setInputFiles({ name: fixture.name, mimeType: fixture.mimeType, buffer: fixture.buffer })
  await pollFaceVerdict(page, seat.scope, card, tag, slot.name, 1, opts)
  const base = 'data/input/' + fixture.name
  const holds = opts?.holds ?? carryLaw(seat.grammar, slot.name, fixture)
  const law = opts?.law ?? (seat.grammar === 'estate-path'
    ? `the bench doc's ${slot.name} coordinate carries the upload door's estate path ${base} (the estate-path grammar)`
    : `the bench doc's ${slot.name} coordinate carries THIS run's attachment (the data URL with this run's own prefix and length — the studio's readAsDataURL law)`)
  return await pollStageDoc(page, card, tag, law, holds, opts)
}

/** THE DETACH ARM (one home): the seat's own ✕ (never a doc patch —
 *  the sweep drives the user's gesture), then the DEPARTURE LAW —
 *  the attachment must leave the doc. TWO SPELLINGS, ONE LAW (the
 *  img-to-mesh ride, 2026-11-12): mask's generic row detaches by
 *  null-DELETE (JSON Merge Patch deletes the key), img-to-mesh's
 *  detach persists '' — the dialects differ, the contract does not:
 *  absent, null, or '' all carry no attachment; the value that
 *  still names the bytes is the silent half, red on either grammar
 *  with both planes named (the face dropped, the doc kept). The
 *  compose verdict still runs after — a departure the door refuses
 *  is judged there, never here. */
async function detachFrom(page: Page, seat: { scope: Locator, grammar: 'estate-path' | 'data-url' }, card: string, tag: string, slot: SlotFace, opts?: {
  marker?: string
  draftPin?: string
  stagePin?: string
}): Promise<Record<string, unknown>> {
  const fixtureName = fixtureFor(slot).name
  await seat.scope.getByRole('button', { name: /^Detach / }).first().click({ timeout: 15_000 })
  await pollFaceVerdict(page, seat.scope, card, tag, slot.name, 0, opts)
  const departure = (p: Record<string, unknown>) => {
    const v = p[slot.name]
    return !(slot.name in p) || v === null || v === '' || !(typeof v === 'string' && (v.startsWith('data:') || v.includes(fixtureName)))
  }
  return await pollStageDoc(page, card, tag,
    `${slot.name} holds no attachment after the detach (the departure law — the face dropped, so the doc must carry no bytes: absent, null, or the persisted empty, never a stale ${fixtureName})`,
    departure,
    opts)
}

test('the attach/detach sweep — slot file inputs, re-switch after attach', async ({ page }) => {

  test.setTimeout(3_600_000)
  armCollectors(page)
  await settleHost(page)
  await openBench(page)

  const roster = await deriveRoster(page)
  // THE DERIVED CENSUS (the header's law): only cards whose served
  // envelope declares slot fields ride — a card the walker gives no
  // inputs face has nothing to attach to, and an env-capped roster
  // keeps the ride bounded exactly like the main sweep's.
  const withSlots = roster.filter((row) => row.slots.length > 0)
  expect(withSlots.length, 'the served envelopes declare at least one slot file input (the walker derived the inputs face from the field kinds — never a hand-list)').toBeGreaterThan(0)
  const familyCap = Number(process.env.SWEEP_FAMILIES ?? '0')
  const bounded = familyCap > 0 ? withSlots.slice(0, familyCap) : withSlots
  const maxCombos = Number(process.env.SWEEP_MAX_COMBOS ?? '8')
  // eslint-disable-next-line no-console -- THE CENSUS receipt (which cards, which slots, which seat grammar the resolver owes)
  console.log('[sweep-attach-roster]', JSON.stringify(bounded.map((row) => ({ card: row.card, models: row.models.map((m) => m.id), slots: row.slots }))))

  for (const row of bounded) {
    // THE VISIT SET (the main sweep's combos law): every served
    // family of the card gets its own visit — the slot rows are
    // family-scoped (img-to-mesh's image seat rides pixal3d, its GLB
    // seats transfer-rig), so a card-level walk would never seat the
    // scoped rows. A family-less card visits once, on the default
    // family's spelling.
    const families = (row.models.length > 0 ? row.models : [{ id: '', label: '' }]).slice(0, maxCombos)
    for (const family of families) {
      silent.length = 0
      voiced.length = 0
      if (WIRE_TAP) wireFrames.length = 0
      wireFailures.length = 0
      const famId = family.id !== '' ? family.id : ((await defaultFamilyOf(page, row.card)) ?? row.card)
      const tag = `${row.card} :: ${famId} :: attach`
      const sweepPrompt = `attach sweep ${tag} #${RUN_TAG}`

      const { stageId, draftId } = await addStagePinned(page, row.card, row.label, tag)
      const docPin: { marker?: string, draftPin: string, stagePin: string } = { draftPin: draftId, stagePin: stageId }
      // THE MARKER LINK (the main sweep's prompt law): fill the
      // prompt when the card renders one — the marker pins the doc
      // read AND the compose door's required-knob voice stays lawful
      // instead of refusing every admission judgment.
      const promptBox = page.getByRole('textbox', { name: 'Prompt', exact: true }).first()
      if ((await promptBox.count()) > 0) {
        await promptBox.fill(sweepPrompt, { timeout: 15_000 })
        await expect.poll(async () => promptBox.inputValue(), {
          timeout: 15_000,
          message: `${tag}: the Prompt face carries the sweep's marker after the fill`,
        }).toBe(sweepPrompt)
        await page.waitForTimeout(2_000)
        docPin.marker = sweepPrompt
      }
      // THE ARRIVAL (the same seat the main sweep's switched combos
      // ride): land the visit's family before any slot arm — the
      // declared set below is read from THIS family's envelope.
      if (row.models.length > 0) await switchModelSeat(page, tag, family, row.models.length)
      const runPressCard = famId
      const arrivalWalk = await arrivalSlots(page, famId)
      const arrival = arrivalWalk.slots
        .filter((s) => s.families === null || s.families.includes(famId))
      const census = arrival.length
      expect(census, `${tag}: the arrival envelope declares its slot rows (the roster derived ${row.slots.length} at card level; the arrival walk found ${census})`).toBeGreaterThan(0)

      // ── ARM (a) ATTACH — every declared, RENDERED slot row takes
      // its own fixture; declared-but-unrendered rows (a visible_when
      // seat the arrival's defaults keep closed) are receipted and
      // left to the re-switch law, never driven against a seat that
      // is not there.
      const attached: Array<{ slot: SlotFace, grammar: 'estate-path' | 'data-url' }> = []
      for (const slot of arrival) {
        const seat = await slotSeat(page, slot, census)
        if (seat === null) {
          // eslint-disable-next-line no-console -- the declared-but-closed receipt (which closure law keeps the seat shut)
          console.log(`[sweep-attach] ${tag} · ${slot.name}: declared, not rendered — ${await closureVoice(page, famId, slot.name)}; judged in the re-switch law only`)
          continue
        }
        const params = await attachTo(page, seat, row.card, tag, slot, docPin)
        expectVerdictLawful(await composeVerdict(page, params, runPressCard), `${tag} · ${slot.name} :: attach`)
        attached.push({ slot, grammar: seat.grammar })
      }

      // THE FLIP ARM (the ROADMAP row's third gesture, 2026-11-12 —
      // the input-prep source flip image→audio→image, the F1 cure's
      // live arm): gated on the OBSERVED grammar, never a card name —
      // the single-row data-URL studio whose row label speaks the
      // Image/Audio flip and whose envelope serves the media enum and
      // the crop transform. Attach the wav: the sniff flips the lane,
      // media_type flips, the transform keys take the unset grammar
      // (crop_x -1), and the DOOR must admit the audio lane. Attach
      // the png again: the lane flips back, the transforms STAY unset
      // (no resurrection), the door admits the image lane.
      if (census === 1 && attached.length === 1 && attached[0].grammar === 'data-url') {
        const flipRow = page.locator('[data-source-row]').first()
        const flipLabel = await flipRow.getAttribute('data-source-row')
        const hasMediaEnum = arrivalWalk.fields.includes('media_type')
        const hasCropTransform = arrivalWalk.fields.includes('crop_x')
        if (flipLabel === 'Image' && hasMediaEnum && hasCropTransform) {
          const slot = attached[0].slot
          const flipTag = `${tag} · flip`
          const audio = await attachTo(page, { scope: flipRow, grammar: 'data-url' }, row.card, flipTag, slot, {
            ...docPin,
            fixture: fixtureFor(slot, FIXTURES.wav),
            law: `the flip: ${slot.name} carries the wav as a data:audio URL and media_type flips to audio with the unset transform grammar (crop_x === -1 — the F1 cure's own seat)`,
            holds: (p) => typeof p[slot.name] === 'string' && String(p[slot.name]).startsWith('data:audio/')
              && p['media_type'] === 'audio' && p['crop_x'] === -1,
          })
          expectVerdictLawful(await composeVerdict(page, audio, runPressCard), `${flipTag} :: audio lane`)
          const back = await attachTo(page, { scope: flipRow, grammar: 'data-url' }, row.card, flipTag, slot, {
            ...docPin,
            law: `the flip back: ${slot.name} carries the png as a data:image URL and media_type flips to image with the transforms STILL unset (no resurrection)`,
            holds: (p) => typeof p[slot.name] === 'string' && String(p[slot.name]).startsWith('data:image/')
              && p['media_type'] === 'image' && p['crop_x'] === -1,
          })
          expectVerdictLawful(await composeVerdict(page, back, runPressCard), `${flipTag} :: image lane`)
        }
      }

      // ── ARM (b) DETACH — every row the attach arm seated rides its
      // own ✕; the doc drops the coordinate per the grammar's law and
      // the door still answers (admit, or the lawful empty-bench
      // voice the door owns — never the brick).
      for (const { slot, grammar } of attached) {
        const seat = await slotSeat(page, slot, census)
        if (seat === null) continue // the flip/lane changed the row's spelling — the re-switch law judges it
        const emptied = await detachFrom(page, { scope: seat.scope, grammar }, row.card, tag, slot, docPin)
        expectVerdictLawful(await composeVerdict(page, emptied, runPressCard), `${tag} · ${slot.name} :: detach`)
      }

      // ── ARM (c) RE-SWITCH AFTER ATTACH — re-attach every driven
      // row, then ONE switch, then the doc judged against the
      // ARRIVAL envelope's own declared set: carried while the
      // arrival still declares AND renders the field (a carried
      // coordinate the compose door would otherwise never see),
      // dropped when the arrival lost it (a departed key the door
      // BRICKS as an unknown param — the doc keeping it is the
      // switch-brick class, h3 2026-11-05's own voice).
      for (const { slot } of attached) {
        const seat = await slotSeat(page, slot, census)
        if (seat === null) continue
        await attachTo(page, seat, row.card, tag, slot, docPin)
      }
      const other = row.models.find((m) => m.id !== famId)
      let arrival2Id = famId
      let reSwitchTag = ''
      if (row.models.length > 1 && other !== undefined) {
        reSwitchTag = `${tag} :: re-switch → ${other.id}`
        arrival2Id = other.id
        await switchModelSeat(page, reSwitchTag, other, row.models.length)
      } else {
        // THE SINGLE-FAMILY ROUND-TRIP (the re-switch arm's bound):
        // the first served non-Recipe axis group rides ONE row — the
        // same select→pick→face law the main sweep's axis arm rides.
        // A card with neither seat receipts the bound: the attachment
        // must simply hold.
        const group = await page.evaluate(async (fam: string) => {
          const spec = await (await fetch(`/v1/form-spec?model=${encodeURIComponent(fam)}`)).json() as {
            variants?: Array<{ group?: unknown }>
          }
          return [...new Set((spec.variants ?? []).map((v) => typeof v.group === 'string' ? v.group : ''))].filter((g) => g !== '' && g !== 'Recipe')[0] ?? null
        }, famId)
        if (group !== null) {
          reSwitchTag = `${tag} :: re-switch → ${group} axis`
          await sweepAxis(page, group, reSwitchTag, row.card, { maxRows: 1 })
        } else {
          // eslint-disable-next-line no-console -- the no-switch receipt
          console.log(`[sweep-attach] ${reSwitchTag || tag}: no model seat and no served axis — the re-switch arm rides the hold law only`)
        }
      }
      const arrival2Walk = await arrivalSlots(page, arrival2Id)
      const arrival2 = arrival2Walk.slots
        .filter((s) => s.families === null || s.families.includes(arrival2Id))
      const census2 = arrival2.length
      for (const { slot, grammar } of attached) {
        const declared = arrival2.some((s) => s.name === slot.name)
        const seat2 = declared ? await slotSeat(page, slot, census2) : null
        const law2 = carryLaw(grammar, slot.name, fixtureFor(slot))
        const holds = declared && seat2 !== null
          ? law2
          : (p: Record<string, unknown>) => !law2(p)
        // THE DEPARTED-KEY JUDGMENT (WALLED 2026-11-17, the
        // switch-brick cure): the switch's own verb nulls the
        // departed family's scoped slots (card-base
        // modelSwitchPatch's family-scoped clause — the verb wall
        // is spec-walker's FAMILY-SCOPED SLOT NULL arm), so the doc
        // MUST drop them; a kept attachment here is the h3
        // 2026-11-05 switch-brick class RED, verbatim. The carried
        // side keeps its hard red: an attachment the arrival still
        // renders must follow, and its loss is the silent drop.
        const finalDoc = declared && seat2 !== null
          ? await pollStageDoc(page, row.card, `${reSwitchTag || tag} · ${slot.name}`,
            `the attachment FOLLOWS the switch (${slot.name} still declared and rendered on the arrival ${arrival2Id})`,
            holds,
            docPin)
          : await pollStageDoc(page, row.card, `${reSwitchTag || tag} · ${slot.name}`,
            `the attachment is GONE after the switch (${slot.name} left the arrival ${arrival2Id} — a departed family-scoped slot the switch verb must null; a kept one is the switch-brick class)`,
            holds,
            docPin)
        expectVerdictLawful(await composeVerdict(page, finalDoc, arrival2Id), `${reSwitchTag || tag} · ${slot.name} :: re-switch`)
      }

      // THE VISIT'S OWN LEDGERS (assert class (a)): silent errors and
      // swallowed wire failures on the estate doors — the compose
      // probe's adjudicated refusals stay classified (the tap's own
      // law), every other 4xx/5xx reds the visit. THE VOICED DEFECTS
      // ride their own law: a known catalog-integrity voice prints
      // its finding receipt (the run log carries it verbatim), an
      // unknown voiced error reds the visit — loud must never mean
      // passed.
      expect(silent, `${tag}: silent errors (console/page)`).toEqual([])
      expect(wireFailures, `${tag}: swallowed wire failures on the estate doors`).toEqual([])
      const voicedUnknown = voiced.filter((v) => !VOICED_KNOWN.test(v))
      expect(voicedUnknown, `${tag}: unclassified voiced defects (the estate's own toasts — a loud defect the classifier does not know is still a defect)`).toEqual([])
      for (const v of voiced) {
        // eslint-disable-next-line no-console -- the voiced-defect receipt (the finding, verbatim, every ride)
        console.log(`[sweep-voiced] ${tag}: ${v}`)
      }

      // THE TEARDOWN (the main sweep's close law): the drill's
      // accessible name, then the Escape fallback.
      const close = page.getByRole('button', { name: /^Collapse card$|^Close$|^Back$/ }).first()
      if ((await close.count()) > 0) await close.click({ timeout: 10_000 }).catch(() => { /* the drill may already be closed */ })
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape').catch(() => { /* no modal — nothing to close */ })
      await page.waitForTimeout(500)
    }
  }
})
