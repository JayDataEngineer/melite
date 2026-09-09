// melite_discover — Melite discover (the rework, 2026-09-09):
// ONE disclosure system over both planes. Grants the progressive
// disclosure LINES (clamped summary rows — the tier the agent
// routes on). Thin door wrapper (gatewayRequest) — the SHAPE lives
// in doors/disclose.ts; this file is the DSH ToolDefinition face
// (input schema, presentCall, output schema/render, execute).
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

/** Flow summary line (the discover tier — routes, never bodies). */
export interface DiscoverFlowLine {
  name: string
  title: string
  description: string
  stages: number
  skillRefs: string[]
}

/** Card summary line (tags are card-declared retrieval metadata). */
export interface DiscoverCardLine {
  id: string
  label: string
  description: string
  tags: string[]
}

export function meliteDiscover(gatewayUrl: string): ToolDefinition {
  return {
    name: 'melite_discover',
    description:
      'Progressive disclosure tier 1 over the estate (cards + flows): returns clamped summary LINES, never bodies. '
      + 'Args: lookup (all | cards | flows, default all) + tags (comma-separated card-declared tags, e.g. "image,upscale") '
      + '+ optional q (free-text filter). Prefer a FLOW when one fits the task — composition over single calls; '
      + 'fall back to cards. Open a line with melite_load (agents md + signature + skill lines).',
    parameters: {
      type: 'object',
      properties: {
        lookup: {
          type: 'string',
          description: 'Which plane to list: all (default) | cards | flows.',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated card-declared tags (image,upscale,generate,enhance,...). Empty means unfiltered.',
        },
        q: {
          type: 'string',
          description: 'Optional free-text filter over names/titles/descriptions/ids.',
        },
      },
    },
    presentCall(args) {
      const a = (args ?? {}) as { lookup?: unknown; tags?: unknown; q?: unknown };
      const bits: string[] = [];
      if (typeof a.lookup === 'string' && a.lookup !== '') bits.push(a.lookup);
      if (typeof a.tags === 'string' && a.tags !== '') bits.push(a.tags);
      if (typeof a.q === 'string' && a.q !== '') bits.push(a.q);
      return { card: 'generic', title: 'Discover' + (bits.length > 0 ? ': ' + bits.join(' · ') : ''), kind: 'search' };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          flows: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Flow lines (name/title/description/stages/skillRefs) — present unless lookup=cards.',
          },
          cards: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Card lines (id/label/description/tags) — present unless lookup=flows.',
          },
        },
      },
      render: (_args, value) => {
        const v = value as { flows?: unknown[]; cards?: unknown[]; error?: string }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_discover REFUSED: ' + v.error }]
        const nf = Array.isArray(v?.flows) ? v.flows.length : 0
        const nc = Array.isArray(v?.cards) ? v.cards.length : 0
        return [{ type: 'text', text: `discover: ${nf} flows, ${nc} cards — open one with melite_load` }]
      },
    },
    async execute(args, exec) {
      const a = (args ?? {}) as { lookup?: unknown; tags?: unknown; q?: unknown }
      const params = new URLSearchParams();
      const lookup = typeof a.lookup === 'string' && a.lookup !== '' ? a.lookup : 'all';
      params.set('lookup', lookup);
      if (typeof a.q === 'string' && a.q !== '') params.set('q', a.q);
      if (typeof a.tags === 'string' && a.tags !== '') params.set('tags', a.tags);
      try {
        const res = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/discover?' + params.toString(),
          undefined, exec.signal, TIMEOUT_MS,
        );
        return jsonClean(res);
      } catch (e) {
        const err = e as { body?: unknown; message?: string };
        return jsonClean({ error: typeof err.body === 'string' && err.body !== '' ? err.body : (err.message ?? 'discover failed') });
      }
    },
  }
}
