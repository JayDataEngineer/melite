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
import type { JsonValue, ToolDefinition } from '../types.ts'
import { gatewayRequest, RayGatewayError } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'
import { DEFAULT_BENCH, projectStages } from './melite-construct.ts'
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
const CATALOG_TIMEOUT_MS = 15_000

interface StartResult {
  run_id?: unknown
  status?: unknown
  error?: string
}

/** POST /v1/flows/start — the verbatim-error pattern (the agent
 *  reads the gateway's refusal text, not a transport code). */
async function startRun(
  gatewayUrl: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let res: StartResult
  try {
    res = await gatewayRequest(gatewayUrl, 'POST', '/v1/flows/start', body, signal, TIMEOUT_MS) as StartResult
  } catch (e) {
    if (e instanceof RayGatewayError) {
      let named = ''
      try {
        named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
      } catch { named = '' }
      return { error: named || e.body || 'queue refused the start' }
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
  gatewayUrl: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  const b = await gatewayRequest(
    gatewayUrl, 'POST', '/v1/bench/ensure', body, signal, DRAFT_TIMEOUT_MS,
  ) as { draft_id?: unknown; error?: string }
  if (b && typeof b.error === 'string' && b.error) throw new Error(b.error)
  const id = b && b.draft_id
  if (typeof id !== 'string' || id === '') throw new Error('bench ensure returned no draft_id')
  return id
}

/** BENCH (the bench rework's run verb): run THE shared bench as it
 *  stands — no composition, no sugar. The stages are projected onto
 *  the flow_inline wire contract (presentation extras strip), then
 *  started under the bench's own draft_id. This is what the user's
 *  Run press does and what {bench: true} does — one truth. */
async function runBench(
  gatewayUrl: string,
  a: { test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  let b: Record<string, unknown>
  try {
    b = await gatewayRequest(gatewayUrl, 'GET', `/v1/bench/${DEFAULT_BENCH}`, undefined, signal, 15_000) as Record<string, unknown>
  } catch (e) {
    if (e instanceof RayGatewayError && e.status === 404) {
      return { error: 'the bench is empty — construct stages first (melite_construct)' }
    }
    throw e
  }
  const stages = projectStages(b['stages'])
  if (stages.length === 0) return { error: 'the bench is empty — construct stages first (melite_construct)' }
  const draftId = typeof b['draft_id'] === 'string' ? b['draft_id'] as string : `bench-${DEFAULT_BENCH}`
  const started = await startRun(gatewayUrl, {
    flow_inline: { stages }, test: a.test === true, draft_id: draftId,
  }, signal)
  return { mode: 'bench', target: `bench-${DEFAULT_BENCH} @ rev ${String(b['rev'] ?? '?')}`, draft_id: draftId, ...started }
}

/** SINGLE (the old card_run path, composed inside): manifest gate
 *  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(
  gatewayUrl: string,
  a: { card?: string; model?: string; prompt?: string; params?: Record<string, unknown>; test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const card = a.card ?? ''
  const model = a.model ?? ''
  if (!model) return { error: 'model is required (name the family explicitly — QUEUE LANE LAW)' }
  const tools = await gatewayRequest(gatewayUrl, 'GET', '/v1/card-tools', undefined, signal, CATALOG_TIMEOUT_MS) as Array<Record<string, unknown>>
  const manifest = (Array.isArray(tools) ? tools : []).find((t) => t.model === model)
  if (manifest === undefined) {
    const allowed = (Array.isArray(tools) ? tools : []).map((t) => String(t.model)).filter((s) => s !== '').join(', ')
    return { error: `model "${model}" has no card tool. Live card tools: ${allowed}` }
  }
  try {
    const v = await gatewayRequest(gatewayUrl, 'GET',
      '/v1/card-tools/validate?model=' + encodeURIComponent(model),
      undefined, signal, 10_000) as { runnable?: boolean; error?: string }
    if (v.runnable !== true) return { error: v.error || `model "${model}" cannot run` }
  } catch (e: unknown) {
    if (e instanceof Error && /cannot run/.test(e.message)) return { error: e.message }
  }
  const cat = await gatewayRequest(gatewayUrl, 'GET', '/v1/model-catalog', undefined, signal, CATALOG_TIMEOUT_MS) as {
    models?: Record<string, { defaults?: unknown }>
  }
  const entry = (cat.models ?? {})[model]
  const defaults = (entry !== undefined && entry.defaults !== null
    && typeof entry.defaults === 'object' && !Array.isArray(entry.defaults))
    ? entry.defaults as Record<string, unknown> : {}
  const cardDefaults: Record<string, unknown> = {}
  {
    const props = (manifest.params_schema !== null && typeof manifest.params_schema === 'object'
      && (manifest.params_schema as { properties?: Record<string, { default?: unknown }> }).properties) ?? {}
    for (const [k, spec] of Object.entries(props)) {
      if (spec.default !== undefined) cardDefaults[k] = spec.default
    }
  }
  const bag = a.params ?? {}
  const params: Record<string, unknown> = { ...cardDefaults, ...defaults, ...bag }
  if (typeof a.prompt === 'string' && a.prompt !== '') params["prompt"] = a.prompt
  const intentSrc = typeof params["prompt"] === 'string' ? params["prompt"] as string : card
  const intent = intentSrc.length > 80 ? intentSrc.slice(0, 77) + '…' : intentSrc
  let draftId: string
  try {
    draftId = await loadBench(gatewayUrl, {
      session: DEFAULT_BENCH,
      intent,
      stages: [{
        id: 's_0',
        ...(card !== '' ? { card } : {}),
        engine: 'comfyui',
        params,
      }],
    }, signal)
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(gatewayUrl, { ...params, model, test: a.test === true, draft_id: draftId }, signal)
  if (typeof started["error"] === 'string') return { mode: 'card', target: card !== '' ? card : model, ...started }
  return { mode: 'card', target: card !== '' ? card : model, model, draft_id: draftId, ...started }
}

/** TEMPLATE (the old flow_run path): drafts {flow,...} + start. */
async function runTemplate(
  gatewayUrl: string,
  a: { flow?: string; params?: Record<string, unknown>; test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const flow = a.flow ?? ''
  if (!flow) return { error: 'flow is required (a discovered flow name)' }
  const overrides = a.params ?? {}
  let draftId: string
  try {
    // TEMPLATE load sugar: the bench carries the template REFERENCE
    // (the {flow} start arm expands the graph server-side; the run
    // registry snapshots it). One marker row keeps the doc honest.
    draftId = await loadBench(gatewayUrl, {
      session: DEFAULT_BENCH,
      intent: flow,
      stages: [{ id: 's_0', engine: 'comfyui', ref_flow: flow, params: {} }],
    }, signal)
  } catch (e) {
    if (e instanceof RayGatewayError) {
      let named = ''
      try {
        named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
      } catch { named = '' }
      return { mode: 'flow', target: flow, error: named || e.body || 'card compose refused the template' }
    }
    return { mode: 'flow', target: flow, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(gatewayUrl, { ...overrides, flow, test: a.test === true, draft_id: draftId }, signal)
  // a refused start carries the error and NO draft_id — a tile never
  // mounts for a run that never registered (the estate card-tool law).
  if (typeof started["error"] === 'string') return { mode: 'flow', target: flow, ...started }
  return { mode: 'flow', target: flow, draft_id: draftId, ...started }
}

/** AD-HOC (the old build_flow MULTI path): COMPILE FIRST at
 *  validate (no GPU on a bad wire), then draft + {flow_inline}. */
async function runAdHoc(
  gatewayUrl: string,
  a: { stages?: unknown; connects?: unknown; id?: unknown; description?: unknown; test?: boolean },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const rawStages = a.stages
  if (!Array.isArray(rawStages) || rawStages.length === 0) {
    return { error: 'stages must be a non-empty array of {id, engine, params?, outputs?} rows' }
  }
  const flowId = typeof a.id === 'string' && a.id !== '' ? a.id : 'adhoc'
  const connects = Array.isArray(a.connects) ? a.connects as Array<{ from?: unknown; to?: unknown; kind?: unknown }> : []
  let folded: MeliteFoldedStage[]
  try {
    folded = foldConnects(flowId, rawStages as Array<{ id?: unknown; engine?: unknown; description?: unknown; params?: unknown; outputs?: unknown }>, connects)
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
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
    await gatewayRequest(gatewayUrl, 'POST', '/v1/flows/validate', flowBody, signal, VALIDATE_TIMEOUT_MS)
  } catch (e) {
    if (e instanceof RayGatewayError) {
      let named = ''
      try {
        named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
      } catch { named = '' }
      return { mode: 'adhoc', target: flowId, error: named || e.body || 'flow does not compile' }
    }
    throw e
  }
  let draftId: string
  try {
    draftId = await loadBench(gatewayUrl, {
      session: DEFAULT_BENCH,
      intent: flowId,
      stages: folded,
    }, signal)
  } catch (e) {
    return { mode: 'adhoc', target: flowId, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(gatewayUrl, { flow_inline: flowBody, test: a.test === true, draft_id: draftId }, signal)
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

export function meliteFlow(gatewayUrl: string): ToolDefinition {
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
      const a = (args ?? {}) as {
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
          return jsonClean(await runBench(gatewayUrl, { test }, exec.signal)) as FlowResult;
        }
        if (hasFlow) {
          return jsonClean(await runTemplate(gatewayUrl, {
            flow: a.flow as string, params: bag, test,
          }, exec.signal)) as FlowResult;
        }
        if (hasCard) {
          return jsonClean(await runSingle(gatewayUrl, {
            card: a.card as string,
            model: typeof a.model === 'string' ? a.model : '',
            prompt: typeof a.prompt === 'string' ? a.prompt : undefined,
            params: bag, test,
          }, exec.signal)) as FlowResult;
        }
        return jsonClean(await runAdHoc(gatewayUrl, {
          stages: a.stages,
          connects: a.connects,
          id: a.id,
          description: typeof a.description === 'string' ? a.description : undefined,
          test,
        }, exec.signal)) as FlowResult;
      } catch (e) {
        if (e instanceof RayGatewayError) {
          let named = ''
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
          } catch { named = '' }
          // Ledger row 11: the refusal echoes mode/target (the fields the
          // schema requires of EVERY shape — comfy-manage's ok/action
          // pattern) so a careful refusal never fails output validation.
          const mode = hasFlow ? 'flow' : (hasCard ? 'card' : 'adhoc')
          const target = hasFlow ? String(a.flow) : (hasCard ? String(a.card) : 'pipeline')
          return jsonClean<FlowResult>({ error: named || e.body || 'gateway refused', mode, target });
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
