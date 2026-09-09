/**
 * draft.ts — the native card surface's data layer, PURE and
 * fetch-injected (tests pass stubs; the component passes window.fetch).
 *
 * The wire is the SAME one the editor rides, same-origin through the
 * card-deck host's /v1 proxy (packages/web/melite-card-deck/src/index.ts):
 *   GET   /v1/flows/drafts/<id>            → the draft doc (createdAt IS
 *                                            the version — bumped on every
 *                                            server-side rewrite)
 *   PATCH /v1/flows/drafts/<d>/stages/<s>  → stage param edits
 *   POST  /v1/flows/start {draft_id}       → {run_id} | {error}
 *   GET   /v1/flows/status/<run_id>        → per-stage status + artifact
 *                                            urls (/v1/assets/runs/…)
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

/** The fetch shape the component injects (window.fetch compatible). */
export type DraftFetch = (path: string, init?: RequestInit) => Promise<Response>

function jsonBody(res: Response, what: string): Promise<unknown> {
  return res.json().catch(() => {
    throw new Error(`${what}: malformed JSON (HTTP ${res.status})`)
  })
}

/** GET the draft doc; throws with the door's own name on failure. */
export async function fetchDraft(fetchImpl: DraftFetch, draftId: string): Promise<DraftDoc> {
  const res = await fetchImpl('/v1/flows/drafts/' + encodeURIComponent(draftId))
  const doc = await jsonBody(res, 'draft GET') as Record<string, unknown>
  if (!res.ok) {
    const err = (doc as { error?: unknown }).error
    throw new Error(typeof err === 'string' && err !== '' ? err : `draft GET failed: HTTP ${res.status}`)
  }
  if (typeof doc['draft_id'] !== 'string' || !Array.isArray(doc['stages'])) {
    throw new Error('draft GET: not a draft doc')
  }
  return doc as unknown as DraftDoc
}

/** PATCH one stage's params (the editor's resultOutbox door, param edits only). */
export async function patchStageParams(
  fetchImpl: DraftFetch, draftId: string, stageId: string, params: Record<string, unknown>,
): Promise<void> {
  const res = await fetchImpl(
    '/v1/flows/drafts/' + encodeURIComponent(draftId) + '/stages/' + encodeURIComponent(stageId),
    { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ params }) },
  )
  if (!res.ok) {
    const doc = await jsonBody(res, 'stage PATCH').catch(() => null) as Record<string, unknown> | null
    const err = doc?.['error']
    throw new Error(typeof err === 'string' && err !== '' ? err : `stage PATCH failed: HTTP ${res.status}`)
  }
}

/** POST the run; returns {run_id} or throws the door's named refusal. */
export async function startDraft(fetchImpl: DraftFetch, draftId: string): Promise<string> {
  const res = await fetchImpl('/v1/flows/start', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ draft_id: draftId }),
  })
  const doc = await jsonBody(res, 'flows/start') as Record<string, unknown>
  if (!res.ok || typeof doc['run_id'] !== 'string') {
    const err = doc['error']
    throw new Error(typeof err === 'string' && err !== '' ? err : `flows/start failed: HTTP ${res.status}`)
  }
  return doc['run_id']
}

/** GET the run status (poll target). Throws on transport failure only. */
export async function runStatus(fetchImpl: DraftFetch, runId: string): Promise<RunStatusDoc> {
  const res = await fetchImpl('/v1/flows/status/' + encodeURIComponent(runId))
  const doc = await jsonBody(res, 'run status') as Record<string, unknown>
  if (!res.ok || typeof doc['status'] !== 'string') {
    throw new Error(`run status failed: HTTP ${res.status}`)
  }
  return doc as unknown as RunStatusDoc
}

/** The terminal states (polling stops; the tile settles). */
export function runFinished(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'error' || status === 'stopped'
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
  const liveStages = new Map<string, RunStageStatus>()
  if (live?.stages) for (const s of live.stages) liveStages.set(s.id, s)
  return doc.stages.map((stage) => {
    const runStage = liveStages.get(stage.id)
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
      thumbUrl: typeof runStage?.url === 'string' && runStage.url !== '' ? runStage.url : null,
    }
  })
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
