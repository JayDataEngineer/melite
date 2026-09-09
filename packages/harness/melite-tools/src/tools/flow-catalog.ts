/**
 * flow_catalog - the disclosure system, PREFERRED tier: search the
 * named multi-stage flows FIRST.
 *
 * The gateway (GET /v1/flows/catalog?action=search) returns one
 * summary per flow (name + title + one-line description + stage
 * count + skill refs) - the routing layer, never bodies. A flow is
 * a named pipeline of card stages (generate-then-upscale,
 * speak-with-voice); when one fits the task, drive it with flow_run
 * and NEVER decompose to cards by hand. Cards (card_catalog) are the
 * FALLBACK - only when no flow fits.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'

const CATALOG_TIMEOUT_MS = 15_000

interface FlowRow {
  name?: unknown
  title?: unknown
  description?: unknown
  stages?: unknown
  skillRefs?: unknown
}

export function flowCatalog(gatewayUrl: string): ToolDefinition {
  return {
    name: 'flow_catalog',
    description:
      'Search the named multi-stage flows (the PREFERRED composition): name + title + one-line description '
      + 'per flow. ALWAYS search flows FIRST for a multi-step task (image and upscale, speak this with that '
      + 'voice); when a flow fits, drive it with flow_run. Only when NO flow fits, fall back to card_catalog '
      + 'and compose cards directly. Takes an optional search phrase (empty = list all).',
    parameters: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search phrase over flow name/title/description (e.g. "image upscale"). Empty = list all.',
        },
      },
      required: [],
    },
    presentCall(args) {
      const q = (args as { q?: unknown } | null | undefined)?.q;
      const s = typeof q === 'string' && q !== '' ? ': ' + q : '';
      return { card: 'generic', title: 'Flow catalog' + s, kind: 'search' };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          count: { type: 'number', description: 'Flows found.' },
          flows: {
            type: 'array',
            description: 'Flow summaries: name/title/description/stages/skillRefs.',
          },
        },
        required: ['count', 'flows'],
      },
      render: (_args, value) => {
        const v = value as { count?: number }
        return [{
          type: 'text',
          text: 'flow_catalog: ' + String(v.count ?? 0) + ' flows (drive one with flow_run, or fall back to card_catalog)',
        }]
      },
    },
    async execute(args, exec) {
      const q = typeof (args as { q?: unknown }).q === 'string' ? (args as { q: string }).q : ''
      const res = await gatewayRequest(
        gatewayUrl, 'GET', '/v1/flows/catalog?action=search&q=' + encodeURIComponent(q),
        undefined, exec.signal, CATALOG_TIMEOUT_MS,
      ) as { flows?: FlowRow[] }
      const rows = Array.isArray(res.flows) ? res.flows : []
      return { count: rows.length, flows: rows }
    },
  }
}
