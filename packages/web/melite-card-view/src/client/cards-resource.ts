// cards-resource.ts — the cards resource protocol: the cards tab's
// live values (bench read, draft writes, the resource addresses).
// The uploads door's client verb is NOT re-exported here — it lives
// in @melite/card-base/client (the construction law's upload half)
// and its consumers import it from its own home (the 2026-10-12
// §6-adjacent deletion of this compat line).

/**
 * The `cards` resource protocol — the cards tab's live values.
 *
 * Addresses (the bench rework's client plane):
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
import { cardsRunAddress } from '@melite/card-base/client'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { RemoteStreamCarrierError, type ClientRemote, type RemoteStreamItem } from '@deepseek-ai/dsh-api-gateway/client'

// BenchNamespace's definition + the generated contribution's
// declaration merge now live in estate-remote.ts (the one-lane
// module — all four namespaces typed off the generated clients).
// The run-wire package keeps the PURE laws (readRunStatus,
// toRunMediaUrl, the terminal vocabulary — their ONE definition);
// every transport verb rides the mounted namespaces (stroke 81).
import {
  isTerminalRun,
  readRunStatus,
  toRunMediaUrl,
} from '@melite-plugin/melite-run-wire'
import {
  fetchLatestRunForDraft,
  fetchRunStageUrl,
  fetchRunStatus,
  fetchRunTerminal,
  probeRunGone,
} from '@melite/card-base/client'
import { estateRemote, isEstateRefusal, unwrapRemote, type BenchNamespace } from '@melite/card-base/client'
export type { BenchNamespace }
import type { FlowEventFrame } from './draft.ts'
import { patchStageOutcome } from './draft.ts'
import { rejectionVoice } from './rejection-voice.ts'

// the draft tail's delay (module scope: the other sleeps in this
// file are locals of other generator scopes)
const tailDelay = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms) })

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
export interface BenchStageView {
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
  /** THE TRANSPORT-HEALTH CHANNEL (LOW-23, 2026-10-12): the card
   *  plane's resource signal — 'unreachable' after the escalation
   *  threshold, absent otherwise, deleted on recovery. Never a
   *  runStatus value: a resource signal is not run vocabulary. */
  health?: string
  result?: unknown
  /** THE SERVED RESOLVED MAP (hour-26 stroke 15, the 1:1 run law):
   *  prepareCardParams' own stamped + lifted body, served by the
   *  drafts doors — the form layers it under the user layer. */
  resolved?: Record<string, unknown> | null
  /** THE OUTPUT HISTORY (stroke 40): the stage's PREVIOUS results,
   *  newest first, estate-capped at 12 — archived server-side at
   *  every result overwrite (the live poll's progress faces never
   *  destroy a run's outputs; entries are unique by url set).
   *  Each entry may carry `params` — the snapshot of the params
   *  that MADE that generation, taken at result landing (the
   *  output-component stroke; entries archived before it carry
   *  none). */
  history?: unknown[]
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
  stages: BenchStageView[]
  log: BenchLogHead[]
  /** THE SESSION KEY (stroke 80 — the misaddressed-delete fix): the
   *  bench's own conversation key, carried ON the value so every
   *  mutation verb (remove/reorder/group/ungroup) addresses the doc
   *  the bar RENDERS. Before this, the wires hardcoded 'main' — a
   *  non-main bench's adds landed in its own draft (addStageWire
   *  already carried the key) while its deletes hit MAIN's doc and
   *  refused 'stage not found' against rows main never held. */
  sessionKey: string
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
  stages: BenchStageView[]
  /** the draft doc's bench revision (0 when the doc carries no bench
   *  block) — the CAS fence's expect handle for param writes. */
  rev: number
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap {
    /** The Melite cards tab: the shared bench and live runs. */
    cards: CardsValue
  }
}

/** The bench address (the legacy bare form serves 'main' — the
 *  pre-session key records resolve unchanged). */
export const CARDS_BENCH_ADDRESS = 'dsh-resource://cards/bench'

// ── THE PER-CONVERSATION BENCH (stroke 44: "when I start a new
// conversation, that old flow will be there like before" — never
// again). The flow BELONGS TO THE CONVERSATION: one bench per
// conversation, fresh on the first turn, shared by its human and its
// agent (the one-flow law, unchanged within a conversation). The
// session key is the DSH Session id (the same value the tool side
// reads from exec.agent.id); the key rides the ADDRESS TAIL (the
// file protocol's documented pattern,
// dsh-resource://file/session/<sessionId>/…) so one address = one
// resource record = one session's stream — two conversations' cards
// tabs never share state. 'main' remains the fallback for
// unattributed seats (headless, legacy records).
// THE SERVER'S SESSION GRAMMAR, MIRRORED (the drafts package owns it; the
// draft-id-grammar wall fails if the three ever differ — a client must
// never accept an id the server refuses)
// THE CONTRACT'S GRAMMAR (the identity law, 2026-09-28): the bench
// key is an ADDRESS and has one grammar. This copy was a MIRROR of
// the server's — a mirror is a second producer the moment the server
// moves, and the wall that compared the copies could only name the
// ones it knew. The client imports the contract's.
// THE DECISION MOVED BESIDE THE GRAMMAR (the li-ay stroke,
// 2026-10-11): the sanitize body was this file's own spelling of
// `SESSION_RE.test(id) ? id : 'main'` — one of FOUR on the estate
// (this one, the gallery client's, and two inline in the agent
// tool). The contract floor owns the decision now; the local name
// stays for this module's callers, but there is no second producer
// to drift.
import { benchSessionOf } from '@melite/contracts/benchStage'
import { isTerminalStatus, isLiveRunStatus, statusOf, RUN_STATUS_WORDS } from '@melite/contracts/stageView'
export { benchSessionOf as benchSessionKey }

/** The bench address for one session key. */
export function benchAddressOf(sessionKey: string): string {
  return CARDS_BENCH_ADDRESS + '/' + benchSessionOf(sessionKey)
}

/** The session key a bench address carries (the bare legacy address
 *  and every non-bench address resolve to 'main'). */
export function benchSessionOfAddress(address: string): string {
  if (!address.startsWith(CARDS_BENCH_ADDRESS + '/')) return 'main'
  return benchSessionOf(address.slice(CARDS_BENCH_ADDRESS.length + 1))
}

export { cardsRunAddress } // the ONE mint: card-base cards-address.ts (DRY sweep C3, 2026-10-18)

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
  // The bench carries its session key in the tail (stroke 44, the
  // file protocol's scope-in-path pattern); the bare form serves 'main'.
  if (rest === 'bench' || rest.startsWith('bench/')) return { bench: true }
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
      // NO EMPTINESS GUARD (the slash gate above admits only
      // interior slashes, so both parts hold ≥1 char, and decoding
      // never empties a non-empty string — the pair always returns).
      return { draft: draftId, stage: stageId }
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
/** THE CARD BIRTH LAW, ONE PLACE (2026-10-10, the wire audit's
 *  CRITICAL-1): a chat-born bench's stage arrives with NO `card` —
 *  its identity survives on the DRAFT INTENT alone. The law was
 *  written out three times (readBench, the chat consult, and NOT at
 *  all in freshStageRow), so a tile could RENDER a card and then
 *  refuse to run: the drill read the re-attached row, the run read
 *  the raw one. One function, every reader: a single-stage
 *  card-born bench takes its identity from the intent; a
 *  user-authored multi-stage bench carries `card` per row and never
 *  takes this arm. */
export function deriveCardForRow(
  stages: BenchStageView[],
  intent: string,
): BenchStageView[] {
  if (intent === '' || stages.length !== 1) return stages
  const only = stages[0]!
  if (only['card'] !== undefined && only['card'] !== '') return stages
  return [{ ...only, card: intent }]
}

/** THE PROBE VERDICT, TRANSLATED (2026-10-10, the wire audit's
 *  H1): a file-era sidecar can answer `success` or `unknown` (the
 *  runs list admits both, and probeRunGone returns them verbatim).
 *  The tile's vocabulary has neither — so the stage was stamped with
 *  a status no dot knows, the observer stopped, and the tile looked
 *  idle FOREVER though its run had finished. The map is here, once:
 *  a verdict this client cannot render becomes a terminal one it
 *  can, never an unknown word stamped onto a row. */
export function tileStatusFromVerdict(verdict: string): 'running' | 'done' | 'stopped' {
  // ONE CLASSIFIER (2026-10-13): this seat and the run view used to
  // fold the same words privately and disagree — 'cached' rendered
  // `done` here and a failure-looking `stopped` there, and an unknown
  // word meant "running" in one and "stopped" in the other. The
  // contract's fold answers for both.
  // 'gone' is the phantom cure's VERDICT word, never a status (the
  // probe's union — audit E25): it must never feed the fold, which
  // would read its fall-through as waiting. A listed live word (the
  // probe returns the list's own status when the status door refuses)
  // stamps running — the run is live per the list, and the reconcile
  // stays armed to finish it. Unreadable words stamp stopped: the
  // conservative terminal, never a fake spinner.
  if (verdict === 'gone') return 'stopped'
  if (isLiveRunStatus(verdict)) return 'running'
  // THIS SEAT'S OWN UNREADABLE-WORD LAW, kept explicit: the contract
  // fold refuses a word outside the vocabulary (operator decision
  // 2026-10-12), and this seat's contract is the conservative
  // terminal, not an exception — so the membership test happens HERE,
  // against the one vocabulary owner, before the fold is called.
  if (!RUN_STATUS_WORDS.has(verdict.toLowerCase())) return 'stopped'
  const folded = statusOf(verdict)
  if (folded === 'done' || folded === 'cached' || folded === 'skipped' || folded === 'reused') return 'done'
  return 'stopped'
}

export function readBench(doc: Record<string, unknown>, sessionKey: string): CardsBenchValue {
  let stages = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is BenchStageView =>
        typeof s === 'object' && s !== null && typeof (s as BenchStageView)['id'] === 'string')
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
  stages = deriveCardForRow(stages, intent)
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
    sessionKey: benchSessionOf(sessionKey),
  }
}

/** A missing bench is a FRESH conversation's honest zero state, not a
 *  failure (stroke 44): a conversation's bench is born by its first
 *  write; reading before that serves the empty bench — rev 0, so the
 *  birth (rev 1) lands as a FRESH frame and the spotlight reveals
 *  the very first card. */
export function emptyBench(sessionKey: string): CardsBenchValue {
  const key = benchSessionOf(sessionKey)
  return readBench({ draft_id: 'bench-' + key, rev: 0, intent: '', stages: [] }, key)
}

function isMissingBench(e: unknown): boolean {
  const message = rejectionVoice(e)
  return message.includes('no such bench')
}

/** Re-read one conversation's bench — the consumer's reload
 *  after its own edits (the provider's bench stream is a single
 *  snapshot; same-address navigation does not re-run it). */
export async function fetchBench(sessionKey: string, signal?: AbortSignal): Promise<CardsBenchValue> {
  const key = benchSessionOf(sessionKey)
  try {
    return readBench(await unwrapRemote(estateRemote().bench.get(key, signal), 'bench/get') as unknown as Record<string, unknown>, key)
  } catch (e) {
    if (isMissingBench(e)) return emptyBench(key)
    throw e
  }
}

/** media/list — the runs-tree library (moved beside the bind it
 *  rides: @melite/card-base/client — re-exported here so the
 *  tab's existing import keeps working). */
export { fetchMediaLibrary } from '@melite/card-base/client'

// ── THE BENCH SPOTLIGHT (stroke 42, the operator's law 2026-09-14:
// "AI CONVERSATION AND HUMAN SHARE 1 FLOW — there is no other flow
// state"). The cards sidebar IS the one shared flow state, so an
// agent-authored bench write (the chat's melite_construct, a
// bench-mode pass) must BRING THE SURFACE FORWARD, not land invisibly
// behind whatever tab the human is reading. The served log carries
// per-entry author ("agent"|"user" — bench.ts AUTHORSHIP), which is
// the whole discriminator: user-authored bumps are the human's own
// gestures (their tab tail renders them), agent-authored bumps are
// the OTHER author of the one flow — the reveal fires for those.

/** The cards surface's live marker (set by CardsTab's mount effect —
 *  the only seat that renders the bench). The spotlight skips the
 *  reveal while the surface is mounted AND the column is expanded:
 *  re-placing an address the user is already reading would reset
 *  their scroll/selection for nothing. */
let cardsSurfaceLive = false

/** CardsTab's visibility contract: true while the bench surface is
 *  the mounted tab body, false the moment it unmounts (another tab
 *  took the pane, or the column collapsed its body away). */
export function markCardsSurface(live: boolean): void {
  cardsSurfaceLive = live
}

/** Whether the spotlight should reveal given the seat's own state
 *  (exported for the wall battery: the flag + the column's expanded
 *  face decide together — a collapsed column shows the rail, not the
 *  flow, so it still reveals). */
export function shouldSpotlight(isExpanded: boolean): boolean {
  return !cardsSurfaceLive || !isExpanded
}

/** THE SPOTLIGHT WATCHER, STREAM EDITION (2026-09-15, the mux swap —
 *  the heartbeat poll is DEAD): consume `bench/subscribe` for the
 *  ACTIVE session key — every estate write pushes one item, so the
 *  reveal fires at write time, not at the next tick. On a rev drift
 *  whose fresh log entries carry author "agent", fire onAgentLand
 *  once. The FIRST item of each key is hydration — history never
 *  yanks the user forward on load or on a conversation switch (the
 *  per-key baseline map survives re-keys, so returning to a key
 *  never replays its past).
 *
 *  RE-KEY WITHOUT A TIMER: the session source's observable
 *  (HostObservable.subscribe — push, no polling) trips a latch the
 *  consumption loop races against the pending item; a key change
 *  disposes the stream and reopens on the new key. Without the
 *  subscription seam the watcher still re-keys on the next item (a
 *  quiet switch delays only its own reveals, never the active
 *  stream's).
 *
 *  A terminal stream failure ends the watcher best-effort (logged —
 *  the watcher owns no rendered truth, the tab tail does; its
 *  swallow can hide nothing). Returns the stop function (the
 *  plugin's effect disposer). */
export function watchBenchLands(
  getSession: () => string,
  onAgentLand: (sessionKey: string) => void,
  signal: AbortSignal | undefined,
  remote: ClientRemote | undefined,
  benchNs: BenchNamespace | undefined,
  subscribeSession: ((fn: () => void) => () => void) | undefined,
): () => void {
  let stopped = false
  const ctrl = new AbortController()
  const halt = (): void => {
    if (stopped) return
    stopped = true
    ctrl.abort()
  }
  signal?.addEventListener('abort', halt, { once: true })
  if (signal?.aborted === true) halt()
  if (remote === undefined || benchNs === undefined) {
    console.error('[melite-card-view] bench spotlight off: the remote face or bench namespace did not mount')
    return halt
  }
  const lastRevs = new Map<string, number>()
  let activeKey = benchSessionOf(getSession())
  let wakeRekey: (() => void) | undefined
  let rekeyLatch: Promise<'rekey'> = new Promise(resolve => { wakeRekey = () => resolve('rekey') })
  const offSubscribe = subscribeSession?.(() => {
    const wanted = benchSessionOf(getSession())
    if (wanted !== activeKey && !stopped) wakeRekey?.()
  })
  const openStream = (key: string) => remote!.$stream<Record<string, unknown>>({
    name: 'cards bench spotlight',
    open: openSignal => benchNs.subscribe(key, openSignal) as AsyncIterable<Record<string, unknown>>,
    ended: accepted => new RemoteStreamCarrierError(
      `bench spotlight stream ${accepted ? 'ended' : 'never opened'} (${key})`),
  })
/** THE NAVIGATION-TEARDOWN LATCH (the reload wall, 2026-10-13): a
 *  page reload or close aborts every open transport mid-flight
 *  ("signal is aborted without reason" — the browser killing the
 *  connection at unload). A stream death after the page began
 *  unloading is teardown, never a supervisor failure: the error
 *  ledger of a plain reload must stay empty. */
let pageUnloading = false
addEventListener('pagehide', () => { pageUnloading = true }, { once: true })

const run = async (): Promise<void> => {
    let stream = openStream(activeKey)
    let iterator = stream[Symbol.asyncIterator]()
    let first = true
    try {
      while (!stopped) {
        const raced: { item: IteratorResult<RemoteStreamItem<Record<string, unknown>>> } | 'rekey' =
          await Promise.race([
            iterator.next().then(item => ({ item })),
            rekeyLatch,
          ])
        if (raced === 'rekey') {
          rekeyLatch = new Promise(resolve => { wakeRekey = () => resolve('rekey') })
          const wanted = benchSessionOf(getSession())
          if (wanted !== activeKey) {
            activeKey = wanted
            stream.dispose().catch((error: unknown) => {
              // the replaced stream's transport is already dying with
              // the rekey — a dispose refusal has no surface here, but
              // it is a named row, not a swallowed rejection
              console.warn('[melite-card-view] spotlight rekey dispose refused:', error)
            })
            stream = openStream(wanted)
            iterator = stream[Symbol.asyncIterator]()
            first = true
          }
          continue
        }
        const result = raced.item
        if (result.done) break
        if (first) {
          result.value.accept()
          first = false
        }
        const key = activeKey
        const bench = readBench(result.value.value, key)
        const lastRev = lastRevs.get(key) ?? null
        if (lastRev === null) {
          lastRevs.set(key, bench.rev) // first sight of this key: hydration
        } else if (bench.rev > lastRev) {
          const seen = lastRev
          lastRevs.set(key, bench.rev)
          const fresh = bench.log.filter((e) => e.rev > seen)
          if (fresh.some((e) => e.author === 'agent')) onAgentLand(key)
        } else {
          lastRevs.set(key, bench.rev) // honesty on regression: resync, never fire
        }
      }
    } catch (error) {
      // terminal supervisor failure — best-effort seat, logged only.
      // The navigation-teardown latch (pagehide) classifies the
      // reload's own abort: teardown, not a failure.
      if (pageUnloading) return
      console.error('[melite-card-view] bench spotlight stream failed:', error)
    } finally {
      offSubscribe?.()
      await stream.dispose().catch((error: unknown) => {
        // a dispose refusal after the stream already ended is noise,
        // never a supervisor failure — named so it stays debuggable
        console.warn('[melite-card-view] spotlight dispose refused:', error)
      })
      // THE LISTENER RELEASE (audit V-S8): the watcher's work is done
      // — an immortal outer signal must not keep this halt registered
      signal?.removeEventListener('abort', halt)
    }
  }
  void run()
  return halt
}

/** THE OUTCOME OBSERVER (the attribution half): poll the run to
 *  terminal on the run-wire cadence, then write runStatus + result
 *  onto the bench row through the shared-state door. Both run paths
 *  (the sequential pass AND the tab's onStarted arm) fire it per
 *  gesture — the SINGLE-FLIGHT registry below seats them on ONE
 *  poller. The patch is bookkeeping — a refusal is swallowed (the
 *  next run rewrites the row), an abort ends the watch. The
 *  result.url rides the status door's already-rewritten media
 *  route. */
/** THE SINGLE-FLIGHT REGISTRY (2026-09-21, the operator's catch:
 * the bench log carried PAIRS of identical result/runStatus patches
 * — two writes per state move, a re-render storm mid-run that ate
 * clicks and reset scroll): ONE observer per draft:stage:run, ever,
 * in-process. Both run paths (the sequential pass's own await AND
 * the tab's onStarted arm) observe the same run — the second call
 * RIDES the first's promise instead of arming a twin poller. The
 * entry clears when the observer settles, so a genuinely new run
 * (or a retry after settle) observes fresh. */
const observingRuns = new Map<string, Promise<'done' | 'failed' | 'stopped' | null>>()

export function observeRunOutcome(
  draftId: string,
  stageId: string,
  runId: string,
  signal?: AbortSignal,
  onTouched?: () => void,
): Promise<'done' | 'failed' | 'stopped' | null> {
  const key = `${draftId}\u0000${stageId}\u0000${runId}`
  const inFlight = observingRuns.get(key)
  if (inFlight !== undefined) return inFlight
  const started = observeRunOutcomeRun(draftId, stageId, runId, signal, onTouched)
  const seated = started.finally(() => { observingRuns.delete(key) })
  observingRuns.set(key, seated)
  return seated
}

async function observeRunOutcomeRun(
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
    // the initial probe's catch is HONEST optimism, not the C2 crime:
    // the start just answered, so the run IS live server-side; this
    // face survives exactly one poll interval before a real answer
    // (or the transport escalation below) corrects it.
    const startStatus = await fetchRunStatus(runId, signal).then((r) => r.status).catch(() => 'running')
    // the queue-feedback stamp, classified by the fold: queued or
    // still-waiting stamps queued; 'live'/'stopping' stamp running
    // (the fold carries every waiting word onto 'queued' itself —
    // statusOf('pending') is 'queued' — so one compare answers it)
    const foldedStart = statusOf(startStatus)
    const first = foldedStart === 'queued' ? 'queued' : 'running'
    await patchStageOutcome(draftId, stageId, { runStatus: first, result: { run_id: runId } })
    onTouched?.()
  } catch {
    /* a refused start stamp is bookkeeping: the run itself is live and
     * the terminal patch below rewrites the row with the verdict */
  }
  // The abortable sleep is DSH's own internal shape (connection.ts's
  // sleep(ms, signal): timer + once-abort listener — reference
  // packages/client/connection/src/client/connection.ts:23).
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      const t = setTimeout(resolve, ms)
      signal?.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
    })
  let lastLive = 'running'
  let lastPct: number | null = null
  let lastAct = ''
  // THE TRANSPORT ESCALATION (the fallback audit's CRITICAL-2): a
  // downed gateway used to retry forever with the tile face stuck at
  // 'running' — the audit's "a 502 becomes 'still live'". The estate
  // ANSWERED-refusal arm below already cures the phantom case; the
  // never-answers case now gets an explicit 'unreachable' face after
  // TRANSPORT_UNREACHABLE_AFTER consecutive failures, with backoff —
  // and the next successful poll corrects the face (the recovery
  // patch clears the health word, so the live patch always fires).
  // THE HEALTH CHANNEL (LOW-23, 2026-10-12, the operator's "add a
  // health field"): the transport word rides the stage row's own
  // `health` field, never runStatus — folding it into the status
  // word laundered a resource signal into run vocabulary, and the
  // status classifiers had to treat an out-of-vocabulary word as
  // no-information to survive it. With its own channel, runStatus
  // keeps whatever live word it last held (the run may genuinely
  // still be running server-side) and the tile captions the health
  // word beside the still-persisting spinner — transport silence,
  // not a run verdict.
  // THE POLICY (3.6's rationale, recorded — the DSH mirror): the
  // backoff is ConnectionRecoveryConfig's shape (references/
  // deepseek-harness/packages/client/connection/src/recovery-config.ts
  // — base, growth factor, cap): exponential 1500*2^(n-1) capped at
  // 10s — the SAME exponent DSH's backoffCap rides (connection.ts's
  // backoffBaseMs * backoffFactor ** (attempt-1)); ours opens slower
  // by base alone (1500 vs 500): each poll is a full estate door
  // round-trip, not a carrier redial (DSH also jitters 50-100%). The escalation threshold (10 consecutive
  // transport failures) is the never-answers judgment: under it, a
  // flap stays a live face (the under-threshold wall); past it, the
  // row says what is true — the transport is down.
  let transportFails = 0
  let healthStamped = false
  const TRANSPORT_UNREACHABLE_AFTER = 10
  const TRANSPORT_BACKOFF_BASE_MS = 1500
  const TRANSPORT_BACKOFF_MAX_MS = 10000
  while (signal?.aborted !== true) {
    let row: Awaited<ReturnType<typeof fetchRunStatus>>
    try {
      row = await fetchRunStatus(runId, signal)
    } catch (e: unknown) {
      if (isEstateRefusal(e)) {
        // THE PHANTOM CURE (2026-09-13): the estate ANSWERED — the
        // run is not in the live map (the registry restarted since
        // the start). Never poll forever: the file-era list may still
        // hold a terminal answer; else the run is gone and the row's
        // honest terminal is 'stopped'.
        const verdict = await probeRunGone(runId, signal)
        const terminal = tileStatusFromVerdict(verdict)
        try {
          // the refusal ANSWERED the transport — a stale health word
          // retires with the phantom verdict (same clear law)
          await patchStageOutcome(draftId, stageId,
            healthStamped
              ? { runStatus: terminal, result: { run_id: runId }, health: null }
              : { runStatus: terminal, result: { run_id: runId } })
          onTouched?.()
        } catch {
          /* a refused terminal patch is bookkeeping: the verdict came
           * from the runs door — the poller keeps it and retries the
           * row write on the next pass */
        }
        // tileStatusFromVerdict's vocabulary is running|done|stopped
        // (a 'failed' verdict folds to 'stopped' by its own law) —
        // 'running' is the one non-terminal, and it polls on.
        return terminal === 'running' ? null : terminal
      }
      transportFails += 1
      if (transportFails === TRANSPORT_UNREACHABLE_AFTER) {
        try {
          await patchStageOutcome(draftId, stageId, { health: 'unreachable', result: { run_id: runId } })
          healthStamped = true // the recovery patch below clears it
          lastLive = '' // force the corrective live patch on recovery
          onTouched?.()
        } catch {
          /* the health stamp is bookkeeping: the transport failures
           * already back off on their own cadence, and the recovery
           * patch clears the health on the first good poll */
        }
      }
      await sleep(Math.min(
        TRANSPORT_BACKOFF_BASE_MS * 2 ** (transportFails - 1),
        TRANSPORT_BACKOFF_MAX_MS,
      )) // exponential backoff — the estate returning is the cure
      continue
    }
    transportFails = 0
    if (!isTerminalRun(row.status)) {
      // the LIVE flip (queued → running): patch the tile the moment
      // the estate picks the run up — never a stuck 'queued' face.
      // Classified by the fold: queued or still-waiting stamps queued;
      // the wire's 'live' and the estate's 'stopping' stamp running
      // (every waiting word folds onto 'queued' itself — one compare).
      const foldedLive = statusOf(row.status)
      const live = foldedLive === 'queued' ? 'queued' : 'running'
      // THE PROGRESS FORWARD (2026-09-13, the operator's "forward
      // the comfyui progress webhooks like before"): the tap's live
      // fold rides the row — patched ONLY when the integer percent
      // or activity line moves (the bench stream re-renders per
      // patch; percent granularity keeps the CAS churn honest).
      const stage = row.stages.find((s) => s.id === stageId)
        ?? (row.stages.length === 1 ? row.stages[0] : undefined)
      const p = stage?.progress
      const pct = p !== undefined && p.max > 0
        ? Math.floor((100 * p.value) / p.max) : null
      const act = stage?.activity ?? ''
      if (live !== lastLive || pct !== lastPct || act !== lastAct) {
        const patch: { runStatus: string; health?: null; result?: Record<string, unknown> } = { runStatus: live }
        // THE RECOVERY CLEAR (LOW-23): the first live patch after an
        // escalation deletes the health word — the transport answered,
        // the warning face retires with the same write.
        if (healthStamped) {
          patch['health'] = null
          healthStamped = false
        }
        if (pct !== null || act !== '') {
          patch['result'] = {
            run_id: runId,
            ...(pct !== null && p !== undefined ? { progress: { value: p.value, max: p.max } } : {}),
            ...(act !== '' ? { activity: act } : {}),
          }
        }
        lastLive = live
        lastPct = pct
        lastAct = act
        try {
          await patchStageOutcome(draftId, stageId, patch)
          onTouched?.()
        } catch {
          /* a refused live patch is bookkeeping: the next poll re-reads
           * the run and rewrites the row — the pass never wedges on it */
        }
      }
      await sleep(1500)
      continue
    }
    const stage = row.stages.find((s) => s.id === stageId)
      ?? (row.stages.length === 1 ? row.stages[0] : undefined)
    // THE TERMINAL OUTCOME, one pure builder (the operator's law,
    // 2026-09-20: "this can all be validated by contract"). The
    // builder's law — its output satisfies `benchResultDefects`
    // (the bench stage result contract) for every real status
    // shape — is PINNED BY WALLS (cards-tab-doors: builder output
    // contract-clean for the image-gen, h3, failed, and empty
    // shapes; the regression needle proving the contract catches
    // the old disease). No runtime armor: the walls are the fence.
    const rowError: unknown = (row as unknown as Record<string, unknown>)['error']
    const runError = typeof rowError === 'string' ? rowError : undefined
    const { result, terminal } = terminalOutcomeOf(runId, row.status, stage, runError)
    try {
      // the terminal patch clears a stale health word too: a settled
      // run answered the transport — no warning face outlives it
      await patchStageOutcome(draftId, stageId,
        healthStamped ? { runStatus: terminal, result, health: null } : { runStatus: terminal, result })
      onTouched?.()
    } catch {
      /* bookkeeping — the bench may have moved; the next run rewrites the row */
    }
    // NO EXHAUSTIVENESS IF (the disjunction is provably total:
    // this block runs only under the isTerminalRun gate —
    // completed/failed/stopped — and the mapping above sends those
    // to done/failed/stopped. The `as` narrows what the compiler
    // cannot see.)
    return terminal as 'done' | 'failed' | 'stopped'
  }
  return null
}

/** THE PHANTOM RECONCILE (2026-09-13): rows stamped running/queued
 *  whose run the restarted estate no longer knows flip to their
 *  honest terminal (the file-era list's answer, else stopped) — the
 *  observer that would have written it died with the session that
 *  started the run. Live rows arm a tab-side observer so terminal
 *  always lands even when the starting session is gone. Idempotent
 *  per stage:run key (the `armed` set is the caller's, kept across
 *  bench refreshes). */
export async function reconcileBenchRuns(
  bench: CardsBenchValue,
  hooks: { signal?: AbortSignal; onTouched?: () => void; armed?: Set<string> } = {},
): Promise<void> {
  for (const stage of bench.stages) {
    // the owner's live judgement (was a private {running,queued} set —
    // a 'pending' or 'stopping' row whose run died was never reconciled
    // and kept its phantom forever)
    if (!isLiveRunStatus(typeof stage.runStatus === 'string' ? stage.runStatus : '')) continue
    const result = typeof stage.result === 'object' && stage.result !== null ? stage.result as Record<string, unknown> : null
    const runId = result !== null && typeof result['run_id'] === 'string' ? result['run_id'] as string : ''
    if (runId === '') continue
    const key = stage.id + ':' + runId
    if (hooks.armed?.has(key) === true) continue
    hooks.armed?.add(key)
    let verdict: 'live' | 'gone' | string
    try {
      verdict = await probeRunGone(runId, hooks.signal)
    } catch {
      hooks.armed?.delete(key) // transport — a later refresh retries
      continue
    }
    if (verdict === 'live') {
      void observeRunOutcome(bench.draftId, stage.id, runId, hooks.signal, hooks.onTouched)
      continue
    }
    const terminal = tileStatusFromVerdict(verdict)
    try {
      await patchStageOutcome(bench.draftId, stage.id, { runStatus: terminal, result: { run_id: runId } })
      hooks.onTouched?.()
    } catch { /* bookkeeping — the row heals on a later refresh */ }
  }
}

/** THE TERMINAL OUTCOME BUILDER (pure, under CONTRACT — the
 * operator's law, 2026-09-20). Turns a terminal runs/status row
 * into the bench patch's result + runStatus. The row it returns
 * satisfies `benchResultDefects` (the bench stage result contract)
 * — the observer writes lawful rows only, and the walls drive THIS
 * builder against the real status shape (never a hand-claimed
 * fixture).
 *
 * ONE FILE, ONE KEY (the doubled-rowset cure): the artifacts map
 * carries each file EXACTLY ONCE, keyed by its gallery name. The
 * legacy hardcoded 'video' stamp wrote the stage url — which IS
 * gallery[0] — under a second key, so every image-gen result
 * rendered the same picture twice (hero + a phantom rest-thumb
 * row). The h3 timeline (the stamp's only reader) backfills its
 * own artifacts.video when absent — no consumer needs the stamp.
 * The primary `url` field may name a file that also lives in the
 * map (it is the primary POINTER, not a second key). */
export function terminalOutcomeOf(
  runId: string,
  status: string,
  stage: { url?: unknown, gallery?: unknown, error?: unknown, reports?: unknown } | undefined,
  runError: string | undefined,
): { result: Record<string, unknown>, terminal: 'done' | 'failed' | 'stopped' } {
  // THE OWNER DECIDES (2026-10-01): the old ternary knew only
  // 'completed' and 'failed' — a file-era 'succeeded' stamped
  // 'stopped' (a false stop on a good run) and an 'error' word never
  // became a failure. The fold classifies; this seat only names the
  // outcome stamp ('failed' stays the stamp word for a folded error).
  const folded = statusOf(status)
  const terminal: 'done' | 'failed' | 'stopped' = folded === 'done'
    ? 'done'
    : folded === 'error' ? 'failed' : 'stopped'
  const result: Record<string, unknown> = { run_id: runId }
  const url = stage !== undefined && typeof stage.url === 'string' && stage.url !== ''
    ? stage.url : ''
  if (url !== '') result['url'] = url
  // THE HARVEST CARRY (2026-09-12): the stage's full artifact set
  // rides the row so studio adapters read REAL data; gallery names
  // rewrite onto the media route with the same one-rewrite law as
  // the stage url.
  const gallery: ReadonlyArray<{ name?: unknown }> = Array.isArray(stage?.gallery)
    ? (stage.gallery as ReadonlyArray<{ name?: unknown }>) : []
  const artNames: string[] = []
  for (const g of gallery) {
    if (typeof g?.name === 'string' && g.name !== '') artNames.push(g.name)
  }
  if (artNames.length > 0) {
    // ONE FILE, ONE ENTRY — both faces: the name→url map and the
    // flat primary-first list. An engine emitting the same file
    // under two gallery names (or twice) never lands it twice.
    const artifacts: Record<string, string> = {}
    const mediaUrls: string[] = []
    for (const n of artNames) {
      const u = toRunMediaUrl(runId, n)
      if (mediaUrls.includes(u)) continue
      mediaUrls.push(u)
      artifacts[n] = u
    }
    result['artifacts'] = artifacts
    result['assetUrls'] = url !== '' && !mediaUrls.includes(url) ? [url, ...mediaUrls] : mediaUrls
  }
  // THE REPORTS CARRY (2026-10-17, the rig-reports writer): the
  // status row's stage arrives with its mounted report sidecars
  // (the runs seat's decorate — the entries already passed the
  // contract's judge there); INLINE verbatim, the same object the
  // row paints. The reports map is never a url set — the
  // one-file-one-key law does not see it.
  if (stage !== undefined && typeof stage.reports === 'object' && stage.reports !== null
    && !Array.isArray(stage.reports)) {
    const entries = Object.entries(stage.reports as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v))
    if (entries.length > 0) {
      result['reports'] = Object.fromEntries(entries)
    }
  }
  // THE FAILURE CARRY (2026-09-13, the silent-failure cure): a
  // failed run's reason rides the row verbatim — the stage's own
  // error first, the run-level text as fallback.
  if (terminal === 'failed') {
    const reason = typeof stage?.error === 'string' && stage.error !== ''
      ? stage.error : runError
    if (reason !== undefined && reason !== '') result['error'] = reason
  }
  // THE CONTRACT: this builder's output satisfies
  // `benchResultDefects` for every real status shape — pinned by
  // the walls (cards-tab-doors), including the regression needle
  // that proves the contract catches the old 'video'-stamp
  // disease. The law lives in the contract and its walls, not in
  // runtime armor here.
  return { result, terminal }
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
/** THE FRESH-READ LAW (2026-09-13 incident): the run composes the
 *  ESTATE's row — read back AFTER the drill's patch — never the
 *  client's stale render row. The drill patches the bench, then Run
 *  reads; composing the clicked-open row object drops every param
 *  typed between open and Run (the music prompt refusal: typed, Run,
 *  compose saw nothing). Returns null when the estate read fails or
 *  the row is gone — the caller composes its held row and the door
 *  refuses honestly. */
export async function freshStageRow(
  draftId: string,
  stageId: string,
  signal?: AbortSignal,
): Promise<BenchStageView | null> {
  try {
    const doc = await unwrapRemote(estateRemote().drafts.get(draftId, signal), 'drafts/get') as unknown as Record<string, unknown>
    const stages = Array.isArray(doc['stages'])
      ? (doc['stages'] as unknown[]).filter((s): s is BenchStageView =>
          typeof s === 'object' && s !== null && typeof (s as BenchStageView)['id'] === 'string')
      : []
    // THE SAME BIRTH LAW (the audit's C1): this row is what the Run
    // press reads — it must carry the identity the tile rendered,
    // or the stage refuses to run with "names no card".
    const intent = typeof doc['intent'] === 'string' ? (doc['intent'] as string) : ''
    return deriveCardForRow(stages, intent).find((s) => s.id === stageId) ?? null
  } catch {
    // the hold read is best-effort: an unreadable bench doc renders
    // the empty arm and the next fetch retries, never a thrown face
    return null
  }
}

export function readDraft(draftId: string, stageId: string, doc: Record<string, unknown>): CardsDraftValue {
  const stages = Array.isArray(doc['stages'])
    ? (doc['stages'] as unknown[]).filter((s): s is BenchStageView =>
        typeof s === 'object' && s !== null && typeof (s as BenchStageView)['id'] === 'string')
    : []
  const bench = doc['bench']
  const rev = typeof bench === 'object' && bench !== null
    && typeof (bench as { rev?: unknown })['rev'] === 'number'
    ? (bench as { rev: number })['rev'] : 0
  return {
    kind: 'draft',
    draftId,
    stageId,
    intent: typeof doc['intent'] === 'string' ? (doc['intent'] as string) : '',
    stages,
    rev,
  }
}

// The estate verb calls in this file ride the mounted namespaces
// directly (estateRemote() — the one-lane law); the old
// envelope-frame wrapper died with the hand-written lane.

/** The card-back-into-flow report — counts, never throws for
 *  per-stage skips (a refusal STOPS the restore and throws: a half
 *  flow with a silent hole would be the lie). */
export interface RestoreReport {
  added: number
  skipped: number
  carried: number
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
 *  keeps whatever landed before it, and the report says so.
 *
 *  THE OUTCOME CARRY (2026-10-02, the resume law's run-view half):
 *  the run's own stage rows hold the terminal outcome a bare
 *  re-admission loses — the add-stage door authors params only and
 *  refuses result/runStatus by its own law, so the outcome rides the
 *  same drafts patch door the live observer writes, stamped by the
 *  same builder (terminalOutcomeOf). Matching is by stage id (the
 *  run executed this very draft's rows); a draft edited since keeps
 *  its surviving ids' outcomes and simply has none for new rows. */
export async function restoreRunToBench(
  run: CardsRunValue,
  sessionKey: string,
  signal?: AbortSignal,
): Promise<RestoreReport> {
  if (run.draftId === null || run.draftId === '') {
    throw new Error('this run names no draft — nothing to restore')
  }
  const key = benchSessionOf(sessionKey)
  let draft: Record<string, unknown>
  try {
    draft = await unwrapRemote(estateRemote().drafts.get(run.draftId, signal), 'drafts/get') as unknown as Record<string, unknown>
  } catch (e) {
    throw new Error('the producing draft is unreadable: ' + (rejectionVoice(e)))
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
    bench = await unwrapRemote(estateRemote().bench.get(key, signal), 'bench/get') as unknown as Record<string, unknown>
  } catch (e) {
    throw new Error('the bench is unreadable: ' + (rejectionVoice(e)))
  }
  let rev = typeof bench['rev'] === 'number' ? (bench['rev'] as number) : 0
  const report: RestoreReport = { added: 0, skipped: 0, carried: 0, notes: [] }
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
      const row = await unwrapRemote(estateRemote().bench['add-stage'](key, doc as Parameters<BenchNamespace['add-stage']>[1], signal), 'bench/add-stage') as unknown as Record<string, unknown>
      if (typeof row['rev'] === 'number') rev = row['rev'] as number
      report.added += 1
      await carryOutcome(run, key, id, row, report, signal)
    } catch (e) {
      const message = rejectionVoice(e)
      if (id !== null && message.includes('already on the bench')) {
        // The id is taken (restoring twice, or the bench kept it) —
        // retry once without the id; the bench auto-ids s_<n>.
        const retry: Record<string, unknown> = { ...doc }
        delete retry['id']
        try {
          const row = await unwrapRemote(estateRemote().bench['add-stage'](key, retry as Parameters<BenchNamespace['add-stage']>[1], signal), 'bench/add-stage') as unknown as Record<string, unknown>
          if (typeof row['rev'] === 'number') rev = row['rev'] as number
          report.added += 1
          report.notes.push(id + ' was already on the bench — added under a fresh id')
          await carryOutcome(run, key, id, row, report, signal)
        } catch (e2) {
          throw new Error('restore stopped after ' + String(report.added) + ' stage(s): '
            + (rejectionVoice(e2)))
        }
      } else {
        throw new Error('restore stopped after ' + String(report.added) + ' stage(s): ' + message)
      }
    }
  }
  return report
}

/** One restored row's outcome carry: patch the terminal outcome the
 *  run's own stage row holds onto the seated bench row, through the
 *  drafts patch door (the only door result/runStatus lawfully ride
 *  — the add-stage verb refuses them by its authoring law). The
 *  lookup id is the DRAFT's id (the run's rows carry it); the patch
 *  target is the SEATED id the add answer names (a collision retry
 *  seats a fresh one). A stage with no outcome data carries nothing;
 *  a carry that cannot land notes itself — the workflow stands
 *  either way.
 *  @param run the run value the restore serves (its stage rows hold
 *  the terminal outcomes).
 *  @param benchKey the bench draft id the rows landed on.
 *  @param draftStageId the DRAFT stage id this row restored (null —
 *  an id-less draft row — carries nothing: the run's rows are id-keyed).
 *  @param addAnswer the bench/add-stage answer (its `stage` names the
 *  seated id; a non-string answer falls back to the draft id).
 *  @param report the report the carry counts into.
 *  @param signal the caller's abort signal, honored by the patch. */
async function carryOutcome(
  run: CardsRunValue,
  benchKey: string,
  draftStageId: string | null,
  addAnswer: Record<string, unknown>,
  report: RestoreReport,
  signal?: AbortSignal,
): Promise<void> {
  if (draftStageId === null) return
  const runStage = run.stages.find((s) => s.id === draftStageId)
  if (runStage === undefined) return
  const outcome = terminalOutcomeOf(run.runId, runStage.status, runStage, undefined)
  if (!('url' in outcome.result) && !('artifacts' in outcome.result) && !('error' in outcome.result)) return
  const seated = typeof addAnswer['stage'] === 'string' && (addAnswer['stage'] as string) !== ''
    ? (addAnswer['stage'] as string) : draftStageId
  try {
    await patchStageOutcome(benchKey, seated, { runStatus: outcome.terminal, result: outcome.result })
    report.carried += 1
  } catch (e) {
    report.notes.push('could not carry ' + draftStageId + "'s outcome: " + (rejectionVoice(e)))
  }
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
 *  'cards', open })`. The bench tail rides the mounted remote face
 *  (bench/subscribe over the mux — the client entry passes the live
 *  ctx.remote here); abort ends the stream per the contract. */
export function openCardsResource(
  address: string,
  ctx: { signal: AbortSignal },
  remote: ClientRemote | undefined,
  benchNs: BenchNamespace | undefined,
): AsyncIterable<RemoteResult<CardsValue>> {
  const target = parseCardsAddress(address)
  const benchKey = benchSessionOfAddress(address)
  const bench = target !== null && 'bench' in target
  const runId = target !== null && 'run' in target ? target.run : ''
  const draftTarget = target !== null && 'draft' in target ? target : null
  return (async function* () {
    if (target === null) {
      yield failure(address, 'not a cards address')
      return
    }
    if (bench) {
      if (remote === undefined) {
        // THE UNMOUNTED FACE (honest degrade, no poll — 2026-09-15):
        // one HTTP snapshot, then ONE failure frame — an absent
        // stream face is a broken mount, and the silent-death law
        // says surface it, never freeze the view pretending to watch.
        let value: CardsBenchValue
        try {
          value = readBench(await unwrapRemote(estateRemote().bench.get(benchKey), 'bench/get') as unknown as Record<string, unknown>, benchKey)
        } catch (e) {
          if (!isMissingBench(e)) {
            yield failure(address, rejectionVoice(e))
            return
          }
          value = emptyBench(benchKey)
        }
        yield { ok: true, value }
        yield failure(address, 'bench stream unavailable — the remote face did not mount (showing one snapshot)')
        return
      }
      // THE BENCH TAIL (live co-presence, 2026-09-12 → the mux swap
      // 2026-09-15): the bench is ONE shared doc — the agent
      // (construct verbs, bench-mode passes) and out-of-band sessions
      // write it too — author writes bump the rev, run-face writes
      // ride it silently (the telemetry law). bench/subscribe
      // pushes a fresh doc per write over the same-origin mux; the
      // tail yields on doc change (rev drift, or run-face movement
      // at the same rev) with reconnect supervision. THE
      // POLL IS DEAD. (No second remote-undefined arm here: the
      // unmounted face above dominates — remote is a const parameter.)
      if (benchNs === undefined) {
        yield failure(address, 'bench stream failed: the bench namespace did not mount (the inject seat is absent)')
        return
      }
      yield* streamBenchFrames(remote, benchNs, benchKey, address, ctx.signal)
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
        value = readDraft(draftTarget.draft, draftTarget.stage, await unwrapRemote(estateRemote().drafts.get(draftTarget.draft), 'drafts/get') as unknown as Record<string, unknown>)
      } catch (e) {
        yield failure(address, rejectionVoice(e))
        return
      }
      yield { ok: true, value }
      // THE DRAFT TAIL (the second audit's HOLE 1, 2026-10-11): one
      // snapshot per open left the error face a LATCH on this surface
      // — the retirement effect's dep never moved, so a generation
      // that landed through ANY other hand (the agent's commission,
      // a sibling tab) never retired the strip: the operator's exact
      // bug, uncured on the drill tab. The tail re-reads the doc on
      // the same DOC-CHANGE GATE the bench holds (rev + the stages'
      // own bytes): a foreign-landed gen moves the faces, the frame
      // yields, the claim retires; the agent's param writes drift
      // the rev, so no rendered field can move unseen either way. A
      // transient read failure keeps the last frame standing.
      let lastRev = value.rev
      let lastFaces = JSON.stringify(value.stages)
      while (!ctx.signal.aborted) {
        await tailDelay(1500)
        if (ctx.signal.aborted) return
        let next: CardsDraftValue
        try {
          next = readDraft(draftTarget.draft, draftTarget.stage, await unwrapRemote(estateRemote().drafts.get(draftTarget.draft), 'drafts/get') as unknown as Record<string, unknown>)
        } catch (tailReadError) {
          // tailReadError: a transient read failure (the drafts door
          // mid-write, a dropped socket) keeps the last frame
          // standing per this tail's contract above — the next pass
          // re-reads; a persistent fault surfaces on the next
          // successful read's rev/faces delta, never as a thrown
          // generator death mid-strip.
          continue
        }
        const faces = JSON.stringify(next.stages)
        if (lastRev === next.rev && lastFaces === faces) continue
        lastRev = next.rev
        lastFaces = faces
        value = next
        yield { ok: true, value }
      }
      return
    }
    // run view: hydrate, then push (1.8, the hand-roll audit's last
    // poll, 2026-10-12 — THE POLL IS DEAD): runs/subscribe pushes a
    // fresh row after every registry write that moves the run (the
    // claim, the settle, the artifacts harvest, the stop press) over
    // the same-origin mux the bench tail rides; the tail yields on
    // row change until terminal or abort.
    let value: CardsRunValue
    try {
      value = readRun(runId, await unwrapRemote(estateRemote().runs.status(runId), 'runs/status') as unknown as Record<string, unknown>)
    } catch (e) {
      yield failure(address, rejectionVoice(e))
      return
    }
    yield { ok: true, value }
    if (isTerminal(value.status)) return
    if (remote === undefined) {
      // THE UNMOUNTED FACE (the bench branch's own honest degrade,
      // one law for both tails): one HTTP snapshot, then ONE failure
      // frame — an absent stream face is a broken mount, never a
      // silent freeze pretending to watch.
      yield failure(address, 'run stream unavailable — the remote face did not mount (showing one snapshot)')
      return
    }
    // no aborted re-check here: the stream's own opening guard owns
    // that arm (the bench branch's shape — one law, one place)
    yield* streamRunFrames(remote, runId, address, value, ctx.signal)
  })()
}

/** The sidebar conversation card's run-frames carrier — handed down
 *  from the client entry. The card (the toolview mount in the right
 *  sidebar's cards column) cannot reach ctx.remote (estateRemote
 *  binds the namespaces only, and $stream lives on the remote face),
 *  so the entry binds the live face here after its mounts; the card's
 *  live tail then rides the SAME run frames the run view's resource
 *  serves. Unbound (a harness that never mounted) is the provider's
 *  unmounted face: one snapshot, one failure frame, the tail ends. */
let runFramesRemote: ClientRemote | undefined

/** Bind the run-frames carrier (the client entry, once, after mounts).
 *
 * @param remote the live remote face ($stream included); undefined
 *   unbinds (tests reset between mounts) */
export function bindRunFramesRemote(remote: ClientRemote | undefined): void {
  runFramesRemote = remote
}

/** The sidebar conversation card's live tail — run frames by run id
 *  (the run view's resource, same address, same carrier law).
 *
 * @param runId the started run
 * @param signal abort disposes the stream and ends the tail
 * @returns the run resource's frames: one hydrate, then movement */
export function subscribeRunFrames(
  runId: string,
  signal: AbortSignal,
): AsyncIterable<RemoteResult<CardsRunValue>> {
  // The run address reaches only the run branch (parseCardsAddress
  // above), so every ok frame is a run value — narrowed here, at the
  // one place that owns the address, not at every consumer.
  const frames: AsyncIterable<RemoteResult<CardsValue>> =
    openCardsResource(cardsRunAddress(runId), { signal }, runFramesRemote, undefined)
  return frames as AsyncIterable<RemoteResult<CardsRunValue>>
}

/** The terminal statuses — the runs seat's own vocabulary (runsRegistry:
 *  stopFlag stamps 'stopped'; the settle path stamps 'completed' or
 *  'failed'. A settled run ends the stream; the hydrated/polled value
 *  stays as the last ok frame. */
function isTerminal(status: string): boolean {
  return isTerminalStatus(status)
}

/** THE RUN TAIL, STREAM EDITION (1.8, the hand-roll audit's last
 *  poll retired 2026-10-12 — the poll is DEAD): consume
 *  `runs/subscribe` through the gateway's reconnecting RemoteStream —
 *  one item per registry write that moves the run, push on the
 *  same-origin mux, zero cadence chatter. The laws the poll held,
 *  kept one-for-one (the bench tail's own charter, streamBenchFrames
 *  below):
 *
 *  - NO FRAME SPAM: an item yields ONLY on row change — status
 *    drift or the stages' own bytes. The spam floor is seeded from
 *    the hydrated row, so the stream re-serving the row the view
 *    already shows stays quiet.
 *  - THE VISIBILITY LAW (the silent-death cure): a carrier loss —
 *    the wire dropped, the supervisor is reconnecting — surfaces as
 *    ONE failure frame beside the last ok value, cleared by the next
 *    frame. A TERMINAL stream failure (the supervisor gave up) is
 *    one final failure frame, then the tail ends; the holder can
 *    reopen.
 *  - TERMINAL ROW: a settled run ends the tail (the last ok frame
 *    stays as the view).
 *  - ABORT: the holder's signal disposes the stream and ends the
 *    tail clean.
 *
 * The loss race: the carrierFailed callback cannot yield from inside
 * the generator, so it trips a latch the consumption loop races
 * against the pending iterator step — the voice lands the moment the
 * loss is noticed, not at recovery. */
async function* streamRunFrames(
  remote: ClientRemote,
  runId: string,
  address: string,
  hydrated: CardsRunValue,
  signal: AbortSignal,
): AsyncGenerator<RemoteResult<CardsRunValue>> {
  let wake: (() => void) | undefined
  let latch: Promise<'loss'> = new Promise(resolve => { wake = () => resolve('loss') })
  const stream = remote.$stream<Record<string, unknown>>({
    name: 'cards run stream',
    // A generation END (mux drop, host restart) is CARRIER — retry
    // through the supervisor; the subscribe generator itself only
    // ends on abort, so an end before abort is always the carrier.
    open: openSignal => estateRemote().runs.subscribe(runId, openSignal) as AsyncIterable<Record<string, unknown>>,
    ended: accepted => new RemoteStreamCarrierError(
      accepted
        ? `run stream ended after its snapshot (${address})`
        : `run stream ended before its first frame (${address})`),
    // ONE VOICE PER EPISODE: the latch re-arms when the loss frame is
    // yielded; a drop between items trips it and the always-race
    // above voices it before the reconnect's first item arrives
    carrierFailed: () => { wake?.() },
  })
  const onAbort = (): void => { void stream.dispose() }
  if (signal.aborted) { onAbort(); return }
  signal.addEventListener('abort', onAbort, { once: true })
  const iterator = stream[Symbol.asyncIterator]()
  let first = true
  // the spam floor is seeded from the hydrated row: the stream's
  // opening re-read of the same row stays quiet (no frame for the
  // state the view already shows)
  let lastStatus: string = hydrated.status
  let lastFaces: string = JSON.stringify(hydrated.stages)
  try {
    for (;;) {
      const step = iterator.next()
      // ALWAYS race the loss latch: a carrier drop fires while the
      // consumer is parked on the pending item — the voice must land
      // at the moment of loss, not at recovery (a parked plain await
      // would swallow the episode entirely)
      const raced: { item: IteratorResult<RemoteStreamItem<Record<string, unknown>>> } | 'loss' =
        await Promise.race([
          step.then(item => ({ item })),
          latch,
        ])
      let result: IteratorResult<RemoteStreamItem<Record<string, unknown>>>
      if (raced === 'loss') {
        yield failure(address, 'run live stream lost — reconnecting (showing the last known state)')
        latch = new Promise(resolve => { wake = () => resolve('loss') })
        result = await step
      } else {
        result = raced.item
      }
      if (result.done) return
      const item = result.value
      if (first) {
        // mark the opening baseline accepted — a later generation end
        // classifies as after-snapshot (carrier, retry)
        item.accept()
        first = false
      }
      const value = readRun(runId, item.value)
      // THE ROW-CHANGE GATE: an item yields ONLY when the status or
      // the stages' own bytes moved (stable through the JSON
      // round-trip, so a reconnect re-serving the identical row
      // stays quiet)
      const faces = JSON.stringify(value.stages)
      if (lastStatus === value.status && lastFaces === faces) continue
      lastStatus = value.status
      lastFaces = faces
      yield { ok: true, value }
      if (isTerminal(value.status)) return
    }
  } catch (e) {
    // terminal supervisor failure — one final voice, then the tail
    // ends; the holder (the resource seat) can reopen the address
    yield failure(address, 'run stream failed: ' + (rejectionVoice(e)))
    return
  } finally {
    signal.removeEventListener('abort', onAbort)
    await stream.dispose()
  }
}


/** THE BENCH TAIL, STREAM EDITION (2026-09-15, the mux swap — the
 *  poll is DEAD): consume `bench/subscribe` through the gateway's
 *  reconnecting RemoteStream — one item per estate write, push on the
 *  same-origin mux, zero cadence chatter. The laws the poll held,
 *  kept one-for-one:
 *
 *  - FIRST FRAME: the stream's opening doc (the subscribe generator
 *    serves the zero state for a not-yet-born bench — the birth watch).
 *  - NO FRAME SPAM: later items yield ONLY on doc change — rev
 *    drift (an author move) or run-face movement at the same rev (a
 *    run's progress/result/history landing through a rev-silent
 *    telemetry write). A reconnect re-serving the identical doc is
 *    the same rev AND the same stage bytes: no frame.
 *  - THE VISIBILITY LAW (the silent-death cure): a carrier loss —
 *    the wire dropped, the supervisor is reconnecting — surfaces as
 *    ONE failure frame beside the last ok value, cleared by the next
 *    frame. A TERMINAL stream failure (the supervisor gave up) is one
 *    final failure frame, then the tail ends; the holder can reopen.
 *  - ABORT: the holder's signal disposes the stream and ends the
 *    tail clean.
 *
 * The loss race: the carrierFailed callback cannot yield from inside
 * the generator, so it trips a latch the consumption loop races
 * against the pending iterator step — the voice lands the moment the
 * loss is noticed, not at recovery. */
async function* streamBenchFrames(
  remote: ClientRemote,
  benchNs: BenchNamespace,
  sessionKey: string,
  address: string,
  signal: AbortSignal,
): AsyncGenerator<RemoteResult<CardsBenchValue>> {
  let wake: (() => void) | undefined
  let latch: Promise<'loss'> = new Promise(resolve => { wake = () => resolve('loss') })
  const stream = remote.$stream<Record<string, unknown>>({
    name: 'cards bench stream',
    // A generation END (mux drop, host restart) is CARRIER — retry
    // through the supervisor; the subscribe generator itself only
    // ends on abort, so an end before abort is always the carrier.
    open: openSignal => benchNs.subscribe(sessionKey, openSignal) as AsyncIterable<Record<string, unknown>>,
    ended: accepted => new RemoteStreamCarrierError(
      accepted
        ? `bench stream ended after its snapshot (${address})`
        : `bench stream ended before its first frame (${address})`),
    // ONE VOICE PER EPISODE: the latch re-arms when the loss frame is
    // yielded; a drop between items trips it and the always-race
    // above voices it before the reconnect's first item arrives
    carrierFailed: () => { wake?.() },
  })
  const onAbort = (): void => { void stream.dispose() }
  if (signal.aborted) { onAbort(); return }
  signal.addEventListener('abort', onAbort, { once: true })
  const iterator = stream[Symbol.asyncIterator]()
  let first = true
  let lastRev: number | null = null
  let lastFaces: string | null = null
  try {
    for (;;) {
      const step = iterator.next()
      // ALWAYS race the loss latch: a carrier drop fires while the
      // consumer is parked on the pending item — the voice must land
      // at the moment of loss, not at recovery (a parked plain await
      // would swallow the episode entirely)
      const raced: { item: IteratorResult<RemoteStreamItem<Record<string, unknown>>> } | 'loss' =
        await Promise.race([
          step.then(item => ({ item })),
          latch,
        ])
      let result: IteratorResult<RemoteStreamItem<Record<string, unknown>>>
      if (raced === 'loss') {
        yield failure(address, 'bench live stream lost — reconnecting (showing the last known state)')
        latch = new Promise(resolve => { wake = () => resolve('loss') })
        result = await step
      } else {
        result = raced.item
      }
      if (result.done) return
      const item = result.value
      if (first) {
        // mark the opening baseline accepted — a later generation end
        // classifies as after-snapshot (carrier, retry)
        item.accept()
        first = false
      }
      const value = readBench(item.value, sessionKey)
      // THE DOC-CHANGE GATE (the telemetry law, 2026-10-08 — rev is
      // AUTHORSHIP now, not change): a same-rev frame still yields
      // when the RUN FACES moved — a foreign-started run's progress,
      // landed result, or archived history rides a write that never
      // touches the rev, and a passive tab (no local observer armed)
      // would otherwise never see it: no frame, no re-render, and
      // the phantom reconcile never arms for the foreign run. The
      // dedup key is rev + the stages' own bytes (stable through the
      // JSON round-trip, so a reconnect re-serving the identical doc
      // stays quiet); author moves always drift the rev, so no
      // rendered field can move unseen either way.
      const faces = JSON.stringify(value.stages)
      if (lastRev === value.rev && lastFaces === faces) continue // same-doc reconnect: no frame
      lastRev = value.rev
      lastFaces = faces
      yield { ok: true, value }
    }
  } catch (e) {
    // terminal supervisor failure — one final voice, then the tail
    // ends; the holder (the resource seat) can reopen the address
    yield failure(address, 'bench stream failed: ' + (rejectionVoice(e)))
    return
  } finally {
    signal.removeEventListener('abort', onAbort)
    await stream.dispose()
  }
}


/** The stage's artifact URL from its run (the studio's output half)
 *  — the run-wire package's verb, re-exported (public face stable).
 *  Carries the SINGLE-STAGE FALLBACK: a one-stage run's stage IS the
 *  asked stage ({model:} runs name stages by the card's skeleton). */
export { fetchRunStageUrl, fetchRunTerminal, fetchLatestRunForDraft } // re-exports: definitions in runs-policy.ts

/** isTerminalRun re-export (the run-view stream's terminal law). */
export { isTerminalRun as isTerminal }
