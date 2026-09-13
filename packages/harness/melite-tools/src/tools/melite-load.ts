// melite_load — Melite load (the rework, 2026-09-09): open ONE
// card or flow discovered via melite_discover. Returns the bundle:
// agents md + tool-call signature + tier-1 skill lines (+ model
// hints on cards — the boarded families' DECL identity, data FOR
// the card; prompt craft is the agent's own via skill_read, and
// LLM-powered enhance is the user's ✦ door, never this bundle).
// Bodies stay behind skill_read; quote the bundle digest you hold
// and skip reload on a match. Thin door wrapper (estateRequest).
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { EstateRequest } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 20_000

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). name/inference_type ride
 *  every shape (the refusal echoes the args); bundle is
 *  success-only. */
type LoadResult = {
  name: string;
  inference_type: string;
  bundle?: Record<string, JsonValue>;
  error?: string;
} & Record<string, JsonValue>;

export function meliteLoad(
  request: EstateRequest,
  opts: { headless?: boolean } = {},
): ToolDefinition {
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
    const a = (args ?? {}) as { name?: unknown; inference_type?: unknown };
    const nm = typeof a.name === 'string' && a.name !== '' ? a.name : '?';
    return { card: 'generic', title: `Load ${nm}`, kind: 'search' };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'melite_load',
    description:
      'Open ONE card or flow (discover it first with melite_discover). Args: name (the card id or flow name) + '
      + 'inference_type (card | flow — a card or a flow tool call; nothing else executes). Returns the bundle: '
      + 'agents md, the tool-call signature (params_schema for cards; the prebuilt simplified signature for flows), '
      + 'tier-1 skill lines for the underlying skills (bodies load via skill_read — write the prompts yourself from '
      + 'the craft you read), model hints on cards (the boarded families\' DECL identity — id/label/description), '
      + 'and a stable bundle digest — quote it and skip reload on a match.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      name: {
        type: 'string',
        description: 'The card id or flow name exactly as discovered.',
        required: true,
      },
      inference_type: {
        type: 'string',
        description: 'card | flow.',
        required: true,
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          bundle: {
            type: 'object',
            additionalProperties: true,
            description: 'The opened bundle (name/kind/signature/agents/skills + stages/refs on flows, model_hints on cards, digest). Absent on refusal.',
          },
          // Ledger row 11 (2026-09-10): required = fields every return
          // shape carries (the refusal echoes the args); bundle is
          // success-only and stays optional.
          name: { type: 'string', description: 'Echo of the requested card id or flow name.', required: true },
          inference_type: { type: 'string', description: 'Echo of the requested inference_type.', required: true },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (_args, value) => {
        const v = value as {
          bundle?: {
            name?: unknown; kind?: unknown; digest?: unknown
            signature?: {
              name?: unknown; model?: unknown; card?: unknown
              params_schema?: { properties?: Record<string, unknown>; required?: unknown }
            } | null
            agents?: Array<{ path?: unknown; text?: unknown }>
            skills?: Array<Record<string, unknown>>
            model_hints?: Array<{ id?: unknown; label?: unknown }>
            stages?: Array<Record<string, unknown>>
          }
          error?: string
        }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_load REFUSED: ' + v.error }]
        // THE BUNDLE RIDES (the render IS the model-facing tool response
        // — see melite-discover's render note): the follow-up call needs
        // the params keys (melite_flow's params) and the model ids (its
        // model arg) — counts alone leave the agent unable to compose
        // anything. Agents md rides verbatim (the estate already caps
        // it: 8 files / 32KB); the digest rides so a reload can be
        // skipped by quoting it.
        const b = v?.bundle ?? {}
        const str = (x: unknown): string => typeof x === 'string' ? x : ''
        // THE INTERFACE LAW (2026-09-13, the operator's agent-mode
        // breakdown + the follow-up correction): the NEXT-STEP hint
        // names a door THIS agent actually has. The browser interface
        // registers no melite_flow (compose-only), so pointing the
        // model at melite_flow there sends it hunting a phantom verb
        // until it breaks down. But compose-only is NOT a hand-off —
        // the browser agent is the live co-editor of the flow state
        // in the user's cards tab (right sidebar): it composes the
        // flow and keeps editing it as asked; runs start at the
        // user's Run press. Headless keeps the old line — it owns
        // the verb.
        const next = opts.headless === true
          ? 'open with melite_flow'
          : 'compose it with melite_construct (add_stage) — the flow state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press'
        const out: string[] = [`loaded ${str(b.kind) || '?'} ${str(b.name) || '?'} — ${next}`]
        const hints = Array.isArray(b.model_hints) ? b.model_hints : []
        if (hints.length > 0) {
          out.push('models: ' + hints.map((h) => `${str(h?.id)}${str(h?.label) !== '' ? ' (' + str(h?.label) + ')' : ''}`).join(', '))
        }
        const sig = b.signature
        if (sig !== null && sig !== undefined) {
          const props = sig.params_schema?.properties
          const keys = props !== undefined && props !== null ? Object.keys(props) : []
          const req = Array.isArray(sig.params_schema?.required)
            ? sig.params_schema.required.filter((r): r is string => typeof r === 'string') : []
          if (keys.length > 0) {
            const marked = keys.map((k) => req.includes(k) ? k + '*' : k)
            out.push('params: ' + marked.join(', ') + ' (* required)')
          }
          const model = str(sig.model)
          if (model !== '') out.push('signature model: ' + model)
        }
        const stages = Array.isArray(b.stages) ? b.stages : []
        if (stages.length > 0) {
          out.push('stages: ' + stages.map((s) => `${str(s?.id)}:${str(s?.card)}`).join(' → '))
        }
        const skills = Array.isArray(b.skills) ? b.skills : []
        if (skills.length > 0) {
          const names = skills.slice(0, 8).map((s) => str(s?.id) !== '' ? str(s?.id) : str(s?.ref))
          // THE ROUTING LAW (2026-09-13, image-flow session): a bare id
          // list points the model at the WRONG door — the harness's own
          // core `skill` tool (session catalog) refused
          // `invalid skill name "card:image-gen:image-craft"` while the
          // melite plane served the very id 200. Every list-yielding
          // render names the tool that opens one entry; these ids open
          // with skill_read, never the core skill tool.
          out.push(`skills: ${skills.length} — read one with skill_read: ${names.join(', ')}${skills.length > 8 ? ' …' : ''}`)
        }
        const digest = str(b.digest)
        if (digest !== '') out.push('digest: ' + digest + ' (quote it to skip a reload)')
        const docs = Array.isArray(b.agents) ? b.agents : []
        if (docs.length > 0) {
          out.push('agents md:')
          for (const d of docs) out.push(str(d?.text))
        }
        return [{ type: 'text', text: out.join('\n') }]
      },
    },
    async execute(args, exec): Promise<LoadResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover;
      // name/inference_type are required strings in parameters, so the
      // wrapper gate guarantees strings at the body and honest casts
      // ride instead of gate-dead typeof fallbacks (2026-09-12).
      const a = args as { name?: unknown; inference_type?: unknown }
      const name = a.name as string;
      const inferenceType = a.inference_type as string;
      if (!name) return jsonClean<LoadResult>({ error: 'name is required (discover it first)', name, inference_type: inferenceType });
      if (inferenceType !== 'card' && inferenceType !== 'flow') {
        return jsonClean<LoadResult>({ error: 'inference_type must be card|flow — a card or a flow tool call; nothing else executes', name, inference_type: inferenceType });
      }
      const params = new URLSearchParams({ name, inference_type: inferenceType });
      try {
        const res = await request( 'GET', '/v1/load?' + params.toString(),
          undefined, exec.signal, TIMEOUT_MS,
        );
        // THE ECHO LAW (agent-trace audit, 2026-09-13): the output
        // schema marks name/inference_type required on EVERY shape
        // (ledger row 11) and dsh-tools' registry validates the value
        // against it at the tool-service layer — the seat's success
        // answer is {bundle} alone, so a verbatim return was
        // schema-INVALID in every real agent mount ("missing required
        // property value.name"; the wall drove execute() directly and
        // bypassed that validation — blind spot closed there too).
        // Spread the seat answer, echo the args over it.
        const body = (res ?? {}) as Record<string, unknown>
        return jsonClean({ ...body, name, inference_type: inferenceType }) as LoadResult;
      } catch (e) {
        const err = e as { body?: unknown; message?: string };
        return jsonClean<LoadResult>({ error: typeof err.body === 'string' && err.body !== '' ? err.body : (err.message ?? 'load failed'), name, inference_type: inferenceType });
      }
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
