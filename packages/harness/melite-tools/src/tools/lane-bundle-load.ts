/**
 * lane_bundle_load — the LOAD tier (progressive disclosure step 2).
 *
 * Attach ONE lane: GET {gateway}/v1/cards/<name>/bundle?kind=… →
 *   - agent: the lane's PRIMARY AGENT DOC INJECTED INLINE — the card
 *     AGENT.md (compose laws) for cards, a composed orientation
 *     (steps ladder) for templates. Zero extra round-trips:
 *     orientation arrives with the bundle.
 *   - tools: the card manifests with params_schema (the input
 *     contract). tools[0].name is the lane's DEDICATED CARD TOOL.
 *   - flows: the template row (steps) for flow lanes.
 *   - skills: index rows across ALL levels (card, model, base chain,
 *     guide) — bodies on demand via skill_read, guided by read_first.
 *
 * kind is action_card | template — MODELS ARE NOT LANES (operator
 * order, 2026-09-04: only action cards do inference; a model is a
 * card parameter + craft docs). A bare model id resolves server-side
 * to the CARD that boards it; model craft docs ride that card's
 * skills (or skill_read directly).
 *
 * The flow this anchors: lane_bundle_peek → THIS → skill_read for the
 * deep craft → melite_flow (stages drafted on the fly) / the dedicated
 * card tool.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

interface BundleTool {
  name?: unknown
  model?: unknown
  description?: unknown
  params_schema?: unknown
  constraints?: unknown
}

interface BundleSkill {
  id?: unknown
  name?: unknown
  description?: unknown
}

interface BundleFlow {
  id?: unknown
  name?: unknown
  description?: unknown
  steps?: unknown
  step_count?: unknown
}

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). lane/kind/agent ride the
 *  success shape; the refusal echoes lane/kind with the error (the
 *  `as` bridge below — the refusal is a careful subset, never a
 *  schema failure by construction). */
type LoadBundleResult = {
  lane: string;
  kind: string;
  agent: Record<string, JsonValue>;
  tools?: Record<string, JsonValue>[];
  flows?: Record<string, JsonValue>[];
  skills?: Record<string, JsonValue>[];
  read_first?: string[];
  tool_count?: number;
  skill_count?: number;
  error?: string;
} & Record<string, JsonValue>;

export function laneBundleLoad(gatewayUrl: string): ToolDefinition {
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
    const a = (typeof args === "object" && args !== null ? args : {}) as { kind?: unknown; name?: unknown };
    return {
      card: 'generic',
      title: `Load ${String(a.kind ?? '?')} bundle: ${String(a.name ?? '?')}`,
      kind: 'fetch',
      rawInput: { kind: String(a.kind ?? '?'), name: String(a.name ?? '?') },
    };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'lane_bundle_load',
    description:
      'LOAD one lane (attach): the lane\'s primary AGENT DOC arrives INLINE (agent.content — '
      + 'orientation with zero extra calls) plus its tools (card manifests with params_schema — '
      + 'tools[0].name is the lane\'s DEDICATED CARD TOOL), flows (the multi-step template '
      + 'for flow lanes) and the skill index across every level (card, model, base-model chain, '
      + 'guide). Read agent.content + the read_first skills (skill_read loads each body), then '
      + 'call the card tool with params from its params_schema. kind must match what you peeked: '
      + 'action_card (image-gen, h3-timeline…) or template (kimodo-native, trellis2-gate… '
      + '— flows/<name>/flow.py declarations, the live scan). '
      + 'MODELS ARE NOT LANES — only action cards do inference; a model id passed bare resolves '
      + 'to the card that boards it, and its craft docs ride that card\'s skills.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      kind: {
        type: 'string',
        enum: ['action_card', 'template'],
        description: 'The lane class (from lane_bundle_peek rows): action_card | template.',
        required: true,
      },
      name: {
        type: 'string',
        description: 'The lane key from peek (card dir name or template name; a bare model id resolves to the card that boards it).',
        required: true,
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          lane: { type: 'string', description: 'The resolved lane name.', required: true },
          kind: { type: 'string', description: 'The resolved lane class.', required: true },
          agent: {
            type: 'object',
            additionalProperties: true,
            description: 'The injected agent doc: {source, name, content} — content is the full markdown.',
            required: true,
          },
          tools: { type: 'array', description: 'Card manifests with params_schema + constraints.' },
          flows: { type: 'array', description: 'Flow templates (steps ladder) for template lanes.' },
          skills: { type: 'array', description: 'Skill index rows across all levels.' },
          read_first: { type: 'array', description: 'Skill ids in read order (guide first).' },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (args, value) => {
        const a = (typeof args === "object" && args !== null ? args : {}) as { name?: string }
        const v = value as { kind?: string; agent?: { name?: string }; tools?: unknown[]; skills?: unknown[] }
        return [{
          type: 'text',
          text: 'lane_bundle_load ' + String(a.name ?? v.kind ?? '?') + ' (' + String(v.kind ?? '?') + '): '
            + 'agent "' + String(v.agent?.name ?? '?') + '" injected · '
            + (v.tools?.length ?? 0) + ' tool(s) · ' + (v.skills?.length ?? 0) + ' skill(s)'
            + ' — read the skills, then call the card tool',
        }]
      },
    },
    async execute(args, exec): Promise<LoadBundleResult> {
      const a = (typeof args === "object" && args !== null ? args : {}) as { kind?: unknown; name?: unknown }
      const kind = typeof a.kind === 'string' ? a.kind : ''
      const name = typeof a.name === 'string' ? a.name : ''
      const res = await gatewayRequest(
        gatewayUrl, 'GET',
        '/v1/cards/' + encodeURIComponent(name) + '/bundle?kind=' + encodeURIComponent(kind),
        undefined, exec.signal, TIMEOUT_MS,
      ) as {
        lane?: string
        kind?: string
        card?: string | null
        agent?: { source?: string; name?: string; content?: string }
        tools?: BundleTool[]
        flows?: BundleFlow[]
        skills?: BundleSkill[]
        read_first?: string[]
        error?: string
      }
      if (res && typeof res.error === 'string') {
        return jsonClean({ lane: name, kind, error: res.error }) as LoadBundleResult
      }
      // WIRE CONTRACT GATE (2026-09-05 duck-typing audit): this tool
      // DECLARES required ['lane','kind','agent'] in its output
      // schema — the old walk silently emitted `agent: null` on a
      // malformed bundle, violating the declared contract invisibly
      // (the model saw "0 tool(s) · 0 skill(s)" with no reason).
      // A bundle that violates the contract now refuses LOUDLY,
      // naming the missing member — never a silently-hollow success.
      const obj = (res ?? {}) as Record<string, unknown>
      const missing: string[] = []
      for (const key of ['lane', 'kind']) {
        if (typeof obj[key] !== 'string' || obj[key] === '') missing.push(key)
      }
      const agent = obj.agent as { name?: unknown; content?: unknown } | undefined
      if (typeof agent?.content !== 'string' || agent.content === '') {
        missing.push('agent.content')
      }
      if (missing.length > 0) {
        return jsonClean({
          lane: name, kind,
          error: 'bundle for ' + JSON.stringify(name) + ' violates the wire '
            + 'contract (missing ' + missing.join(', ') + ') — the gateway '
            + 'bundle door is the contract; a hollow bundle is a loud '
            + 'refusal, never a silently-empty attach',
        }) as LoadBundleResult
      }
      // every TOOL row carries a string name — a nameless tool row
      // cannot be called and is malformed, not silently passed
      const rawTools = Array.isArray(obj.tools) ? obj.tools : []
      for (const t of rawTools) {
        const nm = (t as BundleTool)?.name
        if (typeof nm !== 'string' || nm === '') {
          return jsonClean({
            lane: name, kind,
            error: 'bundle for ' + JSON.stringify(name) + ' carries a tool '
              + 'row with no name — the manifest is malformed (a nameless '
              + 'tool cannot be called)',
          }) as LoadBundleResult
        }
      }
      const tools = rawTools.map((t) => {
          const row = t as BundleTool
          return {
            name: row.name,
            model: row.model,
            description: row.description,
            params_schema: row.params_schema,
            constraints: row.constraints,
          } })
      const skills = Array.isArray(res.skills)
        ? res.skills.map((s) => ({ id: s.id, name: s.name, description: s.description }))
        : []
      const flows = Array.isArray(res.flows)
        ? res.flows.map((p) => ({
            id: p.id, name: p.name, description: p.description,
            steps: p.steps, step_count: p.step_count,
          }))
        : []
      return jsonClean({
        lane: obj.lane as string,
        kind: obj.kind as string,
        agent,
        tools,
        flows,
        skills,
        read_first: Array.isArray(obj.read_first) ? obj.read_first : [],
        tool_count: tools.length,
        skill_count: skills.length,
      }) as LoadBundleResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
