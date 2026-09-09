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
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
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

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). count/lanes ride every
 *  shape (the refusal carries the empty table); error is
 *  refusal-only. */
type PeekResult = {
  count: number;
  lanes: Record<string, JsonValue>[];
  error?: string;
} & Record<string, JsonValue>;

export function laneBundlePeek(gatewayUrl: string): ToolDefinition {
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
    const a = (typeof args === "object" && args !== null ? args : {}) as { kind?: unknown; genre?: unknown };
    return {
      card: 'generic',
      title: `Peek ${String(a.kind ?? '?')} bundles`,
      kind: 'read',
      rawInput: String(a.genre ?? a.kind ?? '?'),
    };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
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
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper) — both filters are optional.
    parameters: {
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
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          count: { type: 'number', description: 'Lanes matching the filters.', required: true },
          lanes: {
            type: 'array',
            description: 'Preview rows: {kind, lane, genre, title, description, params?, steps?, skills?}.',
            required: true,
          },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
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
    async execute(args, exec): Promise<PeekResult> {
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
        return jsonClean<PeekResult>({ count: 0, lanes: [], error: res.error })
      }
      const lanes = Array.isArray(res.lanes) ? res.lanes : []
      return jsonClean({ count: lanes.length, lanes }) as PeekResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
