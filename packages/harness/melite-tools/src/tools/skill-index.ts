/**
 * skill_index - progressive disclosure TIER 1: the cheap skill index.
 *
 * The gateway (GET /v1/skills) walks the catalog models' agents/ trees
 * (AGENT.md + agents/skills/*.md) plus the global skills/ lane docs and
 * returns one row per skill: id, name, one-line description, genre and
 * owning model when scoped. This is the SCAN; the BODY comes only via
 * skill_read on demand - that pairing is the whole point of progressive
 * disclosure: the agent never pays for docs it does not open.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { EstateRequest } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const INDEX_TIMEOUT_MS = 15_000

interface SkillRow {
  id?: unknown
  name?: unknown
  description?: unknown
  genre?: unknown
  model?: unknown
}

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). */
type SkillIndexResult = {
  count: number;
  skills: Record<string, JsonValue>[];
  error?: string;
} & Record<string, JsonValue>;

export function skillIndex(request: EstateRequest): ToolDefinition {
  // PRESENTATION ADAPTATION (tool-presentation wall + conversion
  // invariance — presentCall output must not change): defineTool
  // soft-gates presentCall behind arg validation (invalid → undefined),
  // but the raw face always returned the tool's own generic card, and
  // the wall pins that (junk/invalid args during streaming + replay
  // still render the generic view, never throw). The presenter is
  // shared: it rides the definition AND is re-attached over the gate
  // below. execute validation (ToolArgsError/INVALID_ARGS) is
  // unaffected.
  const presentCall: () => ToolCallView = () => {
    return { card: 'generic', title: 'Skill index', kind: 'search' };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'skill_index',
    description:
      'List gateway skills (progressive disclosure tier 1): id + name + one-line description per skill, '
      + 'with genre/model when the skill is model-scoped. Cheap scan. Then load ONLY the skill you need '
      + 'with skill_read. Use before generating with an unfamiliar model, when the user asks what this '
      + 'stack can do, or to find the lane recipe for a genre (image/audio/video/3D/text). '
      + 'No arguments.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // — no arguments, so the map is empty.
    parameters: {},
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          count: { type: 'number', description: 'Skills found.', required: true },
          skills: {
            type: 'array',
            description: 'Index rows: id/name/description (+genre/model when scoped).',
            required: true,
          },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (_args, value) => {
        const v = value as { count?: number }
        return [{
          type: 'text',
          text: 'skill_index: ' + String(v.count ?? 0) + ' skills (load one with skill_read)',
        }]
      },
    },
    async execute(_args, exec): Promise<SkillIndexResult> {
      const res = await request( 'GET', '/v1/skills', undefined, exec.signal, INDEX_TIMEOUT_MS,
      ) as { skills?: SkillRow[] }
      const rows = Array.isArray(res.skills) ? res.skills : []
      return jsonClean({ count: rows.length, skills: rows }) as SkillIndexResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
