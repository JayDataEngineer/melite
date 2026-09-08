/**
 * lane_bundle_peek — the PEEK tier (progressive disclosure step 1).
 *
 * The agent's discovery move: scan the callable lanes BEFORE loading
 * one. GET {gateway}/v1/lanes → one cheap preview row per lane:
 * kind (action_card | template), lane key, title, one-line
 * description, shape counts (params for cards, steps for templates).
 * NO bodies, NO schemas — the table only.
 *
 * MODELS ARE NOT LANES (operator order, 2026-09-04: the only way to
 * actually do inference is through action cards — the model level
 * must never present as available for inference). The table lists
 * the CALLABLE surface only: cards + flow templates. Model parameter
 * detail is model_catalog's job; model craft docs ride the card
 * bundle (skill_read).
 *
 * The flow this anchors: lane_bundle_peek(kind, genre) → read the
 * rows → lane_bundle_load(kind, name) → agent doc INJECTED inline +
 * the tools/skills index → work.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

interface PeekRow {
  kind?: unknown
  lane?: unknown
  genre?: unknown
  title?: unknown
  description?: unknown
  params?: unknown
  steps?: unknown
  skills?: unknown
}

export function laneBundlePeek(gatewayUrl: string): ToolDefinition {
  return {
    name: 'lane_bundle_peek',
    description:
      'PEEK the callable lanes (discovery scan): one cheap preview row per lane — kind '
      + '(action_card | template), lane key, title, one-line description, shape counts '
      + '(params for cards, steps for templates). Filter by kind and/or genre (video, image, '
      + 'audio, edit, 3d…). The table is the CALLABLE surface ONLY — cards and flow templates; '
      + 'MODELS ARE NOT LANES (they cannot run: only action cards do inference). Model '
      + 'parameter detail: model_catalog(query); model craft docs: skill_read. NO bodies — '
      + 'pick ONE lane, then lane_bundle_load(kind, name) to attach: the lane\'s agent doc '
      + 'arrives INLINE plus its tools and skill index. '
      + 'Examples: peek() = the whole table; peek(kind="template") = every multi-step flow '
      + '(creature-flow, humanoid-flow, sprite-sheet…); peek(genre="video") = every video lane.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['action_card', 'template'],
          description: 'Optional class filter: action_card (card lanes — the ONLY inference surface), template (multi-step flow flows).',
        },
        genre: {
          type: 'string',
          description: 'Optional genre filter (video, image, audio, edit…) — applies to cards and models; templates are not genre-classified.',
        },
      },
      required: [],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { kind?: unknown; genre?: unknown };
      return {
        card: 'generic',
        title: `Peek ${String(a.kind ?? '?')} bundles`,
        kind: 'read',
        rawInput: String(a.genre ?? a.kind ?? '?'),
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          count: { type: 'number', description: 'Lanes matching the filters.' },
          lanes: {
            type: 'array',
            description: 'Preview rows: {kind, lane, genre, title, description, params?, steps?, skills?}.',
          },
        },
        required: ['count', 'lanes'],
      },
      render: (_args, value) => {
        const v = value as { lanes?: PeekRow[] }
        const rows = v.lanes ?? []
        const by = (k: string) => rows.filter((r) => r.kind === k).length
        return [{
          type: 'text',
          text: 'lane_bundle_peek: ' + rows.length + ' callable lanes — cards: ' + by('action_card')
            + ', templates: ' + by('template')
            + ' (load one with lane_bundle_load; models are not lanes)',
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { kind?: unknown; genre?: unknown }
      let path = '/v1/lanes'
      const q: string[] = []
      if (typeof a.kind === 'string' && a.kind.length > 0) q.push('kind=' + encodeURIComponent(a.kind))
      if (typeof a.genre === 'string' && a.genre.length > 0) q.push('genre=' + encodeURIComponent(a.genre))
      if (q.length > 0) path += '?' + q.join('&')
      const res = await gatewayRequest(
        gatewayUrl, 'GET', path, undefined, exec.signal, TIMEOUT_MS,
      ) as { count?: number; lanes?: PeekRow[]; error?: string }
      if (res && typeof res.error === 'string') {
        return jsonClean({ count: 0, lanes: [], error: res.error })
      }
      const lanes = Array.isArray(res.lanes) ? res.lanes : []
      return jsonClean({ count: lanes.length, lanes })
    },
  }
}
