/** bench-row.ts — the bench stage distilled to the card row: the dot
 * map, the row interface, the distillation, the card grouping
 * (extracted from CardsTab.tsx hour 15). */

import { previewKindFor, previewArtifactsFor } from './preview-kinds.ts'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'

/** Bench row run-status → the installed StateDot union (FlowCards'
 *  CardRowLine law: done|warning|ongoing|error — a stage that never
 *  ran shows NO dot, never a fake state). */
// THE DOT MAP IS DERIVED (2026-10-13, the card-UI duplication audit):
// this table and the inline ternary in draft-run-views.tsx were two
// owners of the same question, and they already disagreed — a stopped,
// error or unknown stage showed a dot here and NO dot there, which is
// exactly the "looks idle forever" failure the table was written to
// prevent. One fold (contracts' statusOf), one map, two seats.
export const STAGE_DOT: Record<string, 'done' | 'ongoing' | 'error' | 'warning' | null> = {
  queued: 'warning', pending: 'warning', running: 'ongoing', done: 'done', failed: 'error', stopped: 'warning', ready: null,
  // the FILE-ERA words (the audit's H1): a pre-lifecycle sidecar can
  // carry them, and a stage whose dot is null looks idle forever. The
  // stamp above translates them, so these are the backstop.
  success: 'done', succeeded: 'done', error: 'error', unknown: 'warning', stopping: 'warning',
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

/** The chrome's running truth: the row's stamped status (the observer
 *  patches it terminal the moment the run lands). */
export function rowRunning(row: CardRowLineTabRow): boolean {
  return row.status === 'running' || row.status === 'queued' || row.status === 'pending'
}

/** The bench stage as a card row (the same distillation cardRows()
 *  performs for the chat plane). */
export interface CardRowLineTabRow {
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
  stage: BenchStageView
}

/** exported for the door-contract specs (the tile-face law). */
export function benchRow(stage: BenchStageView, bench?: CardsBenchValue): CardRowLineTabRow {
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
