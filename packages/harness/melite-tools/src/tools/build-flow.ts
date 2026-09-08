/**
 * build_flow — compose the action cards. THE OLD CONTRACT, the old
 * name (agent/prompts/BASE_PROMPT.md: "build_flow composes the cards
 * the user reviews and runs"; docs/agent/CAPABILITIES.md: "It composes; it
 * never executes — there is no run tool").
 *
 * TWO compose modes (multi-step phase, 2026-09-04):
 *
 *   single-step (the old shape): model + prompt (+ params) — one card
 *     tile. The allowlist is NO LONGER hardcoded: it is derived LIVE
 *     from /v1/card-tools (the stale 6-model list died with this
 *     stroke — it hid half the estate's card tools).
 *
 *   multi-step: flow = {id, description?, stages[], connects[]} — an
 *     AGENT-CONSTRUCTED pipeline (still image -> motion, text -> tts,
 *     ...). Flat connects (`{from: "stage[.output]" | "initial.key",
 *     to: "stage.input", kind?}`) are folded here into the gateway's
 *     typed edge rows; the body is then COMPILED FIRST at
 *     POST /v1/flows/validate — a refusal returns the verbatim
 *     compile-time error (flow/stage/input + both Kinds) so the agent
 *     iterates without a queue slot, a GPU claim, or a sidecar. Only
 *     a body that compiles becomes a draft.
 *
 * Execute POSTs the DRAFT to {gateway}/v1/flows/drafts — the exact
 * wire the old backend tool used — with the compiled body riding the
 * doc's `flow` member (the ONE carrier: the card surface hydrates
 * from the draft, never the tool result). The conversation then
 * renders the REAL action cards (the editor's InlineFlowCards surface,
 * embedded per draft): the user reviews the tiles, edits in the zoom
 * drilldown, and presses Run — the card surface posts the draft's
 * compiled body to /v1/flows/start as {flow_inline}: ONE typed run,
 * server-side wiring, one run_id. This tool cannot execute anything;
 * there is no run tool.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const CATALOG_TIMEOUT_MS = 15_000
const DRAFT_TIMEOUT_MS = 15_000
const VALIDATE_TIMEOUT_MS = 15_000

interface CatalogModel {
  family?: unknown
  label?: unknown
  defaults?: unknown
}

interface CatalogShape {
  models?: Record<string, CatalogModel>
  families?: Record<string, { label?: unknown }>
}

/** One flat connect from the agent's surface. */
interface ConnectArg {
  from?: unknown
  to?: unknown
  kind?: unknown
}

/** One stage row from the agent's surface (gateway inline shape). */
interface StageArg {
  id?: unknown
  engine?: unknown
  description?: unknown
  params?: unknown
  outputs?: unknown
}

/** The gateway edge row (flow_from_body contract). */
type EdgeRow = { initial: string } | { stage: string; output: string }

interface FoldedStage {
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
function foldConnects(
  flowId: string,
  stages: StageArg[],
  connects: ConnectArg[],
): FoldedStage[] {
  const folded: FoldedStage[] = stages.map((st) => {
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

export function buildFlow(gatewayUrl: string): ToolDefinition {
  return {
    name: 'build_flow',
    description:
      'Compose a flow the user reviews and runs. TWO modes. '
      + 'SINGLE: model (any model with a live card tool — discover with card_tools; e.g. h3-timeline, music3, krea-2) '
      + '+ prompt (+ optional params). '
      + 'MULTI-STEP: flow = {id, description?, stages: [{id, engine, description?, params?, outputs?: {name: kind}}], '
      + 'connects: [{from: "stage[.output]"| "initial.key", to: "stage.input", kind?}]} — a typed pipeline. '
      + 'The flow is COMPILED FIRST at /v1/flows/validate: a bad wire (wrong kind, forward wire, typo) returns the '
      + 'verbatim compile error naming stage/input and both kinds — iterate until it compiles, no GPU spent. '
      + 'kinds: text image video audio mesh num lora seg; initial wires state kind explicitly. '
      + 'Creates a flow draft; the conversation renders editable card tiles (one per stage). '
      + "The user's Run posts the whole flow as ONE typed run — edits on the tiles ride it. "
      + 'This tool never executes anything — there is no run tool; ONLY the user starts runs, from the cards.',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          description: 'SINGLE mode: catalog model id (discover with card_tools / model_catalog).',
        },
        prompt: {
          type: 'string',
          description: 'SINGLE mode: generation prompt. The card carries it; the user can refine it before running.',
        },
        params: {
          type: 'object',
          additionalProperties: true,
          description: 'SINGLE mode: extra card params over the model defaults (e.g. {"seed":7}). '
            + 'An explicit prompt argument wins over params.prompt.',
        },
        flow: {
          type: 'object',
          additionalProperties: true,
          description: 'MULTI-STEP mode: the typed pipeline body. {id, description?, stages[], connects[]}. '
            + 'Exclusive with model/prompt. Compiled at /v1/flows/validate before any draft exists.',
        },
      },
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { model?: unknown; flow?: { stages?: unknown } };
      const stages = Array.isArray(a.flow?.stages) ? a.flow.stages.length : 0;
      return {
        card: 'generic',
        title: stages > 0 ? `Build flow (${stages} stages)` : `Build flow: ${String(a.model ?? '?')}`,
        kind: 'execute',
        rawInput: stages > 0 ? { stages } : { model: String(a.model ?? '?') },
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          card: { type: 'string', description: 'Always "draft" — editable cards, never a run.' },
          draftId: { type: 'string', description: 'The backend draft id the card surface hydrates.' },
          stages: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Slim stage rows (id/title/kind/service) — one per action card.',
          },
        },
        required: ['card', 'draftId', 'stages'],
      },
      render: (_args, value) => {
        const v = value as { draftId?: string; model?: string; stages?: unknown[] }
        const n = Array.isArray(v.stages) ? v.stages.length : 0
        return [{
          type: 'text',
          // The toolview parses the draft id out of this line (content is
          // the render text, not the raw value): it takes the token right
          // after the FIRST 'card ' — so the draft id must come IMMEDIATELY
          // after 'card ' (the gateway card-tools contract), with no other
          // 'card ' occurrence earlier in the line.
          text: 'card ' + String(v.draftId ?? '?')
            + ' (' + String(v.model ?? '?') + ') — ' + n + ' stage' + (n === 1 ? '' : 's')
            + ' · the user presses Run on the card',
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as {
        model?: unknown; prompt?: unknown
        params?: Record<string, unknown>
        flow?: Record<string, unknown>
      }
      if (a.flow !== undefined) {
        return composeMulti(gatewayUrl, a.flow, exec.signal)
      }
      return composeSingle(gatewayUrl, a, exec.signal)
    },
  }
}

// ── MULTI-STEP ──────────────────────────────────────────────────────

async function composeMulti(
  gatewayUrl: string,
  flowArg: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  const flowId = typeof flowArg.id === 'string' ? flowArg.id : ''
  if (flowId === '') {
    throw new Error('build_flow: flow.id is required (the pipeline name, [a-z_][a-z0-9_-]*)')
  }
  const rawStages = flowArg.stages
  if (!Array.isArray(rawStages) || rawStages.length === 0) {
    throw new Error('build_flow: flow.stages must be a non-empty array of {id, engine, ...} rows')
  }
  const connects: ConnectArg[] = Array.isArray(flowArg.connects) ? flowArg.connects as ConnectArg[] : []
  // fold flat connects -> typed edges (LOUD on bad shapes, pre-HTTP)
  const folded = foldConnects(flowId, rawStages as StageArg[], connects)
  const flowBody = {
    id: flowId,
    description: typeof flowArg.description === 'string' ? flowArg.description : '',
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
  // COMPILE FIRST — the AI feedback loop. A 400 throws RayGatewayError
  // carrying the gateway's error body VERBATIM: the compile refusal
  // (flow/stage/input + both Kinds) becomes the model-facing text and
  // the agent iterates. No queue slot, no GPU, no sidecar.
  await gatewayRequest(gatewayUrl, 'POST', '/v1/flows/validate',
    flowBody, signal, VALIDATE_TIMEOUT_MS)
  // compiled — the DRAFT (cards, not runs; one tile per stage). The
  // draft doc carries the COMPILED BODY as its `flow` member: the card
  // surface hydrates from the draft (never the tool result), and its
  // Run button posts that body as {flow_inline} — ONE typed run, the
  // same rows that validated here. Stage ids ride both shapes so the
  // editor's param overlay joins card ↔ flow stage by id.
  const draft = await gatewayRequest(gatewayUrl, 'POST', '/v1/flows/drafts', {
    intent: flowId,
    flow: flowBody,
    stages: folded.map((s) => ({
      id: s.id,
      title: s.description !== '' ? s.description : s.id,
      kind: 'generation',
      service: s.engine,
      params: s.params,
    })),
  }, signal, DRAFT_TIMEOUT_MS) as { draftId?: unknown; stages?: unknown }
  if (typeof draft.draftId !== 'string' || draft.draftId === '') {
    throw new Error('build_flow: gateway draft POST returned no draftId')
  }
  return jsonClean({
    card: 'draft',
    draftId: draft.draftId,
    model: flowId,
    title: flowId,
    stages: Array.isArray(draft.stages) ? draft.stages : [],
  })
}

// ── SINGLE-STEP (the old shape, live allowlist) ─────────────────────

async function composeSingle(
  gatewayUrl: string,
  a: { model?: unknown; prompt?: unknown; params?: Record<string, unknown> },
  signal: AbortSignal,
): Promise<Record<string, unknown>> {
  if (typeof a.model !== 'string' || a.model.length === 0) {
    throw new Error('build_flow: "model" is required (a catalog model id string)')
  }
  if (typeof a.prompt !== 'string' || a.prompt.length === 0) {
    throw new Error('build_flow: "prompt" is required (what to put on the card)')
  }
  // THE LIVE ALLOWLIST — /v1/card-tools is the composability SSOT:
  // a model without a card tool cannot compose, and the LIVE list is
  // the gate (the hardcoded 6-model list was stale the day it shipped
  // — it hid live card tools). The manifest this fetch returns also
  // carries stage_title + params_schema defaults below.
  const tools = await gatewayRequest(gatewayUrl, 'GET', '/v1/card-tools', undefined, signal, CATALOG_TIMEOUT_MS) as Array<Record<string, unknown>>
  const manifest = Array.isArray(tools)
    ? tools.find((t) => t.model === a.model)
    : undefined
  if (manifest === undefined) {
    const allowed = (Array.isArray(tools) ? tools : [])
      .map((t) => String(t.model)).filter((s) => s !== '').join(', ')
    throw new Error(
      'build_flow: model "' + a.model + '" has no card tool. Live card tools: ' + allowed,
    )
  }
  // Catalog read: the model's default params + its family label —
  // enrichment AFTER the gate (a card-tools model missing from the
  // catalog degrades to manifest-only defaults; the card still
  // composes — the manifest is the card's own declaration).
  const cat = await gatewayRequest(gatewayUrl, 'GET', '/v1/model-catalog', undefined, signal, CATALOG_TIMEOUT_MS) as CatalogShape
  const entry = (cat.models ?? {})[a.model]
  // title precedence (the operator-reported regression): manifest
  // stage_title > family label > model id — Manifest > catalog, always.
  const familyId = (entry !== undefined && typeof entry.family === 'string')
    ? entry.family : a.model
  const famLabel = cat.families?.[familyId]?.label
  let title = (typeof famLabel === 'string' && famLabel.length > 0)
    ? famLabel : a.model
  const cardDefaults: Record<string, unknown> = {}
  {
    const props = (manifest.params_schema !== null && typeof manifest.params_schema === 'object'
      && (manifest.params_schema as { properties?: Record<string, { default?: unknown }> }).properties) ?? {}
    for (const [k, spec] of Object.entries(props)) {
      if (spec.default !== undefined) cardDefaults[k] = spec.default
    }
    if (typeof manifest.stage_title === 'string' && manifest.stage_title.length > 0) {
      title = manifest.stage_title
    }
  }
  // RUNNABILITY GATE — ask the server's own resolver if this model
  // can actually produce a flow at Run time. If not, refuse.
  // This is a read-only check — no run registered, no GPU claimed.
  try {
    const v = await gatewayRequest(gatewayUrl, 'GET',
      '/v1/card-tools/validate?model=' + encodeURIComponent(a.model),
      undefined, signal, 10_000) as { runnable?: boolean; error?: string }
    if (v.runnable !== true) {
      throw new Error('build_flow: ' + (v.error || 'model "' + a.model + '" cannot run'))
    }
  } catch (e: unknown) {
    // If the endpoint doesn't exist (old gateway), allow through —
    // the old gateway doesn't have the validate gate.
    if (e instanceof Error && /cannot run/.test(e.message)) throw e
  }
  const defaults = (entry !== undefined && entry.defaults !== null
    && typeof entry.defaults === 'object' && !Array.isArray(entry.defaults))
    ? entry.defaults as Record<string, unknown>
    : {}
  const bag = (a.params !== null && typeof a.params === 'object' && !Array.isArray(a.params)) ? a.params : {}
  // Card params: card manifest defaults < model defaults < explicit
  // params < the prompt arg (most specific wins).
  const params: Record<string, unknown> = { ...cardDefaults, ...defaults, ...bag, prompt: a.prompt }
  // Intent: the SHORT headline (the embed's card name) — the full prompt
  // lives in params.prompt; a novel-length prompt as intent is noise.
  const intent = a.prompt.length > 80 ? a.prompt.slice(0, 77) + '…' : a.prompt
  // THE DRAFT — the old wire: POST /v1/flows/drafts. Cards, not runs.
  const draft = await gatewayRequest(gatewayUrl, 'POST', '/v1/flows/drafts', {
    intent,
    stages: [{
      title,
      kind: 'generation',
      service: a.model,
      params,
    }],
  }, signal, DRAFT_TIMEOUT_MS) as { draftId?: unknown; stages?: unknown }
  if (typeof draft.draftId !== 'string' || draft.draftId === '') {
    throw new Error('build_flow: gateway draft POST returned no draftId')
  }
  return jsonClean({
    card: 'draft',
    draftId: draft.draftId,
    model: a.model,
    title,
    stages: Array.isArray(draft.stages) ? draft.stages : [],
  })
}
