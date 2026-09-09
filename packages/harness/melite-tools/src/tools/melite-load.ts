// melite_load — Melite load (the rework, 2026-09-09): open ONE
// card or flow discovered via melite_discover. Returns the bundle:
// agents md + tool-call signature + tier-1 skill lines (+ model
// hints on cards — the boarded families' DECL identity, data FOR
// the card; prompt craft is the agent's own via skill_read, and
// LLM-powered enhance is the user's ✦ door, never this bundle).
// Bodies stay behind skill_read; quote the bundle digest you hold
// and skip reload on a match. Thin door wrapper (gatewayRequest).
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
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

export function meliteLoad(gatewayUrl: string): ToolDefinition {
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
        const v = value as { bundle?: { name?: string; kind?: string; skills?: unknown[] }; error?: string }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_load REFUSED: ' + v.error }]
        const b = v?.bundle ?? {}
        const n = Array.isArray(b.skills) ? b.skills.length : 0
        return [{ type: 'text', text: `loaded ${String(b.kind ?? '?')} ${String(b.name ?? '?')} — ${n} skill lines` }]
      },
    },
    async execute(args, exec): Promise<LoadResult> {
      const a = (args ?? {}) as { name?: unknown; inference_type?: unknown }
      const name = typeof a.name === 'string' ? a.name : '';
      const inferenceType = typeof a.inference_type === 'string' ? a.inference_type : '';
      if (!name) return jsonClean<LoadResult>({ error: 'name is required (discover it first)', name, inference_type: inferenceType });
      if (inferenceType !== 'card' && inferenceType !== 'flow') {
        return jsonClean<LoadResult>({ error: 'inference_type must be card|flow — a card or a flow tool call; nothing else executes', name, inference_type: inferenceType });
      }
      const params = new URLSearchParams({ name, inference_type: inferenceType });
      try {
        const res = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/load?' + params.toString(),
          undefined, exec.signal, TIMEOUT_MS,
        );
        return jsonClean(res) as LoadResult;
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
