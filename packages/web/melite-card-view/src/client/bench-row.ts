/** bench-row.ts — the bench stage distilled to the card row: the dot
 * map, the row interface, the distillation, the card grouping
 * (extracted from CardsTab.tsx hour 15). */

import { previewKindFor, previewArtifactsFor } from './preview-kinds.ts'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'
import { statusOrPendingOf, type CardStatus } from '@melite/contracts/stageView'

/** CardStatus → the installed StateDot union (FlowCards' CardRowLine
 *  law: done|warning|ongoing|error — a stage that never ran shows NO
 *  dot, never a fake state). */
// THE DOT MAP IS FOLDED (2026-10-01, the vocabulary audit): the old
// raw-word table carried NO 'completed' key while the estate settles
// every finished stage to exactly that word — no dot on any settled
// stage, the bug this table's comment claimed cured. Keyed by the
// fold's own output (Record<CardStatus, …> — the compiler now refuses
// a missing word), read through statusOf at both seats, so completed,
// succeeded, success, interrupted and live arrive for free. 'pending'
// shows no dot: it is the fold's home for no-information (never ran
// or unrecognized), and a stage we know nothing about shows nothing.
// cached and reused carry their artifact: a done dot, not a blank.
export const STATUS_DOT: Record<CardStatus, 'done' | 'ongoing' | 'error' | 'warning' | null> = {
  pending: null,
  queued: 'warning',
  running: 'ongoing',
  done: 'done',
  error: 'error',
  stopped: 'warning',
  stale: null,
  cached: 'done',
  skipped: null,
  reused: 'done',
}

/** THE CATEGORIES: bench stages grouped by card (first-appearance
 *  order — the agent's construction order survives; stages with no
 *  card gather under 'uncategorized', never dropped). */
export function groupStagesByCard(stages: BenchStageView[]): Array<{ card: string; rows: BenchStageView[] }> {
  const groups: Array<{ card: string; rows: BenchStageView[] }> = []
  for (const s of stages) {
    const card = typeof s.card === 'string' && s.card !== '' ? s.card : 'uncategorized'
    const known = groups.find((g) => g.card === card)
    if (known === undefined) groups.push({ card, rows: [s] })
    else known.rows.push(s)
  }
  return groups
}

/** The chrome's running truth: the row's FOLDED status (the observer
 *  patches it terminal the moment the run lands). The folded live
 *  pair is running|queued — the waiting face. Folded `pending` is
 *  deliberately excluded: on the folded plane it is the
 *  no-information home (never-ran, or a word the fold does not
 *  know), and spinning on no information is a fake state. Raw
 *  'pending' words never reach here folded-pending: the fold maps a
 *  raw queued-for-start to 'queued'. Seats that judge RAW words use
 *  the owner's isLiveRunStatus instead. */
export function rowRunning(row: CardRowLineTabRow): boolean {
  const s = row.status
  return s === 'running' || s === 'queued'
}

/** The bench stage as a card row (the same distillation cardRows()
 *  performs for the chat plane). */
export interface CardRowLineTabRow {
  id: string
  kind: string
  title: string
  service: string | null
  /** THE FOLDED STATUS (2026-10-01): the one vocabulary, end to end —
   *  raw words never ride a row. Consumers branch on CardStatus; the
   *  raw word stays on stage.runStatus for the drill's wire truth. */
  status: CardStatus
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
  stage: BenchStageView
}

/** exported for the door-contract specs (the tile-face law). */
export function benchRow(stage: BenchStageView, bench?: CardsBenchValue): CardRowLineTabRow {
  const isGroup = stage.card === 'group'
  const children = isGroup && Array.isArray(stage.children) ? stage.children.length : 0
  const title = isGroup
    ? 'Group (' + String(children) + ')'
    : (stage.title ?? stage.card ?? stage.id)
  // THE FOLD AT THE SEAM: every word in the vocabulary folds to its
  // CardStatus exactly once, here. A word outside it is "never ran"
  // — this seat's own no-information home (no dot, not running) — and
  // the membership test is explicit, because the contract fold now
  // refuses an unknown word rather than laundering it into 'pending'
  // (operator decision 2026-10-12). 'ready' is NOT such a word: it is
  // FlowStatus's "awaiting run" (the bench stamps it at birth) and
  // folds to the waiting face like 'pending'.
  const rawStatus = typeof stage.runStatus === 'string' ? stage.runStatus : ''
  const status: CardStatus = statusOrPendingOf(rawStatus)
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
    dot: STATUS_DOT[status],
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
