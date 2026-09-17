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
import { Button, IconLoadingOutline16, IconPlayOutline16, IconStopFill16, IconTrashOutline16, Input, Menu, Modal, Pill, StateDot, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { CardDrill } from './card-drill.tsx'
import { MediaDrilldown, type MediaDrilldownItem } from '@melite-plugin/dsh-gallery/drilldown'
import type { StageViewOwnerProps } from './types.ts'
import { fetchCardCatalog, fetchFormSpec, fieldsOf, resolveValue, seedUser, SpecForm } from './spec-form.tsx'
import { titleCaseId } from '@melite/card-base/spec'
import { fetchFormsTable, postManageAction } from '@melite/card-base/wire'
import { ToastViewport } from '@melite/card-base/toast'
import { StudioShell } from '@melite/card-base/shell'
// THE PAINT FACE (paint-leaf-canvas.md): the demoted studio's
// brush modal, threaded into CardForm for leaf_face kinds — the
// host delivers the face, card-base stays atom-generic.
import { PaintLeafModal } from '@melite/image-mask-studio/paint-leaf'
import { BboxLeafModal } from '@melite/image-mask-studio/bbox-leaf'
import { cardLlmArg } from '@melite/catalog'

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
import { paramFields, patchStageOutcome, patchStageParams } from './draft.ts'
import css from './card.module.css'
import type { CardsBenchValue, CardsDraftValue, CardsRunValue, BenchStageRow } from './cards-resource.ts'
import { fetchMediaLibrary, CARDS_BENCH_ADDRESS, benchAddressOf, benchSessionKey, benchSessionOfAddress, cardsRunAddress, fetchBench, fetchLatestRunForDraft, freshStageRow, markCardsSurface, observeRunOutcome, openCardsResource, parseCardsAddress, reconcileBenchRuns, restoreRunToBench, uploadInputFile } from './cards-resource.ts'
import { defaultFamilyForCard } from '@melite-plugin/melite-run-wire'
import { startCardRun, stopRun } from '@melite/card-base/runs-policy'
import { addStageWire, groupStagesWire, removeStageWire, reorderStageWire, ungroupStageWire } from './add-stage.ts'
import { AudioStagePreview, ImageStagePreview, MeshStagePreview, VideoStagePreview, figureCoeffsOf, figureLocalChangesOf } from '@melite/card-base/preview'
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
  /** The conversation this tab serves (SessionStandardProps — the
   *  ui-session merge delivers sessionId to every session-scoped slot
   *  body). The bench is per-conversation (stroke 44): the tab binds
   *  its bench to exactly this key; unattributed seats serve 'main'. */
  sessionId?: string
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
    const selects = fieldsOf(spec).filter((f) => f.type === 'select' && Array.isArray(f.options))
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
export function previewKindFor(url: string): 'video' | 'image' | 'audio' | 'mesh' | null {
  const u = url.toLowerCase()
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(u)) return 'video'
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/.test(u)) return 'image'
  if (/\.(mp3|wav|ogg|flac|m4a|aac)(\?|$)/.test(u)) return 'audio'
  if (/\.(glb|gltf)(\?|$)/.test(u)) return 'mesh'
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

/** THE PARAMS CHIP (the output-component stroke — the operator's
 *  law: old generations are tagged by the parameters that differ):
 *  the comma-joined KEYS whose values differ between an archived
 *  generation's params snapshot and the live params. undefined when
 *  the snapshot is absent (an entry archived before the stroke) or
 *  nothing differs — same params, same picture, no noise. */
export function paramsDiffKeys(a: unknown, b: unknown): string | undefined {
  const ok = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  if (!ok(a) || !ok(b)) return undefined
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const diff: string[] = []
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff.push(k)
  }
  if (diff.length === 0) return undefined
  return diff.slice(0, 4).join(', ') + (diff.length > 4 ? '…' : '')
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

function SortableTile({ row, entered, onOpen, grouping, selected, onToggleSelect, onAssetAttach,
  dragging, dragOver, onReorderStart, onReorderOver, onReorderDrop,
  onRun, onStop, onRemove, activeRunId }: {
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
  /** THE CHAT-INPUT CHROME (2026-09-13, the operator): the tile's
   *  hover affordances — trash top-right, play bottom-right (→ stop
   *  while running), spinner bottom-left persisting past hover. */
  onRun: (row: CardRowLineTabRow) => void
  onStop: (row: CardRowLineTabRow) => void
  onRemove: (row: CardRowLineTabRow) => void
  /** the stage's live run id (the stop wire's target; null when the
   *  tab never started it — reconcile heals those rows). */
  activeRunId: string | null
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
        onAssetAttach(row.id, asset.url as string, t.startsWith('audio/') ? 'audio' : 'image')
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
          row.face === 'audio'
            ? AudioBarsFace({ stageId: row.id })
            : row.videoUrl !== null
            ? h('video', { className: css.tileImg, src: row.videoUrl, muted: true, playsInline: true, preload: 'metadata', 'data-testid': 'tile-face-video' })
            : row.thumbUrl !== null
            ? h('img', { className: css.tileImg, src: row.thumbUrl, alt: row.title, loading: 'lazy' })
            : h('span', { className: css.kindFace, 'data-kind': row.kind },
                h('span', { className: css.kindInitial }, row.kind.slice(0, 1).toUpperCase()),
                h('span', { className: css.kindName }, titleCaseId(row.kind)),
              ),
          // THE CHAT-INPUT CHROME (replaces the badge + green dot):
          // trash top-right + play/stop bottom-right ride hover; the
          // loading spinner bottom-left PERSISTS while the row runs
          // (the operator's law — loading outlives the hover).
          rowRunning(row)
            ? h('span', { className: css.tileSpin, 'data-testid': 'tile-spin', role: 'status', 'aria-label': 'running' },
                h(IconLoadingOutline16, { size: 14 }),
                // THE PROGRESS FACE (2026-09-13): the tap's percent
                // rides beside the spinner — the operator's "forward
                // the comfyui progress webhooks like before".
                row.progress !== null && row.progress.max > 0
                  ? h('span', {
                      className: css.tilePct, 'data-testid': 'tile-progress',
                      'aria-label': 'progress percent',
                    }, Math.floor((100 * row.progress.value) / row.progress.max) + '%')
                  : null,
              )
            : null,
          grouping ? null : h('button', {
            className: css.tileIconBtn + ' ' + css.tileTrash,
            type: 'button', 'aria-label': 'Remove stage', 'data-testid': 'tile-remove',
            onClick: (e: React.MouseEvent) => { e.stopPropagation(); onRemove(row) },
          }, h(IconTrashOutline16, { size: 14 })),
          grouping ? null : (rowRunning(row)
            ? h('button', {
                className: css.tileIconBtn + ' ' + css.tileRunBtn,
                type: 'button', 'aria-label': 'Stop run', 'data-testid': 'tile-stop',
                disabled: activeRunId === null,
                onClick: (e: React.MouseEvent) => { e.stopPropagation(); onStop(row) },
              }, h(IconStopFill16, { size: 14 }))
            : h('button', {
                className: css.tileIconBtn + ' ' + css.tileRunBtn,
                type: 'button', 'aria-label': 'Run stage', 'data-testid': 'tile-run',
                onClick: (e: React.MouseEvent) => { e.stopPropagation(); onRun(row) },
              }, h(IconPlayOutline16, { size: 14 }))),
        ),
        h('span', { className: css.tileCaption },
          h('span', { className: css.tileTitle }, row.title,
            wiredFrom ? h('span', { className: css.wiredMark, title: 'source wired' }, ' ⛓') : null,
            row.sourceAttached ? h('span', { className: css.wiredMark, title: 'source attached' }, ' 📎') : null,
          ),
          h('span', { className: css.tileMeta },
            row.service !== null ? titleCaseId(row.service) : null,
            row.upstream !== null ? h(Tag, { tone: 'quiet' }, '⟵ ' + row.upstream) : null,
            row.prompt !== null ? h('span', { className: css.tilePrompt }, row.prompt) : null,
          ),
          // THE FAILURE FACE: the run's own refusal text under the
          // caption — a failed run never again reads as silence.
          row.error !== null && row.status === 'failed'
            ? h('span', { className: css.runError, 'data-testid': 'tile-run-error', title: row.error },
                row.error.length > 140 ? row.error.slice(0, 140) + '…' : row.error)
            : null,
        ),
      ),
    ),
  )
}

/** The chrome's running truth: the row's stamped status (the observer
 *  patches it terminal the moment the run lands). */
function rowRunning(row: CardRowLineTabRow): boolean {
  return row.status === 'running' || row.status === 'queued' || row.status === 'pending'
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
  /** the failure carry — the run's own refusal text (rendered on the
   *  tile caption and the drill; null when the run never failed). */
  error: string | null
  /** THE PROGRESS CARRY (2026-09-13): the tap's live fold — percent
   *  faces on the tile spinner and the drill's run row while the row
   *  runs; null off-run (terminal rows carry none). */
  progress: { value: number; max: number } | null
  /** the activity line ("sampling 7/20", "node 12") — same channel. */
  activity: string
  thumbUrl: string | null
  /** the artifact's kind — drives the tile face dispatch. */
  face: 'video' | 'image' | 'audio' | 'mesh' | null
  videoUrl: string | null
  upstream: string | null
  sourceAttached: boolean
  stage: BenchStageRow
}

/** THE AUDIO-BARS FACE (2026-09-13): the old system's music tile
 *  preview — a deterministic bar strip (heights hashed from the stage
 *  id, stable across renders; pure CSS, zero media cost). Rides the
 *  audio identity token per the color law. */
function AudioBarsFace({ stageId }: { stageId: string }): ReturnType<typeof h> {
  let h1 = 0
  for (let i = 0; i < stageId.length; i++) h1 = ((h1 * 31) + stageId.charCodeAt(i)) | 0
  const heights: number[] = []
  for (let i = 0; i < 14; i++) {
    heights.push(18 + (Math.abs(h1 >> (i % 15)) % 60))
  }
  return h('span', { className: css.audioBars, 'data-testid': 'tile-face-audio', 'aria-hidden': 'true' },
    heights.map((ht, i) => h('span', { key: i, className: css.audioBar, style: { height: ht + '%' } })),
  )
}

/** exported for the door-contract specs (the tile-face law). */
export function benchRow(stage: BenchStageRow, bench?: CardsBenchValue): CardRowLineTabRow {
  const isGroup = stage.card === 'group'
  const children = isGroup && Array.isArray(stage.children) ? stage.children.length : 0
  const title = isGroup
    ? 'Group (' + String(children) + ')'
    : (stage.title ?? stage.card ?? stage.id)
  const status = typeof stage.runStatus === 'string' && stage.runStatus !== '' ? stage.runStatus : 'ready'
  // THE WEBHOOK FEED (stroke 46b, the operator's order): the engine's
  // /ws progress tap folds activity + progress onto the stage rows —
  // the drill shows them LIVE (the tile keeps its percent pill).
  const activity = typeof (stage as { activity?: unknown }).activity === 'string'
    ? (stage as { activity?: unknown }).activity as string : ''
  const progress = (stage as { progress?: { value: number, max: number } | null }).progress ?? null
  const pct = progress !== null && progress.max > 0 ? Math.floor((100 * progress.value) / progress.max) : null
  const params = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const promptRaw = typeof params['prompt'] === 'string' ? params['prompt'] : ''
  const result = stage.result
  const url = typeof result === 'object' && result !== null && typeof Reflect.get(result, 'url') === 'string'
    ? Reflect.get(result, 'url') as string
    : ''
  // THE FAILURE FACE (2026-09-13): the observer's failure carry —
  // a failed run's reason, sliced for the caption (the drill shows
  // the full text).
  const failText = typeof result === 'object' && result !== null
    && typeof Reflect.get(result, 'error') === 'string'
    ? (Reflect.get(result, 'error') as string) : ''
  // THE TILE FACE (2026-09-13, the broken-image cure): the artifact's
  // kind decides the face — an mp3 NEVER reaches <img> (the old
  // system's audio-bars face), a glb neither; mesh rows show a real
  // POSTER when the run shipped one (anny's turnaround renders ride
  // alongside the glb — zero render cost), else the kind face.
  const face = previewKindFor(url)
  const absolute = (u: string): boolean => /^(https?:\/\/|\/)/.test(u)
  const posterFromArtifacts = ((): string | null => {
    if (face !== 'mesh') return null
    for (const a of previewArtifactsFor(stage as unknown as Record<string, unknown>)) {
      if (previewKindFor(a.url) === 'image' && absolute(a.url)) return a.url
    }
    return null
  })()
  return {
    id: stage.id,
    kind: isGroup ? 'group' : String(stage.card ?? 'card'),
    title: String(title),
    service: typeof stage.engine === 'string' && stage.engine !== '' ? stage.engine : null,
    status,
    dot: STAGE_DOT[status] ?? null,
    prompt: promptRaw !== '' ? promptRaw.slice(0, 96) : null,
    /** the failure carry — the run's own refusal text, or null. */
    error: failText !== '' ? failText : null,
    // THE PROGRESS CARRY (2026-09-13): the observer patches the tap's
    // live fold onto the row's result while it runs — the tile and
    // drill read it as percent/activity (never on terminal rows).
    progress: typeof result === 'object' && result !== null
      && typeof Reflect.get(result, 'progress') === 'object'
      && Reflect.get(result, 'progress') !== null
      ? Reflect.get(result, 'progress') as { value: number; max: number }
      : null,
    activity: typeof result === 'object' && result !== null
      && typeof Reflect.get(result, 'activity') === 'string'
      ? (Reflect.get(result, 'activity') as string) : '',
    // same-origin absolute or leading-/ artifact urls render; a bare
    // run-relative filename cannot resolve without its run (the run
    // view owns that face) — the kind Pill rides instead.
    thumbUrl: face === 'image' && absolute(url) ? url : posterFromArtifacts,
    face,
    videoUrl: face === 'video' && absolute(url) ? url : null,
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
function StageDrill({ stage, bench, running, onRun, onStop, onClose, onRemoved, onResync, onPatchParams, renderStageView, renderPreview, onSurface, runId, canRemove, bindRun, bindEnhance }: {
  stage: BenchStageRow
  bench: CardsBenchValue
  running: boolean
  onRun: () => void
  /** THE ✦ GESTURE (stroke 23): the drill binds its enhance verb —
   *  the zoom bar renders the capsule beside Run (the rail's own
   *  button is retired; the note stays as inline feedback). */
  bindEnhance?: (verb: () => Promise<void> | void) => void
  /** THE STOP DOOR (2026-09-13): the run button flips to a stop
   *  glyph while running (the tile's own affordance, carried into
   *  the drill — one gesture language, both faces). */
  onStop: () => void
  onClose: () => void
  onRemoved: () => void
  /** THE RESYNC SEAT (2026-09-15, the stuck cure): a write that
   *  refused after its rebase leaves this drill composing against a
   *  bench it can no longer see whole — the view re-reads and this
   *  drill re-seeds from the fresh truth, so the NEXT gesture works.
   *  A named error without a resync is how a tab bricks. */
  onResync?: () => void
  onPatchParams: (patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  /** the preview seam consult (hour-9): the shared video/image preview
   *  rides the drill's RIGHT column — supplied by the host (it owns
   *  the slot site); the shared card-base previews are the defaults. */
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  onSurface?: (size: string) => void
  runId?: string | null
  /** Retired seat (2026-09-13, the operator's "it doesn't need
   *  remove stage button"): the drill no longer renders the remove
   *  row — removal rides the tile's trash. The prop stays for the
   *  call-site seam (nothing reads it; the row is gone). */
  canRemove?: boolean
  /** THE GESTURE REGISTRATION (hour-26): the frame's top-bar pill
   *  calls the drill's OWN run (flush-then-start), never a bare
   *  start that would drop un-flushed form edits (the 1:1 law). */
  bindRun?: (run: () => void) => void
}): ReturnType<typeof h> {
  const title = String(stage.title ?? stage.card ?? stage.id)
  const held: SpecValues = typeof stage.params === 'object' && stage.params !== null ? stage.params : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  // THE USER LAYER (the settings law, 2026-09-14): the stage's
  //  explicit params, presence IS the override mark. The resolved
  //  value derives per render (resolveValue — the engine's compose
  //  cascade mirrored); edits are set/unset ops over THIS map.
  const [user, setUser] = useState<SpecValues>({})
  // THE MEDIA DRILLDOWN SEAT (hour 24: clicking the preview mirrors
  // the media drilldown 1:1 — the SAME shared component the gallery
  // rides; the click maps the stage's primary artifact onto it).
  const [drillItem, setDrillItem] = useState<MediaDrilldownItem | null>(null)
  // THE ✦ AGENT ENHANCE SEAT (hour 24 stroke 10): one press — the
  // sweep door enhances every declared field; the write-back rides
  // the SAME values seam the form's own edits ride (the next Run
  // patches the domain with what the user SEES).
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceNote, setEnhanceNote] = useState<{ err: boolean, text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const reportSurface = onSurface ?? (() => {})
  // (THE LIVE GESTURE STATE moved to the frame (hour-26): the top
  //  bar's Run/Stop pill + the webhook strip derive the row's run
  //  state there — the drill body no longer needs its own copy.)
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
  // THE SPEC KEY FOLLOWS THE EFFECTIVE MODEL (stroke 20, the live
  // filter fix): the pick lives in the USER layer (onSet) — the
  // bench row (stage.params) does not move until Run — so the key
  // must read the USER's held model first (the pick), else the
  // bench row's, else the card. Reading only stage.params left the
  // spec frozen on the old family: the pick cleared the axes and
  // nothing ever re-filtered (the operator's burn).
  const heldModelRaw = (typeof stage.params === 'object' && stage.params !== null
    ? (stage.params as Record<string, unknown>)['model'] : undefined)
  const benchModel = typeof heldModelRaw === 'string' && heldModelRaw !== '' ? heldModelRaw : ''
  const userModelRaw = user['model']
  const userModel = typeof userModelRaw === 'string' && userModelRaw !== '' ? userModelRaw : ''
  const modelKey = userModel !== '' ? userModel : benchModel
  // the pick-preserving seed source: a FRESH OPEN (stage.id moved)
  // seeds from the bench row; a MODEL-PICK re-key (same stage) seeds
  // from the CURRENT user state — the pick + its cleared axes ride,
  // and the new family's own rows seed (never reseed the pick away)
  const lastStageRef = useRef<string>('')
  const userRef = useRef<SpecValues>(user)
  userRef.current = user
  useEffect(() => {
    let alive = true
    const freshOpen = lastStageRef.current !== stage.id
    lastStageRef.current = stage.id
    // ENGINE STAGES (stroke 66, the card-seam generalization): a
    // card-less stage resolves its form from the ENGINE id — the
    // door serves engine docs from the same declared contract the
    // executor validates. The model PARAM is a plain field there,
    // never a family re-key (a brain route is not a family pick).
    const cardId = String(stage.card ?? '')
    const family = cardId !== ''
      ? (modelKey !== '' ? modelKey : cardId)
      : String(stage.engine ?? '')
    if (family === '') { setLoaded(true); return }
    fetchFormSpec(family)
      .then((doc) => {
        if (!alive) return
        setSpec(doc)
        // THE USER-LAYER SEED (the pass-along law under the settings
        // model): every HELD key rides verbatim (presence survived
        // the reopen — never re-derived, never value-compared); the
        // absent axis keys seed per the axis law (first-declared
        // composing row, one direction); a held recipe key is
        // dropped outright — the card-recipe layer is dead (stroke
        // 34; seedUser's one validation clause; the run flush's
        // null-domain half deletes the bench key). A model-pick
        // re-key seeds from the USER state (the pick survives; the
        // new matrix's rows seed under it).
        setUser(seedUser(doc, freshOpen ? held : userRef.current))
        setLoaded(true)
        reportSurface(doc.size === 'huge' ? 'huge' : '')
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'form-spec unavailable')
        setLoaded(true)
      })
    return () => { alive = false }
    // stage.id re-opens; the EFFECTIVE model re-SPECS (a pick
    // refetches the family's own matrix — the axes re-filter LIVE)
  }, [stage.id, modelKey])
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
  const onSet = useCallback((name: string, v: unknown): void => {
    setUser((m) => ({ ...m, [name]: v }))
    // THE SLOT FLUSH LAW (2026-09-15 — the operator's burn: "when I
    // wire an image from the previous flow, it doesn't stay after I
    // close the card"): a slot-shaped pick (image/file) is a
    // DISCRETE GESTURE, not typing — it writes the bench row NOW,
    // not at Run. Before this, the pick lived only in this modal's
    // React state; close without Run and it evaporated — the reopen
    // reseeded from a bench row that never heard it.
    const shape: string | undefined = spec !== null
      ? fieldsOf(spec).find((f) => f.name === name)?.type : undefined
    if (shape === 'image' || shape === 'file') {
      void patchStageParams(bench.draftId, stage.id,
        v === '' ? { [name]: null } : { [name]: v }, bench.rev)
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'slot write failed')
        })
    }
  }, [spec, bench.draftId, bench.rev, stage.id])
  // THE UNSET PATH (the settings law): removing an override is a
  // first-class edit — the key leaves the user map and the row
  // re-derives to its base (defaults <- model defaults <- base).
  // The domain write rides the Run press with the rest (a null
  // value under JSON Merge Patch semantics deletes the key) — EXCEPT
  // slots (the flush law above): an unwired slot leaves the bench
  // NOW, same gesture, same door.
  const onUnset = useCallback((name: string): void => {
    setUser((m) => {
      if (!Object.prototype.hasOwnProperty.call(m, name)) return m
      const next: SpecValues = {}
      for (const [k, v] of Object.entries(m)) if (k !== name) next[k] = v
      return next
    })
    const shape: string | undefined = spec !== null
      ? fieldsOf(spec).find((f) => f.name === name)?.type : undefined
    if (shape === 'image' || shape === 'file') {
      void patchStageParams(bench.draftId, stage.id, { [name]: null }, bench.rev)
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'slot write failed')
        })
    }
  }, [spec, bench.draftId, bench.rev, stage.id])
  // THE RESOLVED VALUE — derived per render (never state): exactly
  // what a Run composes, what the prompt tile and the enhance sweep
  // read, what the form shows. THE SERVED BASE (hour-26 stroke 15,
  // the 1:1 run law): the row's `resolved` map — prepareCardParams'
  // own stamps, served by the drafts doors — layers under the user
  // and over the client's guesses (one resolver, served to the
  // visual; absent = the registry-less lane derive).
  const servedBase: SpecValues | undefined =
    typeof stage.resolved === 'object' && stage.resolved !== null && !Array.isArray(stage.resolved)
      ? stage.resolved as SpecValues : undefined
  const value: SpecValues = resolveValue(spec ?? { form: '' }, user, servedBase)
  // ✦ AGENT ENHANCE (hour 24 stroke 10 — the operator's one-shot
  // order): one press gathers the card's prompt text, the sweep door
  // (/melite-tools/enhance {model, prompt}) enhances EVERY declared
  // field over the model's own SKILL.md recipe, and the results land
  // through the SAME values seam a hand edit rides. The no-clobber
  // law is the old tree's verbatim: the negative carries back ONLY
  // for the prompt field, ONLY when the card declares it, ONLY when
  // the backend produced one — never wipe an existing negative with
  // an empty string (distilled variants return "" because they
  // ignore negatives).
  const enhance = async (): Promise<void> => {
    // THE NO-SILENT-REJECT LAW (the operator's word: "I should never
    // get auto rejected without an error message"): EVERY rejection
    // renders its face — no guard in this verb returns quietly.
    if (enhancing) {
      setEnhanceNote({ err: true, text: 'enhance already running' })
      return
    }
    const current = String(value['prompt'] ?? '').trim()
    if (current === '') {
      setEnhanceNote({ err: true, text: 'nothing to enhance — the prompt is empty' })
      return
    }
    const model = String(spec?.model ?? held['model'] ?? '')
    if (model === '') {
      setEnhanceNote({ err: true, text: 'no model to enhance with — pick a Model first' })
      return
    }
    setEnhancing(true)
    setEnhanceNote(null)
    try {
      // THE CARD LLM PREFERENCE (the ✦ rail's dropdown): unset =
      // Auto — the door's preference chain (muse-spark over glm-5v)
      // serves; a picked route names the enhancer explicitly.
      const llm = cardLlmArg()
      const res = await fetch('/melite-tools/enhance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt: current, ...(llm !== undefined ? { llm } : {}) }),
      })
      // read TEXT first — a non-JSON error body must surface its own
      // words, never a JSON parse stack trace
      const raw = await res.text()
      let doc: {
        results?: Record<string, { positive?: unknown, negative?: unknown, via?: unknown }>
        error?: unknown
      } = {}
      try { doc = JSON.parse(raw) as typeof doc } catch { /* handled below */ }
      if (!res.ok || typeof doc.error === 'string') {
        // NO res.ok-true MIDDLE ARM (the entry condition's ok path
        // requires error-is-string, which voices doc.error above — a
        // middle 'unexpected payload' would be untestable dead code).
        throw new Error(typeof doc.error === 'string' ? doc.error
          : 'enhance failed (' + res.status + (raw.length > 0 && raw.length < 200 ? ': ' + raw : '') + ')')
      }
      const results = doc.results ?? {}
      const declared = new Set(spec !== null ? fieldsOf(spec).map((f) => f.name) : [])
      setUser((m) => {
        const next: SpecValues = { ...m }
        for (const [field, r] of Object.entries(results)) {
          if (typeof r?.positive !== 'string' || r.positive === '') continue
          if (field === 'prompt' || declared.has(field)) next[field] = r.positive
          if (field === 'prompt' && declared.has('negative_prompt')
            && typeof r.negative === 'string' && r.negative !== '') {
            next['negative_prompt'] = r.negative
          }
        }
        return next
      })
      const swept = Object.entries(results)
        .filter(([field, r]) => typeof r?.positive === 'string' && r.positive !== ''
          && (field === 'prompt' || declared.has(field))).length
      if (swept === 0) {
        // the call "succeeded" but nothing landed — that is a
        // rejection with the server's shape as its reason, not a
        // silent no-op and never a lying 'enhanced'
        setEnhanceNote({ err: true, text: 'the enhancer returned no declared fields (' + Object.keys(results).join(', ') + ')' })
      } else {
        const via = Object.values(results)[0]?.via
        setEnhanceNote({ err: false, text: typeof via === 'string' && via !== '' ? 'enhanced via ' + via + ' (' + String(swept) + ' field' + (swept === 1 ? '' : 's') + ')' : 'enhanced (' + String(swept) + ' field' + (swept === 1 ? '' : 's') + ')' })
      }
    } catch (e: unknown) {
      setEnhanceNote({ err: true, text: e instanceof Error ? e.message : 'enhance failed' })
    } finally {
      setEnhancing(false)
    }
  }
  // THE PICKER WIRE (data only — the CONSTRUCTOR owns the square now,
  //  the operator's law: an emitted image input constructs the input
  //  component automatically, no surface wires it). candidatesFor
  //  narrows the picker per the DECLARED input-edge kind (THE EDGE LAW).
  // loadMedia rides the mounted media namespace (the one-lane law —
  // the form's picker receives its rows INJECTED, never a fetch of
  // its own).
  const wire = { candidates, candidatesFor, loadMedia: fetchMediaLibrary }
  const run = async (): Promise<void> => {
    setError(null)
    try {
      // THE USER LAYER RIDES VERBATIM (the parameter audit): the
      // whole explicit map — params, axis keys, macro stamps —
      // presence IS the truth the engine composes. Keys the stage HELD that
      // left the user map ride as nulls (JSON Merge Patch: null
      // deletes — the unset's domain half). An identical map skips
      // the write (a noise guard, never a semantic — marking is by
      // presence, this only avoids re-writing the same bench).
      const patch: SpecValues = {}
      const userKeys = new Set(Object.keys(user))
      const heldKeys = new Set(Object.keys(held))
      for (const k of userKeys) patch[k] = user[k]
      for (const k of heldKeys) if (!userKeys.has(k)) patch[k] = null
      const sameAsHeld = userKeys.size === heldKeys.size
        && [...userKeys].every((k) => Object.is(user[k], held[k]))
      if (Object.keys(patch).length > 0 && !sameAsHeld) {
        await patchStageParams(bench.draftId, stage.id, patch, bench.rev)
      }
      onRun()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'run failed')
      onResync?.()
    }
  }
  // THE GESTURE BINDING (hour-26, the 1:1 law): the frame's top-bar
  // Run pill calls THIS verb — the flush-then-start law the drill
  // owns. A REF DISPATCHER: the bound fn is STABLE (bound once —
  // never a re-render loop) yet always runs the CURRENT closure
  // (the ref re-points every render; the verb reads it at call
  // time, so the flush sees the latest user/held maps).
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    bindRun?.(() => { void runRef.current() })
  }, [bindRun])
  // THE ✦ BINDING (stroke 23): a STABLE wrapper over the ref — the
  // bar's capsule calls the CURRENT closure, bound once per mount
  const enhanceRef = useRef(enhance)
  enhanceRef.current = enhance
  useEffect(() => {
    bindEnhance?.(() => enhanceRef.current())
  }, [bindEnhance])
  const remove = async (): Promise<void> => {
    setError(null)
    setRemoving(true)
    try {
      await removeStageWire({ stage: stage.id, expect_rev: bench.rev }, bench.sessionKey)
      onRemoved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'remove failed')
      setRemoving(false)
      // THE RESYNC LAW: a final refusal (even post-rebase) means this
      // drill's bench view is stale truth — re-read so the next
      // gesture composes against the world as it stands.
      onResync?.()
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
        await ungroupStageWire({ stage: stage.id, expect_rev: bench.rev }, bench.sessionKey)
        onRemoved()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'ungroup failed')
        setRemoving(false)
        onResync?.()
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
    // THE OUTPUT HISTORY (stroke 40): the estate archives the stage's
    // previous results (each a result-shaped row) — newest first,
    // capped, unique by url set. Each entry walks the SAME artifact
    // harvest as the hero's own result (one spelling — the history
    // and the hero can never disagree about what a run produced).
    const historyRaw = Array.isArray((stage as Record<string, unknown>)['history'])
      ? ((stage as Record<string, unknown>)['history'] as unknown[])
      : []
    // THE PARAMS CHIP: each archived generation may carry its params
    // snapshot (taken at ITS landing) — the note names the keys that
    // differ from the live params. One pass harvests artifacts AND
    // note together, so the arrays stay index-aligned by construction
    // (an entry without a snapshot keeps an EMPTY slot — alignment
    // over density; the owner omits the field when no entry differs).
    const liveParams = stage.params
    const pairs = historyRaw
      .map((e) => ({
        arts: previewArtifactsFor({ result: e }),
        note: paramsDiffKeys((e as Record<string, unknown>)['params'], liveParams) ?? '',
      }))
      .filter((p) => p.arts.length > 0)
    const history = pairs.map((p) => p.arts)
    const noteList = pairs.map((p) => p.note)
    const historyNotes = noteList.some((n) => n !== '') ? noteList : undefined
    const owner = {
      kind, artifacts,
      runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
      stageId: stage.id,
      ...(history.length > 0 ? { history } : {}),
      ...(historyNotes !== undefined ? { historyNotes } : {}),
      // THE STRIP OPT-OUT (gap 4, stroke 67): the SERVED doc's
      // preview.historyStrip — door-served off the card's own
      // declaration, never a client-side guess per card id.
      ...((spec as { preview?: { historyStrip?: boolean } } | null)?.preview?.historyStrip === false
        ? { historyStrip: false }
        : {}),
      // THE LIVE FIGURE (stroke 90 + the live follow-up): the SERVED
      // doc's preview.figure claim (identityModel) + the LIVE shape
      // arms derived from the card's RESOLVED params — the identity
      // group's fields (order-sorted) become the coeff vector; the
      // morph group's non-zero values become local_changes. The
      // figure RESHAPES as the user drags (the studio's live
      // sculpt, on the shared fetchBindMesh surface).
      ...(spec?.preview?.figure !== undefined
        ? {
            figure: {
              identityModel: spec.preview.figure.identityModel,
              ...(figureCoeffsOf(spec, value) !== null ? { identityCoeffs: figureCoeffsOf(spec, value) } : {}),
              ...(figureLocalChangesOf(spec, value) !== null ? { localChanges: figureLocalChangesOf(spec, value) } : {}),
            },
          }
        : {}),
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
  // THE WEBHOOK FEED (stroke 46b, the operator's order: "see the
  // received webhooks in the drilled-out view"): the engine's /ws
  // progress tap folds activity + progress onto the stage rows — the
  // drill renders them LIVE (the tile keeps its percent pill).
  const activity = typeof (stage as { activity?: unknown }).activity === 'string'
    ? (stage as { activity?: unknown }).activity as string : ''
  const progress = (stage as { progress?: { value: number, max: number } | null }).progress ?? null
  const pct = progress !== null && progress.max > 0 ? Math.floor((100 * progress.value) / progress.max) : null
  const webhookFeed = h('div', { className: css.runRow, 'data-testid': 'drill-webhooks' },
    activity !== '' ? h('span', { className: css.tilePct, 'aria-label': 'engine activity' }, activity) : null,
    pct !== null ? h('span', { className: css.tilePct, 'data-testid': 'drill-progress', 'aria-label': 'progress percent' }, pct + '% (' + String(progress.value) + '/' + String(progress.max) + ')') : null,
  )
  const genericDetail = (): ReturnType<typeof h> => h('div', { className: css.zoomDetail },
    webhookFeed,
    // THE UNIFORM SHELL (hour 24 stroke 15 — the operator's sharing
    // call): the zoom rides the SAME StudioShell every studio card
    // rides — one params-scroll law, one three-slot shape. The zoom's
    // outputs column claims the preview slot.
    h(StudioShell, {
    params: h('div', { className: css.paramsCol },
        // the ✦ row is a HEADER ACTION, never scroll content (hour 24
        // stroke 12: flush at the params column's scroll top, the
        // button's capsule top clipped under the boundary — the row
        // now rides ABOVE the scrolling list and never moves)
        // THE ✦ BUTTON RETIRED FROM THE RAIL (stroke 23, the operator's
        // law: it rides the top bar beside Run now — the frame's
        // capsule, this rail keeps only the note as inline feedback)
        enhanceNote !== null
          ? h('div', { className: css.enhanceRow, 'data-testid': 'enhance-note' },
              h('span', { className: enhanceNote.err ? css.runError : css.enhanceNote }, enhanceNote.text))
          : null,
        h('div', { className: css.params },
        !loaded ? h('div', { className: css.load }, 'form…')
        : spec !== null
          ? h(SpecForm, {
            spec, user, base: servedBase, onSet, onUnset, wire,
            onPatch: onPatchParams,
            // THE TWO PROMPTS' ARMS (stroke 18, the operator's law:
            // offered-but-absent PROMPTS, never blocks): a boarded
            // model not on the machine → provision_model; a declared
            // extension pack the engine cannot see → install_extension.
            // Both ride the manage door's wire (the user gesture is
            // the click; the reply's truth renders inline).
            onDownloadModel: (id: string) => postManageAction('provision_model', { model: id })
              .then((r) => r.ok),
            onInstallPack: (id: string) => postManageAction('install_extension', { nodes: [id] })
              .then((r) => r.ok),
            // THE PAINT FACE: the brush modal + the reference field
            // (mask-form's input_image — the kind declaration gates
            // the verb; other cards never see it).
            paintFace: PaintLeafModal,
            // THE BBOX FACE (stroke 78): the selection modal for
            // bbox-canvas kinds (sam2/sam3) — same reference law.
            bboxFace: BboxLeafModal,
            paintReference: 'input_image',
          })
        : h('pre', { className: css.mono }, JSON.stringify(held, null, 2)),
        ),
        // THE RUN SEAT RETIRED (hour-26, the operator: the play
        // button rides the top bar and the comfyui progress webhooks
        // surface in the strip under it — the frame's zoomBar owns
        // the gesture and the live fold now, for every face). The
        // params rail keeps only what it owns: the ✦ row and the
        // form; a client-side error (not the run's) still lands at
        // the rail's bottom.
        error !== null ? h('div', { className: css.drillRunRow },
          h('span', { className: css.runError }, error),
        ) : null,
      ),
      preview: h('div', { className: css.outputs },
        h('div', {
          className: css.outputsPreview + ' ' + css.previewClickable,
          'data-testid': 'stage-preview-seat',
          role: 'button',
          tabIndex: 0,
          'aria-label': 'Open media drilldown',
          onClick: () => {
            const artifacts = previewArtifactsFor(stage as unknown as Record<string, unknown>)
            const hero = artifacts[0]
            if (hero === undefined) return
            const kind = primaryKindFor(spec, hero.url)
            if (kind === null) return
            setDrillItem({
              kind: kind === 'mesh' ? 'model' : kind,
              url: hero.url,
              // the drilldown's caption shows the FILE (the gallery's
              // own column) — the harvest's generic 'output' name
              // falls to the url's basename
              file: hero.name !== '' && hero.name !== 'output'
                ? hero.name
                : hero.url.split('/').pop() ?? hero.url,
              head: String(stage.title ?? stage.card ?? stage.id),
              time: '',
            })
          },
          onKeyDown: (e: unknown) => {
            const ke = e as KeyboardEvent
            if (ke.key === 'Enter' || ke.key === ' ') {
              ke.stopPropagation()
              ;(e as { target: HTMLElement }).target.click()
            }
          },
        },
          stagePreview() ?? h('div', { className: css.outputsHint },
            running ? 'rendering… the preview lands here' : 'run lands the preview here')),
        drillItem !== null
          ? h(MediaDrilldown, { item: drillItem, onClose: () => { setDrillItem(null) } })
          : null,
        // (THE FAILURE FACE MOVED TO THE FRAME (hour-26): the run's
        //  error text rides the webhook strip under the top bar —
        //  the outputs column keeps only the preview. The remove row
        //  stays retired.)
        ),
      }),
    )
  // the consult (ToolCallTree's call verbatim): entryKey = card name
  return renderStageView({
    stageId: stage.id,
    cardName: String(stage.card ?? ''),
    row: stage as unknown as Record<string, unknown>,
    runStatus: typeof stage.runStatus === 'string' ? stage.runStatus : '',
    onPatch: onPatchParams,
    onRun,
    onStop,
    // THE GESTURE CHANNEL (hour-26): a studio with a domain-first
    // law binds its verb THROUGH the drill's claim — the frame's
    // pill then runs the studio's law, not a bare start.
    bindRun: (r: () => void) => { bindRun?.(r) },
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
function AddCardDoor({ bench, sessionKey, onAdded, onClose, onAddedRow }: {
  sessionKey: string
  bench: CardsBenchValue
  onAdded: () => void
  /** The add's fresh row, when the bench diff found it — the parent
   *  opens the card's drilldown right after the add (the old tree's
   *  law, InlinePipelineCards.handlePick: "Auto-open the new card —
   *  the user types the prompt immediately, in the zoom drilldown,
   *  not a mystery tile"). */
  onAddedRow?: (row: BenchStageRow) => void
  onClose: () => void
}): ReturnType<typeof h> {
  // THE PLAIN DOOR (the operator's hour-24 order: "a random screen
  //  pops up that I don't want. It should just add the card and go
  //  into the drilldown view" — and the preadd form screen goes with
  //  it): the door is picker ONLY — the pick IS the add (the spec
  //  fetch rides silent for engine + axis seeds), then the fresh
  //  row's drill opens. For EVERY card, claimed or not. The hour-9
  //  claimed-studio preview (a page-sized studio modal hijacking the
  //  door the moment a studio card was picked) is REPEALED — the
  //  studio is the ZOOM face for its cards (the real-card law lives
  //  there), never the add door's.
  const [cards, setCards] = useState<CatalogCard[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // THE PICK IS THE ADD (the operator's law: the preadd form screen
  // goes — clicking a card adds it and opens its drill, no middle
  // screen). busyId marks the row while its spec + add land.
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    fetchCardCatalog()
      .then((list) => { if (alive) setCards(list) })
      .catch((e: unknown) => { if (alive) setCatalogError(e instanceof Error ? e.message : 'catalog unavailable') })
    return () => { alive = false }
  }, [])
  const pick = (card: CatalogCard): void => {
    if (busyId !== null) return
    setBusyId(card.id)
    setAddError(null)
    // the spec fetch goes SILENT (engine + axis seeds for the add —
    // the drill fetches it again for editing): the card's declared
    // form never renders here anymore.
    const family = card.families[0] ?? card.id
    void fetchFormSpec(family).then((doc) => add(card, doc), (e: unknown) => {
      setBusyId(null)
      setAddError(card.label + ': ' + (e instanceof Error ? e.message : 'form-spec unavailable'))
    })
  }
  const add = async (picked: CatalogCard, spec: FormSpecDoc): Promise<void> => {
    try {
      const doc: Record<string, unknown> = {
        card: picked.id,
        author: 'user',
        engine: spec.engine ?? 'comfyui',
        expect_rev: bench.rev,
      }
      // THE AXIS SEED rides the add: a new card is born with its
      // declared variant/quant/model (the first-declared law). The
      // seeds ride as the row's params — defaults derive at compose,
      // never ride the bench as fake overrides.
      const seeds = seedUser(spec, {})
      if (Object.keys(seeds).length > 0) doc['params'] = { ...seeds }
      await addStageWire(doc, sessionKey)
      setBusyId(null)
      // THE OPEN-ON-ADD LAW (the operator's hour-7): after the door
      // lands, the bench is re-read and the ONE fresh id (the card
      // just added — the flow is one card at a time) is handed up;
      // the parent opens the REAL card (the zoom consult). The door
      // response shape never enters this — the bench diff is the
      // truth. A diff that finds nothing falls back to plain onAdded
      // (the row still lands; only the auto-open is skipped).
      try {
        const before = new Set(bench.stages.map((r) => r.id))
        const next = await fetchBench(sessionKey)
        const fresh = next.stages.find((r) => !before.has(r.id)) ?? null
        if (fresh !== null && onAddedRow !== undefined) onAddedRow(fresh)
        else onAdded()
      } catch {
        onAdded()
      }
    } catch (e: unknown) {
      setBusyId(null)
      setAddError(picked.label + ': ' + (e instanceof Error ? e.message : 'add refused'))
    }
  }
  const filtered = (cards ?? []).filter((c) => {
    if (query === '') return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q)
  })
  const genres: Array<[string, CatalogCard[]]> = []
  for (const c of filtered) {
    // (f, operator): Motion belongs to 3d — one section, the 3d
    // lane's own motion cards sit with their kin.
    const g0 = c.genre !== '' ? c.genre : 'other'
    const g = g0 === 'motion' ? '3d' : g0
    const known = genres.find((x) => x[0] === g)
    if (known === undefined) genres.push([g, [c]])
    else known[1].push(c)
  }
  return h(Modal, {
    open: true, onClose, title: 'Add a card', closeLabel: 'Close picker',
    className: css.drill,
  },
    h('div', { className: css.picker },
      h(Input, {
        value: query,
        placeholder: 'Search cards…',
        onChange: (e: unknown) => setQuery((e as { target: { value: string } }).target.value),
        'aria-label': 'Search cards',
      }),
      catalogError !== null ? h('p', { className: css.runError }, catalogError) : null,
      addError !== null ? h('p', { className: css.runError }, addError) : null,
      cards === null && catalogError === null ? h('div', { className: css.load }, 'cards…') : null,
      // SECTIONS KEPT (operator, stroke 46d fix): the genre titles
      // STAY — the complaint was their SIZE, not their existence.
      // The titles now dominate the card labels (the css owns it).
      genres.map(([g, list]) => h('section', { key: g, className: css.pickerGenre },
        h('h4', { className: css.pickerGenreTitle }, titleCaseId(g)),
        list.map((c) => h('button', {
          key: c.id,
          type: 'button',
          className: css.pickerCard,
          disabled: busyId !== null,
          title: c.description !== '' ? c.label + ' — ' + c.description : c.label,
          onClick: () => pick(c),
        },
          h('span', { className: css.pickerCardLabel }, busyId === c.id ? 'adding…' : c.label),
        )),
      )),    ),
  )
}

function BenchView({ bench, sessionKey, onRun, onRunStage, onStopStage, onRemoveStage, stageRuns, running, onPatchParams, renderStageView, renderPreview, runId, refreshTick, startError }: {
  sessionKey: string
  bench: CardsBenchValue
  onRun: () => void
  onRunStage: (stage: BenchStageRow) => void
  /** the tile chrome's stop + remove verbs (the chat-input law). */
  onStopStage: (stage: BenchStageRow) => void
  onRemoveStage: (stage: BenchStageRow) => void
  stageRuns: Record<string, string>
  running: boolean
  onPatchParams: (stage: BenchStageRow, patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId?: string | null
  /** The outcome observer's touch — the rail re-reads so tile
   *  runStatus/result stay live without ever leaving the bench. */
  refreshTick?: number
  /** THE START-ERROR SEAM (stroke 25): a run-start rejection rides
   *  INTO the open drill's webhook bar — the tab-level seat renders
   *  behind the zoom overlay, invisible where Run was pressed. */
  startError?: string | null
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
    fetchBench(sessionKey)
      .then((next) => {
        setLive(next)
        if (opts?.keepOpen === true) {
          setOpen((cur) => cur === null ? null : (next.stages.find((s) => s.id === cur.id) ?? null))
        } else {
          setOpen(null)
        }
      })
      .catch((e: unknown) => { setReloadError(e instanceof Error ? e.message : 'bench reload failed') })
  }, [sessionKey])
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
    void reorderStageWire({ stage: active, to, expect_rev: beforeRev }, sessionKey)
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
      }, sessionKey)
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
      }, sessionKey)
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
        }, sessionKey))
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
    void groupStagesWire({ stages: ordered, expect_rev: live.rev }, sessionKey)
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
        const field = fieldsOf(spec).find((f) => f.type === kind)
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
  // SAVE (operator, stroke 46): mint the bench's stages as a NAMED
  // doc on the drafts domain — it lists in the gallery's Flows face
  // and restores onto any conversation's bench by click. The same
  // ensure door every bench write rides; the name slugs to the key.
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const onSave = useCallback((): void => {
    const name = saveName.trim()
    if (bench.kind !== 'bench' || name === '') return
    const slug = 'saved-' + name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    setSaveError(null)
    fetch('/v1/bench/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: slug, author: 'user', intent: name, stages: bench.stages.map((st) => ({ ...st, result: undefined, runStatus: undefined, resolved: undefined })) }),
    }).then(async (res) => {
      if (!res.ok) { setSaveError('save refused (' + (await res.json().catch(() => null) as { error?: string } | null)?.error + ')'); return }
      setSaving(false); setSaveName('')
    }).catch((e: unknown) => { setSaveError('save failed — ' + (e instanceof Error ? e.message : String(e))) })
  }, [bench, saveName])

  return h('section', { className: css.cardsBench, 'data-cards-bench': benchRev },
    h('header', { className: css.benchHead },
      h('span', { className: css.revTag }, 'rev ' + benchRev),
      h('span', { className: css.groupBar },
            h('button', {
              className: css.runBtn,
              type: 'button',
              disabled: running || live.stages.length === 0,
              title: running ? 'the pass is running' : 'run every card in bench order — one run per card, stop on failure',
              onClick: onRun,
            }, running ? h(IconLoadingOutline16, { size: 14 }) : h(IconPlayOutline16, { size: 14 }), ' Play'),
            saving
              ? h('span', { className: css.groupBar },
                  h(Input, { value: saveName, placeholder: 'flow name', onChange: (e: { target: { value: string } }) => { setSaveName(e.target.value) } }),
                  h('button', { className: css.runBtn, type: 'button', disabled: saveName.trim() === '', onClick: onSave }, 'Save'),
                  h('button', { className: css.back, type: 'button', onClick: () => { setSaving(false); setSaveError(null) } }, 'Cancel'),
                )
              : h('button', { className: css.back, type: 'button', disabled: live.stages.length === 0, title: 'mint this bench as a named flow (restores from the Flows face)', onClick: () => { setSaving(true) } }, 'Save'),
          ),
    saveError !== null ? h('p', { className: css.runError }, saveError) : null,
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
                  onRun: (r) => onRunStage(r.stage),
                  onStop: (r) => onStopStage(r.stage),
                  onRemove: (r) => onRemoveStage(r.stage),
                  activeRunId: stageRuns[s.id] ?? null,
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
    // THE ZOOM (2026-09-11): the drill is the shared-element morph —
    // the tile GROWS into the zoom card (spring 300/30), the modal is
    // dead (the old tree's own law: "the modal was a second surface;
    // both are dead").
    open !== null ? h(CardZoomOverlay, {
      stage: open,
      bench: live,
      startError,
      running,
      onRun: () => { onRunStage(open) },
      onStop: () => { onStopStage(open) },
      onClose,
      onRemoved: () => { setOpen(null); reload() },
      onPatchParams: (patch: Record<string, unknown>) => { onPatchParams(open, patch) },
      renderStageView,
      renderPreview,
      runId,
      detail: StageDrill,
    }) : null,
    adding ? h(AddCardDoor, {
      sessionKey,
      bench: live, onAdded, onClose: () => { setAdding(false) },
      // THE OPEN-ON-ADD (the old tree's law verbatim): the fresh
      // row's zoom (the drilldown; for a studio card the studio IS
      // its drilldown face — the real-card law) opens the moment
      // the door lands it.
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
function DraftView({ value, running, onRun, onStop, onBack, onPatchParams, renderStageView, renderPreview, runId, bindRun }: {
  value: CardsDraftValue
  running: boolean
  onRun: () => void
  /** THE STOP DOOR (2026-09-13): the draft drill's run button flips
   *  to stop mid-run, same gesture as the bench faces. */
  onStop: () => void
  onBack: () => void
  onPatchParams: (patch: Record<string, unknown>) => void
  renderStageView: (owner: StageViewOwnerProps, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  renderPreview?: (owner: { kind: 'video' | 'image' | 'audio' | 'mesh', artifacts: Array<{ name: string, url: string }>, runStatus: string, stageId: string, history?: Array<Array<{ name: string, url: string }>> }, fallback: ReturnType<typeof h>) => ReturnType<typeof h>
  runId: string | null
  bindRun?: (run: () => void) => void
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
  // sessionKey: the chat-plane owner props carry no session id
  // (the slot contract's face — the scope is session-keyed but the
  // props don't spell it), so the synthetic bench carries the
  // address-grammar root's unattributed spelling. The key is never
  // spent (canRemove false below — rev -1 is the no-CAS marker).
  const bench: CardsBenchValue = { kind: 'bench', draftId: value.draftId, rev: -1, stages: value.stages, log: [], sessionKey: benchSessionKey(undefined) }
  return h(StageDrill, {
    stage,
    bench,
    running,
    onRun,
    onStop,
    onClose: onBack,
    onRemoved: onBack,
    onPatchParams,
    renderStageView,
    renderPreview,
    runId,
    canRemove: false,
    bindRun,
  })
}

function RunView({ run, sessionKey, onBack, onRestored, onStop }: {
  sessionKey: string
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
    restoreRunToBench(run, sessionKey).then((report) => {
      const extra = report.notes.length > 0 ? ' (' + report.notes.join('; ') + ')' : ''
      const skipped = report.skipped > 0 ? ', ' + String(report.skipped) + ' skipped' : ''
      setNote('restored ' + String(report.added) + ' stage(s) to the bench' + skipped + extra)
      setRestoring(false)
      onRestored()
    }).catch((e: unknown) => {
      setNote(e instanceof Error ? e.message : String(e))
      setRestoring(false)
    })
  }, [run, onRestored, sessionKey])
  return h('section', { className: css.runView, 'data-run-status': run.status },
    h('header', { className: css.runHead },
      h('span', { className: css.runId }, run.runId),
      h('span', { className: css.runStatus }, titleCaseId(run.status)),
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
  // THE SPOTLIGHT MARKER (stroke 42, the one-flow law): true while
  // THIS body is the mounted seat rendering the bench. The plugin's
  // bench watcher reads it to decide whether an agent-authored land
  // needs the reveal — a seat the user is already reading must not be
  // re-placed (their scroll/selection would reset for nothing).
  useEffect(() => {
    markCardsSurface(true)
    return () => { markCardsSurface(false) }
  }, [])
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
  // THE PER-CONVERSATION BINDING (stroke 44): the tab serves ITS
  // conversation's bench — the session prop wins (the law), the
  // address tail backs it (spotlight-opened tabs carry the key), and
  // 'main' serves unattributed seats. The bench record rides the
  // session-qualified address so two conversations' tabs never share
  // one stream; run/draft addresses pass through untouched.
  const benchKey = benchSessionKey(props.sessionId ?? benchSessionOfAddress(resolveCardsAddress(rawAddress)))
  const benchAddress = benchAddressOf(benchKey)
  const resolved = resolveCardsAddress(rawAddress)
  const parsed = parseCardsAddress(resolved)
  const address = parsed !== null && ('run' in parsed || 'draft' in parsed) ? resolved : benchAddress
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

  // THE TILE CHROME'S RUN MAP (2026-09-13): stageId → live runId —
  // armed when a run starts (the drill's Run, the tile's play, the
  // sequential pass), cleared when its observer settles terminal.
  // The stop button targets this; unknown-run rows (another session)
  // disable stop — reconcile heals their status instead.
  const [stageRuns, setStageRuns] = useState<Record<string, string>>({})
  const clearStageRun = useCallback((stageId: string): void => {
    setStageRuns((m) => { const n = { ...m }; delete n[stageId]; return n })
  }, [])
  const onStarted = useCallback((runId: string, ran?: { draftId: string; stageId: string }): void => {
    setRunning(false)
    setLastRunId(runId)
    if (ran === undefined) return
    setStageRuns((m) => ({ ...m, [ran.stageId]: runId }))
    if (outcomeAbort.current === null) outcomeAbort.current = new AbortController()
    void observeRunOutcome(ran.draftId, ran.stageId, runId, outcomeAbort.current.signal, touchBench)
      .then(() => { clearStageRun(ran.stageId) })
  }, [touchBench, clearStageRun])
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
    // THE NO-SILENT-REJECT LAW (stroke 25's law, applied to the run
    // start): a stale/unhydrated bench is a REJECTION WITH A FACE,
    // never a quiet return — the operator pressed Run and got
    // nothing.
    if (snapshot?.value?.kind !== 'bench') {
      setLocalRunError('the bench is not ready to run from — reopen the Media Flow tab (snapshot kind: ' + String(snapshot?.value?.kind ?? 'none') + ')')
      return
    }
    setRunning(true)
    setLocalRunError(null)
    const draftId = snapshot.value.draftId
    const stageId = stage.id
    // THE REFUSAL/FAILURE CARRY (operator 2026-09-14: the compose
    // refusal "needs to be in drill down card as well"): a refused —
    // or THROWN — start writes the row FAILED with the reason: the
    // tile AND the open drill's failure face read the same row, so
    // the why lands where the Run was pressed, not just the tab top.
    const carryFailure = (error: string): void => {
      setRunning(false)
      setLocalRunError(error)
      // the snapshot's rev fences the row write (stale revs rebase
      // inside the door — the revless-write cure, 2026-09-14).
      const rev = snapshot.value.kind === 'bench' ? snapshot.value.rev : undefined
      void patchStageOutcome(draftId, stageId, { runStatus: 'failed', result: { error } }, rev)
        .then(() => { touchBench() })
        .catch(() => {})
    }
    void runCardStage(draftId, stage).then((res) => {
      if ('runId' in res) onStarted(res.runId, { draftId, stageId })
      else carryFailure(res.refused)
    }, (e: unknown) => {
      // a THROWN start (wire down, 500, read-back failure) is a
      // rejection too — the old code had NO catch here: the promise
      // died unhandled, running stuck, and the operator saw NOTHING
      carryFailure(e instanceof Error ? e.message : 'run start failed')
    })
  }, [snapshot, onStarted, touchBench])
  // THE TILE CHROME'S STOP + REMOVE (the chat-input law's verbs):
  // stop rides the run-wire's cancel door for the row's live run;
  // remove rides the bench's CAS door (the drill's own verb, lifted
  // to the tile — the trash replaces the drill-only affordance).
  const onStopStage = useCallback((stage: BenchStageRow): void => {
    const rid = stageRuns[stage.id]
    if (rid === undefined) return
    void stopRun(rid).catch((e: unknown) => {
      setLocalRunError(e instanceof Error ? e.message : 'stop failed')
    })
  }, [stageRuns])
  const onRemoveStage = useCallback((stage: BenchStageRow): void => {
    if (snapshot?.value?.kind !== 'bench') return
    void removeStageWire({ stage: stage.id, expect_rev: snapshot.value.rev }, snapshot.value.sessionKey)
      .then(() => { touchBench() })
      .catch((e: unknown) => {
        setLocalRunError(e instanceof Error ? e.message : 'remove failed')
      })
  }, [snapshot, touchBench])
  // PARAMS PATCH for surface views (the slot's onPatch currency):
  // the same drafts/patch door the drill's own editor rides.
  const onPatchParamsStage = useCallback((stage: BenchStageRow, patch: Record<string, unknown>): void => {
    if (snapshot?.value?.kind !== 'bench' && snapshot?.value?.kind !== 'draft') return
    // THE CAS FENCE RIDES EVERY AUTHOR (the parameter audit): the
    // surface-params patch joins the bench revision law — a bench
    // that moved under the write refuses loud (the snapshot's rev
    // is the expect; the observer refreshes the doc on the refusal).
    void patchStageParams(snapshot.value.draftId, stage.id, patch, snapshot.value.rev)
      .then(() => { setLocalRunError(null); touchBench() })
      .catch((e: unknown) => {
        setLocalRunError(e instanceof Error ? e.message : 'patch failed')
        touchBench()
      })
  }, [snapshot, touchBench])
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
        // THE REFUSAL CARRY (same law as the bench drill): the
        // refused draft-stage start lands on its row, so the open
        // drill's failure face reads the why.
        const draftId = value.draftId
        const stageId = target.id
        const error = res.refused
        const rev = value.kind === 'draft' ? value.rev : undefined
        void patchStageOutcome(draftId, stageId, { runStatus: 'failed', result: { error } }, rev)
          .catch(() => {})
      }
    })
  }, [snapshot, onStarted])
  // DRAFT-STAGE PATCH (the draft view's onPatch currency): the drafts
  // door directly — the same verb the drill's editor rides.
  const onPatchParamsDraft = useCallback((patch: Record<string, unknown>): void => {
    const value = snapshot?.value
    if (value?.kind !== 'draft') return
    // THE CAS FENCE RIDES EVERY AUTHOR (the parameter audit): the
    // draft's own bench revision fences the write; a moved draft
    // refuses loud, never merges under the earlier author.
    void patchStageParams(value.draftId, value.stageId, patch, value.rev)
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
    if (openResource !== undefined) openResource(benchAddress)
  }, [openResource, benchAddress])
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
        // THE APP-SEAT TOAST VIEWPORT (the toast law): the cards
        // console is the always-alive surface — catalog/run-status
        // contract toasts render here when no studio is open. The
        // mount-claim law dedupes with the studio shell's viewport:
        // one renderer per document, whichever seat is live.
        h(ToastViewport),
        h(BenchView, {
          sessionKey: benchKey,
          bench: value,
          onRun,
          onRunStage,
          onStopStage,
          onRemoveStage,
          stageRuns,
          running,
          onPatchParams: onPatchParamsStage,
          renderStageView,
          renderPreview,
          runId: lastRunId,
          refreshTick: benchTick,
          startError: localRunError,
        }),
      )
    : value.kind === 'draft'
    ? h(Fragment, null,
        localRunError !== null ? h('p', { className: css.runError }, localRunError) : null,
        h(DraftView, {
          value,
          running,
          onRun: onRunDraftStage,
          onStop: lastRunId !== null && onStop !== undefined ? () => { onStop(lastRunId) } : () => {},
          onBack: openResource !== undefined ? onBack : (() => {}),
          onPatchParams: onPatchParamsDraft,
          renderStageView,
          renderPreview,
          runId: lastRunId,
        }),
      )
    : h(RunView, { run: value, sessionKey: benchKey, onBack: openResource !== undefined ? onBack : undefined, onRestored: onBack, onStop })
}
