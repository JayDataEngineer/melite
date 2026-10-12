/**
 * draft.ts — the native card surface's data layer. The model half is
 * PURE (tests import it directly); the fetch half rides the estate's
 * mounted Typert namespaces (stroke 81's one-lane law — the
 * generated client through ctx.remote, never a hand-written
 * envelope; the parameter names ARE the wire fields):
 *   drafts.get(draftId)     → the draft doc (createdAt IS the version —
 *                             bumped on every server-side rewrite)
 *   runs.start({draft_id})  → {run_id} | RemoteError (doc carries the
 *                             draft_id the caller wants started)
 *   runs.status(runId)      → per-stage status + artifact urls
 *
 * Every function narrows untrusted JSON defensively — a malformed doc
 * throws with its own name at the call site, never in the render tree.
 */

/** One draft stage as the door serves it (superset tolerated). */
export interface DraftStage {
  id: string
  title?: string
  kind?: string
  service?: string
  params?: Record<string, unknown>
  inputs?: unknown[]
  status?: string
}

/** The draft doc (GET /v1/flows/drafts/<id>). */
export interface DraftDoc {
  draft_id: string
  intent?: string
  stages: DraftStage[]
  status?: string
  createdAt?: number
  /** THE BENCH BLOCK (the domain's own revision law — the draft doc
   *  carries it; the patch door bumps it on every write). The CAS
   *  fence's expect handle. */
  bench?: { rev: number; log: unknown[] }
}

/** GET /v1/flows/status/<run_id> (the fields the card surface reads). */
export interface RunStatusDoc {
  run_id: string
  status: string
  stages?: RunStageStatus[]
  /** The run-level failure text, verbatim off the run row — the tile's
   *  failure voice (a failed run shows WHY, never just the dot). */
  error?: string
}

/** The events-bus frame — the run-event stream's wire type.
 * `stage` frames are
 * idempotent patches onto the run the 700ms poll owns; `run` frames
 * with a terminal status end the stream. */
export type FlowProgress = { value: number; max: number; node?: string }
export type FlowEventFrame =
  | { type: 'run'; status: string }
  | {
      type: 'stage'
      stage: string
      index?: number
      status?: string
      progress?: FlowProgress
      activity?: string
      error?: string
    }

import { toRunMediaUrl, type RunStageStatus } from '@melite-plugin/melite-run-wire'
import { estateRemote, unwrapRemote, parseNumericInput, isCasConflict, type DraftsNamespace } from '@melite/card-base/client'
import { isTerminalStatus, statusOrPendingOf, type CardStatus } from '@melite/contracts/stageView'
import { rejectionVoice } from './rejection-voice.ts'

/** The media URL seam — the run-wire package's ONE rewrite
 *  (toRunMediaUrl, the browser twin of @melite/estate-media's
 *  mediaUrl): bare run-relative names ride the estate's media
 *  route; urls that already carry a URL pass verbatim. Kept as a
 *  named export for this module's consumers — the definition lives
 *  in ONE package (the operator's DRY law). */
export { toRunMediaUrl as mediaUrl }
export type { RunStageStatus }

/** The draft doc; throws the door's own named refusal on failure. */
export async function fetchDraft(draftId: string): Promise<DraftDoc> {
  const doc = await unwrapRemote(estateRemote().drafts.get(draftId), 'drafts/get') as unknown as Record<string, unknown>
  if (typeof doc['draft_id'] !== 'string' || !Array.isArray(doc['stages'])) {
    throw new Error('drafts/get: not a draft doc')
  }
  return doc as unknown as DraftDoc
}

/** The draft's CURRENT bench rev — the CAS handle for a write the
 *  caller composed without one (the outcome observer holds no rev;
 *  a drill held its open-time rev while the agent moved the bench).
 *  Reads the served doc's own bench block; null when the door won't
 *  say (the caller then throws loud, never writes blind). */
export async function fetchDraftRev(draftId: string): Promise<number | null> {
  try {
    const doc = await fetchDraft(draftId)
    return typeof doc.bench?.rev === 'number' ? doc.bench.rev : null
  } catch {
    return null
  }
}


/** One drafts/patch round trip; throws the door's named refusal. The
 *  generated signature is (draftId, stageId, patch, expectRev:
 *  number | null) — the open local patch shape rides as the wire's
 *  own open JSON record (honestly JSON all the way down). Returns
 *  the door's answer rev (THE CONFIRMED-WRITE LAW: the server's own
 *  word that the write landed — the ledger records it, a caller may
 *  use it as its next CAS handle). */
async function patchOnce(
  draftId: string, stageId: string, patch: Record<string, unknown>,
  expectRev: number | undefined,
): Promise<{ rev: number | null }> {
  const ns: DraftsNamespace = estateRemote().drafts
  const row = await unwrapRemote(
    ns.patch(draftId, stageId, patch as Parameters<DraftsNamespace['patch']>[2], expectRev ?? null),
    'drafts/patch',
  ) as unknown as Record<string, unknown>
  if (row['delivered'] !== true) {
    const reason = typeof row['reason'] === 'string' ? row['reason'] : 'undelivered'
    throw new Error('drafts/patch: ' + reason + ' (draft ' + draftId + ', stage ' + stageId + ')')
  }
  const rev = typeof row['rev'] === 'number' ? row['rev'] : null
  return { rev }
}

// ── THE WRITE LEDGER (the one-press/one-engine law, 2026-09-23) ──
//
// THE OPERATOR'S LAW, verbatim: "Me pressing one thing and ComfyUI
// getting another thing should be IMPOSSIBLE. By construction."
//
// The press → engine span is a CHAIN (emit → debounce → patch → CAS
// → doc → compose) and any link can die silently: on 2026-09-23
// 17:43 the operator toggled the seam cut→carried, pressed Run ten
// seconds later, and a 15-minute film composed from fifteen 'cut' —
// the bench log held NO patch for the toggle (the write died before
// the wire, most plausibly in a debounce timer the run press's view
// flip unmounted). The ledger makes the class DEAD BY CONSTRUCTION:
//
//   1. every authoring write REGISTERS here (module-level state that
//      OUTLIVES component unmount — a view flip cannot kill a write
//      by killing its timer owner);
//   2. every run press FLUSHES the stage's writes first (the gate)
//      — the engine composes only from confirmed doc state, and a
//      write that fails refuses the run LOUD, naming the error;
//   3. the last confirmed rev + last failure are queryable, so "did
//      my press land?" has an answer in the client at all times.
export interface StageWriteState {
  readonly pending: number
  /** Param keys whose latest write FAILED and has not since landed
   *  (the audit's B2, 2026-09-23: a single lastError slot let ANY
   *  later success erase a real refusal while the UI still showed
   *  the failed value — failure memory is per-KEY, cleared only by
   *  that key landing). */
  readonly failedKeys: string[]
  readonly lastError: string | null
  readonly confirmedRev: number | null
}

interface StageWriteRow {
  inflight: Set<Promise<unknown>>
  failedKeys: Set<string>
  lastError: string | null
  confirmedRev: number | null
  /** Bumped by every write that rides this row — the chained door
   *  (`enqueueSend`) and the direct one (`patchStageParams`). A forget
   *  armed at epoch N drops the row only while it still stands at N: a
   *  write that arrived after the forget owns the row's memory afresh
   *  (the race audit's F2/F3, 2026-10-22). */
  epoch: number
}

const stageWrites = new Map<string, StageWriteRow>()

/** THE LEDGER CAP (audit X-D1..D3, round 13): the write ledger is
 *  keyed by doc ids and past STAGE_LEDGER_CAP the OLDEST IDLE rows
 *  evict first-insert order — the runs planes' MAX_SETTLED_* law,
 *  mirrored here so abandoned drafts cannot grow the maps forever.
 *  A busy row (links in flight, a trailing write still scheduled, an
 *  unsettled chain) is never a candidate, and a switched-away draft
 *  is NOT forgotten wholesale (undo can return to it — V-S5's
 *  memory law); only idle residue past the cap pays. */
const STAGE_LEDGER_CAP = 128

function pruneStageLedger(): void {
  let excess = stageWrites.size - STAGE_LEDGER_CAP
  for (const key of stageWrites.keys()) {
    if (excess <= 0) break
    const row = stageWrites.get(key)
    if (row === undefined || row.inflight.size > 0) continue
    if (scheduledWrites.get(key) !== undefined || sendChains.get(key) !== undefined) continue
    stageWrites.delete(key)
    excess -= 1
  }
  excess = scheduledWrites.size - STAGE_LEDGER_CAP
  for (const key of scheduledWrites.keys()) {
    if (excess <= 0) break
    const row = scheduledWrites.get(key)
    if (row === undefined || row.size > 0) continue
    scheduledWrites.delete(key)
    excess -= 1
  }
}

function writeRow(draftId: string, stageId: string): StageWriteRow {
  const key = draftId + '/' + stageId
  let row = stageWrites.get(key)
  if (row === undefined) {
    row = { inflight: new Set(), failedKeys: new Set(), lastError: null, confirmedRev: null, epoch: 0 }
    stageWrites.set(key, row)
    pruneStageLedger()
  }
  return row
}

/** The stage's write accountability snapshot — what the UI consults
 * before it lets anything compose from this doc. */
export function stageWriteState(draftId: string, stageId: string): StageWriteState {
  const row = writeRow(draftId, stageId)
  return { pending: row.inflight.size, failedKeys: [...row.failedKeys], lastError: row.lastError, confirmedRev: row.confirmedRev }
}

/** THE AUTHORING CONTRACT (2026-10-10, the operator's live face:
 *  "Generate Image: lane 'krea-2/turbo' refuses the state: this lane
 *  requires 'prompt' — 'prompt' is not stated" — and "THERE SHOULD
 *  HAVE BEEN A CONTRACT, SO USERS CAN ADD CARDS"). What you type in
 *  a card IS that card's state on the bench. A typed SCHEMA field
 *  used to live in the drill's React state alone (CardForm forwards
 *  its onPatch to the MODS section only), so the run's fresh-read
 *  composed a row that never heard the prompt — the row rode the
 *  axis seeds and nothing else, and the lane refused the image.
 *
 *  The contract's write: EVERY non-slot field edit registers in the
 *  ledger here, coalesced per key on a short trailing delay (a
 *  keystroke storm is one write, not forty) — module-level state, so
 *  a view flip cannot kill a pending write by killing its timer
 *  owner (the 2026-09-23 burn's exact death). ONE hole, named
 *  honestly rather than patched with a lying flush: a write inside
 *  its trailing window dies on DRILL CLOSE — but on a real BROWSER
 *  TAB close the whole heap dies with the page (this ledger, the
 *  timers, the run gate itself — no beforeunload/beacon exists, and
 *  none honestly can: the door's CAS fence needs the write's
 *  answer). The tab-close loss window is REAL and UNCOVERED; the
 *  drill-close half is caught by the run gate, which FORCES every
 *  pending write before composing (flushStageWrites below), so the
 *  engine only ever sees what the studio shows. */
const SCHEDULED_TRAILING_MS = 300
interface ScheduledParamWrite {
  readonly timer: ReturnType<typeof setTimeout>
  readonly params: Record<string, unknown>
  readonly expectRev: number | undefined
  /** Callers waiting on this key's write (the write-seat audit's
   *  orphaned-promise finding: a superseded or forced-out-of-band
   *  write MUST still settle its waiters when the door answers —
   *  "settles when the door answered" is the API's own doc). */
  readonly waiters: Array<() => void>
}
/** Pending trailing writes, keyed draft/stage then param key (the
 *  coalescing unit: one write per key, the newest value wins). */
const scheduledWrites = new Map<string, Map<string, ScheduledParamWrite>>()

/** Per-stage SEND CHAIN (the second audit's timer-fan-out finding,
 *  2026-10-11): two keys scheduled in the same tick fire their
 *  timers together and both read the SAME confirmedRev — the second
 *  collides and burns a rebase round, the exact CAS fan-out the
 *  force path killed, relocated to the timers. Every send for a
 *  stage — timer or force — rides this chain, so each write reads
 *  the rev the PREVIOUS landing answered, by construction. */
const sendChains = new Map<string, Promise<void>>()

function enqueueSend(
  draftId: string, stageId: string, thunk: () => Promise<void>,
): Promise<void> {
  const key = draftId + '/' + stageId
  // THE RIDE MARK (the race audit's F3): this link is about to own the
  // key's memory — a forget armed before it must not drop the row it
  // accumulates into.
  writeRow(draftId, stageId).epoch += 1
  const prev = sendChains.get(key) ?? Promise.resolve()
  const link = prev.then(thunk)
  // the CHAIN never rejects (a failed link must not jam the next
  // write); the CALLER holds the raw link and settles on it. The
  // entry settles away once no newer link has replaced it (audit
  // X-D3: an ever-settled chain must not outlive its stage).
  const settled = link.then(() => undefined, () => undefined)
  sendChains.set(key, settled)
  void settled.then(() => {
    if (sendChains.get(key) === settled) sendChains.delete(key)
  })
  return link
}

/** Keys still sitting in their trailing window (the flush's
 *  liveness check — a schedule that survives the loop below is
 *  voiced, never composed over). */
function pendingScheduledKeys(draftId: string, stageId: string): string[] {
  const row = scheduledWrites.get(draftId + '/' + stageId)
  if (row === undefined) return []
  return [...row.keys()]
}

function scheduledRow(draftId: string, stageId: string): Map<string, ScheduledParamWrite> {
  const key = draftId + '/' + stageId
  let row = scheduledWrites.get(key)
  if (row === undefined) {
    row = new Map()
    scheduledWrites.set(key, row)
    pruneStageLedger()
  }
  return row
}

/** Register an authoring edit: the value rides the row on the
 *  trailing delay. The promise settles when the door ANSWERED —
 *  also when a later edit superseded this one (the waiters ride the
 *  newest write's fate: one key, one write, every waiter hears it)
 *  and when the run gate forced the write out of band. The ledger
 *  owns the failure memory either way. */
export function scheduleStageParam(
  draftId: string,
  stageId: string,
  /** ONE key — the trailing coalescer's unit is a single typed
   *  field. This signature is the 2026-10-12 construction fix: the
   *  old Record<string, unknown> ACCEPTED a multi-key marriage patch
   *  and silently split it per key, so a variant pick that did
   *  everything right still produced half-switch writes the compose
   *  door refused ('stated cfg 3.5 is OUTSIDE the route envelope for
   *  variant "turbo"'). Multi-key writes are CONTRACTS, not typing:
   *  they can only reach patchStageParams — ONE door write, judged
   *  against the state they describe. */
  name: string,
  value: unknown,
  expectRev?: number,
): Promise<void> {
  const key = draftId + '/' + stageId
  const row = scheduledRow(draftId, stageId)
  const params: Record<string, unknown> = { [name]: value }
  if (Object.keys(params).length === 0) {
    return Promise.resolve()
  }
  // patchStageParams owns the DOOR'S DOC SHAPE (benchStage's
  // STAGE_PATCH_KEYS — the wire's key is `params`; the flat
  // client-side vocabulary is wrapped by that function, never by a
  // caller). THE REV AT SEND TIME (the write-seat audit's amplifier
  // finding): the ledger's confirmedRev — the rev the door itself
  // answered for this stage's last landing write — beats the
  // render-time rev callers hand in; a trailing write that fires
  // after an earlier one landed rides the FRESH rev instead of
  // colliding with the stale one by construction.
  const send = (merged: Record<string, unknown>, rev: number | undefined): Promise<void> => {
    const confirmed = writeRow(draftId, stageId).confirmedRev
    return patchStageParams(draftId, stageId, merged, confirmed ?? rev)
  }
  const keys = Object.keys(params)
  const remaining = { n: keys.length }
  const done = new Promise<void>((resolve) => {
    const settle = (): void => {
      remaining.n -= 1
      if (remaining.n === 0) resolve()
    }
    for (const [k, v] of Object.entries(params)) {
      const prev = row.get(k)
      if (prev !== undefined) clearTimeout(prev.timer)
      const merged: Record<string, unknown> = prev !== undefined ? { ...prev.params } : {}
      merged[k] = v
      // the superseded write's waiters ride THIS write's fate (one
      // key, one write — every caller that asked hears the answer)
      const waiters = prev !== undefined ? [...prev.waiters, settle] : [settle]
      const entry: ScheduledParamWrite = {
        params: merged,
        expectRev,
        waiters,
        timer: setTimeout(() => {
          // THE ORPHAN GUARD (audit F1-A, 2026-10-22): an entry the
          // row no longer holds was superseded or consumed, and its
          // timer was cleared — but a supersede that lands between a
          // force's snapshot and its consumption deletes the NEW
          // entry out from under it, leaving this closure armed with
          // no row. Sending then would land a value the row dropped.
          if (row.get(k) !== entry) return
          row.delete(k)
          // an empty row outlives nothing — the entry goes with it
          // (X-D2: the outer map is not a second unbounded ledger)
          if (row.size === 0) scheduledWrites.delete(key)
          void enqueueSend(draftId, stageId, () => send(merged, expectRev)).then(
            () => { for (const w of waiters) w() },
            () => { for (const w of waiters) w() },
          )
        }, SCHEDULED_TRAILING_MS),
      }
      row.set(k, entry)
    }
  })
  return done
}

/** Fire every pending trailing write for the stage NOW (the run
 *  gate's first move — a press composes what the studio shows).
 *  SERIALIZED, one write landing before the next leaves (the
 *  write-seat audit's CAS-violation finding: the first cut fanned
 *  the keys out CONCURRENTLY at one shared render-time rev, every
 *  writer collided, each retry round eliminated exactly one, and
 *  the rebase budget (PATCH_ATTEMPTS=3) exhausted at four-plus keys
 *  into a SPURIOUS refusal the operator never typed). Serial and
 *  riding confirmedRev at send time, a single-author press lands
 *  every key with ZERO collisions; a true second author is met
 *  with the full rebase budget per write. Settling is still
 *  non-throwing here — the LEDGER owns the failure memory and the
 *  run gate voices it. */
async function forceScheduledWrites(draftId: string, stageId: string): Promise<void> {
  const key = draftId + '/' + stageId
  const row = scheduledWrites.get(key)
  if (row === undefined || row.size === 0) return
  for (const [k, write] of [...row.entries()]) {
    // THE IDENTITY LAW (audit F1-A/F1-C, 2026-10-22): the sweep yields
    // at the send below, so the key's entry may have been SUPERSEDED by
    // a keystroke (a fresh entry with the merged value and a fresh
    // timer) or consumed by its own timer while this snapshot entry sat
    // unconsumed. Consuming the snapshot copy then deletes the row's
    // NEW entry and sends the STALE params: the value the operator can
    // no longer see goes on the wire, the fresh send is orphaned to a
    // bare timer the quiet-check cannot find (it re-reads the row), and
    // the gate answers clean over a doc the studio no longer shows —
    // the 2026-09-23 burn. A superseded entry stays a timer for the
    // next sweep; a fired entry is already gone from the row, so this
    // never double-sends it.
    if (row.get(k) !== write) continue
    clearTimeout(write.timer)
    row.delete(k)
    if (row.size === 0) scheduledWrites.delete(key)
    try {
      // through the SAME send chain as the timers (the second
      // audit, 2026-10-11): a timer firing mid-force otherwise
      // races the force's write at the same confirmedRev
      await enqueueSend(draftId, stageId, async () => {
        const confirmed = writeRow(draftId, stageId).confirmedRev
        await patchStageParams(draftId, stageId, write.params, confirmed ?? write.expectRev)
      })
    } catch { /* the ledger records; the gate voices */ }
    for (const w of write.waiters) w()
  }
}

/** Await every authoring write still in flight for the stage (the
 * run gate's flush). Never throws — the caller reads the settled
 * state and refuses the run on any failure. */
export async function flushStageWrites(draftId: string, stageId: string): Promise<StageWriteState> {
  // THE PENDING-FIRST LAW: a trailing write that has not fired yet
  // is still an authoring write — the press forces it before the
  // compose reads the row (the 2026-10-10 burn: press typed, press
  // ran, the prompt was still in a timer). AND THE LOOP (the second
  // audit's mid-force finding, 2026-10-11): a keystroke registered
  // DURING the force's await is a TIMER again — one forced sweep
  // drained inflight only and the gate answered clean with the new
  // write still riding, composing a row the studio no longer showed.
  // The flush therefore repeats until the stage is QUIET — no
  // schedule, nothing in flight — bounded, and a schedule that
  // outlives the bound is VOICED by the gate, never composed over.
  const key = draftId + '/' + stageId
  for (let guard = 0; guard < 16; guard++) {
    await forceScheduledWrites(draftId, stageId)
    const row = writeRow(draftId, stageId)
    while (row.inflight.size > 0) {
      await Promise.allSettled([...row.inflight])
    }
    const sched = scheduledWrites.get(key)
    if (sched !== undefined && sched.size > 0) continue
    // THE CHAIN TAIL (audit F1-B, 2026-10-22): a link enqueued by a
    // timer inside the drain starts its thunk only after the drain's
    // own microtasks settle, so inflight can be empty, the schedule
    // gone, and the write not yet started. Awaiting the stage's chain
    // tail settles that queued thunk before the stage may call itself
    // quiet.
    const tail = sendChains.get(key)
    if (tail === undefined) break
    await tail
  }
  return stageWriteState(draftId, stageId)
}

/** THE RUN GATE'S VOICE (the one-press/one-engine law) — the ONE
 * seat every run verb rides (runCardStage, the chat tile, every
 * future caller): flush the stage's authoring writes, then refuse
 * with the naming message when a key's latest write has not landed.
 * Null = the press may compose. Never throws. */
export async function refuseForUnlandedWrite(draftId: string, stageId: string): Promise<string | null> {
  const state = await flushStageWrites(draftId, stageId)
  if (state.failedKeys.length === 0) {
    // guard-expiry honesty: a schedule that outlived the flush loop
    // (a pathological author typing through sixteen sweeps) is an
    // unlanded write too — the gate voices it, never composes over
    const stillRiding = pendingScheduledKeys(draftId, stageId)
    if (stillRiding.length === 0) return null
    return 'THE WRITE DID NOT LAND — run refused: authoring write(s) still in their trailing window after repeated flush '
      + '(unlanded keys: ' + stillRiding.join(', ') + '). '
      + 'The persisted doc under this stage is not what the studio shows; nothing was sent to the engine.'
  }
  return 'THE WRITE DID NOT LAND — run refused: '
    + (state.lastError ?? 'authoring write(s) still in flight')
    + ' (unlanded keys: ' + state.failedKeys.join(', ') + '). '
    + 'The persisted doc under this stage is not what the studio shows; nothing was sent to the engine.'
}

/** Drop the whole ledger (spec isolation ONLY — same discipline as
 * unbindEstateRemote: specs share draft/stage ids across tests, and
 * a refusal recorded by one test must not refuse the next test's
 * run. Production NEVER calls this: the ledger's memory is the
 * law). */
export function resetStageWrites(): void {
  stageWrites.clear()
  for (const row of scheduledWrites.values()) {
    for (const write of row.values()) {
      clearTimeout(write.timer)
      // settle the waiters (the second audit's orphan note): a
      // caller still awaiting a schedule this reset dropped would
      // hang silently — "settles when the door answered" becomes
      // "settles when the ledger itself is torn down"
      for (const w of write.waiters) w()
    }
  }
  scheduledWrites.clear()
  sendChains.clear()
}

/** THE LEDGER'S INVALIDATION (audit V-S5): a stage the bench no
 *  longer holds — remove-stage, clear, an undo that rewound past it —
 *  must not keep accountability rows forever. Per-row cancel mirrors
 *  resetStageWrites: a pending trailing write's timer dies and its
 *  waiters settle, and that write never fires, so it never lands. A
 *  send already fired into the chain is past cancelling — the door has
 *  it (or will) — so its row is not dropped under it either: the chain
 *  drops the stageWrites row only after its last link settles, so an
 *  in-flight link keeps its failure memory until the door has answered
 *  it. Neighbouring stages are untouched: this is per-stage, never the
 *  nuclear reset.
 *
 *  The row dies with the RIDE THIS FORGET FOUND, never with a
 *  successor's (the race audit's F2/F3, 2026-10-22): a direct-call
 *  write has no chain to defer to, so its row waits for the last
 *  attempt to settle instead of vanishing under it, and a write that
 *  arrives after the forget bumps the row's epoch, which voids the
 *  deferred drop rather than wiping the memory it is accumulating. */
export function forgetStageWrites(draftId: string, stageIds: readonly string[]): void {
  for (const stageId of stageIds) {
    const key = draftId + '/' + stageId
    const scheduled = scheduledWrites.get(key)
    if (scheduled !== undefined) {
      for (const write of scheduled.values()) {
        clearTimeout(write.timer)
        for (const w of write.waiters) w()
      }
      scheduledWrites.delete(key)
    }
    const armed = stageWrites.get(key)?.epoch ?? -1
    const chain = sendChains.get(key)
    sendChains.delete(key)
    const drop = (): void => { forgetRowWhenIdle(key, armed) }
    if (chain === undefined) drop()
    else void chain.finally(drop)
  }
}

/** Drop a stage's row once the ride the forget armed for is over.
 *  @param key the ledger key (draft id / stage id).
 *  @param armed the row's epoch when the forget fired; a successor
 *  write bumps it, and a row that no longer stands at `armed` is not
 *  this forget's to drop. */
function forgetRowWhenIdle(key: string, armed: number): void {
  const row = stageWrites.get(key)
  if (row === undefined || row.epoch !== armed) return
  if (row.inflight.size > 0) {
    // the row outlives the forget by exactly the direct ride still on
    // it: dropping it now would leave the door's answer with nothing
    // to land in (the cap law's own asymmetry — pruneStageLedger
    // refuses a busy row too).
    for (const attempt of [...row.inflight]) {
      // THE DRAIN (the full-suite unhandled rejection, 2026-10-11 —
      // the old `void attempt.finally(recheck)` propagated a
      // rejecting direct ride into a derived promise nobody holds).
      // Both arms recheck: the forget waits out the ride either way.
      void attempt.then(
        () => { forgetRowWhenIdle(key, armed) },
        () => { forgetRowWhenIdle(key, armed) },
      )
    }
    return
  }
  stageWrites.delete(key)
}

/** Forget EVERY row the draft holds — for an action whose stage set the
 *  caller cannot enumerate: an undo restores and removes stages the live
 *  list never showed together, so the ledger's memory of each is stale
 *  truth (the race audit's F4, 2026-10-22). Keys are `draftId/stageId`,
 *  so the draft's rows are the rows under its own prefix — every other
 *  draft is untouched.
 *  @param draftId the draft whose rows go. */
export function forgetDraftWrites(draftId: string): void {
  const prefix = draftId + '/'
  const stageIds = new Set<string>()
  for (const key of [...stageWrites.keys(), ...scheduledWrites.keys()]) {
    if (key.startsWith(prefix)) stageIds.add(key.slice(prefix.length))
  }
  forgetStageWrites(draftId, [...stageIds])
}

/** Reconcile the failure memory against what the studio NOW shows
 * (the write-seat audit's dead-end finding, 2026-10-10): a key whose
 * write FAILED stays in failedKeys forever — but after the drill
 * closes and REOPENS, the edit state reseeds from the HELD row, so
 * the studio shows the field empty while the run gate still refuses
 * naming a key nobody holds anymore (a GHOST: the cure — "retype the
 * field" — is invisible, the refusal looks like a lie). A failed key
 * is dead weight from a prior session of the form only when NOBODY
 * can show it: the held row does not carry it, the freshly seeded
 * edit state does not carry it, AND the form does not DECLARE it
 * (the second audit's live-drop finding, 2026-10-11: seedUser seeds
 * only held keys + axis rows, but the form RENDERS every declared
 * field — a declared-but-never-written 'prompt' shows an empty field
 * the operator can retype, so its refusal is live and curable, not
 * a ghost). A key any of the three still carries KEEPS its refusal
 * — that failure is live and the gate must voice it. */
export function reconcileStageWriteFailures(
  draftId: string, stageId: string,
  heldParams: Record<string, unknown>, seededParams: Record<string, unknown>,
  declaredKeys: ReadonlySet<string> = new Set(),
): void {
  const row = writeRow(draftId, stageId)
  for (const k of [...row.failedKeys]) {
    if (!(k in heldParams) && !(k in seededParams) && !declaredKeys.has(k)) {
      row.failedKeys.delete(k)
    }
  }
  if (row.failedKeys.size === 0) row.lastError = null
}

/** The CAS dance (the run-start face law, 2026-09-14): write with the
 *  held rev; on the door's cas-conflict RE-READ the rev and re-apply
 *  — BOUNDED (2026-10-09: the once-law died under a live bench with
 *  a second author — the agent session or a late-landing keystroke
 *  patch — bumping the rev between the re-read and the retry; one
 *  re-apply refused the run a second time and the operator hit the
 *  wall). Up to PATCH_ATTEMPTS total tries, a fresh rev between
 *  each; exhaustion, a missing rev, or any non-CAS refusal throws
 *  LOUD — never a silent drop, never a blind write. */
const PATCH_ATTEMPTS = 3
async function patchWithRebase(
  draftId: string, stageId: string, patch: Record<string, unknown>,
  expectRev: number | undefined,
): Promise<{ rev: number | null }> {
  let rev = expectRev
  if (rev === undefined) {
    rev = await fetchDraftRev(draftId) ?? undefined
    if (rev === undefined) throw new Error('drafts/patch: no bench rev to write against (draft ' + draftId + ')')
  }
  let last: unknown
  for (let i = 0; i < PATCH_ATTEMPTS; i++) {
    try {
      return await patchOnce(draftId, stageId, patch, rev)
    } catch (e: unknown) {
      if (!isCasConflict(e)) throw e
      last = e
      const fresh = await fetchDraftRev(draftId) ?? undefined
      if (fresh === undefined) throw e
      rev = fresh
    }
  }
  throw last
}

/** Edit one stage's params — the REAL door, reborn 2026-09-11: the
 *  drafts remote's `drafts/patch` write arm over the drafts domain
 *  (the gateway-era PATCH /v1/flows/drafts/:id/stages/:sid died with
 *  the app; stroke L stubbed this to a loud throw — the shared-state
 *  door is back, same per-key merge semantics server-side). Throws
 *  the door's named refusal; delivered:false lands as a named throw
 *  (never a lying success). Null params values ride VERBATIM —
 *  the door's JSON Merge Patch arm deletes those keys (the unset
 *  path's domain half). */
export async function patchStageParams(
  draftId: string, stageId: string, params: Record<string, unknown>,
  expectRev?: number,
): Promise<void> {
  // THE CAS FENCE (the parameter audit, 2026-09-14): the caller
  // hands the bench revision it composed against; the door refuses
  // bench/cas-conflict loud when the bench moved (never merges
  // under the earlier author). On conflict the write re-reads the
  // rev and re-applies (patchWithRebase, up to PATCH_ATTEMPTS=3) —
  // a conflict past the budget throws loud.
  //
  // THE LEDGER REGISTRATION (the one-press/one-engine law): this
  // write is ACCOUNTABLE from the moment it exists — in flight while
  // it travels, its answer rev recorded when the server confirms,
  // its refusal recorded when the server says no. The promise still
  // rejects to the caller (their banner owns the face); the ledger
  // owns the memory no unmount can kill. Failure memory is PER-KEY
  // (the audit's B2): a later success clears only the keys IT
  // carried — an unrelated key landing never erases a real refusal.
  const row = writeRow(draftId, stageId)
  // THE RIDE MARK, direct door (the race audit's F2): this attempt is
  // in `row.inflight` rather than on the chain, so the forget's identity
  // check rests on the epoch alone.
  row.epoch += 1
  const keys = Object.keys(params)
  // STRICT found the self-reference: the finally deletes `attempt`
  // while its own initializer is still the only assigner TS can see.
  // The optional local states the truth — the delete runs after the
  // assignment (the promise cannot settle before it exists).
  let attempt: Promise<void> | undefined
  attempt = (async (): Promise<void> => {
    try {
      const settled = await patchWithRebase(draftId, stageId, { params }, expectRev)
      if (settled.rev !== null) row.confirmedRev = settled.rev
      for (const k of keys) row.failedKeys.delete(k)
      if (row.failedKeys.size === 0) row.lastError = null
    } catch (e: unknown) {
      for (const k of keys) row.failedKeys.add(k)
      row.lastError = rejectionVoice(e)
      throw e
    } finally {
      // (settled ⇒ the initializer completed ⇒ attempt is assigned;
      // the guard states it without lying to the type)
      if (attempt !== undefined) row.inflight.delete(attempt)
    }
  })()
  row.inflight.add(attempt!)
  return attempt
}

/** Report a stage's RUN OUTCOME onto the bench row — the same
 *  shared-state door (runStatus + result keys of the fixed patch
 *  set). This is the chain's attribution half: the estate names
 *  runs by DRAFT only (every bench stage runs under the shared
 *  bench draft), so the tab — the one that knows WHICH stage ran —
 *  writes the outcome the wire edge later reads. result.url rides
 *  the media-route currency (renders in tiles AND stages verbatim
 *  as the next run's chained input). health is the transport
 *  channel (LOW-23): `health: 'unreachable'` escalates, `health:
 *  null` clears on recovery — the status word itself never carries
 *  a resource signal. At least one of runStatus/health/result
 *  rides every body this helper sends. */
export async function patchStageOutcome(
  draftId: string, stageId: string,
  outcome: { runStatus?: string; health?: string | null; result?: Record<string, unknown> },
  expectRev?: number,
): Promise<void> {
  // THE REVLESS-WRITE CURE (2026-09-14, the operator's "PRESS PLAY.
  // NOTHING HAPPENS"): this door sent NO expect_rev, and the server
  // REQUIRES it — every outcome write (running, progress, terminal)
  // refused bench/cas-conflict, deterministically, forever. Finished
  // images piled up on disk while the drill said "No render yet".
  // Now the write carries a rev (the caller's, else a fresh read)
  // and rebases on conflict within the PATCH_ATTEMPTS budget; a
  // conflict past the budget throws LOUD.
  // (THE TELEMETRY LAW, 2026-10-08 — the door now treats
  // result/runStatus-only bodies as RUN FACES: they land without
  // fencing, bumping, or logging, so the bench rev no longer ticks
  // with every progress frame. The rev this helper still fetches
  // and sends is harmless currency — the door simply doesn't spend
  // it on telemetry.)
  await patchWithRebase(draftId, stageId, outcome, expectRev)
}

/** Start the run; returns the run_id or throws the door's named refusal. */
export async function startDraft(draftId: string): Promise<string> {
  const row = await unwrapRemote(estateRemote().runs.start({ draft_id: draftId }), 'runs/start') as unknown as Record<string, unknown>
  if (typeof row['run_id'] !== 'string') {
    throw new Error('runs/start: no run_id in the answer')
  }
  return row['run_id']
}

/** The terminal statuses — the tail's stop condition must match the
 *  stream's, or a dropped socket rides forever / an unknown run stops
 *  early. */
export function runFinished(status: string): boolean {
  return isTerminalStatus(status)
}

/** One card row in the chat tile: the stage distilled for listing. */
export interface CardRow {
  stageId: string
  title: string
  kind: string
  service: string | null
  prompt: string | null
  /** Status precedence: live run status > draft stage status > never
   *  ran. THE ONE VOCABULARY (2026-10-01): the private five-word union
   *  (which dropped success/stopped/unknown/live/stale/skipped/reused
   *  into a 'ready' that reads never-ran) is dead — the row carries
   *  the fold's CardStatus. The estate's queued-for-start stage word
   *  ('pending') folds to 'queued' — the waiting face — so a live
   *  run's yet-to-start stages read waiting, not never-ran. The
   *  'pending' home is the no-information face: '' and words outside
   *  the vocabulary land there through the view-side read (no dot,
   *  not running — never a thrown render). */
  status: CardStatus
  thumbUrl: string | null
  /** The run-level failure text on the failing row (or the last row
   *  when the run died without naming a stage) — the tile says WHY. */
  error?: string
}

function rowStatus(live: string | undefined, doc: string | undefined): CardRow['status'] {
  // The view-side read: both words are persisted draft values no door
  // validated (the card plane writes 'unreachable' onto rows) — an
  // unreadable word is the no-information face, never a thrown render.
  return statusOrPendingOf(live ?? doc ?? '')
}

/** Distill the draft (+ optional live run status) into card rows. */
export function cardRows(doc: DraftDoc, live?: RunStatusDoc | null): CardRow[] {
  // POSITIONAL match (the estate law, flowExecuteSlice: "a stage frame
  // patches onto the stage whose INDEX matches") — the bus and the
  // status door both carry flow order, and run stage ids never equal
  // draft stage ids ('generate' vs 's_0').
  const liveStages = live?.stages ?? []
  // THE FAILURE VOICE (2026-10-22, the "merged submit" freeze hunt):
  // a failed run's error text lands on the failing row — or the last
  // row when the run died without naming a stage (an engine-side
  // death folds no per-stage failure). Never a silent 'failed' dot.
  const runFailed = live?.status === 'failed' && typeof live.error === 'string' && live.error !== ''
  return doc.stages.map((stage, index) => {
    const runStage = liveStages[index]
    const params = stage.params ?? {}
    const prompt = typeof params['prompt'] === 'string' && params['prompt'] !== ''
      ? (params['prompt'] as string).slice(0, 96)
      : null
    const rowFailed = runFailed &&
      (runStage?.status === 'failed' || (liveStages.every((s) => s.status !== 'failed') && index === doc.stages.length - 1))
    // THE HEADLESS-SETTLE FACES (trail-defect-hunt §3): with no live
    // run doc, the DRAFT row is the only voice — its result carries
    // the error text (and the media url) the runs seat's settle
    // mirror stamped. The card speaks it, never a silent 'failed' dot.
    const docResult = (stage as unknown as Record<string, unknown>)['result'] as Record<string, unknown> | undefined
    const docError = docResult !== null && typeof docResult === 'object'
      && typeof docResult['error'] === 'string' && docResult['error'] !== ''
      ? docResult['error'] as string
      : undefined
    const docUrl = docResult !== null && typeof docResult === 'object'
      && typeof docResult['url'] === 'string' && docResult['url'] !== ''
      ? docResult['url'] as string
      : undefined
    return {
      stageId: stage.id,
      title: stage.title ?? stage.id,
      kind: stage.kind ?? 'stage',
      service: typeof stage.service === 'string' && stage.service !== '' ? stage.service : null,
      prompt,
      status: rowStatus(runStage?.status, stage.status),
      thumbUrl: typeof runStage?.url === 'string' && runStage.url !== ''
        ? toRunMediaUrl(live?.run_id ?? '', runStage.url)
        : docUrl ?? null,
      ...(rowFailed && live !== null ? { error: live.error } : {}),
      ...(live === null && docError !== undefined ? { error: docError } : {}),
    }
  })
}

/** Fold one events-bus frame onto the live status doc — an idempotent
 *  patch onto the same store the poll writes. Stage frames patch
 *  positionally by index; terminal run frames set the run status. */
export function foldFrame(prev: RunStatusDoc | null, runId: string, frame: FlowEventFrame): RunStatusDoc {
  if (frame.type === 'stage') {
    const i = typeof frame.index === 'number' ? frame.index : -1
    if (i < 0) return prev ?? { run_id: runId, status: 'running', stages: [] }
    const stages = [...(prev?.stages ?? [])]
    const cur = stages[i] ?? { id: String(i), status: 'running' }
    stages[i] = {
      id: cur.id,
      status: typeof frame.status === 'string' && frame.status !== '' ? frame.status : cur.status,
      url: cur.url,
    }
    return { run_id: runId, status: prev?.status ?? 'running', stages }
  }
  return { run_id: runId, status: String(frame.status), stages: prev?.stages ?? [] }
}

/** One editable param field (the form model — v1 atoms bind these). */
export interface ParamField {
  key: string
  value: string | number | boolean
  /** The ui-primitives atom the field binds: Input (text/number) or Switch. */
  atom: 'text' | 'number' | 'switch'
}

/** Project a stage's params into editable fields (in key order). */
export function paramFields(params: Record<string, unknown>): ParamField[] {
  const fields: ParamField[] = []
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'boolean') fields.push({ key, value, atom: 'switch' })
    else if (typeof value === 'number') fields.push({ key, value, atom: 'number' })
    else if (typeof value === 'string') fields.push({ key, value, atom: 'text' })
    // objects/arrays/null stay read-only (JsonTree in the drilldown); not editable in v1
  }
  return fields
}

/** Coerce an edited atom value back to the param's wire type. The
 *  numeric leg delegates to the spec owner's parseNumericInput —
 *  an unparseable or emptied input keeps the field's current value
 *  (the owner's own law; clearing the box is not a zero edit). */
export function coerceEdit(field: ParamField, next: string): string | number | boolean {
  if (field.atom === 'number') {
    const n = parseNumericInput(next)
    return n !== undefined ? n : field.value
  }
  return next
}

/** The edit map: RAW values as typed (strings for Input fields,
 *  booleans for Switch) — coercion happens once, at patch time, so
 *  typing "1." keeps its dot mid-keystroke. */
export type EditMap = ReadonlyMap<string, string | boolean>

/** The PATCH body for one stage: only the keys whose coerced value
 *  actually changed (a "1." retyped back to the original number is NOT
 *  an edit). */
export function editPatch(fields: ParamField[], edits: EditMap): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  let changed = false
  for (const f of fields) {
    const raw = edits.get(f.key)
    if (raw === undefined) continue
    const next = typeof raw === 'boolean' ? raw : coerceEdit(f, raw)
    if (next === f.value) continue
    patch[f.key] = next
    changed = true
  }
  return changed ? patch : null
}
