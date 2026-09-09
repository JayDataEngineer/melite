/**
 * card_catalog - the disclosure system, FALLBACK tier: search cards
 * by their declared tags, then load the skill bundle for the match.
 *
 * Two verbs, ONE tool (search returns summaries, load returns
 * bodies - the catalog law):
 *
 *   search: the gateway (GET /v1/cards/catalog?action=search) matches
 *   the phrase against card id/label/description/TAGS and returns one
 *   summary per card (id + label + one-line description + genre +
 *   tags). Cards DECLARE their tags (modality + operation words) -
 *   search those ({image, upscale}), not prose. Use ONLY when no flow
 *   fits (flow_catalog first, always).
 *
 *   load_skills: the gateway (?action=load_skills&ids=a,b) returns the
 *   bundle per card - (a) the card's tool signature (the /v1/tools
 *   row: name + params_schema), (b) the action card's skills (its
 *   agents/ docs), (c) the model-level hints (its boarded families'
 *   identity + prompt guidance - the enhance knowledge rides HERE,
 *   ambient, never a tool call). Models are data FOR the card, never
 *   addressed directly: there is no model picker, only bundles.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'

const CATALOG_TIMEOUT_MS = 15_000

export function cardCatalog(gatewayUrl: string): ToolDefinition {
  return {
    name: 'card_catalog',
    description:
      'Search cards by their declared tags + load the skill bundle (the FALLBACK composition - flow_catalog '
      + 'first, always; cards only when NO flow fits). search: phrase over id/label/description/tags plus an '
      + 'optional comma-separated tags filter - returns clamped summaries, never bodies. load_skills: exact '
      + 'card ids (comma-separated) - returns per card (a) the tool signature (params_schema), (b) the action '
      + 'card skills, (c) the model-level hints (prompt guidance rides here, ambient) plus a stable bundle digest. '
      + 'Quote the digests you hold and skip reload on a match (the bundle is content-stable). Models are data for '
      + 'the card - there is no model picker, only bundles.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'search (summaries) or load_skills (the bundle for exact ids).',
          enum: ['search', 'load_skills'],
        },
        q: {
          type: 'string',
          description: 'search: phrase over id/label/description/tags (e.g. "image upscale").',
        },
        tags: {
          type: 'string',
          description: 'search: comma-separated tag filter - every tag must be declared by the card (e.g. "image,upscale").',
        },
        ids: {
          type: 'string',
          description: 'load_skills: comma-separated exact card ids (e.g. "image-gen,upscale-tools").',
        },
      },
      required: ['action'],
    },
    presentCall(args) {
      const a = (args ?? {}) as { action?: unknown; q?: unknown; tags?: unknown; ids?: unknown };
      const s = a.action === 'load_skills' && typeof a.ids === 'string' && a.ids !== ''
        ? ': ' + a.ids
        : (typeof a.q === 'string' && a.q !== '' ? ': ' + a.q
          : (typeof a.tags === 'string' && a.tags !== '' ? ': ' + a.tags : ''));
      return { card: 'generic', title: 'Card catalog' + s, kind: 'search' };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          count: { type: 'number', description: 'Cards (search) or bundles (load_skills) found.' },
          cards: {
            type: 'array',
            description: 'search: card summaries (id/label/description/genre/tags).',
          },
          bundles: {
            type: 'array',
            description: 'load_skills: per-card bundles (id/tool/skills/model_hints).',
          },
        },
        required: ['count'],
      },
      render: (_args, value) => {
        const v = value as { count?: number }
        return [{
          type: 'text',
          text: 'card_catalog: ' + String(v.count ?? 0) + ' results (load_skills the exact ids you will drive)',
        }]
      },
    },
    async execute(args, exec) {
      const a = args as { action?: unknown; q?: unknown; tags?: unknown; ids?: unknown }
      if (a.action === 'load_skills') {
        const ids = typeof a.ids === 'string' ? a.ids : ''
        const res = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/cards/catalog?action=load_skills&ids=' + encodeURIComponent(ids),
          undefined, exec.signal, CATALOG_TIMEOUT_MS,
        ) as { bundles?: unknown[] }
        const rows = Array.isArray(res.bundles) ? res.bundles : []
        return { count: rows.length, bundles: rows }
      }
      const q = typeof a.q === 'string' ? a.q : ''
      const tags = typeof a.tags === 'string' ? a.tags : ''
      const res = await gatewayRequest(
        gatewayUrl, 'GET', '/v1/cards/catalog?action=search&q=' + encodeURIComponent(q) + '&tags=' + encodeURIComponent(tags),
        undefined, exec.signal, CATALOG_TIMEOUT_MS,
      ) as { cards?: unknown[] }
      const rows = Array.isArray(res.cards) ? res.cards : []
      return { count: rows.length, cards: rows }
    },
  }
}
