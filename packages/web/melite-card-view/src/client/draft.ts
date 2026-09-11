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

/** Correlation id for one client-request frame (crypto.randomUUID is
 *  the browser standard). */
function nextRpcId(): string {
  const cryptoApi: Crypto | undefined = globalThis.crypto
  if (cryptoApi?.randomUUID !== undefined) return cryptoApi.randomUUID()
  return 'rpc-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

/** The remotes this layer rides (the wire method table). */
type WireMethod = 'drafts/get' | 'drafts/patch' | 'runs/start' | 'runs/status'

/** One wire call: POST /api/<method> with the client-request frame,
 *  answer narrowed to the value row. A refused result throws the
 *  RemoteError branch's message (the door's own name); a channel
 *  surprise throws honestly. */
async function wireCall(method: WireMethod, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const rpcId = nextRpcId()
  const res = await fetch('/api/' + method, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload: { args } }),
  })
  if (!res.ok) throw new Error(method + ': HTTP ' + String(res.status))
  const body: unknown = await res.json().catch(() => null)
  if (typeof body !== 'object' || body === null
      || Reflect.get(body, 'type') !== 'server-response'
      || Reflect.get(body, 'rpcId') !== rpcId) {
    throw new Error(method + ': malformed response frame')
  }
  const result: unknown = Reflect.get(body, 'result')
  if (typeof result !== 'object' || result === null) {
    throw new Error(method + ': malformed result')
  }
  if (Reflect.get(result, 'ok') !== true) {
    const error: unknown = Reflect.get(result, 'error')
    const message = typeof error === 'object' && error !== null
      && typeof Reflect.get(error, 'message') === 'string'
      ? Reflect.get(error, 'message') : method + ': refused'
    throw new Error(message)
  }
  const value: unknown = Reflect.get(result, 'value')
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(method + ': not a JSON object')
  }
  return value as Record<string, unknown>
}

/** The media URL seam — the twin of @melite/estate-media's mediaUrl
 *  (kept LOCAL: this is a browser module, the package main is a host
 *  plugin). Bare run-relative names ride the estate's media route;
 *  names that already carry a URL pass verbatim. */
export function mediaUrl(runId: string, name: string): string {
  if (name === '') return name
  if (/^(https?:\/\/|\/)/.test(name)) return name
  return '/melite-media/runs/' + encodeURIComponent(runId) + '/' + name
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

/** The draft doc; throws the door's own named refusal on failure. */
export async function fetchDraft(draftId: string): Promise<DraftDoc> {
  const doc = await wireCall('drafts/get', { draftId })
  if (typeof doc['draft_id'] !== 'string' || !Array.isArray(doc['stages'])) {
    throw new Error('drafts/get: not a draft doc')
  }
  return doc as unknown as DraftDoc
}

/** Edit one stage's params — the REAL door, reborn 2026-09-11: the
 *  drafts remote's `drafts/patch` write arm over the drafts domain
 *  (the gateway-era PATCH /v1/flows/drafts/:id/stages/:sid died with
 *  the app; stroke L stubbed this to a loud throw — the shared-state
 *  door is back, same per-key merge semantics server-side). Throws
 *  the door's named refusal; delivered:false lands as a named throw
 *  (never a lying success). */
export async function patchStageParams(
  draftId: string, stageId: string, params: Record<string, unknown>,
): Promise<void> {
  const row = await wireCall('drafts/patch', { draftId, stageId, patch: { params } })
  if (row['delivered'] !== true) {
    const reason = typeof row['reason'] === 'string' ? row['reason'] : 'undelivered'
    throw new Error('drafts/patch: ' + reason + ' (draft ' + draftId + ', stage ' + stageId + ')')
  }
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
        ? mediaUrl(live?.run_id ?? '', runStage.url)
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
