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

/** Per-stage status from the run-status door. */
export interface RunStageStatus {
  id: string
  status: string
  url?: string
}

/** GET /v1/flows/status/<run_id> (the fields the card surface reads). */
export interface RunStatusDoc {
  run_id: string
  status: string
  stages?: RunStageStatus[]
}

/** The events-bus frame — @melite/catalog's FlowEventFrame, verbatim. */
import type { FlowEventFrame } from '@melite/catalog/FlowEvents'
export type { FlowEventFrame }

import { toRunMediaUrl } from '@melite-plugin/melite-run-wire'
import { estateRemote, unwrapRemote, type DraftsNamespace } from '@melite/card-base/estate-remote'

/** The media URL seam — the run-wire package's ONE rewrite
 *  (toRunMediaUrl, the browser twin of @melite/estate-media's
 *  mediaUrl): bare run-relative names ride the estate's media
 *  route; urls that already carry a URL pass verbatim. Kept as a
 *  named export for this module's consumers — the definition lives
 *  in ONE package (the operator's DRY law). */
export { toRunMediaUrl as mediaUrl }

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

/** True when the throw is the door's CAS verdict (stale or missing
 *  expect_rev) — the ONLY refusal a rebase-and-retry may answer. Any
 *  other refusal (admission, unknown stage, store failure) throws
 *  through untouched: retrying those would be a fallback. */
function isCasConflict(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  // THE MATCHER LAW (2026-09-15): the server's real voice is
  // "bench <session> moved: rev is N, caller held M" — 'bench moved'
  // matched NOTHING against 'bench main moved' (a dead matcher made
  // this rebase dead code; the operator's tab stuck on it).
  // THE THIRD VOICE (2026-10-09, the operator's run refusal): the
  // drafts/patch door refuses "bench moved under the patch
  // (expect_rev N, current M)" — NEITHER earlier arm matched it
  // ('rev is' absent; the cas-conflict CODE never rides the message
  // — unwrapRemote forwards message only), so this rebase was dead
  // code for the ONE door the drill uses and every param write
  // under a moved bench refused the run. A matcher arm per DOOR
  // VOICE, all three, forever: a new door voice is a bug, not a
  // feature.
  return msg.includes('moved: rev is')
    || msg.includes('moved under the patch')
    || msg.includes('cas-conflict')
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
}

const stageWrites = new Map<string, StageWriteRow>()

function writeRow(draftId: string, stageId: string): StageWriteRow {
  const key = draftId + '/' + stageId
  let row = stageWrites.get(key)
  if (row === undefined) {
    row = { inflight: new Set(), failedKeys: new Set(), lastError: null, confirmedRev: null }
    stageWrites.set(key, row)
  }
  return row
}

/** The stage's write accountability snapshot — what the UI consults
 * before it lets anything compose from this doc. */
export function stageWriteState(draftId: string, stageId: string): StageWriteState {
  const row = writeRow(draftId, stageId)
  return { pending: row.inflight.size, failedKeys: [...row.failedKeys], lastError: row.lastError, confirmedRev: row.confirmedRev }
}

/** Await every authoring write still in flight for the stage (the
 * run gate's flush). Never throws — the caller reads the settled
 * state and refuses the run on any failure. */
export async function flushStageWrites(draftId: string, stageId: string): Promise<StageWriteState> {
  const row = writeRow(draftId, stageId)
  while (row.inflight.size > 0) {
    await Promise.allSettled([...row.inflight])
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
  if (state.failedKeys.length === 0) return null
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
  // rev and re-applies once (patchWithRebase) — a second conflict
  // still throws loud.
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
  const keys = Object.keys(params)
  const attempt = (async (): Promise<void> => {
    try {
      const settled = await patchWithRebase(draftId, stageId, { params }, expectRev)
      if (settled.rev !== null) row.confirmedRev = settled.rev
      for (const k of keys) row.failedKeys.delete(k)
      if (row.failedKeys.size === 0) row.lastError = null
    } catch (e: unknown) {
      for (const k of keys) row.failedKeys.add(k)
      row.lastError = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      row.inflight.delete(attempt)
    }
  })()
  row.inflight.add(attempt)
  return attempt
}

/** Report a stage's RUN OUTCOME onto the bench row — the same
 *  shared-state door (runStatus + result keys of the fixed patch
 *  set). This is the chain's attribution half: the estate names
 *  runs by DRAFT only (every bench stage runs under the shared
 *  bench draft), so the tab — the one that knows WHICH stage ran —
 *  writes the outcome the wire edge later reads. result.url rides
 *  the media-route currency (renders in tiles AND stages verbatim
 *  as the next run's chained input). */
export async function patchStageOutcome(
  draftId: string, stageId: string,
  outcome: { runStatus: string; result?: Record<string, unknown> },
  expectRev?: number,
): Promise<void> {
  // THE REVLESS-WRITE CURE (2026-09-14, the operator's "PRESS PLAY.
  // NOTHING HAPPENS"): this door sent NO expect_rev, and the server
  // REQUIRES it — every outcome write (running, progress, terminal)
  // refused bench/cas-conflict, deterministically, forever. Finished
  // images piled up on disk while the drill said "No render yet".
  // Now the write carries a rev (the caller's, else a fresh read)
  // and rebases once on conflict; a final failure throws LOUD.
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

/** The run status (poll target). Throws on transport failure only. */
export async function runStatus(runId: string): Promise<RunStatusDoc> {
  const doc = await unwrapRemote(estateRemote().runs.status(runId), 'runs/status') as unknown as Record<string, unknown>
  if (typeof doc['status'] !== 'string') {
    throw new Error('runs/status: not a status doc')
  }
  return doc as unknown as RunStatusDoc
}

/** The terminal set — @melite/catalog FlowEvents' TERMINAL, verbatim
 * (the poll's stop condition must match the stream's, or a dropped
 * socket polls forever / an unknown run stops early). */
export function runFinished(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'stopped' || status === 'unknown'
}

/** One card row in the chat tile: the stage distilled for listing. */
export interface CardRow {
  stageId: string
  title: string
  kind: string
  service: string | null
  prompt: string | null
  /** Status precedence: live run status > draft stage status > ready. */
  status: 'queued' | 'running' | 'done' | 'failed' | 'ready'
  thumbUrl: string | null
}

function rowStatus(live: string | undefined, doc: string | undefined): CardRow['status'] {
  const s = live ?? doc ?? 'ready'
  if (s === 'running' || s === 'queued' || s === 'pending') return s === 'running' ? 'running' : 'queued'
  if (s === 'completed' || s === 'done' || s === 'cached' || s === 'succeeded') return 'done'
  if (s === 'failed' || s === 'error') return 'failed'
  return 'ready'
}

/** Distill the draft (+ optional live run status) into card rows. */
export function cardRows(doc: DraftDoc, live?: RunStatusDoc | null): CardRow[] {
  // POSITIONAL match (the estate law, flowExecuteSlice: "a stage frame
  // patches onto the stage whose INDEX matches") — the bus and the
  // status door both carry flow order, and run stage ids never equal
  // draft stage ids ('generate' vs 's_0').
  const liveStages = live?.stages ?? []
  return doc.stages.map((stage, index) => {
    const runStage = liveStages[index]
    const params = stage.params ?? {}
    const prompt = typeof params['prompt'] === 'string' && params['prompt'] !== ''
      ? (params['prompt'] as string).slice(0, 96)
      : null
    return {
      stageId: stage.id,
      title: stage.title ?? stage.id,
      kind: stage.kind ?? 'stage',
      service: typeof stage.service === 'string' && stage.service !== '' ? stage.service : null,
      prompt,
      status: rowStatus(runStage?.status, stage.status),
      thumbUrl: typeof runStage?.url === 'string' && runStage.url !== ''
        ? toRunMediaUrl(live?.run_id ?? '', runStage.url)
        : null,
    }
  })
}

/** Fold one events-bus frame onto the live status doc — the idempotent
 *  patch (FlowEvents.ts contract: "every frame is an idempotent patch
 *  onto the same store the poll writes"). Stage frames patch
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

/** Coerce an edited atom value back to the param's wire type. */
export function coerceEdit(field: ParamField, next: string): string | number | boolean {
  if (field.atom === 'number') {
    const n = Number(next)
    return Number.isFinite(n) ? n : field.value
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
