// melite_discover — Melite discover (the rework, 2026-09-09):
// ONE disclosure system over both planes. Grants the progressive
// disclosure LINES (clamped summary rows — the tier the agent
// routes on). Thin door wrapper (estateRequest) — the SHAPE lives
// in doors/disclose.ts; this file is the DSH ToolDefinition face
// (input schema, presentCall, output schema/render, execute).
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { EstateRequest } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

/** Counts-first clamp: over this many lines the default answer
 * clamps (counts + vocabulary + the first rows ride instead). */
const CLAMP = 12

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

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). */
type DiscoverResult = {
  flows?: Record<string, JsonValue>[];
  cards?: Record<string, JsonValue>[];
  error?: string;
} & Record<string, JsonValue>;

export function meliteDiscover(request: EstateRequest): ToolDefinition {
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
    const a = (args ?? {}) as { lookup?: unknown; tags?: unknown; q?: unknown };
    const bits: string[] = [];
    if (typeof a.lookup === 'string' && a.lookup !== '') bits.push(a.lookup);
    if (typeof a.tags === 'string' && a.tags !== '') bits.push(a.tags);
    if (typeof a.q === 'string' && a.q !== '') bits.push(a.q);
    return { card: 'generic', title: 'Discover' + (bits.length > 0 ? ': ' + bits.join(' · ') : ''), kind: 'search' };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'melite_discover',
    description:
      'Progressive disclosure tier 1 over the estate (cards + flows): returns clamped summary LINES, never bodies. '
      + 'Args: lookup (all | cards | flows, default all) + tags (comma-separated card-declared tags, e.g. "image,upscale") '
      + '+ optional q (free-text filter). Prefer a FLOW when one fits the task — composition over single calls; '
      + 'fall back to cards. COUNTS-FIRST: a large estate clamps to counts + the tag vocabulary + the first '
      + 'rows; detail=true for every line. Open a line with melite_load (agents md + signature + skill lines).',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true` when
    // needed — all three filters are optional here.
    parameters: {
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
      detail: {
        type: 'boolean',
        description: 'Counts-first: when the estate is large the answer clamps to the first rows + counts + the tag vocabulary. detail=true returns every line.',
      },
    },
    presentCall,
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
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
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
      const a = (args ?? {}) as { lookup?: unknown; tags?: unknown; q?: unknown; detail?: unknown }
      const params = new URLSearchParams();
      const lookup = typeof a.lookup === 'string' && a.lookup !== '' ? a.lookup : 'all';
      params.set('lookup', lookup);
      if (typeof a.q === 'string' && a.q !== '') params.set('q', a.q);
      if (typeof a.tags === 'string' && a.tags !== '') params.set('tags', a.tags);
      try {
        const res = await request( 'GET', '/v1/discover?' + params.toString(),
          undefined, exec.signal, TIMEOUT_MS,
        );
        // The gateway's /v1/discover answer IS the canonical result —
        // the wire-shape assertion mirrors the music card's gwJson
        // bridge (the tool trusts its own gateway contract; the
        // refusal branch constructs the shape literally).
        // COUNTS-FIRST (the bench rework, 2026-09-10): a large
        // estate clamps to the first CLAMP lines + counts + the tag
        // vocabulary (the scan digest); detail=true returns every
        // line. The default answer stays small enough to reason over.
        const r = res as { flows?: Record<string, JsonValue>[]; cards?: Record<string, JsonValue>[] }
        const flows = Array.isArray(r.flows) ? r.flows : []
        const cards = Array.isArray(r.cards) ? r.cards : []
        if (a.detail !== true && (flows.length > CLAMP || cards.length > CLAMP)) {
          const vocab = new Set<string>()
          for (const c of cards) {
            const t = c['tags']
            if (Array.isArray(t)) for (const x of t) if (typeof x === 'string' && x !== '') vocab.add(x)
          }
          return jsonClean<DiscoverResult>({
            counts: { flows: flows.length, cards: cards.length },
            tag_vocabulary: [...vocab].sort().slice(0, 40),
            flows: flows.slice(0, CLAMP),
            cards: cards.slice(0, CLAMP),
            hint: 'clamped — narrow with tags/q, or detail=true for every line',
          })
        }
        return jsonClean(res) as DiscoverResult;
      } catch (e) {
        const err = e as { body?: unknown; message?: string };
        return jsonClean<DiscoverResult>({ error: typeof err.body === 'string' && err.body !== '' ? err.body : (err.message ?? 'discover failed') });
      }
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
