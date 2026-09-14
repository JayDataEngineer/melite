/**
 * draft.ts — the native card surface's data layer. The model half is
 * PURE (tests import it directly); the fetch half rides the estate's
 * Typert remotes over the wire frame — same-origin POST
 * /api/<ns>/<method> carrying the client-request frame (api-gateway.md,
 * the sanctioned caller for plugins outside the DSH web kernel; the
 * parameter names ARE the wire fields):
 *   drafts/get {draftId}   → the draft doc (createdAt IS the version —
 *                            bumped on every server-side rewrite)
 *   runs/start {doc}       → {run_id} | RemoteError (doc carries the
 *                            draft_id the caller wants started)
 *   runs/status {runId}    → per-stage status + artifact urls
 *
 * The gateway-era /v1 paths this layer once fetched died with the
 * gateway app (nothing serves them — by design). The draft
 * stage-PARAM EDIT has no serving plane yet (the drafts remote is
 * read-only: list/get; the bench patch owns bench sessions only) —
 * patchStageParams refuses LOUD at the seam, never lies a success.
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

import { toRunMediaUrl, wireCall as runWireCall } from '@melite-plugin/melite-run-wire'

/** The remotes this layer rides (the wire method table). */
type WireMethod = 'drafts/get' | 'drafts/patch' | 'runs/start' | 'runs/status'

/** One wire call — the run-wire package's ONE frame definition (the
 *  DRY law; this module's spelling died with it). The method rides
 *  as the transport voice so diagnostics name their door. */
async function wireCall(method: WireMethod, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  return await runWireCall(method, args, { voice: method })
}

/** The media URL seam — the run-wire package's ONE rewrite
 *  (toRunMediaUrl, the browser twin of @melite/estate-media's
 *  mediaUrl): bare run-relative names ride the estate's media
 *  route; urls that already carry a URL pass verbatim. Kept as a
 *  named export for this module's consumers — the definition lives
 *  in ONE package (the operator's DRY law). */
export { toRunMediaUrl as mediaUrl }

/** The draft doc; throws the door's own named refusal on failure. */
export async function fetchDraft(draftId: string): Promise<DraftDoc> {
  const doc = await wireCall('drafts/get', { draftId })
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
  return msg.includes('cas-conflict') || msg.includes('bench moved') || msg.includes('expect_rev')
}

/** One drafts/patch round trip; throws the door's named refusal. */
async function patchOnce(
  draftId: string, stageId: string, patch: Record<string, unknown>,
  expectRev: number | undefined,
): Promise<void> {
  const row = await wireCall('drafts/patch', {
    draftId, stageId, patch,
    ...(expectRev !== undefined ? { expectRev } : {}),
  })
  if (row['delivered'] !== true) {
    const reason = typeof row['reason'] === 'string' ? row['reason'] : 'undelivered'
    throw new Error('drafts/patch: ' + reason + ' (draft ' + draftId + ', stage ' + stageId + ')')
  }
}

/** The CAS dance (the run-start face law, 2026-09-14): write with the
 *  held rev; on the door's cas-conflict RE-READ the rev and re-apply
 *  ONCE (the server message's own instruction — "re-read and
 *  re-apply"). A second conflict, a missing rev, or any non-CAS
 *  refusal throws LOUD — never a silent drop, never a blind write. */
async function patchWithRebase(
  draftId: string, stageId: string, patch: Record<string, unknown>,
  expectRev: number | undefined,
): Promise<void> {
  let rev = expectRev
  if (rev === undefined) {
    rev = await fetchDraftRev(draftId) ?? undefined
    if (rev === undefined) throw new Error('drafts/patch: no bench rev to write against (draft ' + draftId + ')')
  }
  try {
    await patchOnce(draftId, stageId, patch, rev)
  } catch (e: unknown) {
    if (!isCasConflict(e)) throw e
    const fresh = await fetchDraftRev(draftId) ?? undefined
    if (fresh === undefined) throw e
    await patchOnce(draftId, stageId, patch, fresh)
  }
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
  await patchWithRebase(draftId, stageId, { params }, expectRev)
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
  await patchWithRebase(draftId, stageId, outcome, expectRev)
}

/** Start the run; returns the run_id or throws the door's named refusal. */
export async function startDraft(draftId: string): Promise<string> {
  const row = await wireCall('runs/start', { doc: { draft_id: draftId } })
  if (typeof row['run_id'] !== 'string') {
    throw new Error('runs/start: no run_id in the answer')
  }
  return row['run_id']
}

/** The run status (poll target). Throws on transport failure only. */
export async function runStatus(runId: string): Promise<RunStatusDoc> {
  const doc = await wireCall('runs/status', { runId })
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
