/**
 * melite_skill_read - progressive disclosure TIER 2: one skill's full body,
 * loaded ONLY when needed (GET /v1/skills/<id>). Every read is ledgered
 * gateway-side (skill.read in _ledger.jsonl), so which recipes the
 * agent actually used is auditable after the fact.
 *
 * Ids come from melite_skill_index: global lane docs are bare stems
 * ("run-recovery"), model card docs are "model:<id>", and per-model
 * skills are "model:<id>:<stem>".
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { EstateRequest } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const READ_TIMEOUT_MS = 15_000

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). id/content ride every
 *  shape; the scoped echoes (genre/model) widen the tail. */
type SkillReadResult = {
  id: string;
  content: string;
  name?: string;
  description?: string;
  genre?: JsonValue;
  model?: JsonValue;
  error?: string;
} & Record<string, JsonValue>;

export function skillRead(request: EstateRequest): ToolDefinition {
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
    const a = (typeof args === "object" && args !== null ? args : {}) as { id?: unknown };
    return {
      card: 'generic',
      title: `Read skill ${String(a.id ?? '?')}`,
      kind: 'read',
      rawInput: String(a.id ?? '?'),
    };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'melite_skill_read',
    description:
      'Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its '
      + 'name/description and genre/model when scoped. Discover ids first with melite_skill_index. '
      + 'Reads are recorded in the gateway ledger (skill.read) - the audit trail of which '
      + 'recipes informed a generation. Args: id (from melite_skill_index).',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      id: {
        type: 'string',
        description: 'Skill id from melite_skill_index: "<stem>", "model:<id>" or "model:<id>:<stem>".',
        required: true,
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          id: { type: 'string', required: true },
          name: { type: 'string', description: 'Skill title from frontmatter.' },
          description: { type: 'string', description: 'One-line summary.' },
          content: { type: 'string', description: 'The full markdown body.', required: true },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (args, value) => {
        const a = (typeof args === "object" && args !== null ? args : {}) as { id?: string }
        const v = value as { id?: string; name?: string; content?: string; error?: string }
        if (v && typeof v.error === 'string' && v.error !== '') {
          return [{ type: 'text', text: 'melite_skill_read REFUSED: ' + v.error }]
        }
        // THE BODY RIDES (the render IS the model-facing tool response
        // — see melite-discover's render note): tier 2's whole purpose
        // is "load ONE skill document in full" so the agent writes
        // prompts from the craft it READS. A title-only line leaves
        // the agent having read nothing.
        const head = 'melite_skill_read ' + String(a.id ?? v.id ?? '?') + ': ' + String(v.name ?? 'loaded')
        const body = typeof v.content === 'string' ? v.content : ''
        return [{ type: 'text', text: body !== '' ? head + '\n' + body : head + '\n(no body)' }]
      },
    },
    async execute(args, exec): Promise<SkillReadResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object and id a required string here, so honest casts
      // ride instead of gate-dead typeof fallbacks (2026-09-12).
      const a = args as { id?: unknown }
      const id = a.id as string
      if (id.length === 0) {
        throw new Error('melite_skill_read: "id" is required (a skill id string from melite_skill_index)')
      }
      // Unknown ids arrive as RayGatewayError with the gateway's 404 body
      // VERBATIM - let it propagate; that IS the honest answer.
      const res = await request( 'GET', '/v1/skills/' + encodeURIComponent(id),
        undefined, exec.signal, READ_TIMEOUT_MS,
      ) as Record<string, unknown>
      return jsonClean({
        id: res.id ?? id,
        name: res.name ?? null,
        description: res.description ?? null,
        genre: res.genre ?? null,
        model: res.model ?? null,
        content: res.content ?? '',
      }) as SkillReadResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
