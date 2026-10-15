/** bench-row.ts — the bench stage distilled to the card row: the dot
 * map, the row interface, the distillation, the card grouping
 * (extracted from CardsTab.tsx hour 15). */

import { previewKindFor, previewArtifactsFor } from './preview-kinds.ts'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'
import { statusOrPendingOf, type CardStatus } from '@melite/contracts/stageView'
import { chromeCopy } from '../chromeCopy.ts'

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
  /** THE PROFESSIONAL NAME (operator 2026-11-06): the catalog's
   *  label for the row's card ('Generate Image', never the
   *  'image-gen' id) — the tile's kind face renders this, falling
   *  back to the title-cased id; null for groups and for cards the
   *  catalog does not know (their faces are exactly today's). */
  kindLabel: string | null
  title: string
  service: string | null
  /** THE FOLDED STATUS (2026-10-01): the one vocabulary, end to end —
   *  raw words never ride a row. Consumers branch on CardStatus; the
   *  raw word stays on stage.runStatus for the drill's wire truth. */
  status: CardStatus
  dot: 'done' | 'ongoing' | 'error' | 'warning' | null
  /** THE TRANSPORT-HEALTH CARRY (LOW-23, 2026-10-12): the stage
   *  row's resource word ('unreachable' while the transport is
   *  down), or null — never folded into status, never laundered
   *  into run vocabulary. */
  health: string | null
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
  face: 'video' | 'image' | 'audio' | 'mesh' | 'text' | null
  videoUrl: string | null
  upstream: string | null
  sourceAttached: boolean
  stage: BenchStageView
}

/** exported for the door-contract specs (the tile-face law). */
export function benchRow(stage: BenchStageView, bench?: CardsBenchValue, cardLabel?: (card: string) => string | null): CardRowLineTabRow {
  const isGroup = stage.card === 'group'
  const children = isGroup && Array.isArray(stage.children) ? stage.children.length : 0
  // THE PROFESSIONAL NAME (operator 2026-11-06): a stage the user
  // never titled faces the catalog's label for its card — never the
  // id. The user's own title always wins; a card the catalog does
  // not know keeps today's id face (the name is never a failure).
  // String() keeps the seat branchless (a cardless row looks up a
  // nonsense id and misses, exactly like an unknown card).
  const label = isGroup ? null : (cardLabel?.(String(stage.card)) ?? null)
  const title = isGroup
    ? chromeCopy.groupTitle({ count: children })
    : (stage.title ?? label ?? stage.card ?? stage.id)
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
  // THE HEALTH CARRY (LOW-23): the transport word rides its own
  // channel — never the status fold. A present word ('unreachable'
  // after the escalation threshold) renders as the warning face.
  const health = typeof stage.health === 'string' && stage.health !== '' ? stage.health : null
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
  //
  // THE RESTORED-RUN HARVEST (2026-10-02, the operator's "resume
  // historical runs and the preview is gone"): the gallery's restore
  // stamp mints `result.url` as the query-carrying artifact route
  // `/infer-gallery/artifact?path=<run-relative tail>` — the url is
  // loadable, but its PATH carries no extension, so the sniff above
  // read null and the tile fell to the kind face while the zoomed
  // drill (which harvests `result.artifacts`) previewed the same
  // run. The tile takes its kind from that same harvest when the
  // sniff cannot: the stamp keys every artifact by its run-relative
  // tail, so the NAME carries the kind the url hides.
  const artifacts = previewArtifactsFor(stage as unknown as Record<string, unknown>)
  const harvested = ((): { kind: 'video' | 'image' | 'audio' | 'mesh' | 'text'; url: string } | null => {
    for (const a of artifacts) {
      const kind = previewKindFor(a.name)
      if (kind === null) continue
      return { kind, url: a.url }
    }
    return null
  })()
  const face = previewKindFor(url) ?? harvested?.kind ?? null
  const absolute = (u: string): boolean => /^(https?:\/\/|\/)/.test(u)
  const posterFromArtifacts = ((): string | null => {
    if (face !== 'mesh') return null
    for (const a of artifacts) {
      // live gallery names may be stems while their urls carry the
      // extension; restored urls hide it behind the query while their
      // names carry it — the pick consults both, never one.
      if ((previewKindFor(a.name) ?? previewKindFor(a.url)) === 'image' && absolute(a.url)) return a.url
    }
    return null
  })()
  return {
    id: stage.id,
    kind: isGroup ? 'group' : String(stage.card ?? 'card'),
    kindLabel: isGroup ? null : label,
    title: String(title),
    service: typeof stage.engine === 'string' && stage.engine !== '' ? stage.engine : null,
    status,
    // THE HEALTH DOT (LOW-23): a present health word owns the dot —
    // 'warning', never the fold of the (possibly stale) status word.
    // The run may genuinely still be running server-side while the
    // transport is down; the warning dot is the only face that says
    // WHY the row went quiet.
    dot: health !== null ? 'warning' : STATUS_DOT[status],
    /** the transport-health carry — the row's resource word, or null. */
    health,
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
    // view owns that face) — the kind Pill rides instead. Every real
    // writer hands the bench an absolute url (the live observer via
    // the run-wire's one rewrite, the restore stamp via the gallery
    // route), so the harvest supplies the KIND and this selection
    // stays url-driven.
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
    sourceAttached: Object.values(params).some((v) => {
      if (typeof v !== 'string') return false
      // the faces the estate stages (round-23 gallery audit F8: the
      // gallery face was missing here — a stage chaining a gallery
      // URL is attached; case-insensitive like every staging door).
      const lower = v.toLowerCase()
      return v.startsWith('data/input/')
        || lower.startsWith('/melite-media/')
        || lower.startsWith('/v1/assets/')
        || lower.startsWith('/infer-gallery/artifact')
    }),
    stage,
  }
}
