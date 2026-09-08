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
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'

const INDEX_TIMEOUT_MS = 15_000

interface SkillRow {
  id?: unknown
  name?: unknown
  description?: unknown
  genre?: unknown
  model?: unknown
}

export function skillIndex(gatewayUrl: string): ToolDefinition {
  return {
    name: 'skill_index',
    description:
      'List gateway skills (progressive disclosure tier 1): id + name + one-line description per skill, '
      + 'with genre/model when the skill is model-scoped. Cheap scan. Then load ONLY the skill you need '
      + 'with skill_read. Use before generating with an unfamiliar model, when the user asks what this '
      + 'stack can do, or to find the lane recipe for a genre (image/audio/video/3D/text). '
      + 'No arguments.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    presentCall() {
      return { card: 'generic', title: 'Skill index', kind: 'search' };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          count: { type: 'number', description: 'Skills found.' },
          skills: {
            type: 'array',
            description: 'Index rows: id/name/description (+genre/model when scoped).',
          },
        },
        required: ['count', 'skills'],
      },
      render: (_args, value) => {
        const v = value as { count?: number }
        return [{
          type: 'text',
          text: 'skill_index: ' + String(v.count ?? 0) + ' skills (load one with skill_read)',
        }]
      },
    },
    async execute(_args, exec) {
      const res = await gatewayRequest(
        gatewayUrl, 'GET', '/v1/skills', undefined, exec.signal, INDEX_TIMEOUT_MS,
      ) as { skills?: SkillRow[] }
      const rows = Array.isArray(res.skills) ? res.skills : []
      return { count: rows.length, skills: rows }
    },
  }
}
