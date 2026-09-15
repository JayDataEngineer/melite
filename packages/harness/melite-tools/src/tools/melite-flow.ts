// melite_flow — Melite flow (the rework, 2026-09-09): the ONE
// execution verb. Takes a card or a flow tool call and executes it
// through the serial GPU queue — card_run + flow_run + build_flow
// unified (their three paths survive inside, the draft ceremony
// does not surface). Drafts stay DOOR-level (CARD BIRTH LAW: every
// start rides a doc-backed draft_id — minted here, never argued).
//
// THREE modes, exactly one per call:
//   - {card, model, prompt?, params?} — a single card (the old
//     card_run path, composed inside: manifest gate + runnability
//     gate + defaults merge, then draft + {model} start).
//   - {flow, params?} — a NAMED template (the old flow_run path:
//     drafts {flow,...} + {flow} start).
//   - {stages, connects?} — cards drafted on the fly (the old
//     build_flow MULTI path: COMPILE FIRST at validate — no GPU on
//     a bad wire — then draft + {flow_inline} start).
// Returns {run_id, draft_id}; poll with run_status. One active run
// machine-wide. L4 test flag rides every mode. The draft_id rides
// the value AND the render's leading `card <draftId>` token — the
// chat tile handle (FlowCards parseCardsBlock), never an agent arg.
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import type { EstateRequest } from '../estate.ts'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { jsonClean } from '../json-clean.ts'
import { DEFAULT_BENCH } from './melite-construct.ts'
import { loadCardDefs } from '@melite/comfyui-cordis'
import { boardedMap, resolveSpecKey } from '../discovery.ts'

/** The row's model (the QUEUE LANE LAW, agent-side): the row's
 *  params may name `model` explicitly; otherwise the card id
 *  resolves through form-spec's OWN alias law (boarded[0] — the
 *  same truth /v1/form-spec serves and the UI's
 *  defaultFamilyForCard reads; ONE resolution, never re-derived).
 *  An unresolvable card rides verbatim and the start door refuses
 *  with its own named voice. */
async function modelForCard(card: string, params: Record<string, unknown>): Promise<string> {
  if (typeof params['model'] === 'string' && params['model'] !== '') return params['model'] as string
  const defs = await loadCardDefs()
  const res = resolveSpecKey(card, defs, boardedMap(defs))
  return res !== null ? res.model : card
}
export interface MeliteConnectArg {
  from?: unknown
  to?: unknown
  kind?: unknown
}

/** One stage row from the agent's surface (gateway inline shape). */
export interface MeliteStageArg {
  id?: unknown
  engine?: unknown
  description?: unknown
  params?: unknown
  outputs?: unknown
}

/** The gateway edge row (flow_from_body contract). */
type EdgeRow = { initial: string } | { stage: string; output: string }

export interface MeliteFoldedStage {
  id: string
  engine: string
  description: string
  params: Record<string, unknown>
  inputs: Record<string, EdgeRow>
  expected: Record<string, string>
  outputs: Record<string, string>
}

/** Fold flat connects into per-stage typed edges. LOUD on shapes the
 * gateway would only bounce later — the agent reads the refusal HERE,
 * before any HTTP round trip. Kind resolution: the connect's `kind`
 * wins; a stage-to-stage connect may omit it when the upstream stage
 * DECLARES its outputs (inferred); an `initial.*` connect must state
 * it (nothing to infer from — the agent knows what its key carries). */
export function foldConnects(
  flowId: string,
  stages: MeliteStageArg[],
  connects: MeliteConnectArg[],
): MeliteFoldedStage[] {
  const folded: MeliteFoldedStage[] = stages.map((st) => {
    const outputs: Record<string, string> = {}
    const o = st.outputs
    if (o !== null && typeof o === 'object' && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
        outputs[k] = String(v)
      }
    }
    return {
      id: String(st.id ?? ''),
      engine: String(st.engine ?? ''),
      description: String(st.description ?? ''),
      params: (st.params !== null && typeof st.params === 'object'
        && !Array.isArray(st.params))
        ? st.params as Record<string, unknown> : {},
      inputs: {},
      expected: {},
      outputs,
    }
  })
  const byId = new Map(folded.map((s) => [s.id, s]))
  for (const c of connects) {
    const from = typeof c.from === 'string' ? c.from : ''
    const to = typeof c.to === 'string' ? c.to : ''
    if (from === '' || to === '') {
      throw new Error(
        'build_flow: connect needs {from, to} — got from=' + JSON.stringify(c.from)
        + ' to=' + JSON.stringify(c.to)
        + ' (from: "stage[.output]" or "initial.key"; to: "stage.input")',
      )
    }
    // to: "stage.input" — stage ids cannot contain dots (FLOW_ID_RE),
    // so the FIRST dot is the seam.
    const toDot = to.indexOf('.')
    if (toDot < 1) {
      throw new Error(
        'build_flow: connect to=' + JSON.stringify(to)
        + ' is not "stage.input" — the receiving stage and its input name',
      )
    }
    const target = byId.get(to.slice(0, toDot))
    if (target === undefined) {
      throw new Error(
        'build_flow: connect to=' + JSON.stringify(to)
        + ' names unknown stage ' + JSON.stringify(to.slice(0, toDot))
        + ' (flow ' + flowId + ' stages: ' + folded.map((s) => s.id).join(', ') + ')',
      )
    }
    const inputName = to.slice(toDot + 1)
    let edge: EdgeRow
    let inferred: string | undefined
    if (from.startsWith('initial.')) {
      edge = { initial: from.slice('initial.'.length) }
    } else {
      const dot = from.indexOf('.')
      const stageId = dot < 0 ? from : from.slice(0, dot)
      const output = dot < 0 ? 'default' : from.slice(dot + 1)
      const upstream = byId.get(stageId)
      if (upstream === undefined) {
        throw new Error(
          'build_flow: connect from=' + JSON.stringify(from)
          + ' names unknown stage ' + JSON.stringify(stageId)
          + ' (initial wires are "initial.<key>")',
        )
      }
      edge = { stage: stageId, output }
      // kind inference: only when the upstream DECLARES this output
      inferred = upstream.outputs[output]
    }
    let kind: string | undefined
    if (typeof c.kind === 'string' && c.kind.length > 0) kind = c.kind
    else if (inferred !== undefined) kind = inferred
    if (kind === undefined) {
      throw new Error(
        'build_flow: connect ' + JSON.stringify(from) + ' -> ' + JSON.stringify(to)
        + ' has no kind and none can be inferred — state it (text, image,'
        + ' video, audio, mesh, num, lora, seg)'
        + (from.startsWith('initial.')
          ? ' (initial wires ALWAYS need an explicit kind)'
          : ' (the upstream stage does not declare this output)'),
      )
    }
    if (target.inputs[inputName] !== undefined) {
      throw new Error(
        'build_flow: stage ' + target.id + ' input ' + JSON.stringify(inputName)
        + ' is wired twice',
      )
    }
    target.inputs[inputName] = edge
    target.expected[inputName] = kind
  }
  return folded
}

const TIMEOUT_MS = 30_000
const DRAFT_TIMEOUT_MS = 15_000
const VALIDATE_TIMEOUT_MS = 15_000

interface StartResult {
  run_id?: unknown
  status?: unknown
  error?: string
}

/** POST /v1/flows/start — the verbatim-error pattern (the agent
 *  reads the gateway's refusal text, not a transport code). */
async function startRun(
  request: EstateRequest,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let res: StartResult
  try {
    res = await request( 'POST', '/v1/flows/start', body, signal, TIMEOUT_MS) as StartResult
  } catch (e) {
    // Remote refusals carry their named error on the protocol's one
    // class (the RayGatewayError HTTP-era arm died with the seats).
    const re = remoteErrorOf(e)
    if (re !== null && re !== undefined) {
      return { error: re.message || 'queue refused the start' }
    }
    throw e
  }
  if (res && typeof res.error === 'string') return { error: res.error }
  return {
    run_id: typeof res.run_id === 'string' ? res.run_id : '',
    status: typeof res.status === 'string' ? res.status : 'queued',
  }
}

/** LOAD THE BENCH (the one-shared-state law — the bench rework,
 *  2026-09-10): every mode's composition lands on THE shared bench
 *  (draft doc bench-<key>) instead of minting a fresh draft per
 *  run. The user's cards tab streams the same bench; runs snapshot
 *  their composition in the run registry (CARD BIRTH LAW holds —
 *  the start still rides a doc-backed draft_id, now the bench's). */
async function loadBench(
  request: EstateRequest,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  // THE CAS READ-MODIFY-WRITE (the door's own law): under the host's
  // persistent storage the shared bench SURVIVES runs — a bare
  // {stages} ensure on an existing bench refuses bench/cas-conflict.
  // Read the row first; a live bench's rev rides as expect_rev, a
  // missing bench births (no expect_rev — the birth arm).
  // body.session is set by all three internal call sites (runSingle /
  // runTemplate / runAdHoc each pass session: DEFAULT_BENCH) — the cast
  // rides that call-site proof instead of a dead 'default' fallback
  // (2026-09-12).
  const session: string = body['session'] as string
  let expectRev: number | undefined
  try {
    const cur = await request( 'GET', `/v1/bench/${encodeURIComponent(session)}`, undefined, signal, DRAFT_TIMEOUT_MS,
    ) as { rev?: unknown }
    if (cur !== null && typeof cur === 'object' && typeof cur['rev'] === 'number') {
      expectRev = cur['rev']
    }
  } catch (e) {
    // bench/not-found = the birth arm (no expect_rev); anything else
    // is a real refusal and propagates.
    const re = remoteErrorOf(e)
    if (re === null || re === undefined || re.code !== 'bench/not-found') throw e
  }
  const b = await request( 'POST', '/v1/bench/ensure', {
    ...body,
    // THE LANDING DECLARES ITSELF (the overwrite law, 2026-09-15):
    // a run landing replaces the shared bench by design (the
    // one-shared-state law) — so it passes overwrite: true up
    // front. The composing agent's melite_construct load gets no
    // such pass; it must confirm each wipe itself.
    overwrite: true,
    ...(expectRev !== undefined ? { expect_rev: expectRev } : {}),
  }, signal, DRAFT_TIMEOUT_MS,
  ) as { draft_id?: unknown; error?: string }
  if (b && typeof b.error === 'string' && b.error) throw new Error(b.error)
  const id = b && b.draft_id
  if (typeof id !== 'string' || id === '') throw new Error('bench ensure returned no draft_id')
  return id
}

/** BENCH (the AI-control pillar, 2026-09-12): the agent drives THE
 *  shared bench exactly like the user's Run press — ONE SEQUENTIAL
 *  PASS, agent-side, one card at a time through the serial queue.
 *  The flow_inline batch arm is DEAD here (the executor takes
 *  single-stage pre-composed graphs only — a multi-stage bench was
 *  an honest refusal, never a pass): each row runs through the
 *  {model: card-id} compose arm under the bench's own draft_id
 *  (resolveCardFamily resolves the card → family estate-side — the
 *  same truth /v1/form-spec serves), the run is observed to
 *  terminal on the run-wire cadence, and EVERY flip is written onto
 *  the bench row (runStatus + result {run_id, url}) through the
 *  bench patch door — the same attribution the tab's observer
 *  performs, so the user's tiles go live WHILE the agent drives.
 *  The pass law is Run All's law verbatim: bench order, skip done
 *  rows, one refusal or failed terminal STOPS the pass. */
async function runBench(
  request: EstateRequest,
  a: { test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const empty = { mode: 'bench', target: `bench-${DEFAULT_BENCH}`, error: 'the bench is empty — construct stages first (melite_construct)' }
  let b: Record<string, unknown>
  try {
    b = await request( 'GET', `/v1/bench/${DEFAULT_BENCH}`, undefined, signal, 15_000) as Record<string, unknown>
  } catch (e) {
    // The bench remote classifies the empty bench as bench/not-found
    // (the HTTP 404 died with the door).
    if (remoteErrorOf(e)?.code === 'bench/not-found') return empty
    throw e
  }
  const rows = Array.isArray(b['stages'])
    ? (b['stages'] as unknown[]).filter((s): s is Record<string, unknown> =>
        typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>)['id'] === 'string')
    : []
  if (rows.length === 0) return empty
  const draftId = typeof b['draft_id'] === 'string' ? b['draft_id'] as string : `bench-${DEFAULT_BENCH}`
  const target = `bench-${DEFAULT_BENCH} @ rev ${String(b['rev'] ?? '?')}`
  const pass: Array<Record<string, unknown>> = []
  for (const row of rows) {
    const stageId = row['id'] as string
    const card = typeof row['card'] === 'string' && row['card'] !== '' ? row['card'] as string : ''
    if (row['runStatus'] === 'done') {
      pass.push({ stage: stageId, card, skipped: 'done' })
      continue
    }
    if (card === '') {
      return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId,
        error: `stage ${stageId} names no card — nothing to compose (melite_construct patch)`, pass }
    }
    const params = row['params'] !== null && typeof row['params'] === 'object' && !Array.isArray(row['params'])
      ? row['params'] as Record<string, unknown> : {}
    const model = await modelForCard(card, params)
    const started = await startRun(request, {
      ...params, model, test: a.test === true, draft_id: draftId,
    }, signal)
    if (typeof started['error'] === 'string') {
      return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId, error: started['error'], pass }
    }
    const runId = started['run_id'] as string
    const outcome = await observeAndAttribute(request, stageId, runId, signal)
    pass.push({ stage: stageId, card, run_id: runId, status: outcome.status,
      ...(outcome.url !== '' ? { url: outcome.url } : {}) })
    if (outcome.status !== 'done') {
      return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId, run_id: runId,
        error: `stage ${stageId} (${card}) ended ${outcome.status}`, pass }
    }
  }
  return { mode: 'bench', target, draft_id: draftId, status: 'done', pass }
}

/** Signal-honoring sleep — the observer's poll cadence (the run-wire
 *  cadence, 1500ms). */
function sleepAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); resolve() }, { once: true })
  })
}

/** THE OUTCOME OBSERVER, agent-side (observeRunOutcome's law, the
 *  attribution half): poll the run to terminal, writing every flip
 *  onto the bench row (runStatus + result) through the bench patch
 *  door. Patches are bookkeeping — a refusal is swallowed (the next
 *  run rewrites the row); the loop's own refusals are the run's.
 *  The url rides the estate's media route: run-RELATIVE names
 *  prefix /melite-media/runs/<runId>/, urls that carry a scheme or
 *  lead with / pass verbatim (the ONE rewrite — the run-wire law,
 *  mirrored). */
async function observeAndAttribute(
  request: EstateRequest,
  stageId: string,
  runId: string,
  signal: AbortSignal,
): Promise<{ status: string; url: string }> {
  let lastLive = ''
  for (;;) {
    signal.throwIfAborted()
    let doc: Record<string, unknown>
    try {
      doc = await request( 'GET', `/v1/flows/status/${encodeURIComponent(runId)}`, undefined, signal, TIMEOUT_MS) as Record<string, unknown>
    } catch (e) {
      // a classified unknown-run is terminal (the poll's stop set
      // must match the stream's — runFinished's law); transport
      // hiccups retry on cadence.
      const re = remoteErrorOf(e)
      if (re !== null && re !== undefined && re.code === 'runs/unknown-run') return { status: 'unknown', url: '' }
      await sleepAbort(1500, signal)
      continue
    }
    const status = typeof doc['status'] === 'string' ? doc['status'] as string : 'unknown'
    if (status === 'completed' || status === 'failed' || status === 'stopped' || status === 'unknown') {
      const stages = Array.isArray(doc['stages'])
        ? (doc['stages'] as unknown[]).filter((s): s is Record<string, unknown> =>
            typeof s === 'object' && s !== null) : []
      const st = stages.find((s) => s['id'] === stageId)
        ?? (stages.length === 1 ? stages[0] : undefined)
      const rawUrl = st !== undefined && typeof st['url'] === 'string' && st['url'] !== '' ? st['url'] as string : ''
      const url = rawUrl === '' ? ''
        : /^([a-z][a-z0-9+.-]*:|\/)/i.test(rawUrl) ? rawUrl : `/melite-media/runs/${runId}/${rawUrl}`
      const result: Record<string, unknown> = { run_id: runId }
      if (url !== '') result['url'] = url
      const terminal = status === 'completed' ? 'done' : status
      try {
        await request( 'POST', `/v1/bench/${DEFAULT_BENCH}/patch`,
          { stage: stageId, runStatus: terminal, result }, signal, DRAFT_TIMEOUT_MS)
      } catch { /* bookkeeping — the next run rewrites the row */ }
      return { status: terminal, url }
    }
    const live = status === 'queued' || status === 'pending' ? 'queued' : 'running'
    if (live !== lastLive) {
      lastLive = live
      try {
        await request( 'POST', `/v1/bench/${DEFAULT_BENCH}/patch`,
          { stage: stageId, runStatus: live, result: { run_id: runId } }, signal, DRAFT_TIMEOUT_MS)
      } catch { /* bookkeeping */ }
    }
    await sleepAbort(1500, signal)
  }
}

/** SINGLE (the old card_run path, composed inside): manifest gate
 *  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(
  request: EstateRequest,
  // hasCard gate (execute, the sole caller): card is a non-empty string
  // and params always an object here — no empty fallbacks exist to cover
  // (2026-09-12). model normalizes at the caller (missing → ''), so the
  // !model guard below stays reachable ('' rides it — melite-load's
  // `if (!name)` precedent).
  a: { card: string; model: string; prompt?: string; params: Record<string, unknown>; test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const card = a.card
  const model = a.model
  if (!model) return { mode: 'card', target: card, error: 'model is required (name the family explicitly — QUEUE LANE LAW)' }
  // THE CARD ARM OWNS THE COMPOSE (REBUILD-9): the runs registry's
  // start {model:} arm gates (manifest/runnability), overlays the
  // route-lens stamp (family defaults + variant resolver_defaults),
  // composes phase-1/phase-2 and registers — the tool passes the
  // USER bag and surfaces the arm's refusal voices (RemoteError →
  // {error}). The /v1/card-tools + /v1/model-catalog lanes died
  // with the gateway (2026-09-10) — never re-derived client-side.
  // execute always passes params: bag (an object) — spread of undefined
  // is {} anyway, so no fallback exists to cover (2026-09-12).
  const bag: Record<string, unknown> = { ...a.params }
  if (typeof a.prompt === 'string' && a.prompt !== '') bag["prompt"] = a.prompt
  // CARD BIRTH LAW (2026-09-13, the hour-6 form regression): a card
  // tool's draft is born with THE CARD ID AS ITS INTENT and one
  // stage. The bench normalization strips `card` from the stage row
  // (identity survives on the intent alone), and the studio consult
  // re-attaches cardName from the intent — so intent MUST be the
  // card id, never the prompt. The prompt-as-intent arm here is what
  // rendered the generic form for every prompt-carrying chat birth:
  // the consult keyed on "a quiet beach at dusk" and no studio
  // claimed it. The prompt rides bag.prompt (params), its display
  // home. (drafts/list shows the card id as the draft name — the
  // bench-default receipt's own shape.)
  const intent = card.length > 80 ? card.slice(0, 77) + '…' : card
  let draftId: string
  try {
    draftId = await loadBench(request, {
      session: DEFAULT_BENCH,
      intent,
      stages: [{
        id: 's_0',
        card,
        engine: 'comfyui',
        params: bag,
      }],
    }, signal)
  } catch (e) {
    return { mode: 'card', target: card, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(request, { ...bag, model, test: a.test === true, draft_id: draftId }, signal)
  if (typeof started["error"] === 'string') return { mode: 'card', target: card, ...started }
  return { mode: 'card', target: card, model, draft_id: draftId, ...started }
}

/** TEMPLATE (the old flow_run path): drafts {flow,...} + start. */
async function runTemplate(
  request: EstateRequest,
  // hasFlow gate (execute, the sole caller): flow is a non-empty string
  // and params always an object here — no fallbacks exist to cover
  // (2026-09-12).
  a: { flow: string; params: Record<string, unknown>; test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const flow = a.flow
  /* v8 ignore next -- hasFlow gate proves non-empty flow (2026-09-12) */
  if (!flow) return { mode: 'flow', target: '', error: 'flow is required (a discovered flow name)' }
  const overrides = a.params
  let draftId: string
  try {
    // TEMPLATE load sugar: the bench carries the template REFERENCE
    // (the {flow} start arm expands the graph server-side; the run
    // registry snapshots it). One marker row keeps the doc honest.
    draftId = await loadBench(request, {
      session: DEFAULT_BENCH,
      intent: flow,
      stages: [{ id: 's_0', engine: 'comfyui', ref_flow: flow, params: {} }],
    }, signal)
  } catch (e) {
    // The bench remote's refusal (RemoteError) — its message is the
    // diagnostic ("bench moved: rev is N, caller held M").
    return { mode: 'flow', target: flow, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(request, { ...overrides, flow, test: a.test === true, draft_id: draftId }, signal)
  // a refused start carries the error and NO draft_id — a tile never
  // mounts for a run that never registered (the estate card-tool law).
  if (typeof started["error"] === 'string') return { mode: 'flow', target: flow, ...started }
  return { mode: 'flow', target: flow, draft_id: draftId, ...started }
}

/** AD-HOC (the old build_flow MULTI path): COMPILE FIRST at
 *  validate (no GPU on a bad wire), then draft + {flow_inline}. */
async function runAdHoc(
  request: EstateRequest,
  a: { stages?: unknown; connects?: unknown; id?: unknown; description?: unknown; test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const rawStages = a.stages
  if (!Array.isArray(rawStages) || rawStages.length === 0) {
    return { mode: 'adhoc', target: 'adhoc', error: 'stages must be a non-empty array of {id, engine, params?, outputs?} rows' }
  }
  const flowId = typeof a.id === 'string' && a.id !== '' ? a.id : 'adhoc'
  const connects = Array.isArray(a.connects) ? a.connects as Array<{ from?: unknown; to?: unknown; kind?: unknown }> : []
  let folded: MeliteFoldedStage[]
  try {
    folded = foldConnects(flowId, rawStages as Array<{ id?: unknown; engine?: unknown; description?: unknown; params?: unknown; outputs?: unknown }>, connects)
  } catch (e) {
    return { mode: 'adhoc', target: flowId, error: e instanceof Error ? e.message : /* v8 ignore next -- foldConnects throws Error only: all six sites `new Error`, and property-access TypeErrors are Errors too (2026-09-12) */ String(e) }
  }
  const flowBody = {
    id: flowId,
    description: typeof a.description === 'string' ? a.description : '',
    stages: folded.map((s) => ({
      id: s.id,
      engine: s.engine,
      description: s.description,
      params: s.params,
      ...(Object.keys(s.inputs).length > 0 ? { inputs: s.inputs } : {}),
      ...(Object.keys(s.expected).length > 0 ? { expected: s.expected } : {}),
      ...(Object.keys(s.outputs).length > 0 ? { outputs: s.outputs } : {}),
    })),
  }
  try {
    await request( 'POST', '/v1/flows/validate', flowBody, signal, VALIDATE_TIMEOUT_MS)
  } catch (e) {
    const re = remoteErrorOf(e)
    if (re !== null && re !== undefined) {
      return { mode: 'adhoc', target: flowId, error: re.message || 'flow does not compile' }
    }
    throw e
  }
  let draftId: string
  try {
    draftId = await loadBench(request, {
      session: DEFAULT_BENCH,
      intent: flowId,
      stages: folded,
    }, signal)
  } catch (e) {
    return { mode: 'adhoc', target: flowId, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(request, { flow_inline: flowBody, test: a.test === true, draft_id: draftId }, signal)
  if (typeof started["error"] === 'string') return { mode: 'adhoc', target: flowId, ...started }
  return { mode: 'adhoc', target: flowId, draft_id: draftId, ...started }
}

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). mode/target ride every
 *  composed shape (the row-11 echo); the two pre-dispatch guards
 *  refuse bare (the `as` bridge below — a careful subset, never a
 *  schema failure by construction). */
type FlowResult = {
  mode: string;
  target: string;
  run_id?: string;
  draft_id?: string;
  status?: string;
  model?: string;
  error?: string;
} & Record<string, JsonValue>;

export function meliteFlow(request: EstateRequest): ToolDefinition {
  // PRESENTATION ADAPTATION (tool-presentation wall + conversion
  // invariance — presentCall output must not change): defineTool
  // soft-gates presentCall behind arg validation (invalid → undefined),
  // but the raw face always returned the tool's own generic card, and
  // the wall pins that (junk/invalid args during streaming + replay
  // still render the generic view, never throw). The presenter is
  // shared: it rides the definition AND is re-attached over the gate
  // below. execute validation (ToolArgsError/INVALID_ARGS) is
  // unaffected.
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (args ?? {}) as { card?: unknown; flow?: unknown; stages?: unknown };
    const target = typeof a.card === 'string' && a.card !== '' ? a.card
      : typeof a.flow === 'string' && a.flow !== '' ? a.flow
      : Array.isArray(a.stages) ? `adhoc (${a.stages.length} stages)` : '?';
    return { card: 'generic', title: `Run ${target}`, kind: 'execute' };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'melite_flow',
    description:
      'Execute through the serial GPU queue — the ONE execution verb. Exactly one per call: bench (run THE shared '
      + 'bench exactly as it stands — what the user\'s Run press runs) | card (a card id + model — single '
      + 'generation) | flow (a NAMED template from melite_load) | stages (cards drafted on the fly: [{id, engine, '
      + 'params?, outputs?}] + optional connects — compiled at validate BEFORE any GPU is spent). Compositions '
      + 'LOAD the shared bench first (nothing mints fresh — one state, one log, one undo); every start rides the '
      + 'bench\'s doc-backed draft_id (CARD BIRTH LAW) — it rides the value as the chat tile handle, never an '
      + 'agent arg. Returns {run_id, draft_id}; poll with run_status. One active run machine-wide.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper) — every composition arm is
    // optional (exactly-one is enforced in execute, never the schema).
    parameters: {
      bench: {
        type: 'boolean',
        description: 'BENCH mode: run THE shared bench exactly as it stands (what the user\'s Run press runs). Exclusive with card/flow/stages.',
      },
      card: {
        type: 'string',
        description: 'SINGLE mode: the card id (discovered). Requires model alongside.',
      },
      model: {
        type: 'string',
        description: 'SINGLE mode: the family id, named explicitly (must own a card tool).',
      },
      flow: {
        type: 'string',
        description: 'TEMPLATE mode: the flow name exactly as loaded.',
      },
      stages: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'AD-HOC mode: [{id, engine, description?, params?, outputs?: {name: kind}}]. Exclusive with card/flow.',
      },
      connects: {
        type: 'array',
        items: { type: 'object', additionalProperties: true },
        description: 'AD-HOC mode: [{from: "stage[.output]" | "initial.key", to: "stage.input", kind?}].',
      },
      prompt: {
        type: 'string',
        description: 'SINGLE mode: the generation prompt (wins over params.prompt).',
      },
      params: {
        type: 'object',
        additionalProperties: true,
        description: 'Overrides merged over the mode defaults (seed, knobs).',
      },
      id: {
        type: 'string',
        description: 'AD-HOC mode: the pipeline name for the compiled flow.',
      },
      description: {
        type: 'string',
        description: 'AD-HOC mode: what the pipeline produces.',
      },
      test: {
        type: 'boolean',
        description: 'L4 barrier: true routes the run to test-output, hidden from production assets. Default false.',
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string', description: 'The queue run id — poll with run_status(run_id). Absent on refusal.' },
          draft_id: { type: 'string', description: 'The minted card draft id — the chat tile handle (?meliteCards=). Absent on refusal.' },
          status: { type: 'string', description: 'Registration status (queued/running). Absent on refusal.' },
          mode: { type: 'string', description: 'Which composition ran (or was attempted): card | flow | adhoc.', required: true },
          target: { type: 'string', description: 'The card id, flow name, or ad-hoc pipeline name (echoed on refusal).', required: true },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
        // Ledger row 11 (2026-09-10): required is the fields EVERY
        // return shape carries — the refusal echoes mode/target
        // (comfy-manage's ok/action pattern); run_id/draft_id/status
        // are success-only and stay optional so the declared schema
        // never calls a careful refusal a schema failure.
      },
      render: (_args, value) => {
        const v = value as { run_id?: string; draft_id?: string; mode?: string; target?: string; status?: string; error?: string }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_flow REFUSED: ' + v.error }]
        // The render stays human/model-facing prose; the tile handle rides
        // presentationMeta (the persisted channel — see below). The leading
        // `card <draftId>` token is the LEGACY replay path only: sessions
        // logged before the meta channel keep hydrating through it.
        return [{
          type: 'text',
          text: 'card ' + String(v.draft_id ?? '?') + ' · flow ' + String(v.target ?? '?')
            + ' → ' + String(v.run_id ?? '?') + ' [' + String(v.status ?? 'queued') + '] — poll with run_status',
        }]
      },
      // presentationMeta: the NATIVE tile channel — persisted verbatim on
      // tool/result; the client derives card props from it (the same path
      // every card tool rides: {draft_id, run_id, model?, status, error}).
      // Pure: live streaming AND session-log replay call it with the frozen
      // value alone. The agent never sees this payload.
      presentationMeta: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>
        return {
          mode: String(v.mode ?? '?'),
          target: String(v.target ?? '?'),
          ...typeof v.model === 'string' && v.model !== '' ? { model: v.model } : {},
          ...typeof v.draft_id === 'string' && v.draft_id !== '' ? { draft_id: v.draft_id } : {},
          ...typeof v.run_id === 'string' && v.run_id !== '' ? { run_id: v.run_id } : {},
          ...typeof v.status === 'string' && v.status !== '' ? { status: v.status } : {},
          ...typeof v.error === 'string' && v.error !== '' ? { error: v.error } : {},
        }
      },
    },
    async execute(args, exec): Promise<FlowResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover;
      // every composition arm stays optional (exactly-one is enforced
      // below, never the schema) (2026-09-12).
      const a = args as {
        bench?: unknown; card?: unknown; model?: unknown; flow?: unknown; stages?: unknown; connects?: unknown;
        prompt?: unknown; params?: unknown; id?: unknown; description?: unknown; test?: unknown;
      }
      const bag = (a.params && typeof a.params === 'object' && !Array.isArray(a.params))
        ? a.params as Record<string, unknown> : {}
      const test = a.test === true
      const hasBench = a.bench === true
      const hasCard = typeof a.card === 'string' && a.card !== '';
      const hasFlow = typeof a.flow === 'string' && a.flow !== '';
      const hasStages = a.stages !== undefined;
      const modes = [hasBench, hasCard, hasFlow, hasStages].filter(Boolean).length;
      if (modes === 0) {
        return jsonClean({ error: 'one composition is required: bench (run what is there) | card (+model) | flow | stages (cards drafted on the fly)' }) as FlowResult;
      }
      if (modes > 1) {
        return jsonClean({ error: 'exactly one composition per call: bench | card | flow | stages — never combined' }) as FlowResult;
      }
      try {
        if (hasBench) {
          return jsonClean(await runBench(request, { test }, exec.signal)) as FlowResult;
        }
        if (hasFlow) {
          return jsonClean(await runTemplate(request, {
            flow: a.flow as string, params: bag, test,
          }, exec.signal)) as FlowResult;
        }
        if (hasCard) {
          return jsonClean(await runSingle(request, {
            card: a.card as string,
            model: typeof a.model === 'string' ? a.model : '',
            prompt: typeof a.prompt === 'string' ? a.prompt : undefined,
            params: bag, test,
          }, exec.signal)) as FlowResult;
        }
        return jsonClean(await runAdHoc(request, {
          stages: a.stages,
          connects: a.connects,
          id: a.id,
          description: typeof a.description === 'string' ? a.description : undefined,
          test,
        }, exec.signal)) as FlowResult;
      } catch (e) {
        const re = remoteErrorOf(e)
        if (re !== null && re !== undefined) {
          // Ledger row 11: the refusal echoes mode/target (the fields the
          // schema requires of EVERY shape — comfy-manage's ok/action
          // pattern) so a careful refusal never fails output validation.
          // BENCH-ONLY (2026-09-12): the sole RemoteError escaping to this
          // catch is runBench's bench GET — runSingle/runTemplate/runAdHoc
          // convert every remote refusal to an {error} value inside
          // (loadBench try/catch, startRun's remote arm, validate's remote
          // arm); non-remote errors rethrow below. The old flow/card/adhoc
          // mapping was dead here and mislabeled bench failures as
          // adhoc/pipeline — the refusal rides bench's own mode/target
          // (a real mislabel, fixed minimally).
          return jsonClean<FlowResult>({ error: re.message || 'remote refused', mode: 'bench', target: `bench-${DEFAULT_BENCH}` });
        }
        throw e;
      }
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
