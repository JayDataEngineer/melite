// cards-resource.ts — the uploads door's client verb now lives in
// the base (@melite/card-base/wire — the construction law's upload
// half); re-exported here for the view's import paths.
export { uploadInputFile } from '@melite/card-base/wire'

/**
 * The `cards` resource protocol — the cards tab's live values.
 *
 * Addresses (the bench rework's client plane, docs/plans/
 * bench-rework-2026-09-10.md §5):
 *
 *   dsh-resource://cards/bench        THE working flow (the shared bench)
 *   dsh-resource://cards/run/<runId>  one run, live
 *
 * The provider wraps the estate's Typert remotes over the wire frame
 * (same-origin POST /api/<ns>/<method> carrying the client-request
 * frame — api-gateway.md, the sanctioned caller for plugins outside
 * the DSH web kernel): the bench hydrates from `bench/get`
 * (session 'main') — a snapshot today, no revision channel exists on
 * the wire, so the stream ends after the first frame and consumers
 * reload after their own edits; the run hydrates from `runs/status`
 * then POLLS it for live stage/terminal movement until the run
 * settles or the last holder releases. (The gateway-era events WS
 * died with the gateway app; the collapse plan's stream remote —
 * @Remote({mode:'stream'}) over the mux — replaces polling when the
 * plane exists. Until then the poll is the honest degrade: no
 * invented sockets, no phantom channels.)
 *
 * Frame law (dsh-client-resources contract): the first frame is the
 * current content; failures are frames, never throws — a thrown stream
 * is a programming error. The generator ends when `signal` aborts.
 */
import type { ResourceProtocolMap } from '@deepseek-ai/dsh-client-ui-slots'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import {
  fetchLatestRunForDraft,
  fetchRunStageUrl,
  fetchRunStatus,
  fetchRunTerminal,
  isTerminalRun,
  nextRpcId,
  readRunStatus,
  toRunMediaUrl,
  wireCall as runWireCall,
} from '@melite-plugin/melite-run-wire'
import type { FlowEventFrame } from './draft.ts'
import { patchStageOutcome } from './draft.ts'

/** The cards resource's Remote failure code, merged into the
 *  protocol's one vocabulary (cookbook §2: declaration merging, next
 *  to the throw — the gateway/internal bucket died with the app). */
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The door's wire is untyped at this seam — the address prefixes
     *  the diagnostic. */
    'cards/unclassified': Record<string, never>;
  }
}

/** One bench stage as the door serves it (presentation extras ride —
 *  this is the USER-facing view; the runner projection strips them). */
export interface BenchStageRow {
  id: string
  engine?: string
  card?: string
  title?: string
  params?: Record<string, unknown>
  /** Named input bindings (the rewire door's truth):
   *  {source: {stage, output} | {initial}} — string[] was the dead
   *  flow-era shape. */
  inputs?: Record<string, unknown>
  outputs?: string[]
  provenance?: string
  runStatus?: string
  result?: unknown
  [key: string]: unknown
}

/** Append-only log head rows (the revision trail's public voice). */
export interface BenchLogHead {
  rev: number
  author?: string
  kind?: string
  [key: string]: unknown
}

/** `dsh-resource://cards/bench`. */
export interface CardsBenchValue {
  kind: 'bench'
  draftId: string
  rev: number
  stages: BenchStageRow[]
  log: BenchLogHead[]
}

/** One run stage as the status door serves it — the run-wire
 *  package's row (re-exported: this module's public face is stable
 *  for the studio and the tests). */
export type { RunStageStatus } from '@melite-plugin/melite-run-wire'
import type { RunStageStatus } from '@melite-plugin/melite-run-wire'

/** `dsh-resource://cards/run/<runId>` — the hydrated status merged with
 *  every later events frame (last frame kept for the view). draftId is
 *  the card-back-into-flow key: the draft that produced the run
 *  (status serves it; null for runs that name none). */
export interface CardsRunValue {
  kind: 'run'
  runId: string
  status: string
  draftId: string | null
  stages: RunStageStatus[]
  lastFrame: FlowEventFrame | undefined
}

export type CardsValue = CardsBenchValue | CardsRunValue | CardsDraftValue

/**
 * `dsh-resource://cards/draft/<draftId>/<stageId>` — ONE stage of a
 * flow draft, the conversation card's studio target (the old embed's
 * law, restored: the chat card opens the authoring surface — the
 * studio claims `cards.stage.view` inside the Cards tab — never a
 * params form). The value carries the WHOLE draft's stages so the
 * drill's input picker (the slot-is-the-wire law) sees siblings'
 * latest outputs exactly as the bench view does.
 */
export interface CardsDraftValue {
  kind: 'draft'
  draftId: string
  stageId: string
  intent: string
  stages: BenchStageRow[]
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    /** The Melite cards tab: the shared bench and live runs. */
    cards: CardsValue
  }
}

/** The bench key the tab serves (melite-tools' DEFAULT_BENCH — 'main'). */
export const CARDS_BENCH_ADDRESS = 'dsh-resource://cards/bench'

/** The run address (the wand's target, plan §5). */
export function cardsRunAddress(runId: string): string {
  return 'dsh-resource://cards/run/' + encodeURIComponent(runId)
}

/** The draft-stage address — the conversation card's studio target
 *  (the old embed's law; both segments encode, either may carry the
 *  separators the bare grammar refuses). */
export function cardsDraftStageAddress(draftId: string, stageId: string): string {
  return 'dsh-resource://cards/draft/' + encodeURIComponent(draftId) + '/' + encodeURIComponent(stageId)
}

/** Parse a cards address; null when the path is not one of ours. */
export function parseCardsAddress(address: string): { bench: true } | { run: string } | { draft: string; stage: string } | null {
  const prefix = 'dsh-resource://cards/'
  if (!address.startsWith(prefix)) return null
  const rest = address.slice(prefix.length)
  if (rest === 'bench') return { bench: true }
  if (rest.startsWith('run/')) {
    const runId = decodeURIComponent(rest.slice('run/'.length))
    if (runId !== '') return { run: runId }
  }
  if (rest.startsWith('draft/')) {
    const body = rest.slice('draft/'.length)
    const slash = body.indexOf('/')
    if (slash > 0 && slash < body.length - 1) {
      const draftId = decodeURIComponent(body.slice(0, slash))
      const stageId = decodeURIComponent(body.slice(slash + 1))
      if (draftId !== '' && stageId !== '') return { draft: draftId, stage: stageId }
    }
  }
  return null
}

/** One failure frame (the contract's error branch — a real RemoteError
 *  on the unclassified cards code; the address prefixes the diagnostic). */
function failure(address: string, message: string): RemoteResult<never> {
  return { ok: false, error: new RemoteError('cards/unclassified', address + ': ' + message, {}) }
}

/** Defensive row readers — the door's wire is untyped at this seam. */
export function readBench(doc: Record<string, unknown>): CardsBenchValue {
  let stages = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is BenchStageRow =>
        typeof s === 'object' && s !== null && typeof (s as BenchStageRow)['id'] === 'string')
    : []
  // CARD BIRTH LAW, bench side (2026-09-13, the hour-6 form
  // regression): a chat-born bench's stages arrive from the estate's
  // normalization with NO `card` (identity survives on the DRAFT
  // INTENT alone). Every consumer of the bench value — the tiles,
  // the row lines, and the ZOOM consult (StageDrill keys the studio
  // slot on cardName) — reads the rows, so the re-attach lives HERE,
  // once, at the value build: single-stage card-born bench only
  // (user-authored multi-stage benches carry card per row and never
  // take this arm — DraftView's consult states the same condition).
  // Before this, the zoom consult saw cardName '' and every
  // chat-born bench card rendered the GENERIC FORM while the chat
  // path (which re-attaches in DraftView) mounted the studio.
  const intent = typeof doc['intent'] === 'string' ? (doc['intent'] as string) : ''
  if (intent !== '' && stages.length === 1
    && (stages[0]!['card'] === undefined || stages[0]!['card'] === '')) {
    stages = [{ ...stages[0]!, card: intent }]
  }
  const log = Array.isArray(doc['log'])
    ? (doc['log'] as unknown[]).filter((s): s is BenchLogHead =>
        typeof s === 'object' && s !== null && typeof (s as BenchLogHead)['rev'] === 'number')
    : []
  return {
    kind: 'bench',
    draftId: typeof doc['draft_id'] === 'string' ? (doc['draft_id'] as string) : 'bench-main',
    rev: typeof doc['rev'] === 'number' ? (doc['rev'] as number) : 0,
    stages,
    log,
  }
}

/** Re-read the shared bench (session 'main') — the consumer's reload
 *  after its own edits (the provider's bench stream is a single
 *  snapshot; same-address navigation does not re-run it). */
export async function fetchBench(signal?: AbortSignal): Promise<CardsBenchValue> {
  return readBench(await wireCall('bench/get', { sessionKey: 'main' }, signal))
}

/** THE OUTCOME OBSERVER (the attribution half): poll the run to
 *  terminal on the run-wire cadence, then write runStatus + result
 *  onto the bench row through the shared-state door. Both run paths
 *  (in-tab stream and shell navigation) start this once per gesture;
 *  the patch is bookkeeping — a refusal is swallowed (the next run
 *  rewrites the row), an abort ends the watch. The result.url rides
 *  the status door's already-rewritten media route. */
export async function observeRunOutcome(
  draftId: string,
  stageId: string,
  runId: string,
  signal?: AbortSignal,
  onTouched?: () => void,
): Promise<'done' | 'failed' | 'stopped' | null> {
  // 'running'/'queued' on the tile the moment the start answers, and
  // the row BINDS to the new run (the stale artifact's url clears —
  // the studio reads its own row's result, never a tab-wide run id).
  // The start response's own status rides first (a QUEUED start
  // shows 'queued' — the old Queue-feedback law — never a lie about
  // running while the GPU is busy with another card).
  try {
    const startStatus = await fetchRunStatus(runId, signal).then((r) => r.status).catch(() => 'running')
    const first = startStatus === 'queued' || startStatus === 'pending' ? 'queued' : 'running'
    await patchStageOutcome(draftId, stageId, { runStatus: first, result: { run_id: runId } })
    onTouched?.()
  } catch { /* bookkeeping */ }
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const t = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
    })
  let lastLive = 'running'
  while (signal?.aborted !== true) {
    let row: Awaited<ReturnType<typeof fetchRunStatus>>
    try {
      row = await fetchRunStatus(runId, signal)
    } catch {
      await sleep(1500) // transport — the next poll may recover
      continue
    }
    if (!isTerminalRun(row.status)) {
      // the LIVE flip (queued → running): patch the tile the moment
      // the estate picks the run up — never a stuck 'queued' face
      const live = row.status === 'queued' || row.status === 'pending' ? 'queued' : 'running'
      if (live !== lastLive) {
        lastLive = live
        try {
          await patchStageOutcome(draftId, stageId, { runStatus: live })
          onTouched?.()
        } catch { /* bookkeeping */ }
      }
      await sleep(1500)
      continue
    }
    const stage = row.stages.find((s) => s.id === stageId)
      ?? (row.stages.length === 1 ? row.stages[0] : undefined)
    const url = stage !== undefined && typeof stage.url === 'string' && stage.url !== ''
      ? stage.url : ''
    const result: Record<string, unknown> = { run_id: runId }
    if (url !== '') result['url'] = url
    // THE HARVEST CARRY (2026-09-12): the stage's full artifact set
    // rides the row so studio adapters read REAL data (the h3
    // timeline's filmstrip + window tiles key off artifacts'
    // name→url map + the flat stitch-first list; a url-only result
    // starves them). Gallery names rewrite onto the media route with
    // the same one-rewrite law as the stage url.
    const gallery: readonly { name: string }[] = stage?.gallery ?? []
    const artNames: string[] = []
    for (const g of gallery) {
      if (g.name !== '') artNames.push(g.name)
    }
    if (artNames.length > 0) {
      const mediaUrls = artNames.map((n): string => toRunMediaUrl(runId, n))
      const artifacts: Record<string, string> = {}
      if (url !== '') artifacts['video'] = url
      for (let i = 0; i < artNames.length; i++) {
        artifacts[artNames[i]!] = mediaUrls[i]!
      }
      result['artifacts'] = artifacts
      result['assetUrls'] = url !== '' ? [url, ...mediaUrls] : mediaUrls
    }
    const terminal = row.status === 'completed' ? 'done' : row.status
    try {
      await patchStageOutcome(draftId, stageId, { runStatus: terminal, result })
      onTouched?.()
    } catch {
      /* bookkeeping — the bench may have moved; the next run rewrites the row */
    }
    if (terminal === 'done' || terminal === 'failed' || terminal === 'stopped') return terminal
    return null
  }
  return null
}

export function readRun(runId: string, doc: Record<string, unknown>): CardsRunValue {
  // the normalization (stage distill + the ONE media-url rewrite)
  // lives in the run-wire package; this wraps it into the protocol's
  // run value (lastFrame is the events face — undefined at hydrate).
  const row = readRunStatus(runId, doc)
  return {
    kind: 'run',
    runId: row.runId,
    status: row.status,
    draftId: row.draftId,
    stages: row.stages,
    lastFrame: undefined,
  }
}

/**
 * Normalize a `drafts/get` doc into the draft-stage value. The row
 * shape is the bench's own (DraftRecord stages carry id/card/params/
 * result extras verbatim); the defensive filter keeps rows with a
 * string id, mirroring readBench — the door's wire is untyped at this
 * seam and a malformed row must not break the whole view.
 */
export function readDraft(draftId: string, stageId: string, doc: Record<string, unknown>): CardsDraftValue {
  const stages = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is BenchStageRow =>
        typeof s === 'object' && s !== null && typeof (s as BenchStageRow)['id'] === 'string')
    : []
  return {
    kind: 'draft',
    draftId,
    stageId,
    intent: typeof doc['intent'] === 'string' ? (doc['intent'] as string) : '',
    stages,
  }
}

/** The bench/drafts verbs this module rides (the RUN verbs live in
 *  the run-wire package — the DRY law; this union narrows the frame
 *  call to the doors this file owns). */
type BenchMethod = 'bench/get' | 'bench/add-stage' | 'drafts/get' | 'runs/status' | 'runs/list'

/** The frame is the run-wire package's ONE definition; this wrapper
 *  narrows the method set for the cards protocol's own verbs. */
async function wireCall(
  nsMethod: BenchMethod,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return await runWireCall(nsMethod, args, { signal })
}

export { nextRpcId }

/** The card-back-into-flow report — counts, never throws for
 *  per-stage skips (a refusal STOPS the restore and throws: a half
 *  flow with a silent hole would be the lie). */
export interface RestoreReport {
  added: number
  skipped: number
  notes: string[]
}

/** Card-back-into-flow: restore a run's producing draft onto the
 *  shared bench — drafts/get (the draft holds the full
 *  card/engine/params stages) then per-stage bench/add-stage as the
 *  USER (the CAS law: bench/get first, each add carries expect_rev,
 *  chained from the previous answer's rev). A stage with no card is
 *  SKIPPED and counted (add-stage requires one); an id collision
 *  retries once without the id (the bench auto-ids s_<n>) and notes
 *  it. Any other refusal throws with the door's own text — the bench
 *  keeps whatever landed before it, and the report says so. */
export async function restoreRunToBench(
  run: CardsRunValue,
  signal?: AbortSignal,
): Promise<RestoreReport> {
  if (run.draftId === null || run.draftId === '') {
    throw new Error('this run names no draft — nothing to restore')
  }
  let draft: Record<string, unknown>
  try {
    draft = await wireCall('drafts/get', { draftId: run.draftId }, signal)
  } catch (e) {
    throw new Error('the producing draft is unreadable: ' + (e instanceof Error ? e.message : String(e)))
  }
  const raw = draft['stages']
  const stages: Record<string, unknown>[] = Array.isArray(raw)
    ? raw.filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    : []
  if (stages.length === 0) {
    throw new Error('the producing draft holds no stages — nothing to restore')
  }
  let bench: Record<string, unknown>
  try {
    bench = await wireCall('bench/get', { sessionKey: 'main' }, signal)
  } catch (e) {
    throw new Error('the bench is unreadable: ' + (e instanceof Error ? e.message : String(e)))
  }
  let rev = typeof bench['rev'] === 'number' ? (bench['rev'] as number) : 0
  const report: RestoreReport = { added: 0, skipped: 0, notes: [] }
  for (const st of stages) {
    const card = st['card']
    if (typeof card !== 'string' || card === '') {
      report.skipped += 1
      report.notes.push('skipped a stage with no card (add-stage requires one)')
      continue
    }
    const doc: Record<string, unknown> = { card, author: 'user', expect_rev: rev }
    if (typeof st['engine'] === 'string' && (st['engine'] as string) !== '') doc['engine'] = st['engine']
    if (typeof st['params'] === 'object' && st['params'] !== null && !Array.isArray(st['params'])) {
      doc['params'] = st['params']
    }
    const id = typeof st['id'] === 'string' && (st['id'] as string) !== '' ? (st['id'] as string) : null
    if (id !== null) doc['id'] = id
    try {
      const row = await wireCall('bench/add-stage', { sessionKey: 'main', doc }, signal)
      if (typeof row['rev'] === 'number') rev = row['rev'] as number
      report.added += 1
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (id !== null && message.includes('already on the bench')) {
        // The id is taken (restoring twice, or the bench kept it) —
        // retry once without the id; the bench auto-ids s_<n>.
        const retry: Record<string, unknown> = { ...doc }
        delete retry['id']
        try {
          const row = await wireCall('bench/add-stage', { sessionKey: 'main', doc: retry }, signal)
          if (typeof row['rev'] === 'number') rev = row['rev'] as number
          report.added += 1
          report.notes.push(id + ' was already on the bench — added under a fresh id')
        } catch (e2) {
          throw new Error('restore stopped after ' + String(report.added) + ' stage(s): '
            + (e2 instanceof Error ? e2.message : String(e2)))
        }
      } else {
        throw new Error('restore stopped after ' + String(report.added) + ' stage(s): ' + message)
      }
    }
  }
  return report
}

/** Merge one events frame into a run value (stage rows upserted by id;
 *  run-status frames replace the status; the frame is kept for the view). */
export function mergeRunFrame(value: CardsRunValue, frame: FlowEventFrame): CardsRunValue {
  const next: CardsRunValue = { ...value, lastFrame: frame }
  const type = (frame as Record<string, unknown>)['type']
  if (type === 'run' && typeof (frame as Record<string, unknown>)['status'] === 'string') {
    next.status = (frame as Record<string, unknown>)['status'] as string
  }
  if (type === 'stage') {
    const stageId = (frame as Record<string, unknown>)['stage']
    if (typeof stageId === 'string') {
      const known = next.stages.find((s) => s.id === stageId)
      if (known === undefined) {
        next.stages = [...next.stages, { id: stageId, status: 'running' }]
      } else {
        next.stages = next.stages.map((s) => (s.id === stageId ? { ...s, status: 'running' } : s))
      }
    }
  }
  return next
}

/** The provider registration body: `ctx.resources.register({ protocol:
 *  'cards', open })`. The estate remotes over the wire frame; abort
 *  ends the stream per the contract. */
export function openCardsResource(
  address: string,
  ctx: { signal: AbortSignal },
): AsyncIterable<RemoteResult<CardsValue>> {
  const target = parseCardsAddress(address)
  const bench = target !== null && 'bench' in target
  const runId = target !== null && 'run' in target ? target.run : ''
  const draftTarget = target !== null && 'draft' in target ? target : null
  return (async function* () {
    if (target === null) {
      yield failure(address, 'not a cards address')
      return
    }
    if (bench) {
      let value: CardsBenchValue
      try {
        value = readBench(await wireCall('bench/get', { sessionKey: 'main' }))
      } catch (e) {
        yield failure(address, e instanceof Error ? e.message : String(e))
        return
      }
      yield { ok: true, value }
      // THE BENCH TAIL (live co-presence, 2026-09-12: "fix the [REDACTED 2026-11-05]
      // gaps"): the bench is ONE shared doc — the agent (construct
      // verbs, bench-mode passes) and out-of-band sessions write it
      // too, and every write bumps the rev. The provider polls the rev
      // on a cadence and yields a fresh frame ONLY on drift — every
      // consumer of the resource sees the agent's rows land, with no
      // view-level watchers and no manual refresh. The estate's change
      // events + bench/subscribe stream remote (the push source) exist;
      // the browser wire is one-frame HTTP, so this heartbeat carries
      // the same law until the host's stream face lands — then the
      // source swaps with zero consumer changes. Abort ends the tail.
      yield* pollBenchFrames(value, ctx.signal)
      return
    }
    // draft-stage view (the conversation card's studio target): one
    // snapshot per open — the drill's own Run gesture refreshes the
    // doc through its outcome observer, and the bench's shared-doc
    // heartbeat does not apply (this draft is not the bench; the
    // agent's writes land on the next open, the same snapshot law the
    // bench held before its tail landed).
    if (draftTarget !== null) {
      let value: CardsDraftValue
      try {
        value = readDraft(draftTarget.draft, draftTarget.stage, await wireCall('drafts/get', { draftId: draftTarget.draft }))
      } catch (e) {
        yield failure(address, e instanceof Error ? e.message : String(e))
        return
      }
      yield { ok: true, value }
      return
    }
    // run view: hydrate, then poll the status remote until terminal or
    // abort (the events WS died with the gateway; the stream remote
    // replaces the poll when the plane exists).
    let value: CardsRunValue
    try {
      value = readRun(runId, await wireCall('runs/status', { runId }))
    } catch (e) {
      yield failure(address, e instanceof Error ? e.message : String(e))
      return
    }
    yield { ok: true, value }
    if (ctx.signal.aborted) return
    if (isTerminal(value.status)) return
    yield* pollRunFrames(runId, value, ctx.signal)
  })()
}

/** The terminal statuses — the runs seat's own vocabulary (runsRegistry:
 *  stopFlag stamps 'stopped'; the settle path stamps 'completed' or
 *  'failed'. A settled run ends the stream; the hydrated/polled value
 *  stays as the last ok frame. */
function isTerminal(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'stopped'
}

/** The live tail (the honest degrade): poll `runs/status` and yield a
 *  value ONLY when the row moved (no frame spam) until the run turns
 *  terminal or the holder aborts. A poll error mid-run is not a
 *  failure frame — the last ok value stays (the kit keeps it); the
 *  next poll may recover. The cadence (1500ms) rides the run pump's
 *  own observation granularity, not user perception of latency: stage
 *  transitions inside the estate tick on the pump's settle path. */
async function* pollRunFrames(
  runId: string,
  hydrated: CardsRunValue,
  signal: AbortSignal,
): AsyncGenerator<RemoteResult<CardsRunValue>> {
  let value = hydrated
  const sleep = (ms: number): Promise<'slept' | 'abort'> =>
    new Promise((resolve) => {
      const t = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve('slept') }, ms)
      const onAbort = (): void => { clearTimeout(t); resolve('abort') }
      if (signal.aborted) { onAbort(); return }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  while (!signal.aborted && !isTerminal(value.status)) {
    const woke = await sleep(1500)
    if (woke === 'abort' || signal.aborted) return
    let row: Record<string, unknown>
    try {
      row = await wireCall('runs/status', { runId }, signal)
    } catch {
      continue // the last ok value stays; the next poll may recover
    }
    const next = readRun(runId, row)
    const moved = next.status !== value.status
      || JSON.stringify(next.stages) !== JSON.stringify(value.stages)
    if (!moved) continue
    value = next
    yield { ok: true, value }
  }
}


/** THE BENCH TAIL (the provider's live half — pollRunFrames' law,
 *  applied to the shared doc): poll `bench/get` on a cadence and
 *  yield a value ONLY when the rev moved (no frame spam) until the
 *  holder aborts. A poll error is not a failure frame — the last ok
 *  value stays; the next poll may recover. The cadence (2500ms)
 *  balances agent-write visibility against doc-read chatter; a
 *  hidden document still receives frames (the shell decides whether
 *  the tab renders — the provider never guesses visibility). */
async function* pollBenchFrames(
  hydrated: CardsBenchValue,
  signal: AbortSignal,
): AsyncGenerator<RemoteResult<CardsBenchValue>> {
  let value = hydrated
  const sleep = (ms: number): Promise<'slept' | 'abort'> =>
    new Promise((resolve) => {
      const t = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve('slept') }, ms)
      const onAbort = (): void => { clearTimeout(t); resolve('abort') }
      if (signal.aborted) { onAbort(); return }
      signal.addEventListener('abort', onAbort, { once: true })
    })
  while (!signal.aborted) {
    const woke = await sleep(2500)
    if (woke === 'abort' || signal.aborted) return
    let row: Record<string, unknown>
    try {
      row = await wireCall('bench/get', { sessionKey: 'main' }, signal)
    } catch {
      continue // the last ok value stays; the next poll may recover
    }
    const next = readBench(row)
    if (next.rev === value.rev) continue
    value = next
    yield { ok: true, value }
  }
}


/** The stage's artifact URL from its run (the studio's output half)
 *  — the run-wire package's verb, re-exported (public face stable).
 *  Carries the SINGLE-STAGE FALLBACK: a one-stage run's stage IS the
 *  asked stage ({model:} runs name stages by the card's skeleton). */
export { fetchRunStageUrl, fetchRunTerminal, fetchLatestRunForDraft }

/** isTerminalRun re-export (the run-view stream's terminal law). */
export { isTerminalRun as isTerminal }
