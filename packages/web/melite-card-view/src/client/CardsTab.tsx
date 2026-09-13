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
import { createElement as h, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Menu, Modal, Pill, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import type { StageViewOwnerProps } from './types.ts'
import { fetchCardCatalog, fetchFormSpec, seedAxisValues, specDefaults, specPatch, SpecForm, useSquareProvider } from './spec-form.tsx'
import { fetchFormsTable } from '@melite/card-base/wire'

/** The /v1/forms edge-meta cache (card id → declared input/output
 *  kinds) — ONE fetch per browser session; the picker's kind
 *  matching (THE EDGE LAW) reads it. A failed fetch leaves null and
 *  the picker falls to the unfiltered list (never blocks a pick). */
let formsEdgeMetaPromise: Promise<Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }>> | null = null
function loadFormsEdgeMeta(): Promise<Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }>> {
  formsEdgeMetaPromise ??= fetchFormsTable().then((rows) => {
    const out: Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }> = {}
    for (const [id, row] of Object.entries(rows)) out[id] = { inputs: row.inputs, outputs: row.outputs }
    return out
  }).catch((e: unknown) => {
    formsEdgeMetaPromise = null // retry on the next mount
    throw e
  })
  return formsEdgeMetaPromise
}
import type { CatalogCard, FormSpecDoc, ModifierKind, SpecValues } from './spec-form.tsx'
import { paramFields, patchStageParams } from './draft.ts'
import css from './card.module.css'
import type { CardsBenchValue, CardsDraftValue, CardsRunValue, BenchStageRow } from './cards-resource.ts'
import { CARDS_BENCH_ADDRESS, cardsRunAddress, fetchBench, fetchLatestRunForDraft, freshStageRow, observeRunOutcome, openCardsResource, parseCardsAddress, reconcileBenchRuns, restoreRunToBench, uploadInputFile } from './cards-resource.ts'
import { defaultFamilyForCard, startCardRun, stopRun } from '@melite-plugin/melite-run-wire'
import { addStageWire, groupStagesWire, removeStageWire, reorderStageWire, ungroupStageWire } from './add-stage.ts'
import { AudioStagePreview, ImageStagePreview, MeshStagePreview, VideoStagePreview } from '@melite/card-base/preview'
import { CardZoomOverlay } from './zoom.tsx'
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
  (address: string): { status: 'none' | 'loading' | 'live' | 'failed'; value?: CardsBenchValue | CardsRunValue | CardsDraftValue; failure?: { message?: string } }
}

export interface CardsTabProps {
  useTabInfo?: () => TabInfo
  useResource?: ResourceHook
  /** Injected by the slot system because the seat registration
   *  declares 'cards.stage.view' + 'cards.stage.preview' as children
   *  (PropsRenderSlots shape; optional so test doubles and legacy
   *  mounts render the generic card). */
  renderSlot?: StageViewRenderSlot
}

/** The typed dispatch fn the slot system injects for the declared
 *  children — RenderSlotFn spelled locally so the component file
 *  stays free of the slot package's runtime graph. Hour-9: the
 *  preview seam's consult rides the same injection (keyed by media
 *  kind — the shared video/image previews). */
export interface StageViewRenderSlot {
  (key: 'cards.stage.view', owner: StageViewOwnerProps, opts?: { entryKey?: string; fallback?: import('react').ReactNode }): import('react').ReactNode
  (key: 'cards.stage.preview', owner: import('@melite/contracts').PreviewOwnerProps, opts?: { entryKey?: string; fallback?: import('react').ReactNode }): import('react').ReactNode
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

/** Correlation id — the run-wire package's ONE definition (re-exported
 *  by cards-resource for the tab's legacy importers). */

/** Run ONE card stage through the COMPOSING door (the run-wire
 *  package's startCardRun — the {model:} arm). The flow_inline door
 *  this gesture rode before cannot consume cards ("card= stages are
 *  unported on this gateway") and its executor demanded a pre-composed
 *  params.workflow nobody emitted — the Sep 11 bench runs' "node
 *  carries no inline workflow". The {model:} door composes the card's
 *  arms estate-side; `model` is the card's DEFAULT FAMILY from the
 *  catalog (the runs door resolves neither card ids nor aliases —
 *  defaultFamilyForCard carries the currency, session-cached).
 *  THE PARAM IS THE WIRE (the two-month law): whatever the stage's
 *  slot holds — an upload's estate path or a picked upstream output's
 *  media-route url — rides the start doc VERBATIM; the engine stages
 *  it under its runs-root arm. No client-side edge resolution exists.
 *  Exported for the tab seam's door-contract spec. */
export async function runCardStage(
  draftId: string,
  row: BenchStageRow,
): Promise<{ runId: string } | { refused: string }> {
  // THE NO-WIRE REFUSAL FIRST (the door contract): a row naming no
  // card refuses before any wire fires.
  if (typeof row.card !== 'string' || row.card === '') {
    return { refused: 'this stage names no card — nothing to compose' }
  }
  // THE FRESH-READ LAW (2026-09-13 incident): compose the ESTATE's
  // row, read back AFTER the drill's patch — the passed row is the
  // client's render snapshot (the row as it stood at open) and the
  // patch the drill just awaited lives only estate-side. Without this
  // read-back every param typed between open and Run is dropped (the
  // music prompt refusal). A failed read composes the held row — the
  // door refuses honestly rather than lying with a fallback fetch.
  const src = await freshStageRow(draftId, row.id) ?? row
  const params = typeof src.params === 'object' && src.params !== null && !Array.isArray(src.params)
    ? src.params as Record<string, unknown>
    : {}
  const card = typeof src.card === 'string' && src.card !== '' ? src.card : ''
  if (card === '') return { refused: 'this stage names no card — nothing to compose' }
  // THE MODEL PASS-ALONG (2026-09-12: "the card-ui package is supposed
  //  to pass along the model, variant, and quant fields"): the stage's
  //  held `model` param — what the Model/Variant/Quant axes wrote (the
  //  variant defaults overlay re-points it: raw → krea-2-raw) — rides
  //  the {model:} door VERBATIM. The card's default family is only the
  //  RESTING value for stages that never touched the axes.
  const heldModel = params['model']
  const model = typeof heldModel === 'string' && heldModel !== '' ? heldModel
    : await defaultFamilyForCard(card)
  // the declared surface spells SELECT options as strings; a legacy
  // row may hold the matching number — normalize through the spec
  // (only when the stringified value IS a declared option; anything
  // else rides verbatim and the door refuses honestly)
  let doc = params
  try {
    const spec = await fetchFormSpec(card)
    const selects = spec.fields.filter((f) => f.type === 'select' && Array.isArray(f.options))
    if (selects.length > 0) {
      doc = { ...params }
      for (const f of selects) {
        const v = doc[f.name]
        if (typeof v === 'number') {
          const opts = (f.options as Array<string | { value: string }>).map((o) => typeof o === 'string' ? o : o.value)
          if (opts.includes(String(v))) doc[f.name] = String(v)
        }
      }
    }
  } catch { /* spec unavailable — params ride verbatim */ }
  return await startCardRun({ model, params: doc, draftId })
}

/** THE PREVIEW SEAM CONSULT (hour-9 law: "Where the VIDEO PREVIEW
 *  and the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
 *  PRIMITIVES"): one consult, keyed by media kind, the card-base
 *  shared previews as the DEFAULTS. Every card's rendered output
 *  previews through this — image cards get the shared image preview,
 *  video cards the shared video one; a studio's own stage view is
 *  its specialization (the claim-over-default law). */
export function previewKindFor(url: string): 'video' | 'image' | null {
  const u = url.toLowerCase()
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video'
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/.test(u)) return 'image'
  return null
}

/** THE PRIMARY-OUTPUT RESOLUTION (2026-09-13): the card's DECLARED
 *  primary output — the served form-spec's `outputs.default` — is
 *  the preview's kind, never a url sniff. The sniff stays ONLY as
 *  the fallback: when no spec is in hand (a flow row without card
 *  identity), or when the declaration names a non-previewable kind
 *  (text/seg) whose artifacts may still carry a renderable url —
 *  mask-studio declares 'seg' and its artifact IS a png; the sniff
 *  keeps its gallery alive. Declared-previewable ALWAYS wins: an
 *  audio card previews audio even before artifacts land (the empty
 *  state names the kind), a mesh card rides the raw-three stage. */
const PREVIEWABLE_KINDS: ReadonlySet<string> = new Set(['video', 'image', 'audio', 'mesh'])

export function primaryKindFor(spec: FormSpecDoc | null | undefined, url: string): 'video' | 'image' | 'audio' | 'mesh' | null {
  const declared = spec?.outputs?.['default']
  if (typeof declared === 'string' && PREVIEWABLE_KINDS.has(declared)) {
    return declared as 'video' | 'image' | 'audio' | 'mesh'
  }
  return previewKindFor(url)
}

/** The stage row's preview artifacts, harvested from the estate's
 *  result shape (artifacts name→url map first, the flat assetUrls
 *  list second — the harvest law the h3 adapter states). */
export function previewArtifactsFor(row: Record<string, unknown>): Array<{ name: string, url: string }> {
  const result = typeof row['result'] === 'object' && row['result'] !== null ? row['result'] as Record<string, unknown> : {}
  const out: Array<{ name: string, url: string }> = []
  const arts = typeof result['artifacts'] === 'object' && result['artifacts'] !== null ? result['artifacts'] as Record<string, unknown> : {}
  for (const [name, val] of Object.entries(arts)) {
    if (typeof val === 'string' && val !== '') out.push({ name, url: val })
  }
  if (out.length === 0 && Array.isArray(result['assetUrls'])) {
    for (const u of result['assetUrls']) {
      if (typeof u === 'string' && u !== '') out.push({ name: 'output', url: u })
    }
  }
  if (out.length === 0 && typeof result['url'] === 'string' && result['url'] !== '') {
    out.push({ name: 'output', url: result['url'] as string })
  }
  return out
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

/** THE SEQUENTIAL PASS — Run ALL, the old system's composer law
 *  verbatim (flowExecuteSlice runAll, 2026-08-11): execute the
 *  stages IN ORDER, one run per card (the SAME single-stage door the
 *  drill's Run uses — a typed composer bench is never one graph
 *  run; the flow_inline door serves the chain/graph surface, not
 *  this one). Skip stages already done (the cache-hit skip). A
 *  failed or refused stage STOPS the pass — fail loud, never a
 *  doomed downstream run. The per-card observer patches each row as
 *  it goes (running → terminal), so the tiles flip one by one and
 *  the bench is never taken over. Exported for the door-contract
 *  spec. */
export async function runBenchSequential(
  bench: CardsBenchValue,
  hooks: {
    onCardStarted?: (runId: string, ran: { draftId: string; stageId: string }) => void
    onTouched?: () => void
    signal?: AbortSignal
  } = {},
): Promise<{ ran: string[]; stoppedAt: string | null; refused: string | null }> {
  const ran: string[] = []
  for (const stage of bench.stages) {
    if (hooks.signal?.aborted === true) return { ran, stoppedAt: null, refused: null }
    if (stage.runStatus === 'done') continue // the cache-hit skip
    const res = await runCardStage(bench.draftId, stage)
    if ('refused' in res) return { ran, stoppedAt: stage.id, refused: res.refused }
    hooks.onCardStarted?.(res.runId, { draftId: bench.draftId, stageId: stage.id })
    const terminal = await observeRunOutcome(bench.draftId, stage.id, res.runId, hooks.signal, hooks.onTouched)
    if (terminal !== 'done') {
      // failed / stopped / unknown — the pass stops at this card
      return { ran: [...ran, stage.id], stoppedAt: stage.id, refused: null }
    }
    ran.push(stage.id)
  }
  return { ran, stoppedAt: null, refused: null }
}

/** runs/stop — the cancel door (the registry seat's flag + interrupt);
 *  the run-wire package's verb. */

/** Bench row run-status → the installed StateDot union (FlowCards'
 *  CardRowLine law: done|warning|ongoing|error — a stage that never
 *  ran shows NO dot, never a fake state). */
const STAGE_DOT: Record<string, 'done' | 'ongoing' | 'error' | 'warning' | null> = {
  queued: 'warning', pending: 'warning', running: 'ongoing', done: 'done', failed: 'error', stopped: 'warning', ready: null,
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
/** The tile-reorder drag's MIME (native HTML5 sortable — DSH ships no
 *  drag library; the estate drags natively). Carries the source id. */
const CARD_DRAG_MIME = 'application/x-melite-card'

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

/** The sortable tile wrapper — the old grid's SortableCardWrap
 *  pattern: the li is the drag unit, transform/transition ride the
 *  wrapper, the shared-element layoutId stays INSIDE (the morph
 *  anchor is unbroken). */
/** runStatus text → the installed Tag tone union (the primitives
 *  catalog owns badge palettes; a copy is forbidden). */
function statusTone(status: string): 'success' | 'danger' | 'info' | 'warning' | 'neutral' {
  if (status === 'done' || status === 'succeeded') return 'success'
  if (status === 'error' || status === 'failed') return 'danger'
  if (status === 'running' || status === 'queued' || status === 'pending') return 'info'
  if (status === 'cancelled' || status === 'timeout') return 'warning'
  return 'neutral'
}

function SortableTile({ row, entered, onOpen, grouping, selected, onToggleSelect, onAssetAttach,
  dragging, dragOver, onReorderStart, onReorderOver, onReorderDrop }: {
  row: CardRowLineTabRow
  entered: boolean
  onOpen: (row: CardRowLineTabRow) => void
  grouping: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  /** native reorder state (the drag source id / this tile is over). */
  dragging: boolean
  dragOver: boolean
  onReorderStart: (id: string | null) => void
  onReorderOver: (id: string) => void
  onReorderDrop: (active: string, over: string) => void
  /** DROP-ON-CARD ATTACHES TO SLOT (the old SlotSquare law): an asset
   *  tile or OS image file dropped ON this tile patches the stage's
   *  source param — the estate's slot mechanism for direct assets.
   *  source = the asset URL or the raw File; the bench owns upload
   *  and error surfacing. */
  onAssetAttach: (target: string, source: string | File, kind: 'image' | 'audio') => void
}): ReturnType<typeof h> {
  // NATIVE REORDER (the dnd-kit purge): the tile is HTML5-draggable
  // outside grouping mode; the parent owns dragId/overId state and
  // the reorder verb. Selection mode: draggable OFF (reorder pauses),
  // clicks toggle selection — the old sub-view's law, verbatim.
  const dragHandlers = grouping ? {} : {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData(CARD_DRAG_MIME, row.id)
      e.dataTransfer.effectAllowed = 'move'
      onReorderStart(row.id)
    },
    onDragEnd: () => { onReorderStart(null) },
  }
  // THE SLOT IS THE WIRE: this mark shows only an agent-recorded
  // edge (inputs.source on the row); the user-facing wiring IS the
  // input slot's picker — there is no tile wire gesture.
  const wiredFrom = typeof row.stage.inputs === 'object' && row.stage.inputs !== null
    && 'source' in (row.stage.inputs as Record<string, unknown>)
  return h('li', {
    className: css.tile
      + (entered ? ' ' + css.tileEnter : '')
      + (dragging ? ' ' + css.tileDragging : '')
      + (dragOver ? ' ' + css.tileDragOver : ''),
    'data-stage-id': row.id,
    'data-stage-status': row.status,
    'data-grouping': grouping ? 'on' : null,
    'data-selected': grouping && selected ? 'on' : null,
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(CARD_DRAG_MIME)) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'move'
        onReorderOver(row.id)
        return
      }
      if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes('Files')) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(CARD_DRAG_MIME)) {
        e.preventDefault()
        e.stopPropagation()
        const active = e.dataTransfer.getData(CARD_DRAG_MIME)
        if (active !== '' && active !== row.id) onReorderDrop(active, row.id)
        return
      }
      const asset = parseAssetDrop(e.dataTransfer.types.includes(ASSET_DRAG_MIME) ? e.dataTransfer.getData(ASSET_DRAG_MIME) : '')
      if ((asset.url ?? '') !== '') {
        e.preventDefault()
        e.stopPropagation()
        const t = asset.type ?? ''
        if (!t.startsWith('image/') && !t.startsWith('audio/')) return
        onAssetAttach(row.id, asset.url as string, (asset.type ?? '').startsWith('audio/') ? 'audio' : 'image')
        return
      }
      const file = e.dataTransfer.files[0]
      if (file === undefined) return
      if (file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/webp') return
      e.preventDefault()
      e.stopPropagation()
      onAssetAttach(row.id, file, 'image')
    },
    ...dragHandlers,
  },
    h('div', { className: css.tileShared },
      h('button', {
        className: css.tileInner, type: 'button', 'data-status': row.status,
        onClick: () => {
          if (grouping) { onToggleSelect(row.id); return }
          onOpen(row)
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
            row.upstream !== null ? h(Tag, { tone: 'quiet' }, '⟵ ' + row.upstream) : null,
            row.prompt !== null ? h('span', { className: css.tilePrompt }, row.prompt) : null,
          ),
          row.status !== '' && row.status !== 'ready'
            ? h(Tag, { tone: statusTone(row.status) }, row.status)
            : null,
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
    sourceAttached: Object.values(params).some((v) => typeof v === 'string'
      && (v.startsWith('data/input/') || v.startsWith('/melite-media/') || v.startsWith('/v1/assets/'))),
    stage,
  }
}

/** THE SHARED DRILLDOWN — spec-formatted (the old system's law): the
 *  stage's card carries a DECLARED form (/v1/form-spec — typed atoms,
 *  groups, defaults); the drill renders THAT, never a raw key/value
 *  dump. Params left, Run right; the patch carries only CHANGED keys
 *  (coerced once, at patch time — the editPatch law); then the run
 *  gesture (patch lands in the domain BEFORE the run reads it). */
function StageDrill({ stage, bench, running, onRun, onClose, onRemoved, onPatchParams, renderStageView, renderPreview, onSurface, runId, canRemove }: {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  onClose: () => void
  onRemoved: () => void
  onPatchParams: (patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  /** the preview seam consult (hour-9): the shared video/image preview
   *  rides the drill's RIGHT column — supplied by the host (it owns
   *  the slot site); the shared card-base previews are the defaults. */
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  onSurface?: (size: string) => void
  runId?: string | null
  /** Whether stage removal is offered. The bench view owns its rows
   *  (remove rides the bench CAS door); a DRAFT view does not — the
   *  draft's shape belongs to its authoring surface, so the button is
   *  absent there, not broken. */
  canRemove?: boolean
}): ReturnType<typeof h> {
  const title = String(stage.title ?? stage.card ?? stage.id)
  const held: SpecValues = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [values, setValues] = useState<SpecValues>({})
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const reportSurface = onSurface ?? (() => {})
  const [removing, setRemoving] = useState(false)
  // THE SLOT IS THE WIRE (the two-month law, restored 2026-09-12):
  //  no wiring mechanic exists. The square picker lists the OTHER
  //  stages' LATEST OUTPUTS; picking one writes this stage's param
  //  to that artifact's url (the run stages it engine-side).
  //  THE EDGE LAW: the per-field narrowing keeps only rows whose
  //  card DECLARES an output of the picked field's input-edge kind
  //  (spec.inputs) — the edges are defined by the emission, never
  //  guessed from url shapes.
  const others = bench.stages.filter((s) => s.id !== stage.id)
  const candidates = others.flatMap((s) => {
    const res = typeof s.result === 'object' && s.result !== null ? s.result as Record<string, unknown> : null
    const url = res !== null && typeof res['url'] === 'string' && (res['url'] as string) !== ''
      ? res['url'] as string : ''
    return url === '' ? [] : [{ id: s.id, label: String(s.title ?? s.card ?? s.id), url }]
  })
  useEffect(() => {
    let alive = true
    const family = String(stage.card ?? '')
    if (family === '') { setLoaded(true); return }
    fetchFormSpec(family)
      .then((doc) => {
        if (!alive) return
        setSpec(doc)
        // THE AXIS SEED (the pass-along law): a reopened stage holds
        // its keys (held wins); a fresh stage gets the first-declared
        // law (variant = first row, quant = its first cell, model =
        // the row's re-point ?? the spec family).
        setValues({ ...specDefaults(doc.fields), ...seedAxisValues(doc, held), ...held })
        setLoaded(true)
        reportSurface(doc.size === 'huge' ? 'huge' : '')
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'form-spec unavailable')
        setLoaded(true)
      })
    return () => { alive = false }
  }, [stage.id])
  // the forms-table cache (card meta with the DECLARED edges) — one
  // fetch per session; the picker's kind matching reads it
  const [edgeMeta, setEdgeMeta] = useState<Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }> | null>(null)
  useEffect(() => {
    let alive = true
    loadFormsEdgeMeta().then((m) => { if (alive) setEdgeMeta(m) }).catch(() => {})
    return () => { alive = false }
  }, [])
  const candidatesFor = useCallback((f: { name: string }): Array<{ id: string; label: string; url: string }> => {
    if (spec === null || edgeMeta === null) return candidates
    const edge = (spec.inputs ?? []).find((e) => e.name === f.name)
    if (edge === undefined) return candidates
    const kind = edge.kind
    return candidates.filter((c) => {
      const row = others.find((s) => s.id === c.id)
      const cardId = String(row?.card ?? '')
      const outs = edgeMeta[cardId]?.outputs
      return outs !== undefined && Object.values(outs).includes(kind)
    })
  }, [spec, edgeMeta, candidates, others])
  const onEdit = useCallback((name: string, v: unknown): void => {
    setValues((m) => ({ ...m, [name]: v }))
  }, [])
  // THE PICKER WIRE (data only — the CONSTRUCTOR owns the square now,
  //  the operator's law: an emitted image input constructs the input
  //  component automatically, no surface wires it). candidatesFor
  //  narrows the picker per the DECLARED input-edge kind (THE EDGE LAW).
  const wire = { candidates, candidatesFor }
  const run = async (): Promise<void> => {
    setError(null)
    try {
      const patch = spec !== null ? specPatch(spec.fields, values, held) : {}
      // THE AXIS PASS-ALONG: model/variant/quant are not SpecFields —
      // specPatch never sees them — so the changed axis keys ride the
      // patch HERE (the run reads them: runCardStage composes the
      // held model as the {model:} door's family).
      for (const k of ['model', 'variant', 'quant']) {
        if (values[k] !== undefined && String(values[k] ?? '') !== String(held[k] ?? '')) {
          patch[k] = values[k]
        }
      }
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
  // THE SURFACE SLOT (the ui-tool law): a registered card view takes
  // over the whole detail; unclaimed key renders this generic body.
  // THE PREVIEW SEAM CONSULT (hour-9 law — the operator: "notice how
  // image gen rides the defaults… that shared seem should go to teh
  // RIGHT of the input parameters"): the stage's rendered outputs
  // preview through the cards.stage.preview slot, keyed by media
  // kind, with the card-base SHARED previews as the defaults. The
  // consult sits in the drill's RIGHT column — params LEFT, preview
  // RIGHT, the same law as the studio's rail/center.
  const stagePreview = (): ReturnType<typeof h> | null => {
    if (renderPreview === undefined) return null
    const artifacts = previewArtifactsFor(stage as unknown as Record<string, unknown>)
    const heroUrl = artifacts[0]?.url ?? ''
    // the card's DECLARED primary output drives the kind (the spec is
    // already in hand for the form); the url sniff only stands in when
    // the declaration is absent or non-previewable
    const kind = primaryKindFor(spec, heroUrl)
    if (kind === null) return null
    const owner = {
      kind, artifacts,
      runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
      stageId: stage.id,
    }
    const fallback = kind === 'video'
      ? h(VideoStagePreview, owner)
      : kind === 'audio'
        ? h(AudioStagePreview, owner)
        : kind === 'mesh'
          ? h(MeshStagePreview, owner)
          : h(ImageStagePreview, owner)
    return renderPreview(owner, fallback)
  }
  const genericDetail = (): ReturnType<typeof h> => h('div', { className: css.zoomDetail },
    h('div', { className: css.split },
      h('div', { className: css.params },
        !loaded ? h('div', { className: css.load }, 'form…')
        : spec !== null
          ? h(SpecForm, { spec, fields: spec.fields, values, onEdit, wire, onPatch: onPatchParams })
        : h('pre', { className: css.mono }, JSON.stringify(held, null, 2)),
      ),
      h('div', { className: css.outputs },
        h('div', { className: css.outputsPreview, 'data-testid': 'stage-preview-seat' },
          stagePreview() ?? h('div', { className: css.outputsHint },
            running ? 'rendering… the preview lands here' : 'run lands the preview here')),
        h('div', { className: css.runRow },
          error !== null ? h('span', { className: css.runError }, error) : null,
          h(Button, { variant: 'primary', disabled: running, onClick: () => { void run() } },
            running ? 'running…' : 'Run'),
        ),
        h('div', { className: css.runRow },
          canRemove === false ? null : h('button', {
            className: css.back,
            type: 'button',
            disabled: running || removing,
            onClick: () => { void remove() },
          }, removing ? 'removing…' : 'Remove stage'),
        ),
      ),
    ),
  )
  // the consult (ToolCallTree's call verbatim): entryKey = card name
  return renderStageView({
    stageId: stage.id,
    cardName: String(stage.card ?? ''),
    row: stage as unknown as Record<string, unknown>,
    runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
    onPatch: onPatchParams,
    onRun,
    onStop: () => {},
    onRemove: () => { void remove() },
    onSurface: reportSurface,
    upstream: candidates.map((c) => ({ id: c.id, title: c.label, url: c.url })),
    runId: runId ?? null,
  }, genericDetail())
}

/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
 *  + tile → the picker (the catalog's action cards, search + genre
 *  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
 *  as the user (CAS-chained). ONE surface: action cards; models are not
 *  entries (the model select lives ON the card's form). */
function AddCardDoor({ bench, onAdded, onClose, renderStageView, onAddedRow }: {
  bench: CardsBenchValue
  onAdded: () => void
  /** THE REAL-CARD LAW (the operator's hour-7: "It shows me a
   *  [REDACTED 2026-11-05] form card and not the real card"): when the picked
   *  card's stage view is CLAIMED (a studio), the picked preview IS
   *  the studio — the card, live, its own rail the param surface
   *  (E1: a studio is a param editor) — never the spec form. */
  renderStageView?: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  /** The add's fresh row, when the bench diff found it — the parent
   *  opens the REAL card right after the add (the old system's
   *  open-on-add). */
  onAddedRow?: (row: BenchStageRow) => void
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
      .then((doc) => {
        setSpec(doc)
        // THE AXIS SEED rides the add too: a new card is born with its
        // declared variant/quant/model (the first-declared law).
        setValues({ ...specDefaults(doc.fields), ...seedAxisValues(doc, {}) })
      })
      .catch((e: unknown) => setFormError(e instanceof Error ? e.message : 'form-spec unavailable'))
  }
  const onEdit = useCallback((name: string, v: unknown): void => {
    setValues((m) => ({ ...m, [name]: v }))
  }, [])
  // THE PICKER WIRE for the add drill too (the constructor owns the
  //  square — the SAME input component everywhere, operator law
  //  2026-09-12; a fresh card may pick from every existing stage's
  //  latest output).
  const wire = {
    candidates: bench.stages.flatMap((s) => {
      const res = typeof s.result === 'object' && s.result !== null ? s.result as Record<string, unknown> : null
      const url = res !== null && typeof res['url'] === 'string' && (res['url'] as string) !== '' ? res['url'] as string : ''
      return url === '' ? [] : [{ id: s.id, label: String(s.title ?? s.card ?? s.id), url }]
    }),
  }
  // THE REAL-CARD PROBE (the operator's hour-7): consult the keyed
  // slot with a SENTINEL fallback — identity return means unclaimed
  // (no studio: the spec form stays, honestly). A claimed card
  // previews as THE CARD itself, live; its onPatch merges doc params
  // into the values that ride the add door verbatim.
  const studioView = useMemo(() => {
    if (picked === null || renderStageView === undefined) return null
    const sentinel = h('div', { key: '__unclaimed__' })
    const probe: StageViewOwnerProps = {
      stageId: '__add__',
      cardName: picked.id,
      row: { id: '__add__', card: picked.id, params: { ...specDefaults(spec?.fields ?? []), ...values } },
      runStatus: '',
      onPatch: (patch: Record<string, unknown>) => { setValues((m) => ({ ...m, ...patch })) },
      onRun: () => {}, onStop: () => {}, onRemove: () => {}, onSurface: () => {},
      upstream: [],
      runId: null,
    }
    const node = renderStageView(probe, sentinel)
    return node === sentinel ? null : node
  }, [picked, spec, values, renderStageView])
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
      // THE OPEN-ON-ADD LAW (the operator's hour-7): after the door
      // lands, the bench is re-read and the ONE fresh id (the card
      // just added — the flow is one card at a time) is handed up;
      // the parent opens the REAL card (the zoom consult). The door
      // response shape never enters this — the bench diff is the
      // truth. A diff that finds nothing falls back to plain onAdded
      // (the row still lands; only the auto-open is skipped).
      try {
        const before = new Set(bench.stages.map((r) => r.id))
        const next = await fetchBench()
        const fresh = next.stages.find((r) => !before.has(r.id)) ?? null
        if (fresh !== null && onAddedRow !== undefined) onAddedRow(fresh)
        else onAdded()
      } catch {
        onAdded()
      }
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
  // THE CLAIMED-CARD MODAL LAW (hour-9: "when I press add card, it
  // shows me a [REDACTED 2026-11-05] interface instead of the actual card"): the
  // 860px drill modal squeezed the studio's shell grid into a 363px
  // column — a card WITH a studio previews in the PAGE-SIZED modal
  // (94vw × 94vh, the zoom's own huge law); the picker and the
  // unclaimed form keep the compact drill.
  // THE CLAIMED DOOR IS HEADLESS (hour-9): the primitive's own body
  // div sits between .content and children as flex:0 — the studio
  // could never fill the page-sized dialog through it. Headless puts
  // the children directly in the dialog; this door renders its own
  // header (title + close) + the full-bleed studio + the Add row.
  // (The primitive's Modal type is a discriminated overload — the
  // headless branch is its own literal-true call.)
  const claimed = studioView !== null
  if (claimed) {
    return h(Modal, {
      open: true, onClose, headless: true, title: 'Add a card',
      className: css.addHugeModal,
    },
      h('div', { className: css.addClaimed },
        h('div', { className: css.addClaimedHead },
          h('span', { className: css.addClaimedTitle }, 'Add a card'),
          h('button', { type: 'button', className: css.closeX, 'aria-label': 'Close picker', onClick: onClose }, '✕'),
        ),
        h('div', { className: css.addStageView, 'data-testid': 'add-stage-view' }, studioView),
        h('div', { className: css.runRow },
          h('button', { type: 'button', className: css.back, onClick: () => { setPicked(null); setSpec(null) } }, '← ' + (cards?.length ?? 0) + ' cards'),
          formError !== null ? h('span', { className: css.runError }, formError) : null,
          h(Button, { variant: 'primary', disabled: adding || spec === null, onClick: () => { void add() } },
            adding ? 'adding…' : 'Add card'),
        ),
      ),
    )
  }
  return h(Modal, {
    open: true, onClose, title: 'Add a card', closeLabel: 'Close picker',
    className: css.drill,
  },
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
      // The UNCLAIMED card's honest fallback: the spec form beside the
      // Add row — never a studio's stand-in.
      : h('div', { className: css.split },
          h('div', { className: css.params },
            h('button', { type: 'button', className: css.back, onClick: () => { setPicked(null); setSpec(null) } }, '← ' + (cards?.length ?? 0) + ' cards'),
            formError !== null ? h('p', { className: css.runError }, formError) : null,
            spec === null && formError === null ? h('div', { className: css.load }, 'form…') : null,
            spec !== null ? h(SpecForm, { spec, fields: spec.fields, values, onEdit, wire }) : null,
          ),
        h('div', { className: css.outputs },
          h('div', { className: css.runRow },
            h(Button, { variant: 'primary', disabled: adding || spec === null, onClick: () => { void add() } },
              adding ? 'adding…' : 'Add card'),
          ),
        ),
      ),
  )
}

function BenchView({ bench, onRun, onRunStage, running, onPatchParams, renderStageView, renderPreview, runId, refreshTick }: {
  bench: CardsBenchValue
  onRun: () => void
  onRunStage: (stage: BenchStageRow) => void
  running: boolean
  onPatchParams: (stage: BenchStageRow, patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId?: string | null
  /** The outcome observer's touch — the rail re-reads so tile
   *  runStatus/result stay live without ever leaving the bench. */
  refreshTick?: number
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
  useEffect(() => {
    if (refreshTick !== undefined && refreshTick > 0) reload({ keepOpen: true })
  }, [refreshTick])
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
  // ── DRAG REORDER (native HTML5 sortable — the dnd-kit purge; DSH
  //    ships no drag library): optimistic splice, then the door; a
  //    refusal reloads the truth. The verb is the old one verbatim.
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const onReorderStart = useCallback((id: string | null): void => {
    setDragId(id)
    if (id === null) setOverId(null)
  }, [])
  const onReorderOver = useCallback((id: string): void => { setOverId(id) }, [])
  const onReorderDrop = useCallback((active: string, over: string): void => {
    setDragId(null)
    setOverId(null)
    if (over === active || over === 'add') return
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
  //    file's input-dir name) patches the TARGET stage's OWN image
  //    field — the card's form-spec names it ('source' on input-prep,
  //    'input_image' on img-to-mesh); a card without an image slot
  //    refuses honestly. Never a foreign key: undeclared params refuse
  //    at compose admission (the old SlotSquare's onDropAsset law).
  const onAssetAttach = useCallback((target: string, source: string | File, kind: 'image' | 'audio'): void => {
    const row = live.stages.find((s) => s.id === target)
    if (row === undefined) return
    void fetchFormSpec(String(row.card))
      .then((spec) => {
        const field = spec.fields.find((f) => f.type === kind)
        if (field === undefined) throw new Error('the ' + String(row.card) + ' card has no ' + kind + ' slot')
        return field.name
      })
      .then((field) => (typeof source === 'string'
        ? Promise.resolve([field, source] as const)
        : uploadInputFile(source).then(({ name }) => [field, name] as const)))
      .then(([field, src]) => patchStageParams(live.draftId, target, { [field]: src }))
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
    // ONE SURFACE, NO STATES (operator, 2026-09-12: "Why is there an
    // empty state? Why does the sidebar have multiple states? That is
    // insane."): the tile grid is THE bench at every stage count —
    // zero stages shows exactly one thing, the standing Add tile (the
    // entry), because the grid ALWAYS carries it. No empty branch, no
    // special-cased render, no dead-end paragraph exists.
    h('ol', {
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
                  grouping, selected: selectedIds.has(s.id), onToggleSelect, onAssetAttach,
                  dragging: dragId === s.id, dragOver: overId === s.id && dragId !== null && dragId !== s.id,
                  onReorderStart, onReorderOver, onReorderDrop,
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
      onPatchParams: (patch: Record<string, unknown>) => { onPatchParams(open, patch) },
      renderStageView,
      renderPreview,
      runId,
      detail: StageDrill,
    }) : null,
    adding ? h(AddCardDoor, {
      bench: live, onAdded, onClose: () => { setAdding(false) },
      renderStageView,
      // THE OPEN-ON-ADD: the fresh row's zoom opens the REAL card
      // (the consult) the moment the door lands it.
      onAddedRow: (row: BenchStageRow) => { setAdding(false); setOpen(row) },
    }) : null,
  )
}

/**
 * THE DRAFT VIEW (the conversation card's target, 2026-09-12 — the
 * old embed's law restored): one flow draft's stage on the authoring
 * surface. The studio claims `cards.stage.view` exactly as the bench's
 * zoom does — same slot, same owner currency, same run/patch doors —
 * so the chat card opens the timeline/video/splits/audio surface, and
 * a card with no registered studio falls back to the generic zoom
 * card (params + Run), the bench's own fallback.
 *
 * Removal is NOT offered (the draft's shape belongs to its authoring
 * surface — the bench CAS door has no business here); the back affordance
 * returns to the shared bench, the tab's home address.
 */
function DraftView({ value, running, onRun, onBack, onPatchParams, renderStageView, renderPreview, runId }: {
  value: CardsDraftValue
  running: boolean
  onRun: () => void
  onBack: () => void
  onPatchParams: (patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId: string | null
}): ReturnType<typeof h> {
  const found = value.stages.find((s) => s.id === value.stageId) ?? null
  if (found === null) {
    return h('div', { className: css.zoomDetail },
      h('p', { className: css.groupNote },
        'Stage ' + value.stageId + ' is no longer on draft ' + value.draftId + '.'),
      h('div', { className: css.runRow },
        h('button', { className: css.back, type: 'button', onClick: onBack }, 'Back to the bench'),
      ),
    )
  }
  // CARD BIRTH LAW (the runs door's own text: "every run is born from
  // an action card"): a card tool's draft is born with the card id as
  // its intent and ONE stage — the estate's bench normalization keeps
  // only the engine row (service/title discarded), so the card
  // identity survives on the DRAFT INTENT alone. The studio consult
  // keys on cardName; re-attach it from the intent for the
  // single-stage card-born draft only (user-authored benches carry
  // card on the row itself and never take this arm). Live-lane
  // receipt 2026-09-12: the chat-born bench-default/s_0 rendered the
  // generic drill because the consult saw cardName ''.
  let stage = found
  if ((stage['card'] === undefined || stage['card'] === '') && value.intent !== '' && value.stages.length === 1) {
    stage = { ...found, card: value.intent }
  }
  // The synthetic bench: siblings for the input picker (the
  // slot-is-the-wire law), the draft id for the patch door. rev -1 is
  // the no-CAS marker — removal is absent (canRemove false), so the
  // marker is never spent.
  const bench: CardsBenchValue = { kind: 'bench', draftId: value.draftId, rev: -1, stages: value.stages, log: [] }
  return h(StageDrill, {
    stage,
    bench,
    running,
    onRun,
    onClose: onBack,
    onRemoved: onBack,
    onPatchParams,
    renderStageView,
    renderPreview,
    runId,
    canRemove: false,
  })
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
    // ONE SURFACE (no states): the run's stage list renders at every
    // count — zero rows is an empty list, never a special paragraph.
    h('ol', { className: css.tileGrid }, run.stages.map((s) => {
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
  // cards.stage.view dispatch (the ui-tool ToolCallTree call verbatim):
  // keyed by card name; unclaimed key renders the drill's own body.
  const renderStageView = (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>): ReturnType<typeof h> => {
    if (props.renderSlot === undefined) return fallback
    return (props.renderSlot('cards.stage.view', owner, { entryKey: owner.cardName, fallback }) ?? fallback) as ReturnType<typeof h>
  }
  // THE PREVIEW SEAM CONSULT (hour-9): keyed by media kind; the shared
  // card-base previews ride as the fallback — image gen rides the
  // defaults TODAY, a card claims its kind only to specialize. This is
  // the ONE consult site; the drill's RIGHT column renders it.
  const renderPreview = (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string }, fallback: ReturnType<typeof h>): ReturnType<typeof h> => {
    if (props.renderSlot === undefined) return fallback
    return (props.renderSlot('cards.stage.preview', owner, { entryKey: owner.kind, fallback }) ?? fallback) as ReturnType<typeof h>
  }
  const info = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
  const rawAddress = info?.tab.navigation.address ?? info?.tab.contentId ?? CARDS_BENCH_ADDRESS
  const address = resolveCardsAddress(rawAddress)
  const openResource = info?.tab.actions.openResource
  const snapshot = typeof props.useResource === 'function' ? props.useResource(address) : undefined
  const [running, setRunning] = useState(false)
  // The draft's last started run (in-session memory; on load the tab
  //  ADOPTS the estate's newest run for this draft via runs/list —
  //  the estate is the SSOT, the studio's poll survives reloads).
  const [lastRunId, setLastRunId] = useState<string | null>(null)
  useEffect(() => {
    if (lastRunId !== null) return
    if (snapshot?.value?.kind !== 'bench' && snapshot?.value?.kind !== 'draft') return
    const draftId = snapshot.value.draftId
    if (draftId === '') return
    let alive = true
    void fetchLatestRunForDraft(draftId).then((rid) => {
      if (alive && rid !== null) setLastRunId(rid)
    }).catch(() => { /* no runs yet — the empty state is honest */ })
    return () => { alive = false }
  }, [lastRunId, snapshot?.value])
  const [localRunError, setLocalRunError] = useState<string | null>(null)
  // THE OUTCOME WATCH (the attribution half): one controller per tab
  //  life — every stage run's observer rides it, unmount ends the
  //  watches (a completed patch is idempotent; an interrupted one is
  //  rewritten by the next run). THE BENCH IS NEVER TAKEN OVER (the
  //  two-month law): a started run stays a TILE — the observer writes
  //  'running' at start and the terminal status + result at settle,
  //  each patch bumps the refresh tick so the rail re-reads; every
  //  other card stays runnable while it goes.
  const outcomeAbort = useRef<AbortController | null>(null)
  const [benchTick, setBenchTick] = useState(0)
  useEffect(() => () => { outcomeAbort.current?.abort() }, [])
  const touchBench = useCallback((): void => { setBenchTick((t) => t + 1) }, [])
  // THE PHANTOM RECONCILE (2026-09-13): when a bench value lands, rows
  // stamped running/queued are probed ONCE per stage:run — dead runs
  // (the registry restarted under them) flip to their honest terminal,
  // live runs arm a tab-side observer so terminal always lands. The
  // armed set spans refreshes (one probe per run, ever); the controller
  // lives for the tab's lifetime (a refresh never kills a live probe).
  const reconcileArmed = useRef<Set<string>>(new Set())
  const reconcileCtrl = useRef<AbortController | null>(null)
  if (reconcileCtrl.current === null) reconcileCtrl.current = new AbortController()
  useEffect(() => () => { reconcileCtrl.current?.abort() }, [])
  const benchValue = snapshot?.value?.kind === 'bench' ? snapshot.value : null
  useEffect(() => {
    if (benchValue === null) return
    void reconcileBenchRuns(benchValue, {
      signal: reconcileCtrl.current?.signal,
      onTouched: touchBench,
      armed: reconcileArmed.current,
    })
  }, [benchValue, touchBench])

  const onStarted = useCallback((runId: string, ran?: { draftId: string; stageId: string }): void => {
    setRunning(false)
    setLastRunId(runId)
    if (ran === undefined) return
    if (outcomeAbort.current === null) outcomeAbort.current = new AbortController()
    void observeRunOutcome(ran.draftId, ran.stageId, runId, outcomeAbort.current.signal, touchBench)
  }, [touchBench])
  // RUN ALL — the sequential pass (the old runAll law): one run per
  //  card in bench order, stop on failure; every tile flips through
  //  the SAME observer the drill's Run uses. Cancel stops the pass
  //  after the in-flight card's observer settles.
  const runAllAbort = useRef<AbortController | null>(null)
  const onRun = useCallback((): void => {
    if (snapshot?.value?.kind !== 'bench') return
    setRunning(true)
    setLocalRunError(null)
    runAllAbort.current?.abort()
    const ctrl = new AbortController()
    runAllAbort.current = ctrl
    void runBenchSequential(snapshot.value, {
      signal: ctrl.signal,
      onCardStarted: (runId) => { setLastRunId(runId) },
      onTouched: touchBench,
    }).then((res) => {
      setRunning(false)
      if (res.refused !== null) setLocalRunError(res.refused)
    })
  }, [snapshot, touchBench])
  // RE-RUN ONE STAGE (the drill's Run): the COMPOSING door — the
  // stage alone, its params patched into the bench BEFORE the run
  // reads it (the drill does the patch, this does the start), then
  // startCardRun over the run-wire package.
  const onRunStage = useCallback((stage: BenchStageRow): void => {
    if (snapshot?.value?.kind !== 'bench') return
    setRunning(true)
    setLocalRunError(null)
    void runCardStage(snapshot.value.draftId, stage).then((res) => {
      if ('runId' in res) onStarted(res.runId, { draftId: snapshot.value.draftId, stageId: stage.id })
      else {
        setRunning(false)
        setLocalRunError(res.refused)
      }
    })
  }, [snapshot, onStarted])
  // PARAMS PATCH for surface views (the slot's onPatch currency):
  // the same drafts/patch door the drill's own editor rides.
  const onPatchParamsStage = useCallback((stage: BenchStageRow, patch: Record<string, unknown>): void => {
    if (snapshot?.value?.kind !== 'bench' && snapshot?.value?.kind !== 'draft') return
    void patchStageParams(snapshot.value.draftId, stage.id, patch)
      .then(() => { setLocalRunError(null) })
      .catch((e: unknown) => {
        setLocalRunError(e instanceof Error ? e.message : 'patch failed')
      })
  }, [snapshot])
  // DRAFT-STAGE RUN (the draft view's Run): the same composing door —
  // patch happens in the drill, this starts the stage's run and arms
  // the same outcome observer (the observer writes the draft's stage
  // outcome; the bench is never touched).
  const onRunDraftStage = useCallback((): void => {
    const value = snapshot?.value
    if (value?.kind !== 'draft') return
    const target = value.stages.find((s) => s.id === value.stageId)
    if (target === undefined) return
    setRunning(true)
    setLocalRunError(null)
    void runCardStage(value.draftId, target).then((res) => {
      if ('runId' in res) onStarted(res.runId, { draftId: value.draftId, stageId: target.id })
      else {
        setRunning(false)
        setLocalRunError(res.refused)
      }
    })
  }, [snapshot, onStarted])
  // DRAFT-STAGE PATCH (the draft view's onPatch currency): the drafts
  // door directly — the same verb the drill's editor rides.
  const onPatchParamsDraft = useCallback((patch: Record<string, unknown>): void => {
    const value = snapshot?.value
    if (value?.kind !== 'draft') return
    void patchStageParams(value.draftId, value.stageId, patch)
      .then(() => { setLocalRunError(null) })
      .catch((e: unknown) => {
        setLocalRunError(e instanceof Error ? e.message : 'patch failed')
      })
  }, [snapshot])

  // CANCEL — runs/stop on the run in view (both the resource stream
  // face and the in-tab local run face); the run-wire package's verb.
  const onStop = useCallback((runId: string): void => {
    void stopRun(runId).catch((e: unknown) => {
      setLocalRunError(e instanceof Error ? e.message : 'cancel failed')
    })
  }, [])

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
          onPatchParams: onPatchParamsStage,
          renderStageView,
          renderPreview,
          runId: lastRunId,
          refreshTick: benchTick,
        }),
      )
    : value.kind === 'draft'
    ? h(Fragment, null,
        localRunError !== null ? h('p', { className: css.runError }, localRunError) : null,
        h(DraftView, {
          value,
          running,
          onRun: onRunDraftStage,
          onBack: openResource !== undefined ? onBack : (() => {}),
          onPatchParams: onPatchParamsDraft,
          renderStageView,
          renderPreview,
          runId: lastRunId,
        }),
      )
    : h(RunView, { run: value, onBack: openResource !== undefined ? onBack : undefined, onRestored: onBack, onStop })
}
