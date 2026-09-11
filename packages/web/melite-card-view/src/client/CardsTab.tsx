/**
 * The Cards tab body — the bench's user plane (plan §5: "the user
 * browses visually in the tab").
 *
 * Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
 * CARD (the categories — each card's stages under its own header with
 * a count), each row opening a DSH Modal drilldown (id/card/engine/
 * params — the chat tile's drilldown pattern, primitives Modal), the
 * revision trail's head, and the Run gesture — which projects the
 * stages onto the flow_inline wire and starts them under the bench's
 * own draft_id, EXACTLY what melite_flow's bench verb does (one
 * truth, two planes; the model's plane is per-call reads, never this
 * component's frames).
 *
 * Run view (`dsh-resource://cards/run/<runId>`): live status + stage
 * rows + artifacts, riding the resource provider's frames — plus the
 * way back: "Back to bench" navigates home, and "Restore to bench"
 * turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
 * + per-stage bench/add-stage as the user, CAS-chained).
 *
 * ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 * the shell's navigation address is the SHELL's (guide clicks arrive
 * as the tab id's own address, not a cards address). An address that
 * does not parse as a cards address serves the BENCH — the tab never
 * sits on a resource no provider claims.
 *
 * The body is dispatched by the keyed `sidebar.right.pane.tab` seat
 * under the type's id; the address arrives through the standard
 * `useTabInfo` hook, the value through the standard `useResource`
 * hook. Local prop typings (the package's local-spelling pattern —
 * see index.ts) keep this package off sibling runtime imports.
 */
import { createElement as h, useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { fetchCardCatalog, fetchFormSpec, specDefaults, specPatch, SpecForm } from './spec-form.tsx'
import type { CatalogCard, FormSpecDoc, SpecValues } from './spec-form.tsx'
import { paramFields, patchStageParams } from './draft.ts'
import css from './card.module.css'
import type { CardsBenchValue, CardsRunValue, BenchStageRow } from './cards-resource.ts'
import { CARDS_BENCH_ADDRESS, parseCardsAddress, restoreRunToBench } from './cards-resource.ts'
import { addStageWire } from './add-stage.ts'
import { OldFlowMount } from './OldFlowMount.tsx'
import { mediaUrl } from './draft.ts'

/** The injected tab information hook's shape (dsh-client-ui-sidebar-right's
 *  UseSidebarRightTabInfo, spelled locally). */
interface TabInfo {
  readonly tab: {
    readonly kind: string
    readonly contentId?: string
    readonly navigation: { readonly address: string }
    readonly actions: { openResource(address: string): void }
  }
}

/** The global standard resource hook's shape (UseResource specialized to
 *  the cards protocol, local spelling). */
interface ResourceHook {
  (address: string): { status: 'none' | 'loading' | 'live' | 'failed'; value?: CardsBenchValue | CardsRunValue; failure?: { message?: string } }
}

export interface CardsTabProps {
  useTabInfo?: () => TabInfo
  useResource?: ResourceHook
}

/** The flow_inline projection — the SAME wire shape melite_flow's bench
 *  verb sends (runner-owned keys strip; ids/engines/params stay). */
function projectStage(s: BenchStageRow): Record<string, unknown> {
  const row: Record<string, unknown> = { id: s.id, engine: s.engine ?? 'comfyui' }
  if (s.params !== undefined && Object.keys(s.params).length > 0) row['params'] = s.params
  if (Array.isArray(s.inputs) && s.inputs.length > 0) row['inputs'] = s.inputs
  if (Array.isArray(s.outputs) && s.outputs.length > 0) row['outputs'] = s.outputs
  return row
}

/** Correlation id for one client-request frame (crypto.randomUUID is
 *  the browser standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** The Run gesture: start the bench as it stands, over the runs
 *  remote's wire door (same-origin POST /api/runs/start carrying the
 *  client-request frame — api-gateway.md; the gateway-era /v1/flows
 *  start died with the app, nothing serves it). Errors surface inline
 *  (the RemoteError branch's own refusal text — logged, never thrown
 *  past React). */
async function runTheBench(
  bench: CardsBenchValue,
  onStarted: (runId: string) => void,
): Promise<void> {
  const stages = bench.stages.map(projectStage)
  if (stages.length === 0) return
  const rpcId = nextRpcId()
  try {
    const res = await fetch('/api/runs/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId,
        method: 'runs/start',
        payload: { args: { doc: { flow_inline: { stages }, draft_id: bench.draftId } } },
      }),
    })
    if (!res.ok) {
      console.error('[cards] run refused: HTTP ' + String(res.status))
      return
    }
    const body: unknown = await res.json().catch(() => null)
    if (typeof body !== 'object' || body === null
        || Reflect.get(body, 'type') !== 'server-response'
        || Reflect.get(body, 'rpcId') !== rpcId) {
      console.error('[cards] run refused: malformed response frame')
      return
    }
    const result: unknown = Reflect.get(body, 'result')
    if (typeof result !== 'object' || result === null) {
      console.error('[cards] run refused: malformed result')
      return
    }
    if (Reflect.get(result, 'ok') === true) {
      const runId = Reflect.get(Reflect.get(result, 'value') as object, 'run_id')
      if (typeof runId === 'string' && runId !== '') {
        onStarted(runId)
      } else {
        console.error('[cards] run refused: no run_id in the answer')
      }
      return
    }
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : 'runs/start refused'
    console.error('[cards] run refused:', message)
  } catch (e) {
    console.error('[cards] run request failed:', e)
  }
}

/** THE CATEGORIES: bench stages grouped by card (first-appearance
 *  order — the agent's construction order survives; stages with no
 *  card gather under 'uncategorized', never dropped). */
export function groupStagesByCard(stages: BenchStageRow[]): Array<{ card: string; rows: BenchStageRow[] }> {
  const groups: Array<{ card: string; rows: BenchStageRow[] }> = []
  for (const s of stages) {
    const card = typeof s.card === 'string' && s.card !== '' ? s.card : 'uncategorized'
    const known = groups.find((g) => g.card === card)
    if (known === undefined) groups.push({ card, rows: [s] })
    else known.rows.push(s)
  }
  return groups
}

/** Bench row run-status → the installed StateDot union (FlowCards'
 *  CardRowLine law: done|warning|ongoing|error — a stage that never
 *  ran shows NO dot, never a fake state). */
const STAGE_DOT: Record<string, 'done' | 'ongoing' | 'error' | 'warning' | null> = {
  queued: 'warning', pending: 'warning', running: 'ongoing', done: 'done', failed: 'error', ready: null,
}

/** THE CARD ROW — the chat plane's CardRowLine grammar VERBATIM
 *  (f3026845, the 9-10 card system): [artifact thumb | kind Pill],
 *  bold title, service Pill, live StateDot, clipped prompt. ONE card
 *  system, both planes — the tab renders the SAME row the chat
 *  renders, from the same stylesheet (the .row/.thumb/.rowTitle/
 *  .prompt classes below are the flow block's own). */
/** THE CARD TILE — the operator's CardTile law (flowCardTile.tsx)
 *  ported to the tab, DSH native: the visual card (INNER) is ONE flex
 *  column with exactly two flow children —
 *    1. the PREVIEW CELL — flex-1 min-h-0, aspect-square: it owns
 *       every pixel the caption strip doesn't need. Media fills it
 *       edge to edge (object-cover); no artifact yet → the KIND FACE
 *       (the kind initial, the glyph chain's face without the editor
 *       runtime). A portrait artifact can NOT drive the row height
 *       (SQUARE LAW, 2026-08-23).
 *    2. the CAPTION STRIP — shrink-0, natural height: the declared
 *       summary line (title · engine) + the live status dot.
 *  Image-anchored overlays (the status dot) live INSIDE the preview
 *  cell so their anchors ride the artifact's corner. Click = the
 *  drilldown (the second state, the shared CardDrill). */
function StageTile({ row, onOpen }: {
  row: CardRowLineTabRow
  onOpen: (row: CardRowLineTabRow) => void
}): ReturnType<typeof h> {
  return h('li', { className: css.tile, 'data-stage-id': row.id, 'data-stage-status': row.status },
    h('button', { className: css.tileInner, type: 'button', 'data-status': row.status, onClick: () => onOpen(row) },
      h('span', { className: css.tilePreview },
        row.thumbUrl !== null
          ? h('img', { className: css.tileImg, src: row.thumbUrl, alt: row.title, loading: 'lazy' })
          : h('span', { className: css.kindFace, 'data-kind': row.kind },
              h('span', { className: css.kindInitial }, row.kind.slice(0, 1).toUpperCase()),
              h('span', { className: css.kindName }, row.kind),
            ),
        row.dot !== null ? h('span', { className: css.tileDot }, h(StateDot, { state: row.dot })) : null,
      ),
      h('span', { className: css.tileCaption },
        h('span', { className: css.tileTitle }, row.title),
        h('span', { className: css.tileMeta },
          row.service !== null ? row.service : null,
          row.prompt !== null ? h('span', { className: css.tilePrompt }, row.prompt) : null,
        ),
      ),
    ),
  )
}

function UnusedCardRowLineTab({ row, onOpen }: {
  row: CardRowLineTabRow
  onOpen: (row: CardRowLineTabRow) => void
}): ReturnType<typeof h> {
  return h('li', { className: css.tile, 'data-stage-id': row.id, 'data-stage-status': row.status },
    h('button', { className: css.row, type: 'button', 'data-status': row.status, onClick: () => onOpen(row) },
      row.thumbUrl !== null
        ? h('img', { className: css.thumb, src: row.thumbUrl, alt: row.title, loading: 'lazy' })
        : h(Pill, null, row.kind),
      h('span', { className: css.rowTitle }, row.title),
      row.service !== null ? h(Pill, null, row.service) : null,
      row.dot !== null ? h(StateDot, { state: row.dot }) : null,
      row.prompt !== null ? h('span', { className: css.prompt }, row.prompt) : null,
    ),
  )
}

/** The bench stage as a card row (the same distillation cardRows()
 *  performs for the chat plane). */
interface CardRowLineTabRow {
  id: string
  kind: string
  title: string
  service: string | null
  status: string
  dot: 'done' | 'ongoing' | 'error' | 'warning' | null
  prompt: string | null
  thumbUrl: string | null
  stage: BenchStageRow
}

function benchRow(stage: BenchStageRow): CardRowLineTabRow {
  const title = stage.title ?? stage.card ?? stage.id
  const status = typeof stage.runStatus === 'string' && stage.runStatus !== '' ? stage.runStatus : 'ready'
  const params = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const promptRaw = typeof params['prompt'] === 'string' ? params['prompt'] : ''
  const result = stage.result
  const url = typeof result === 'object' && result !== null && typeof Reflect.get(result, 'url') === 'string'
    ? Reflect.get(result, 'url') as string
    : ''
  return {
    id: stage.id,
    kind: String(stage.card ?? 'card'),
    title: String(title),
    service: typeof stage.engine === 'string' && stage.engine !== '' ? stage.engine : null,
    status,
    dot: STAGE_DOT[status] ?? null,
    prompt: promptRaw !== '' ? promptRaw.slice(0, 96) : null,
    // same-origin absolute or leading-/ artifact urls render; a bare
    // run-relative filename cannot resolve without its run (the run
    // view owns that face) — the kind Pill rides instead.
    thumbUrl: /^(https?:\/\/|\/)/.test(url) ? url : null,
    stage,
  }
}

/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
 *  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
 *  groups, defaults); the drill renders THAT, never a raw key/value
 *  dump. Params left, Run right; the patch carries only CHANGED keys
 *  (coerced once, at patch time — the editPatch law); then the run
 *  gesture (patch lands in the domain BEFORE the run reads it). */
function StageDrill({ stage, bench, running, onRun, onClose }: {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  onClose: () => void
}): ReturnType<typeof h> {
  const title = String(stage.title ?? stage.card ?? stage.id)
  const held: SpecValues = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [values, setValues] = useState<SpecValues>({})
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    const family = String(stage.card ?? '')
    if (family === '') { setLoaded(true); return }
    fetchFormSpec(family)
      .then((doc) => {
        if (!alive) return
        setSpec(doc)
        setValues({ ...specDefaults(doc.fields), ...held })
        setLoaded(true)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'form-spec unavailable')
        setLoaded(true)
      })
    return () => { alive = false }
  }, [stage.id])
  const onEdit = useCallback((name: string, v: unknown): void => {
    setValues((m) => ({ ...m, [name]: v }))
  }, [])
  const run = async (): Promise<void> => {
    setError(null)
    try {
      const patch = spec !== null ? specPatch(spec.fields, values, held) : {}
      if (Object.keys(patch).length > 0) {
        await patchStageParams(bench.draftId, stage.id, patch)
      }
      onRun()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'run failed')
    }
  }
  return h(Modal, { open: true, onClose, title: 'Stage ' + title, closeLabel: 'Close stage', className: css.drill },
    h('div', { className: css.split },
      h('div', { className: css.params },
        !loaded ? h('div', { className: css.load }, 'form…')
        : spec !== null ? h(SpecForm, { fields: spec.fields, values, onEdit })
        : h('pre', { className: css.mono }, JSON.stringify(held, null, 2)),
      ),
      h('div', { className: css.outputs },
        h('div', { className: css.runRow },
          error !== null ? h('span', { className: css.runError }, error) : null,
          h(Button, { variant: 'primary', disabled: running, onClick: () => { void run() } },
            running ? 'running…' : 'Run'),
        ),
      ),
    ),
  )
}

/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
 *  + tile → the picker (the catalog's action cards, search + genre
 *  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
 *  as the user (CAS-chained). ONE surface: action cards; models are not
 *  entries (the model select lives ON the card's form). */
function AddCardDoor({ bench, onAdded, onClose }: {
  bench: CardsBenchValue
  onAdded: () => void
  onClose: () => void
}): ReturnType<typeof h> {
  const [cards, setCards] = useState<CatalogCard[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<CatalogCard | null>(null)
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [values, setValues] = useState<SpecValues>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  useEffect(() => {
    let alive = true
    fetchCardCatalog()
      .then((list) => { if (alive) setCards(list) })
      .catch((e: unknown) => { if (alive) setCatalogError(e instanceof Error ? e.message : 'catalog unavailable') })
    return () => { alive = false }
  }, [])
  const pick = (card: CatalogCard): void => {
    setPicked(card)
    setSpec(null)
    setFormError(null)
    const family = card.families[0] ?? card.id
    fetchFormSpec(family)
      .then((doc) => { setSpec(doc); setValues(specDefaults(doc.fields)) })
      .catch((e: unknown) => setFormError(e instanceof Error ? e.message : 'form-spec unavailable'))
  }
  const onEdit = useCallback((name: string, v: unknown): void => {
    setValues((m) => ({ ...m, [name]: v }))
  }, [])
  const add = async (): Promise<void> => {
    if (picked === null) return
    setAdding(true)
    setFormError(null)
    try {
      const doc: Record<string, unknown> = {
        card: picked.id,
        author: 'user',
        engine: spec?.engine ?? 'comfyui',
        expect_rev: bench.rev,
      }
      const params = spec !== null ? specPatch(spec.fields, values, specDefaults(spec.fields)) : {}
      if (Object.keys(params).length > 0) {
        // defaults the user never touched ride too — a new card is born
        // with its declared shape, not an empty bag
        doc['params'] = { ...specDefaults(spec?.fields ?? []), ...values }
      }
      await addStageWire(doc)
      setAdding(false)
      onAdded()
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'add refused')
      setAdding(false)
    }
  }
  const filtered = (cards ?? []).filter((c) => {
    if (query === '') return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q)
  })
  const genres: Array<[string, CatalogCard[]]> = []
  for (const c of filtered) {
    const g = c.genre !== '' ? c.genre : 'other'
    const known = genres.find((x) => x[0] === g)
    if (known === undefined) genres.push([g, [c]])
    else known[1].push(c)
  }
  return h(Modal, { open: true, onClose, title: 'Add a card', closeLabel: 'Close picker', className: css.drill },
    picked === null
      ? h('div', { className: css.picker },
          h(Input, {
            value: query,
            placeholder: 'search cards…',
            onChange: (e: unknown) => setQuery((e as { target: { value: string } }).target.value),
            'aria-label': 'Search cards',
          }),
          catalogError !== null ? h('p', { className: css.runError }, catalogError) : null,
          cards === null && catalogError === null ? h('div', { className: css.load }, 'cards…') : null,
          genres.map(([g, list]) => h('section', { key: g, className: css.pickerGenre },
            h('h4', { className: css.specGroupTitle }, g),
            list.map((c) => h('button', {
              key: c.id,
              type: 'button',
              className: css.pickerCard,
              onClick: () => pick(c),
            },
              h('span', { className: css.pickerCardLabel }, c.label),
              c.description !== '' ? h('span', { className: css.pickerCardDesc }, c.description) : null,
              h(Pill, null, c.families[0] ?? c.id),
            )),
          )),
        )
      : h('div', { className: css.split },
          h('div', { className: css.params },
            h('button', { type: 'button', className: css.back, onClick: () => { setPicked(null); setSpec(null) } }, '← ' + (cards?.length ?? 0) + ' cards'),
            spec === null && formError === null ? h('div', { className: css.load }, 'form…') : null,
            formError !== null ? h('p', { className: css.runError }, formError) : null,
            spec !== null ? h(SpecForm, { fields: spec.fields, values, onEdit }) : null,
          ),
          h('div', { className: css.outputs },
            h('div', { className: css.runRow },
              formError !== null ? h('span', { className: css.runError }, formError) : null,
              h(Button, { variant: 'primary', disabled: adding || spec === null, onClick: () => { void add() } },
                adding ? 'adding…' : 'Add card'),
            ),
          ),
        ),
  )
}

function BenchView({ bench, onRun, onNavigate, running }: {
  bench: CardsBenchValue
  onRun: () => void
  onNavigate: (address: string) => void
  running: boolean
}): ReturnType<typeof h> {
  const [open, setOpen] = useState<BenchStageRow | null>(null)
  const [adding, setAdding] = useState(false)
  const onOpen = useCallback((stage: BenchStageRow): void => setOpen(stage), [])
  const onClose = useCallback((): void => setOpen(null), [])
  const onAddCard = useCallback((): void => setAdding(true), [])
  const onAdded = useCallback((): void => {
    setAdding(false)
    onNavigate(CARDS_BENCH_ADDRESS)
  }, [onNavigate])
  return h('section', { className: css.cardsBench, 'data-cards-bench': bench.rev },
    h('header', { className: css.benchHead },
      h('span', { className: css.revTag }, 'rev ' + bench.rev),
      h('button', {
        className: css.runBtn,
        type: 'button',
        disabled: running || bench.stages.length === 0,
        onClick: onRun,
      }, 'Run'),
    ),
    bench.stages.length === 0
      ? h('p', { className: css.empty }, 'The bench is empty — construct stages (the agent adds them; they land here).')
      : h('ol', { className: css.tileGrid },
          bench.stages.map((s) => {
            const row = benchRow(s)
            return h(StageTile, { key: s.id, row, onOpen: (r) => onOpen(r.stage) })
          }),
          h('li', { className: css.tile + ' ' + css.tileAdd },
            h('button', { type: 'button', className: css.tileInner, 'aria-label': 'Add a card', onClick: onAddCard },
              h('span', { className: css.tilePreview + ' ' + css.addFace }, '+'),
              h('span', { className: css.tileCaption },
                h('span', { className: css.tileTitle }, 'Add a card'),
              ),
            ),
          ),
        ),
    bench.log.length > 0
      ? h('p', { className: css.logHead }, bench.log.length + ' log entr' + (bench.log.length === 1 ? 'y' : 'ies'))
      : null,
    open !== null ? h(StageDrill, { stage: open, bench, running, onRun, onClose }) : null,
    adding ? h(AddCardDoor, { bench, onAdded, onClose: () => { setAdding(false) } }) : null,
  )
}

function RunView({ run, onBack, onRestored }: {
  run: CardsRunValue
  onBack: (() => void) | undefined
  onRestored: () => void
}): ReturnType<typeof h> {
  const [restoring, setRestoring] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const onRestore = useCallback((): void => {
    setRestoring(true)
    setNote(null)
    restoreRunToBench(run).then((report) => {
      const extra = report.notes.length > 0 ? ' (' + report.notes.join('; ') + ')' : ''
      const skipped = report.skipped > 0 ? ', ' + String(report.skipped) + ' skipped' : ''
      setNote('restored ' + String(report.added) + ' stage(s) to the bench' + skipped + extra)
      setRestoring(false)
      onRestored()
    }).catch((e: unknown) => {
      setNote(e instanceof Error ? e.message : String(e))
      setRestoring(false)
    })
  }, [run, onRestored])
  return h('section', { className: css.runView, 'data-run-status': run.status },
    h('header', { className: css.runHead },
      h('span', { className: css.runId }, run.runId),
      h('span', { className: css.runStatus }, run.status),
    ),
    h('div', { className: css.runActions },
      onBack !== undefined
        ? h('button', { className: css.back, type: 'button', onClick: onBack }, 'Back to bench')
        : null,
      h('button', {
        className: css.restore,
        type: 'button',
        disabled: restoring || run.draftId === null,
        title: run.draftId === null ? 'this run names no draft — nothing to restore' : 'copy this run\u2019s stages back onto the bench as your own',
        onClick: onRestore,
      }, restoring ? 'Restoring…' : 'Restore to bench'),
    ),
    note !== null ? h('p', { className: css.restoreNote }, note) : null,
    run.stages.length === 0
      ? h('p', { className: css.empty }, 'No stage rows yet.')
      : h('ol', { className: css.tileGrid }, run.stages.map((s) => {
          const thumb = s.url !== undefined ? mediaUrl(run.runId, s.url) : null
          const dot: 'done' | 'ongoing' | 'error' | 'warning' | null
            = s.status === 'done' ? 'done'
            : s.status === 'running' ? 'ongoing'
            : s.status === 'failed' ? 'error'
            : s.status === 'queued' || s.status === 'pending' ? 'warning' : null
          const face = thumb !== null
            ? h('a', { href: thumb, target: '_blank', rel: 'noreferrer', className: css.tileImgLink },
                h('img', { className: css.tileImg, src: thumb, alt: s.id, loading: 'lazy' }))
            : h('span', { className: css.kindFace, 'data-kind': s.id },
                h('span', { className: css.kindInitial }, s.id.slice(0, 1).toUpperCase()),
                h('span', { className: css.kindName }, s.id),
              )
          return h('li', { key: s.id, className: css.tile, 'data-stage-status': s.status },
            h('div', { className: css.tileInner, 'data-status': s.status },
              h('span', { className: css.tilePreview },
                face,
                dot !== null ? h('span', { className: css.tileDot }, h(StateDot, { state: dot })) : null,
              ),
              h('span', { className: css.tileCaption },
                h('span', { className: css.tileTitle }, s.id),
                h('span', { className: css.tileMeta }, s.status),
              ),
            ),
          )
        })),
  )
}

/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 *  the shell's navigation address is the SHELL's (guide clicks arrive
 *  as the tab id's own address, not a cards address). An address that
 *  does not parse as a cards address serves the BENCH — the tab never
 *  sits on a resource no provider claims. */
export function resolveCardsAddress(rawAddress: string): string {
  return parseCardsAddress(rawAddress) !== null ? rawAddress : CARDS_BENCH_ADDRESS
}

/** The tab body component. */
export function CardsTab(props: CardsTabProps): ReturnType<typeof h> {
  const info = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
  const rawAddress = info?.tab.navigation.address ?? info?.tab.contentId ?? CARDS_BENCH_ADDRESS
  const address = resolveCardsAddress(rawAddress)
  const openResource = info?.tab.actions.openResource
  const snapshot = typeof props.useResource === 'function' ? props.useResource(address) : undefined
  const [running, setRunning] = useState(false)

  const onStarted = useCallback((runId: string): void => {
    setRunning(false)
    if (openResource !== undefined) openResource('dsh-resource://cards/run/' + encodeURIComponent(runId))
  }, [openResource])

  const onRun = useCallback((): void => {
    if (snapshot?.value?.kind !== 'bench') return
    setRunning(true)
    void runTheBench(snapshot.value, onStarted)
  }, [snapshot, onStarted])

  const onBack = useCallback((): void => {
    if (openResource !== undefined) openResource(CARDS_BENCH_ADDRESS)
  }, [openResource])

  if (snapshot === undefined) {
    return h('p', { className: css.missing }, 'cards resource hook unavailable')
  }
  if (snapshot.status === 'loading' || snapshot.status === 'none') {
    return h('p', { className: css.loading }, 'loading ' + address + '…')
  }
  if (snapshot.status === 'failed') {
    return h('p', { className: css.failed }, snapshot.failure?.message ?? 'cards resource failed')
  }
  const value = snapshot.value
  if (value === undefined) {
    return h('p', { className: css.failed }, 'cards resource gave no value')
  }
  return value.kind === 'bench'
    ? h(OldFlowMount, { bench: value })
    : h(RunView, { run: value, onBack: openResource !== undefined ? onBack : undefined, onRestored: onBack })
}
