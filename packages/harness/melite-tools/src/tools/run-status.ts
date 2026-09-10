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
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import { RayGatewayError } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). run_id rides every
 *  fetchable shape (the row-11 echo); the pre-fetch guard refuses
 *  bare (the `as` bridge below — a careful subset, never a schema
 *  failure by construction). */
type RunStatusResult = {
  run_id: string;
  status?: string;
  stages?: Record<string, JsonValue>[];
  artifacts?: Record<string, JsonValue>[];
  error?: string;
  queue_position?: number;
} & Record<string, JsonValue>;

export function runStatus(request: EstateRequest): ToolDefinition {
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
    const a = (typeof args === "object" && args !== null ? args : {}) as { runId?: unknown };
    return {
      card: 'generic',
      title: `Run status: ${String(a.runId ?? '?')}`,
      kind: 'read',
      rawInput: String(a.runId ?? '?'),
    };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'run_status',
    description:
      'Poll a queue run: status (queued|running|completed|error|stopped|failed), per-stage '
      + 'progress, artifacts (landed bytes with paths) and the EXACT error string on failure. '
      + 'Args: runId (from melite_flow). Includes queue_position while waiting on '
      + 'the serial GPU lane. Read-only — the stop door is operator-ordered.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      runId: {
        type: 'string',
        description: 'The run id returned by melite_flow.',
        required: true,
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          run_id: { type: 'string', required: true },
          status: { type: 'string' },
          stages: { type: 'array', description: 'Per-stage rows: id/name, status, error when present.' },
          artifacts: { type: 'array', description: 'Landed artifact rows (path, bytes). Empty until completed.' },
          error: { type: 'string', description: 'The EXACT failure string when status is error/failed, or the refusal text when the fetch refused.' },
          queue_position: { type: 'number', description: '0 = active; >0 = waiting in the FIFO.' },
        },
        // Ledger row 11 (2026-09-10): the refusal shape carries
        // {run_id, error} (no status) — required is the intersection.
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
    async execute(args, exec): Promise<RunStatusResult> {
      const a = (typeof args === "object" && args !== null ? args : {}) as { runId?: unknown }
      const runId = typeof a.runId === 'string' ? a.runId : ''
      if (!runId) return jsonClean({ error: 'runId is required' }) as RunStatusResult
      let res: Record<string, unknown>
      try {
        res = await request( 'GET',
          '/v1/flows/status/' + encodeURIComponent(runId),
          undefined, exec.signal, TIMEOUT_MS,
        ) as Record<string, unknown>
      } catch (e) {
        if (e instanceof RayGatewayError) {
          let named = ''
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? '')
          } catch { named = '' }
          return jsonClean<RunStatusResult>({ run_id: runId, error: named || e.body || 'status fetch failed' })
        }
        throw e
      }
      if (res && typeof res.error === 'string') {
        return jsonClean<RunStatusResult>({ run_id: runId, error: res.error })
      }
      return jsonClean({
        run_id: typeof res.run_id === 'string' ? res.run_id : runId,
        status: typeof res.status === 'string' ? res.status : 'unknown',
        stages: Array.isArray(res.stages) ? res.stages : [],
        artifacts: Array.isArray(res.artifacts) ? res.artifacts : [],
        error: typeof res.error === 'string' ? res.error : undefined,
        queue_position: typeof res.queue_position === 'number' ? res.queue_position : 0,
      }) as RunStatusResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
