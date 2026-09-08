/**
 * ledger_tail - work off the file ledger: the append-only activity
 * journal (output/_ledger.jsonl) the gateway maintains for EVERY
 * material event - server.boot, run.registered, run.state, prov.state,
 * skill.read. This tool tails it (GET /v1/ledger), oldest -> newest
 * within the tail, so the agent can answer "what happened here",
 * resume interrupted work, and audit its own skill usage without
 * asking the user or trusting memory.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'

const LEDGER_TIMEOUT_MS = 15_000

interface LedgerEntry {
  ts?: unknown
  event?: unknown
  data?: Record<string, unknown>
}

export function ledgerTail(gatewayUrl: string): ToolDefinition {
  return {
    name: 'ledger_tail',
    description:
      'Tail the gateway file ledger (append-only journal of runs, provisions, skill reads, server '
      + 'boots). Use to answer "what happened / what ran / what downloaded", to resume interrupted '
      + 'work after a restart, or to audit activity. Entries come back oldest -> newest within the '
      + 'tail; pair with skill_read "run-recovery" for the full recovery workflow. '
      + 'Args: limit (optional, default 50, max 500), event (optional prefix filter, e.g. "run." '
      + 'or "prov").',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'How many entries to return (default 50, max 500).',
        },
        event: {
          type: 'string',
          description: 'Optional event-name prefix filter, e.g. "run.", "prov", "skill".',
        },
      },
      required: [],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { limit?: unknown; event?: unknown };
      return {
        card: 'generic',
        title: 'Ledger tail',
        kind: 'read',
        rawInput: { limit: a.limit, event: a.event },
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          shown: { type: 'number', description: 'Entries returned.' },
          matched: { type: 'number', description: 'Total entries matching the filter.' },
          entries: {
            type: 'array',
            description: 'Ledger rows: {ts, event, data}, oldest -> newest.',
          },
        },
        required: ['shown', 'matched', 'entries'],
      },
      render: (_args, value) => {
        const v = value as { shown?: number; matched?: number }
        return [{
          type: 'text',
          text: 'ledger_tail: ' + String(v.shown ?? 0) + ' of ' + String(v.matched ?? 0) + ' entries',
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { limit?: unknown; event?: unknown }
      const q: string[] = []
      if (typeof a.limit === 'number' && Number.isFinite(a.limit) && a.limit > 0) {
        q.push('limit=' + encodeURIComponent(String(Math.floor(a.limit))))
      } else if (typeof a.limit === 'string' && a.limit.length > 0) {
        q.push('limit=' + encodeURIComponent(a.limit))
      }
      if (typeof a.event === 'string' && a.event.length > 0) {
        q.push('event=' + encodeURIComponent(a.event))
      }
      const path = '/v1/ledger' + (q.length > 0 ? '?' + q.join('&') : '')
      const res = await gatewayRequest(
        gatewayUrl, 'GET', path, undefined, exec.signal, LEDGER_TIMEOUT_MS,
      ) as { entries?: LedgerEntry[]; shown?: unknown; matched?: unknown }
      const entries = Array.isArray(res.entries) ? res.entries : []
      return {
        shown: typeof res.shown === 'number' ? res.shown : entries.length,
        matched: typeof res.matched === 'number' ? res.matched : entries.length,
        entries,
      }
    },
  }
}
