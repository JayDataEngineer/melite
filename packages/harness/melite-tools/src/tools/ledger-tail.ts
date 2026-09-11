/**
 * ledger_tail - work off the file ledger: the append-only activity
 * journal (output/_ledger.jsonl) the gateway maintains for EVERY
 * material event - server.boot, run.registered, run.state, prov.state,
 * skill.read. This tool tails it (GET /v1/ledger), oldest -> newest
 * within the tail, so the agent can answer "what happened here",
 * resume interrupted work, and audit its own skill usage without
 * asking the user or trusting memory.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { EstateRequest } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const LEDGER_TIMEOUT_MS = 15_000

interface LedgerEntry {
  ts?: unknown
  event?: unknown
  data?: Record<string, unknown>
}

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). */
type LedgerTailResult = {
  shown: number;
  matched: number;
  entries: Record<string, JsonValue>[];
  error?: string;
} & Record<string, JsonValue>;

export function ledgerTail(request: EstateRequest): ToolDefinition {
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
    const a = (typeof args === "object" && args !== null ? args : {}) as { limit?: unknown; event?: unknown };
    return {
      card: 'generic',
      title: 'Ledger tail',
      kind: 'read',
      rawInput: { limit: a.limit, event: a.event },
    };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'ledger_tail',
    description:
      'Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server '
      + 'boots). Use to answer "what happened / what ran / what downloaded", to resume interrupted '
      + 'work after a restart, or to audit activity. Entries come back oldest -> newest within the '
      + 'tail; pair with skill_read "run-recovery" for the full recovery workflow. '
      + 'Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. "run." '
      + 'or "prov").',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper) — both filters are optional.
    parameters: {
      limit: {
        type: 'number',
        description: 'How many entries to return (default 50, max 500).',
      },
      event: {
        type: 'string',
        description: 'Optional event-name prefix filter, e.g. "run.", "prov", "skill".',
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          shown: { type: 'number', description: 'Entries returned.', required: true },
          matched: { type: 'number', description: 'Total entries matching the filter.', required: true },
          entries: {
            type: 'array',
            description: 'Ledger rows: {ts, event, data}, oldest -> newest.',
            required: true,
          },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (_args, value) => {
        const v = value as { shown?: number; matched?: number }
        return [{
          type: 'text',
          text: 'ledger_tail: ' + String(v.shown ?? 0) + ' of ' + String(v.matched ?? 0) + ' entries',
        }]
      },
    },
    async execute(args, exec): Promise<LedgerTailResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here (2026-09-12).
      const a = args as { limit?: unknown; event?: unknown }
      const q: string[] = []
      // limit is schema-typed number: the wrapper gate rejects strings
      // before the body (a string limit throws ToolArgsError there), so
      // no string arm rides — the old one was gate-dead (2026-09-12).
      if (typeof a.limit === 'number' && Number.isFinite(a.limit) && a.limit > 0) {
        q.push('limit=' + encodeURIComponent(String(Math.floor(a.limit))))
      }
      if (typeof a.event === 'string' && a.event.length > 0) {
        q.push('event=' + encodeURIComponent(a.event))
      }
      const path = '/v1/ledger' + (q.length > 0 ? '?' + q.join('&') : '')
      const res = await request( 'GET', path, undefined, exec.signal, LEDGER_TIMEOUT_MS,
      ) as { entries?: LedgerEntry[]; shown?: unknown; matched?: unknown }
      const entries = Array.isArray(res.entries) ? res.entries : []
      return jsonClean({
        shown: typeof res.shown === 'number' ? res.shown : entries.length,
        matched: typeof res.matched === 'number' ? res.matched : entries.length,
        entries,
      }) as LedgerTailResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
