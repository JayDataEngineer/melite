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
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, Modal, Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { fetchCardCatalog, fetchFormSpec, specDefaults, specPatch, SpecForm } from './spec-form.tsx'
import type { CatalogCard, FormSpecDoc, SpecValues } from './spec-form.tsx'
import { paramFields, patchStageParams } from './draft.ts'
import css from './card.module.css'
import type { CardsBenchValue, CardsRunValue, BenchStageRow } from './cards-resource.ts'
import { CARDS_BENCH_ADDRESS, cardsRunAddress, fetchBench, openCardsResource, parseCardsAddress, restoreRunToBench } from './cards-resource.ts'
import { addStageWire, groupStagesWire, removeStageWire, reorderStageWire, rewireStageWire, ungroupStageWire } from './add-stage.ts'
import { CardZoomOverlay, cardLayoutId, ZOOM_SPRING } from './zoom.tsx'
import { motion } from 'framer-motion'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
async function runStages(
  draftId: string,
  rows: readonly BenchStageRow[],
): Promise<{ runId: string } | { refused: string }> {
  const stages = rows.map(projectStage)
  if (stages.length === 0) return { refused: 'nothing to run' }
  const rpcId = nextRpcId()
  try {
    const res = await fetch('/api/runs/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId,
        method: 'runs/start',
        // test:false — a real run. The registry's envelope gate
        // requires an explicit boolean (absent/null is refused), and
        // the flow body needs its id (the bench runs under its own
        // draft_id — the bench verb's one truth).
        payload: { args: { doc: { flow_inline: { id: draftId, stages }, draft_id: draftId, test: false } } },
      }),
    })
    if (!res.ok) {
      return { refused: 'run refused: HTTP ' + String(res.status) }
    }
    const body: unknown = await res.json().catch(() => null)
    if (typeof body !== 'object' || body === null
        || Reflect.get(body, 'type') !== 'server-response'
        || Reflect.get(body, 'rpcId') !== rpcId) {
      return { refused: 'run refused: malformed response frame' }
    }
    const result: unknown = Reflect.get(body, 'result')
    if (typeof result !== 'object' || result === null) {
      return { refused: 'run refused: malformed result' }
    }
    if (Reflect.get(result, 'ok') === true) {
      const runId = Reflect.get(Reflect.get(result, 'value') as object, 'run_id')
      if (typeof runId === 'string' && runId !== '') {
        return { runId }
      }
      return { refused: 'run refused: no run_id in the answer' }
    }
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : 'runs/start refused'
    return { refused: String(message) }
  } catch (e) {
    return { refused: e instanceof Error ? e.message : 'run request failed' }
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

/** Run ALL — the header gesture (multi-stage benches are refused by
 *  the single-stage runs gateway until the estate queues flows; the
 *  refusal surfaces inline, never a fake success). */
async function runTheBench(bench: CardsBenchValue): Promise<{ runId: string } | { refused: string }> {
  return await runStages(bench.draftId, bench.stages)
}

/** runs/stop — the cancel door (the registry seat's flag + interrupt).
 *  Same wire frame as every other verb. */
async function stopRunWire(runId: string): Promise<void> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/runs/stop', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method: 'runs/stop', payload: { args: { runId } } }),
  })
  if (!res.ok) throw new Error('runs/stop: HTTP ' + String(res.status))
  const body: unknown = await res.json().catch(() => null)
  if (typeof body !== 'object' || body === null || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error('runs/stop: malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null || Reflect.get(result, 'ok') !== true) {
    const error: unknown = typeof result === 'object' && result !== null ? Reflect.get(result, 'error') : null
    throw new Error(typeof error === 'object' && error !== null && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') as string : 'runs/stop refused')
  }
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
/** The OLD system's drag contract, VERBATIM (2026-08-08/08-22 era,
 *  recovered from d13560be^ packages/web-kit): capability tiles carry
 *  a fully-resolved card; asset tiles carry {url, type}. One drop
 *  target, two contracts, no ambiguity — the MIME pair is the law. */
const CAPABILITY_DRAG_MIME = 'application/tech-noir-capability'
const ASSET_DRAG_MIME = 'application/tech-noir-asset'

interface CapabilityDropPayload { service: string; title: string; params?: Record<string, unknown>; kind?: string }

/** Parse the capability MIME off a drop event. null = absent or
 *  malformed (falls through to the asset/file path) — old law. */
function parseCapabilityDrop(raw: string): CapabilityDropPayload | null {
  if (raw === '') return null
  try {
    const p = JSON.parse(raw) as Partial<CapabilityDropPayload>
    if (typeof p.service === 'string' && typeof p.title === 'string') return p as CapabilityDropPayload
    return null
  } catch { return null }
}

interface AssetDropPayload { url?: string; type?: string }

function parseAssetDrop(raw: string): AssetDropPayload {
  if (raw === '') return {}
  try { return JSON.parse(raw) as AssetDropPayload } catch { return {} }
}

/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL) → the
 *  input-dir name input-prep's `source` field accepts. The door's own
 *  gates (type whitelist, one clean segment) are the law — the client
 *  only voices its refusals, never invents its own. */
async function uploadInputFile(file: File): Promise<{ name: string }> {
  const isImage = file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp'
  const isAudio = file.type.startsWith('audio/')
  if (!isImage && !isAudio) {
    throw new Error('Input cards don\u2019t accept ' + (file.type !== '' ? file.type : 'that file') + ' \u2014 drop an image or audio file')
  }
  if (!isImage) {
    throw new Error('audio uploads have no door yet \u2014 the uploads door boards png / jpeg / webp only')
  }
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => { resolve(String(r.result)) }
    r.onerror = () => { reject(new Error('could not read the dropped file')) }
    r.readAsDataURL(file)
  })
  const res = await fetch('/v1/uploads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ filename: file.name.replace(/[^A-Za-z0-9._-]/g, '_'), data: dataUrl }),
  })
  if (!res.ok) throw new Error('upload refused: HTTP ' + String(res.status))
  const out: unknown = await res.json()
  const path = typeof out === 'object' && out !== null && typeof Reflect.get(out, 'path') === 'string'
    ? Reflect.get(out, 'path') as string : ''
  if (path === '') throw new Error('upload answered without a path')
  return { name: path.split('/').pop() ?? file.name }
}

/** The sortable tile wrapper — the old grid's SortableCardWrap
 *  pattern: the li is the drag unit, transform/transition ride the
 *  wrapper, the shared-element layoutId stays INSIDE (the morph
 *  anchor is unbroken). */
function SortableTile({ row, entered, onOpen, onWireDrop, onWireArm, wireSrc, grouping, selected, onToggleSelect, onAssetAttach }: {
  row: CardRowLineTabRow
  entered: boolean
  onOpen: (row: CardRowLineTabRow) => void
  onWireDrop: (target: string, source: string) => void
  onWireArm: (id: string) => void
  wireSrc: string | null
  grouping: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  /** DROP-ON-CARD ATTACHES TO SLOT (the old SlotSquare law): an asset
   *  tile or OS image file dropped ON this tile patches the stage's
   *  source param — the estate's slot mechanism for direct assets.
   *  source = the asset URL or the raw File; the bench owns upload
   *  and error surfacing. */
  onAssetAttach: (target: string, source: string | File) => void
}): ReturnType<typeof h> {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  // selection mode: pointer listeners OFF (reorder pauses), clicks
  // toggle selection — the old sub-view's law, verbatim.
  const dragProps = grouping ? {} : { ...attributes, ...listeners }
  const wiredFrom = typeof row.stage.inputs === 'object' && row.stage.inputs !== null
    && 'source' in (row.stage.inputs as Record<string, unknown>)
  // WIRE MODE (2026-09-11): the ⛓ button arms the tile as the wire
  // SOURCE; the next tile CLICKED becomes the target (its `source`
  // input wires from this stage's first declared output). Click the
  // armed tile again to cancel. Unambiguous with the dnd-kit pointer
  // drag (reorder) — the two gestures can never collide.
  const wiring = wireSrc !== null
  return h('li', {
    ref: setNodeRef,
    className: css.tile
      + (entered ? ' ' + css.tileEnter : '')
      + (isDragging ? ' ' + css.tileDragging : '')
      + (wiring ? ' ' + css.wiring : '')
      + (wireSrc === row.id ? ' ' + css.wiringSource : ''),
    style: { transform: CSS.Translate.toString(transform), ...(transition !== null ? { transition } : {}) },
    'data-stage-id': row.id,
    'data-stage-status': row.status,
    'data-wiring': wireSrc === row.id ? 'source' : wiring ? 'target' : null,
    'data-grouping': grouping ? 'on' : null,
    'data-selected': grouping && selected ? 'on' : null,
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes('Files')) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    onDrop: (e: React.DragEvent) => {
      const asset = parseAssetDrop(e.dataTransfer.types.includes(ASSET_DRAG_MIME) ? e.dataTransfer.getData(ASSET_DRAG_MIME) : '')
      if ((asset.url ?? '') !== '') {
        e.preventDefault()
        e.stopPropagation()
        const t = asset.type ?? ''
        if (!t.startsWith('image/') && !t.startsWith('audio/')) return
        onAssetAttach(row.id, asset.url as string)
        return
      }
      const file = e.dataTransfer.files[0]
      if (file === undefined) return
      if (file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/webp') return
      e.preventDefault()
      e.stopPropagation()
      onAssetAttach(row.id, file)
    },
    ...dragProps,
  },
    h(motion.div, { layoutId: cardLayoutId(row.id), className: css.tileShared, transition: ZOOM_SPRING },
      h('button', {
        className: css.tileInner, type: 'button', 'data-status': row.status,
        onClick: () => {
          if (grouping) { onToggleSelect(row.id); return }
          if (wireSrc === null) { onOpen(row); return }
          if (wireSrc === row.id) { onWireArm(row.id); return } // self-click cancels
          onWireDrop(row.id, wireSrc)
        },
      },
        grouping ? h('span', {
          className: css.checkCircle + (selected ? ' ' + css.checkOn : ''),
          'aria-hidden': 'true',
        }, selected ? '\u2713' : '') : null,
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
          h('span', { className: css.tileTitle }, row.title,
            wiredFrom ? h('span', { className: css.wiredMark, title: 'source wired' }, ' ⛓') : null,
            row.sourceAttached ? h('span', { className: css.wiredMark, title: 'source attached' }, ' 📎') : null,
          ),
          h('span', { className: css.tileMeta },
            row.service !== null ? row.service : null,
            row.upstream !== null ? h('span', { className: css.upstreamBadge, title: 'source ⟵ ' + row.upstream }, '\u27f5 ' + row.upstream) : null,
            row.prompt !== null ? h('span', { className: css.tilePrompt }, row.prompt) : null,
          ),
          row.status !== '' && row.status !== 'ready'
            ? h('span', { className: css.statusChip, 'data-status': row.status }, row.status)
            : null,
        ),
        // the ⛓ arm button — a SIBLING of the open button (no nested
        // buttons in HTML), riding the tile's top-right corner
        h('button', {
          className: css.wireBtn, type: 'button',
          'aria-label': 'Wire from this stage',
          title: 'Wire from this stage',
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); onWireArm(row.id) },
        }, '⛓'),
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
  upstream: string | null
  sourceAttached: boolean
  stage: BenchStageRow
}

function benchRow(stage: BenchStageRow, bench?: CardsBenchValue): CardRowLineTabRow {
  const isGroup = stage.card === 'group'
  const children = isGroup && Array.isArray(stage.children) ? stage.children.length : 0
  const title = isGroup
    ? 'Group (' + String(children) + ')'
    : (stage.title ?? stage.card ?? stage.id)
  const status = typeof stage.runStatus === 'string' && stage.runStatus !== '' ? stage.runStatus : 'ready'
  const params = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const promptRaw = typeof params['prompt'] === 'string' ? params['prompt'] : ''
  const result = stage.result
  const url = typeof result === 'object' && result !== null && typeof Reflect.get(result, 'url') === 'string'
    ? Reflect.get(result, 'url') as string
    : ''
  return {
    id: stage.id,
    kind: isGroup ? 'group' : String(stage.card ?? 'card'),
    title: String(title),
    service: typeof stage.engine === 'string' && stage.engine !== '' ? stage.engine : null,
    status,
    dot: STAGE_DOT[status] ?? null,
    prompt: promptRaw !== '' ? promptRaw.slice(0, 96) : null,
    // same-origin absolute or leading-/ artifact urls render; a bare
    // run-relative filename cannot resolve without its run (the run
    // view owns that face) — the kind Pill rides instead.
      thumbUrl: /^(https?:\/\/|\/)/.test(url) ? url : null,
    // THE UPSTREAM BADGE's text: the source stage's own card name (the
    // old UpstreamBadge resolved indices; the named-input era resolves
    // the id through the bench).
    upstream: (() => {
      const inputs = typeof stage.inputs === 'object' && stage.inputs !== null ? stage.inputs as Record<string, unknown> : null
      const edge = inputs !== null && typeof inputs['source'] === 'object' && inputs['source'] !== null
        ? inputs['source'] as Record<string, unknown> : null
      const from = edge !== null && typeof edge['stage'] === 'string' ? edge['stage'] : ''
      if (from === '' || bench === undefined) return null
      const upstreamRow = bench.stages.find((s) => s.id === from)
      return upstreamRow !== undefined ? String(upstreamRow.card ?? upstreamRow.id) : null
    })(),
    sourceAttached: typeof params['source'] === 'string' && params['source'] !== '',
    stage,
  }
}

/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
 *  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
 *  groups, defaults); the drill renders THAT, never a raw key/value
 *  dump. Params left, Run right; the patch carries only CHANGED keys
 *  (coerced once, at patch time — the editPatch law); then the run
 *  gesture (patch lands in the domain BEFORE the run reads it). */
function StageDrill({ stage, bench, running, onRun, onClose, onRemoved, onRewired }: {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  onClose: () => void
  onRemoved: () => void
  onRewired: () => void
}): ReturnType<typeof h> {
  const title = String(stage.title ?? stage.card ?? stage.id)
  const held: SpecValues = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [values, setValues] = useState<SpecValues>({})
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [removing, setRemoving] = useState(false)
  // THE WIRE DROPDOWN (the old system's second wire vector): this
  // stage's `source` input ⟵ another stage's first declared output
  // ('default' when none declared), or NONE to clear.
  const inputs: Record<string, unknown> = typeof stage.inputs === 'object' && stage.inputs !== null
    ? stage.inputs as Record<string, unknown> : {}
  const sourceEdge = typeof inputs['source'] === 'object' && inputs['source'] !== null
    ? inputs['source'] as Record<string, unknown> : null
  const wiredStage = sourceEdge !== null && typeof sourceEdge['stage'] === 'string' ? sourceEdge['stage'] : ''
  const others = bench.stages.filter((s) => s.id !== stage.id)
  const setWire = async (fromId: string): Promise<void> => {
    setError(null)
    try {
      const fromStage = bench.stages.find((s) => s.id === fromId)
      const outputs = fromStage !== undefined && Array.isArray(fromStage.outputs)
        ? fromStage.outputs : []
      await rewireStageWire(fromId === ''
        ? { stage: stage.id, input: 'source', expect_rev: bench.rev }
        : { stage: stage.id, input: 'source', from: { stage: fromId, output: outputs[0] ?? 'default' }, expect_rev: bench.rev })
      onRewired()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'wire failed')
    }
  }
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
  const remove = async (): Promise<void> => {
    setError(null)
    setRemoving(true)
    try {
      await removeStageWire({ stage: stage.id, expect_rev: bench.rev })
      onRemoved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'remove failed')
      setRemoving(false)
    }
  }
  // THE GROUP FACE: a compound's drill is its member list + Ungroup
  // (no params, no Run — compounds organize; chain-running rides the
  // multi-stage estate debt, surfaced not hidden).
  if (stage.card === 'group') {
    const members: BenchStageRow[] = Array.isArray(stage.children)
      ? stage.children.filter((c): c is BenchStageRow =>
          typeof c === 'object' && c !== null && typeof Reflect.get(c, 'id') === 'string') : []
    const ungroup = async (): Promise<void> => {
      setError(null)
      setRemoving(true)
      try {
        await ungroupStageWire({ stage: stage.id, expect_rev: bench.rev })
        onRemoved()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'ungroup failed')
        setRemoving(false)
      }
    }
    return h('div', { className: css.zoomDetail },
      h('p', { className: css.groupNote },
        'A compound of ' + String(members.length) + ' stages. Ungroup restores them at this position.'),
      h('ol', { className: css.memberList },
        members.map((m, i) => h('li', { key: m.id, className: css.memberRow },
          h('span', { className: css.memberIdx }, String(i + 1) + '.'),
          h('span', { className: css.memberName }, String(m.title ?? m.card ?? m.id)),
        ))),
      h('div', { className: css.runRow },
        error !== null ? h('span', { className: css.runError }, error) : null,
        h('button', {
          className: css.back, type: 'button',
          disabled: removing,
          onClick: () => { void ungroup() },
        }, removing ? 'ungrouping…' : 'Ungroup'),
      ),
    )
  }
  // THE ZOOM DETAIL (2026-09-11): no Modal — this renders INSIDE the
  // shared-element zoom card (the tile's morph target). The params/
  // Run split is the old drill content, container is the zoom card.
  return h('div', { className: css.zoomDetail },
    h('div', { className: css.wireRow },
      h('span', { className: css.wireLabel }, 'source input ⟵'),
      h('select', {
        className: css.specSelect,
        value: wiredStage,
        'aria-label': 'Wire source input from stage',
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => { void setWire(e.target.value) },
      },
        h('option', { key: '', value: '' }, wiredStage !== '' ? '— clear wire —' : '— none —'),
        others.map((s) => h('option', { key: s.id, value: s.id },
          String(s.title ?? s.card ?? s.id) + ' → ' + stage.id)),
      ),
    ),
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
        h('div', { className: css.runRow },
          h('button', {
            className: css.back,
            type: 'button',
            disabled: running || removing,
            onClick: () => { void remove() },
          }, removing ? 'removing…' : 'Remove stage'),
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

function BenchView({ bench, onRun, onRunStage, running }: {
  bench: CardsBenchValue
  onRun: () => void
  onRunStage: (stage: BenchStageRow) => void
  running: boolean
}): ReturnType<typeof h> {
  // The LIVE bench: the resource snapshot is the first frame only (the
  // provider's bench stream ends after one snapshot), so the view owns
  // its copy and reloads after its own edits — same-address navigation
  // does not re-run the stream.
  const [live, setLive] = useState<CardsBenchValue>(bench)
  useEffect(() => { setLive(bench) }, [bench.draftId, bench.rev])
  // TILE-POP (the old tree's animate-tile-pop): a tile whose id was not
  // in the previous render's set lands with the soft pop — fresh adds,
  // not reloads of the same bench.
  const knownIds = useRef<Set<string>>(new Set(bench.stages.map((s) => s.id)))
  const [entered, setEntered] = useState<Set<string>>(new Set())
  useEffect(() => {
    const fresh: string[] = []
    for (const s of live.stages) {
      if (!knownIds.current.has(s.id)) { knownIds.current.add(s.id); fresh.push(s.id) }
    }
    if (fresh.length > 0) {
      setEntered((prev) => { const next = new Set(prev); for (const id of fresh) next.add(id); return next })
    }
  }, [live.stages])
  const [open, setOpen] = useState<BenchStageRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [reloadError, setReloadError] = useState<string | null>(null)
  const onOpen = useCallback((stage: BenchStageRow): void => setOpen(stage), [])
  const onClose = useCallback((): void => setOpen(null), [])
  const onAddCard = useCallback((): void => setAdding(true), [])
  // keepOpen: the wire path — the drill STAYS OPEN and its stage row
  // swaps to the fresh one (the old system updated the wire in place;
  // only remove-stage closes the drill).
  const reload = useCallback((opts?: { keepOpen?: boolean }): void => {
    setReloadError(null)
    fetchBench()
      .then((next) => {
        setLive(next)
        if (opts?.keepOpen === true) {
          setOpen((cur) => cur === null ? null : (next.stages.find((s) => s.id === cur.id) ?? null))
        } else {
          setOpen(null)
        }
      })
      .catch((e: unknown) => { setReloadError(e instanceof Error ? e.message : 'bench reload failed') })
  }, [])
  const onAdded = useCallback((): void => {
    setAdding(false)
    reload()
  }, [reload])
  // ── DRAG REORDER (dnd-kit, the old grid's SortableCardWrap pattern):
  //    optimistic splice, then the door; a refusal reloads the truth.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const onDragEnd = useCallback((e: DragEndEvent): void => {
    const active = String(e.active.id)
    const over = e.over !== null ? String(e.over.id) : null
    if (over === null || over === active || over === 'add') return
    const from = live.stages.findIndex((s) => s.id === active)
    const to = live.stages.findIndex((s) => s.id === over)
    if (from < 0 || to < 0) return
    const next = live.stages.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    const beforeRev = live.rev
    setLive((cur) => ({ ...cur, stages: next }))
    void reorderStageWire({ stage: active, to, expect_rev: beforeRev })
      .then((row) => {
        const rev = typeof row['rev'] === 'number' ? row['rev'] as number : beforeRev + 1
        setLive((cur) => ({ ...cur, rev }))
      })
      .catch((err: unknown) => {
        setReloadError(err instanceof Error ? err.message : 'reorder failed')
        reload()
      })
  }, [live, reload])
  // ── TILE-ON-TILE WIRE, click form (2026-09-11): the ⛓ button arms a
  //    source tile; clicking another tile commits — target.source ⟵
  //    source's first declared output ('default' when none declared).
  //    The canvas-era drag gesture cannot survive dnd-kit's pointer
  //    claim on the same mousedown; clicks are unambiguous.
  const [wireSrc, setWireSrc] = useState<string | null>(null)
  const onWireArm = useCallback((id: string): void => {
    setWireSrc((cur) => (cur === id ? null : id))
  }, [])
  const onWireDrop = useCallback((target: string, source: string): void => {
    setWireSrc(null)
    const src = live.stages.find((s) => s.id === source)
    const outputs = src !== undefined && Array.isArray(src.outputs)
      ? src.outputs : []
    void rewireStageWire({ stage: target, input: 'source', from: { stage: source, output: outputs[0] ?? 'default' }, expect_rev: live.rev })
      .then(() => { reload() })
      .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'wire failed') })
  }, [live, reload])
  // ── CAPABILITY / ASSET / FILE DROP SURFACE (slice 3): the grid is
  //    the old onCardsDrop target reborn — capability tile lands a new
  //    stage; asset tile lands an input-prep card; OS image file rides
  //    the /v1/uploads door then lands the same way.
  const [capOver, setCapOver] = useState(false)
  const dropInterested = (e: React.DragEvent): boolean =>
    e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)
    || e.dataTransfer.types.includes(ASSET_DRAG_MIME)
    || e.dataTransfer.types.includes('Files')
  const onGridDragOver = useCallback((e: React.DragEvent): void => {
    if (!dropInterested(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setCapOver(true)
  }, [])
  const onGridDragLeave = useCallback((e: React.DragEvent): void => {
    if (e.relatedTarget === null) setCapOver(false)
  }, [])
  const onGridDrop = useCallback((e: React.DragEvent): void => {
    if (!dropInterested(e)) return
    e.preventDefault()
    setCapOver(false)
    if (e.dataTransfer.types.includes(CAPABILITY_DRAG_MIME)) {
      const cap = parseCapabilityDrop(e.dataTransfer.getData(CAPABILITY_DRAG_MIME))
      if (cap === null) return
      // the door's ADD_KEYS carry no `title` — stages are named by
      // their card (benchRow: title ?? card ?? id); the payload's
      // title is diagnostics, not a stage field.
      void addStageWire({
        card: cap.service,
        ...(cap.params !== undefined && Object.keys(cap.params).length > 0 ? { params: cap.params } : {}),
        expect_rev: live.rev,
      })
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'add refused') })
      return
    }
    if (e.dataTransfer.types.includes(ASSET_DRAG_MIME)) {
      const payload = parseAssetDrop(e.dataTransfer.getData(ASSET_DRAG_MIME))
      if ((payload.url ?? '') === '') return
      const t = payload.type ?? ''
      const ok = t.startsWith('image/') || t.startsWith('audio/')
      if (!ok) {
        setReloadError(t !== '' ? 'Input cards don\u2019t accept ' + t + ' assets' : 'That asset isn\u2019t supported \u2014 drop an image or audio asset')
        return
      }
      void addStageWire({
        card: 'input-prep',
        params: { source: payload.url },
        expect_rev: live.rev,
      })
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'add refused') })
      return
    }
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file === undefined) return
      void uploadInputFile(file)
        .then(({ name }) => addStageWire({
          card: 'input-prep',
          params: { source: name },
          expect_rev: live.rev,
        }))
        .then(() => { reload() })
        .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'drop refused') })
    }
  }, [live, reload])
  // ── GROUP CARDS SUB-VIEW (2026-09-11, the old 2026-08-12 law):
  //    the header's Group action flips the grid into selection mode —
  //    check circles on tiles, clicks toggle selection (no zoom, no
  //    reorder), the floating bar carries Group N cards / Cancel, Esc
  //    clears. Group → bench/group with the bench-ordered ids.
  const [grouping, setGrouping] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const onToggleSelect = useCallback((id: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const exitGrouping = useCallback((): void => {
    setGrouping(false)
    setSelectedIds(new Set())
  }, [])
  useEffect(() => {
    if (!grouping) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      const t = e.target as HTMLElement | null
      if (t !== null && typeof t.closest === 'function'
          && t.closest('input, textarea, select, [contenteditable]') !== null) return
      exitGrouping()
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [grouping, exitGrouping])
  // drop selections whose stages vanished (grouped away / removed)
  useEffect(() => {
    if (selectedIds.size === 0) return
    const present = new Set(live.stages.map((s) => s.id))
    const stale = [...selectedIds].filter((id) => !present.has(id))
    if (stale.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of stale) next.delete(id)
      return next
    })
  }, [live.stages, selectedIds])
  const onGroup = useCallback((): void => {
    const ordered = live.stages.map((s) => s.id).filter((id) => selectedIds.has(id))
    if (ordered.length < 2) return
    void groupStagesWire({ stages: ordered, expect_rev: live.rev })
      .then(() => { exitGrouping(); reload() })
      .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'group refused') })
  }, [live, selectedIds, exitGrouping, reload])
  // ── DROP-ON-CARD ATTACHES TO SLOT: the asset URL (or the uploaded
  //    file's input-dir name) patches the TARGET stage's source param
  //    through drafts/patch — the estate's slot mechanism for direct
  //    assets (the old SlotSquare's onDropAsset/onDropFile law).
  const onAssetAttach = useCallback((target: string, source: string | File): void => {
    void (typeof source === 'string'
      ? Promise.resolve(source)
      : uploadInputFile(source).then(({ name }) => name))
      .then((src) => patchStageParams(live.draftId, target, { source: src }))
      .then(() => { reload({ keepOpen: true }) })
      .catch((err: unknown) => { setReloadError(err instanceof Error ? err.message : 'attach refused') })
  }, [live, reload])
  const benchRev = live.rev
  return h('section', { className: css.cardsBench, 'data-cards-bench': benchRev },
    h('header', { className: css.benchHead },
      h('span', { className: css.revTag }, 'rev ' + benchRev),
      grouping
        ? h('span', { className: css.groupBar },
            h('button', {
              className: css.runBtn,
              type: 'button',
              disabled: selectedIds.size < 2,
              title: selectedIds.size < 2 ? 'select 2+ tiles to group' : 'collapse the selected stages into one compound',
              onClick: onGroup,
            }, 'Group ' + String(selectedIds.size) + ' cards'),
            h('button', { className: css.back, type: 'button', onClick: exitGrouping }, 'Cancel'),
          )
        : h('span', { className: css.groupBar },
            h('button', {
              className: css.back,
              type: 'button',
              disabled: live.stages.length < 2,
              title: live.stages.length < 2 ? 'grouping needs 2+ stages' : 'enter the selection sub-view',
              onClick: () => { setGrouping(true) },
            }, 'Group Cards'),
            h('button', {
              className: css.runBtn,
              type: 'button',
              disabled: running || live.stages.length === 0,
              onClick: onRun,
            }, 'Run'),
          ),
    ),
    reloadError !== null ? h('p', { className: css.runError }, reloadError) : null,
    live.stages.length === 0
      ? h('p', { className: css.empty }, 'The bench is empty — construct stages (the agent adds them; they land here).')
      : h(DndContext, { sensors, collisionDetection: closestCenter, onDragEnd },
          h(SortableContext, {
            items: live.stages.map((s) => s.id),
            strategy: rectSortingStrategy,
            children: h('ol', {
              className: css.tileGrid + (capOver ? ' ' + css.capOver : ''),
              onDragOver: onGridDragOver,
              onDragLeave: onGridDragLeave,
              onDrop: onGridDrop,
              'data-drop-surface': 'cards',
            },
              live.stages.map((s) => {
                const row = benchRow(s, live)
                return h(SortableTile, {
                  key: s.id, row, entered: entered.has(s.id),
                  onOpen: (r) => onOpen(r.stage),
                  onWireDrop, onWireArm, wireSrc,
                  grouping, selected: selectedIds.has(s.id), onToggleSelect, onAssetAttach,
                })
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
          }),
        ),
    live.log.length > 0
      ? h('p', { className: css.logHead }, live.log.length + ' log entr' + (live.log.length === 1 ? 'y' : 'ies'))
      : null,
    // THE ZOOM (2026-09-11): the drill is the shared-element morph —
    // the tile GROWS into the zoom card (spring 300/30), the modal is
    // dead (the old tree's own law: "the modal was a second surface;
    // both are dead").
    open !== null ? h(CardZoomOverlay, {
      stage: open,
      bench: live,
      running,
      onRun: () => { onRunStage(open) },
      onClose,
      onRemoved: () => { setOpen(null); reload() },
      onRewired: () => { reload({ keepOpen: true }) },
      detail: StageDrill,
    }) : null,
    adding ? h(AddCardDoor, { bench: live, onAdded, onClose: () => { setAdding(false) } }) : null,
  )
}

function RunView({ run, onBack, onRestored, onStop }: {
  run: CardsRunValue
  onBack: (() => void) | undefined
  onRestored: () => void
  onStop: ((runId: string) => void) | undefined
}): ReturnType<typeof h> {
  const [restoring, setRestoring] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)
  const live = run.status === 'queued' || run.status === 'pending' || run.status === 'running'
  const onCancel = (): void => {
    if (onStop === undefined) return
    setStopping(true)
    onStop(run.runId)
  }
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
      live && onStop !== undefined
        ? h('button', {
            className: css.cancelBtn,
            type: 'button',
            disabled: stopping,
            onClick: onCancel,
          }, stopping ? 'cancelling…' : 'Cancel run')
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
  // In-tab run view: when the host offers no navigation (openResource
  // undefined — e.g. a tab the shell mounted without actions), a started
  // run streams HERE through the same provider the resource plane uses
  // (hydrate + status poll to terminal), instead of stranding the user
  // on the bench with no feedback.
  const [localRun, setLocalRun] = useState<CardsRunValue | null>(null)
  const [localRunError, setLocalRunError] = useState<string | null>(null)
  const runStreamAbort = useRef<AbortController | null>(null)
  useEffect(() => () => { runStreamAbort.current?.abort() }, [])

  const onStarted = useCallback((runId: string): void => {
    setRunning(false)
    if (openResource !== undefined) {
      openResource(cardsRunAddress(runId))
      return
    }
    runStreamAbort.current?.abort()
    const ctrl = new AbortController()
    runStreamAbort.current = ctrl
    setLocalRunError(null)
    void (async () => {
      try {
        for await (const frame of openCardsResource(cardsRunAddress(runId), { signal: ctrl.signal })) {
          if (ctrl.signal.aborted) return
          if (frame.ok) setLocalRun(frame.value as CardsRunValue)
          else {
            const err: unknown = typeof frame === 'object' && frame !== null && 'error' in frame
              ? (frame as { error: unknown }).error
              : null
            setLocalRunError(err instanceof Error ? err.message : 'run stream failed')
            return
          }
        }
      } catch (e: unknown) {
        if (!ctrl.signal.aborted) setLocalRunError(e instanceof Error ? e.message : 'run stream failed')
      }
    })()
  }, [openResource])

  const onRun = useCallback((): void => {
    if (snapshot?.value?.kind !== 'bench') return
    setRunning(true)
    setLocalRunError(null)
    void runTheBench(snapshot.value).then((res) => {
      if ('runId' in res) onStarted(res.runId)
      else {
        setRunning(false)
        setLocalRunError(res.refused)
      }
    })
  }, [snapshot, onStarted])
  // RE-RUN ONE STAGE (the drill's Run, 2026-09-11): the single-stage
  // runs gateway serves exactly this — the stage alone, its params
  // patched into the bench BEFORE the run reads it (the drill does the
  // patch, this does the start).
  const onRunStage = useCallback((stage: BenchStageRow): void => {
    if (snapshot?.value?.kind !== 'bench') return
    setRunning(true)
    setLocalRunError(null)
    void runStages(snapshot.value.draftId, [stage]).then((res) => {
      if ('runId' in res) onStarted(res.runId)
      else {
        setRunning(false)
        setLocalRunError(res.refused)
      }
    })
  }, [snapshot, onStarted])
  // CANCEL — runs/stop on the run in view (both the resource stream
  // face and the in-tab local run face).
  const onStop = useCallback((runId: string): void => {
    void stopRunWire(runId).catch((e: unknown) => {
      setLocalRunError(e instanceof Error ? e.message : 'cancel failed')
    })
  }, [])

  const onBack = useCallback((): void => {
    if (openResource !== undefined) openResource(CARDS_BENCH_ADDRESS)
  }, [openResource])
  const onLocalBack = useCallback((): void => {
    runStreamAbort.current?.abort()
    setLocalRun(null)
    setLocalRunError(null)
  }, [])

  if (localRun !== null) {
    return h(RunView, { run: localRun, onBack: onLocalBack, onRestored: onLocalBack, onStop })
  }
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
    // Pure-DSH tab (2026-09-11): the bench renders the native BenchView
    // (tiles + drill + picker on the estate doors). The legacy 1:1
    // FlowCanvas branch was retired in Phase 2 (src/old/ deleted).
    ? h(Fragment, null,
        localRunError !== null ? h('p', { className: css.runError }, localRunError) : null,
        h(BenchView, {
          bench: value,
          onRun,
          onRunStage,
          running,
        }),
      )
    : h(RunView, { run: value, onBack: openResource !== undefined ? onBack : undefined, onRestored: onBack, onStop })
}
