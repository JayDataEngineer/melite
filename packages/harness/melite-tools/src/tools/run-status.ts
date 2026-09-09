/**
 * run_status — the run monitor (headless).
 *
 * Poll ONE run through its lifecycle: GET {gateway}/v1/flows/
 * status/<run_id> → status, per-stage stages[].status, artifacts (the
 * bytes that landed), error (the EXACT failure string — RESILIENCE
 * LAW: never a bare "failed") and queue_position while waiting.
 *
 * Terminal states: completed | error | stopped | failed. The stop door
 * (/v1/flows/stop/<id>) stays operator-ordered — this tool only
 * READS.
 *
 * Registered ONLY in headless mounts (MELITE_HEADLESS=1).
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest, RayGatewayError } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

export function runStatus(gatewayUrl: string): ToolDefinition {
  return {
    name: 'run_status',
    description:
      'Poll a queue run: status (queued|running|completed|error|stopped|failed), per-stage '
      + 'progress, artifacts (landed bytes with paths) and the EXACT error string on failure. '
      + 'Args: runId (from melite_flow). Includes queue_position while waiting on '
      + 'the serial GPU lane. Read-only — the stop door is operator-ordered.',
    parameters: {
      type: 'object',
      properties: {
        runId: {
          type: 'string',
          description: 'The run id returned by melite_flow.',
        },
      },
      required: ['runId'],
    },
    presentCall(args) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { runId?: unknown };
      return {
        card: 'generic',
        title: `Run status: ${String(a.runId ?? '?')}`,
        kind: 'read',
        rawInput: String(a.runId ?? '?'),
      };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string' },
          status: { type: 'string' },
          stages: { type: 'array', description: 'Per-stage rows: id/name, status, error when present.' },
          artifacts: { type: 'array', description: 'Landed artifact rows (path, bytes). Empty until completed.' },
          error: { type: 'string', description: 'The EXACT failure string when status is error/failed.' },
          queue_position: { type: 'number', description: '0 = active; >0 = waiting in the FIFO.' },
        },
        required: ['run_id', 'status'],
      },
      render: (args, value) => {
        const v = value as {
          run_id?: string; status?: string; stages?: Array<{ status?: string }>;
          artifacts?: unknown[]; error?: string; queue_position?: number
        }
        if (v && v.error) {
          return [{ type: 'text', text: 'run ' + String(v.run_id ?? '?') + ' ' + String(v.status ?? '?') + ' — ' + v.error }]
        }
        const done = (v.stages ?? []).filter(s => s && s.status === 'completed').length
        const total = (v.stages ?? []).length
        const pos = typeof v.queue_position === 'number' && v.queue_position > 0
          ? ' (queue #' + v.queue_position + ')' : ''
        return [{
          type: 'text',
          text: 'run ' + String(v.run_id ?? '?') + ' ' + String(v.status ?? '?') + pos
            + ' — ' + done + '/' + total + ' stage(s)'
            + ((v.artifacts ?? []).length ? ' · ' + (v.artifacts ?? []).length + ' artifact(s)' : ''),
        }]
      },
    },
    async execute(args, exec) {
      const a = (typeof args === "object" && args !== null ? args : {}) as { runId?: unknown }
      const runId = typeof a.runId === 'string' ? a.runId : ''
      if (!runId) return jsonClean({ error: 'runId is required' })
      let res: Record<string, unknown>
      try {
        res = await gatewayRequest(
          gatewayUrl, 'GET',
          '/v1/flows/status/' + encodeURIComponent(runId),
          undefined, exec.signal, TIMEOUT_MS,
        ) as Record<string, unknown>
      } catch (e) {
        if (e instanceof RayGatewayError) {
          let named = ''
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
          } catch { named = '' }
          return jsonClean({ run_id: runId, error: named || e.body || 'status fetch failed' })
        }
        throw e
      }
      if (res && typeof res.error === 'string') {
        return jsonClean({ run_id: runId, error: res.error })
      }
      return jsonClean({
        run_id: typeof res.run_id === 'string' ? res.run_id : runId,
        status: typeof res.status === 'string' ? res.status : 'unknown',
        stages: Array.isArray(res.stages) ? res.stages : [],
        artifacts: Array.isArray(res.artifacts) ? res.artifacts : [],
        error: typeof res.error === 'string' ? res.error : undefined,
        queue_position: typeof res.queue_position === 'number' ? res.queue_position : 0,
      })
    },
  }
}
