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
import type { Estate } from '../estate.ts'
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

export function ledgerTail(estate: Estate): ToolDefinition {
  // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
  // seat for the invalid face): the presenter rides defineTool
  // validation, and defineTool's soft gate OWNS invalid args
  // (invalid → undefined, never throw). The pre-purge re-attach over
  // that gate (a second, ungated seat rendering the generic card for
  // junk) is deleted — conversion invariance (presentCall output must
  // not change) now reads against the gated face. execute validation
  // (ToolArgsError/INVALID_ARGS) is unaffected.
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
      + 'tail; pair with melite_skill_read "run-recovery" for the full recovery workflow. '
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
      // THE BODIES LAW (a live 3088 commission's finding, 2026-09-26):
      // this render printed only COUNTS — "8 of 3688 entries" — so a
      // maker auditing a commission's history got a number and no
      // history, and fell back to run_status/melite_read to
      // reconstruct what the ledger already held. The rows ride here
      // now, one compact line each, byte-capped (an unbounded tail is
      // its own context hazard), with the full rows still in the
      // structured result for a caller that wants them whole.
      render: (_args, value) => {
        const v = value as { shown?: number; matched?: number; entries?: Record<string, JsonValue>[] }
        const lines: string[] = [
          'ledger_tail: ' + String(v.shown ?? 0) + ' of ' + String(v.matched ?? 0) + ' entries',
        ]
        const rows = Array.isArray(v.entries) ? v.entries : []
        const ROWS_SHOWN = 20
        const CHAR_CAP = 6000
        let used = lines[0]!.length
        for (const row of rows.slice(0, ROWS_SHOWN)) {
          const ts = typeof row['ts'] === 'string' || typeof row['ts'] === 'number' ? String(row['ts']) : '?'
          const event = typeof row['event'] === 'string' ? row['event'] : '(no event)'
          const data = row['data']
          let detail = ''
          if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
            const parts: string[] = []
            for (const [k, val] of Object.entries(data as Record<string, JsonValue>).slice(0, 6)) {
              if (val === null || val === undefined) continue
              const text = typeof val === 'object' ? JSON.stringify(val) : String(val)
              parts.push(k + '=' + (text.length > 60 ? text.slice(0, 57) + '…' : text))
            }
            detail = parts.length > 0 ? ' — ' + parts.join(', ') : ''
          } else if (data !== undefined) {
            const text = typeof data === 'string' ? data : JSON.stringify(data)
            detail = ' — ' + (text.length > 80 ? text.slice(0, 77) + '…' : text)
          }
          const line = ts + ' ' + event + detail
          if (used + line.length + 1 > CHAR_CAP) {
            lines.push('… row cap reached (the full rows ride the structured result)')
            break
          }
          used += line.length + 1
          lines.push(line)
        }
        if (rows.length > ROWS_SHOWN) {
          lines.push('… ' + String(rows.length - ROWS_SHOWN) + ' more row(s) in the structured result')
        }
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args, exec): Promise<LedgerTailResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here (2026-09-12).
      const a = args as { limit?: unknown; event?: unknown }
      // limit is schema-typed number: the wrapper gate rejects strings
      // before the body (a string limit throws ToolArgsError there), so
      // no string arm rides — the old one was gate-dead (2026-09-12).
      // The seat reads defaulted strings ('50' / '') — the query
      // string's own defaults (the router parsed them the same way).
      const limit = typeof a.limit === 'number' && Number.isFinite(a.limit) && a.limit > 0
        ? String(Math.floor(a.limit))
        : '50'
      const event = typeof a.event === 'string' && a.event.length > 0 ? a.event : ''
      const res = await estate.ledgerTail(limit, event, exec.signal, LEDGER_TIMEOUT_MS
      ) as { entries?: LedgerEntry[]; shown?: unknown; matched?: unknown; searched?: unknown }
      const entries = Array.isArray(res.entries) ? res.entries : []
      return jsonClean({
        shown: typeof res.shown === 'number' ? res.shown : entries.length,
        matched: typeof res.matched === 'number' ? res.matched : entries.length,
        entries,
        // §23 CROSS-ROOTS: the seat names the manifest roots whose
        // journals merged (absent on the legacy single-root call).
        ...(Array.isArray(res.searched) ? { searched: res.searched } : {}),
      }) as LedgerTailResult
    },
  });
  // (§7 P7: the presenter rides defineTool validation — no second,
  // ungated seat over the gate. The tool-presentation wall pins the
  // gated face.)
  return def;
}
