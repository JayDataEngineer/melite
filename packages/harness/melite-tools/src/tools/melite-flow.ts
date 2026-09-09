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
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest, RayGatewayError } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'
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

/** Mint a draft doc (CARD BIRTH LAW — every start below rides one). */
async function mintDraft(
  gatewayUrl: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  const draft = await gatewayRequest(
    gatewayUrl, 'POST', '/v1/flows/drafts', body, signal, DRAFT_TIMEOUT_MS,
  ) as { draftId?: unknown; error?: string }
  if (draft && typeof draft.error === 'string' && draft.error) throw new Error(draft.error)
  const id = draft && draft.draftId
  if (typeof id !== 'string' || id === '') throw new Error('draft POST returned no draftId')
  return id
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
    draftId = await mintDraft(gatewayUrl, {
      intent,
      stages: [{ title: card !== '' ? card : model, kind: 'generation', service: model, params }],
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
  const composeBody = { ...overrides, flow }
  let draftId: string
  try {
    draftId = await mintDraft(gatewayUrl, composeBody, signal)
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
    draftId = await mintDraft(gatewayUrl, {
      intent: flowId,
      flow: flowBody,
      stages: folded.map((s) => ({
        id: s.id,
        title: s.description !== '' ? s.description : s.id,
        kind: 'generation',
        service: s.engine,
        params: s.params,
      })),
    }, signal)
  } catch (e) {
    return { mode: 'adhoc', target: flowId, error: e instanceof Error ? e.message : String(e) }
  }
  const started = await startRun(gatewayUrl, { flow_inline: flowBody, test: a.test === true, draft_id: draftId }, signal)
  return { mode: 'adhoc', target: flowId, draft_id: draftId, ...started }
}

export function meliteFlow(gatewayUrl: string): ToolDefinition {
  return {
    name: 'melite_flow',
    description:
      'Execute through the serial GPU queue — the ONE execution verb (a card or a flow tool call; nothing else '
      + 'executes). Exactly one per call: card (a card id + model — single generation) | flow (a NAMED template '
      + 'from melite_load) | stages (cards drafted on the fly: [{id, engine, params?, outputs?}] + optional '
      + 'connects — compiled at validate BEFORE any GPU is spent, then run as one typed flow). Drafts are minted '
      + 'inside (CARD BIRTH LAW) — the minted draft_id rides the value as the chat tile handle (the card surface '
      + 'hydrates from it via ?meliteCards=), but the agent never passes it anywhere. Returns {run_id, draft_id}; '
      + 'poll with run_status. One active run machine-wide.',
    parameters: {
      type: 'object',
      properties: {
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
    },
    presentCall(args) {
      const a = (args ?? {}) as { card?: unknown; flow?: unknown; stages?: unknown };
      const target = typeof a.card === 'string' && a.card !== '' ? a.card
        : typeof a.flow === 'string' && a.flow !== '' ? a.flow
        : Array.isArray(a.stages) ? `adhoc (${a.stages.length} stages)` : '?';
      return { card: 'generic', title: `Run ${target}`, kind: 'execute' };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string', description: 'The queue run id — poll with run_status(run_id).' },
          draft_id: { type: 'string', description: 'The minted card draft id — the chat tile handle (?meliteCards=).' },
          status: { type: 'string', description: 'Registration status (queued/running).' },
          mode: { type: 'string', description: 'Which composition ran: card | flow | adhoc.' },
          target: { type: 'string', description: 'The card id, flow name, or ad-hoc pipeline name.' },
        },
        required: ['run_id', 'draft_id', 'mode', 'target'],
      },
      render: (_args, value) => {
        const v = value as { run_id?: string; draft_id?: string; mode?: string; target?: string; status?: string; error?: string }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_flow REFUSED: ' + v.error }]
        // TOKEN-FIRST (the chat tile contract, FlowCards parseCardsBlock):
        // the token after 'card ' is the draft id — the card surface
        // hydrates from it. Same token format build_flow spoke.
        return [{
          type: 'text',
          text: 'card ' + String(v.draft_id ?? '?') + ' · flow ' + String(v.target ?? '?')
            + ' → ' + String(v.run_id ?? '?') + ' [' + String(v.status ?? 'queued') + '] — poll with run_status',
        }]
      },
    },
    async execute(args, exec) {
      const a = (args ?? {}) as {
        card?: unknown; model?: unknown; flow?: unknown; stages?: unknown; connects?: unknown;
        prompt?: unknown; params?: unknown; id?: unknown; description?: unknown; test?: unknown;
      }
      const bag = (a.params && typeof a.params === 'object' && !Array.isArray(a.params))
        ? a.params as Record<string, unknown> : {}
      const test = a.test === true
      const hasCard = typeof a.card === 'string' && a.card !== '';
      const hasFlow = typeof a.flow === 'string' && a.flow !== '';
      const hasStages = a.stages !== undefined;
      const modes = [hasCard, hasFlow, hasStages].filter(Boolean).length;
      if (modes === 0) {
        return jsonClean({ error: 'one composition is required: card (+model) | flow | stages (cards drafted on the fly)' });
      }
      if (modes > 1) {
        return jsonClean({ error: 'exactly one composition per call: card | flow | stages — never combined' });
      }
      try {
        if (hasFlow) {
          return jsonClean(await runTemplate(gatewayUrl, {
            flow: a.flow as string, params: bag, test,
          }, exec.signal));
        }
        if (hasCard) {
          return jsonClean(await runSingle(gatewayUrl, {
            card: a.card as string,
            model: typeof a.model === 'string' ? a.model : '',
            prompt: typeof a.prompt === 'string' ? a.prompt : undefined,
            params: bag, test,
          }, exec.signal));
        }
        return jsonClean(await runAdHoc(gatewayUrl, {
          stages: a.stages,
          connects: a.connects,
          id: a.id,
          description: typeof a.description === 'string' ? a.description : undefined,
          test,
        }, exec.signal));
      } catch (e) {
        if (e instanceof RayGatewayError) {
          let named = ''
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
          } catch { named = '' }
          return jsonClean({ error: named || e.body || 'gateway refused' });
        }
        throw e;
      }
    },
  }
}
