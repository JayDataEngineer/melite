/**
 * skill_read - progressive disclosure TIER 2: one skill's full body,
 * loaded ONLY when needed (GET /v1/skills/<id>). Every read is ledgered
 * gateway-side (skill.read in _ledger.jsonl), so which recipes the
 * agent actually used is auditable after the fact.
 *
 * Ids come from skill_index: global lane docs are bare stems
 * ("run-recovery"), model card docs are "model:<id>", and per-model
 * skills are "model:<id>:<stem>".
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'

const READ_TIMEOUT_MS = 15_000

export function skillRead(gatewayUrl: string): ToolDefinition {
  return {
    name: 'skill_read',
    description:
      'Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its '
      + 'name/description and genre/model when scoped. Discover ids first with skill_index. '
      + 'Reads are recorded in the gateway ledger (skill.read) - the audit trail of which '
      + 'recipes informed a generation. Args: id (from skill_index).',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Skill id from skill_index: "<stem>", "model:<id>" or "model:<id>:<stem>".',
        },
      },
      required: ['id'],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { id?: unknown };
      return {
        card: 'generic',
        title: `Read skill ${String(a.id ?? '?')}`,
        kind: 'read',
        rawInput: String(a.id ?? '?'),
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          id: { type: 'string' },
          name: { type: 'string', description: 'Skill title from frontmatter.' },
          description: { type: 'string', description: 'One-line summary.' },
          content: { type: 'string', description: 'The full markdown body.' },
        },
        required: ['id', 'content'],
      },
      render: (args, value) => {
        const a = (typeof args === "object" && args !== null ? args : {}) as { id?: string }
        const v = value as { id?: string; name?: string }
        return [{
          type: 'text',
          text: 'skill_read ' + String(a.id ?? v.id ?? '?') + ': ' + String(v.name ?? 'loaded'),
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { id?: unknown }
      if (typeof a.id !== 'string' || a.id.length === 0) {
        throw new Error('skill_read: "id" is required (a skill id string from skill_index)')
      }
      // Unknown ids arrive as RayGatewayError with the gateway's 404 body
      // VERBATIM - let it propagate; that IS the honest answer.
      const res = await gatewayRequest(
        gatewayUrl, 'GET', '/v1/skills/' + encodeURIComponent(a.id),
        undefined, exec.signal, READ_TIMEOUT_MS,
      ) as Record<string, unknown>
      return {
        id: res.id ?? a.id,
        name: res.name ?? null,
        description: res.description ?? null,
        genre: res.genre ?? null,
        model: res.model ?? null,
        content: res.content ?? '',
      }
    },
  }
}
