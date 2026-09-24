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
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import type { EstateRequest } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

// THE WAIT PRIMITIVE (efficiency review, prong (a) fix 5,
// 2026-09-22): the attempt005 census counted 20 sleep calls —
// polling was the only wait shape, and each wake re-read multi-KB
// log tails from byte zero. wait_s turns N poll turns into ONE:
// the tool re-fetches server-side on a flat 5s cadence (each fetch
// ~200 bytes of context — the row, never the log) until the run is
// terminal or the budget expires. The tool def's own timeoutMs
// rises to cover the full budget + one fetch's slack; wait_s=0
// keeps the historical single-shot read.
const WAIT_MAX_S = 300
const WAIT_POLL_S = 5

/** Abortable sleep — resolves after ms, rejects immediately when
 * the caller's signal aborts (a cancelled wait never lingers). */
function sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort(): void {
      clearTimeout(t)
      reject(signal.reason ?? new Error('aborted'))
    }
    if (signal.aborted) { onAbort(); return }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

const TERMINAL = new Set(['completed', 'error', 'stopped', 'failed'])

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
  planned_stages?: Record<string, JsonValue>[];
  card?: string;
  run_age_s?: number;
  export_name?: string;
  export_path?: string;
  test?: boolean;
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
      wait_s: {
        type: 'number',
        description:
          'Long-poll budget in seconds (0-300, default 0 = single read; clamped at execute). '
          + 'The tool re-fetches internally every 5s until the run is terminal — '
          + 'ONE result row instead of a sleep-and-repoll turn loop (efficiency '
          + 'review fix 5). On budget expiry the row carries wait_expired: true.',
      },
    },
    // The wait budget runs INSIDE one execute — the def's own
    // timeout must cover it (WAIT_MAX_S + one fetch's slack).
    timeoutMs: (WAIT_MAX_S + 20) * 1000,
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
          planned_stages: { type: 'array', description: 'The registered plan (id/engine per stage) — present when a live row has no stage rows yet.' },
          card: { type: 'string', description: 'The card (or pipeline) the run was born from.' },
          run_age_s: { type: 'number', description: 'Seconds since registration — the heartbeat for long renders.' },
          wait_expired: { type: 'boolean', description: 'True when wait_s expired before the run reached a terminal state — wait again.' },
          waited_s: { type: 'number', description: 'Seconds actually waited when the run reached terminal inside the budget.' },
        },
        // Ledger row 11 (2026-09-10): the refusal shape carries
        // {run_id, error} (no status) — required is the intersection.
      },
      render: (args, value) => {
        const v = value as {
          run_id?: string; status?: string; stages?: Array<{ status?: string }>;
          artifacts?: unknown[]; error?: string; queue_position?: number;
          planned_stages?: Array<{ id?: string }>; card?: string; run_age_s?: number;
          wait_expired?: boolean; waited_s?: number; export_name?: string; export_path?: string; test?: boolean
        }
        if (v && v.error) {
          return [{ type: 'text', text: 'run ' + String(v.run_id ?? '?') + ' ' + String(v.status ?? '?') + ' — ' + v.error }]
        }
        const stages = v.stages ?? []
        const artifacts = v.artifacts ?? []
        const done = stages.filter(s => s && s.status === 'completed').length
        const total = stages.length
        const pos = typeof v.queue_position === 'number' && v.queue_position > 0
          ? ' (queue #' + v.queue_position + ')' : ''
        // THE LIVE-ROW PLAN (efficiency review 002, Fix 2): a live row
        // with no stage rows yet renders its registered plan + age —
        // never the bare "0/0" that sent agents to tail logs with bash.
        const plan = total === 0 && Array.isArray(v.planned_stages) && v.planned_stages.length > 0
          ? ' · plan: ' + v.planned_stages.length + ' stage(s)' +
            (typeof v.card === 'string' && v.card ? ' (' + v.card + ')' : '') +
            (typeof v.run_age_s === 'number' ? ' · age ' + v.run_age_s + 's' : '')
          : ''
        // THE RECEIPT-PATH LAW (022's self-critique #1, 2026-09-24):
        // a completed row that names only COUNTS forces the agent to
        // `ls output/<run_id>` for the actual paths — the exact
        // glob-output detour the efficiency law forbids. Terminal
        // rows render their artifact paths (up to 4, as served) and
        // per-stage status rows; live rows stay one-line (counts +
        // plan + age — nothing to receipt yet).
        const terminal = v.status === 'completed' || v.status === 'failed'
        const stageVoice = terminal && stages.length
          ? '\nstages: ' + stages.map((s) => {
            const row = s as { id?: unknown; name?: unknown; error?: unknown }
            const id = typeof row.id === 'string' ? row.id : (typeof row.name === 'string' ? row.name : '?')
            const st = typeof s?.status === 'string' ? s.status : '?'
            const err = typeof row.error === 'string' && row.error !== '' ? ' ! ' + row.error : ''
            return id + ':' + st + err
          }).join(', ')
          : ''
        const artPaths = terminal ? artifacts.slice(0, 4).map((a) => {
          const p = typeof a === 'string' ? a
            : (typeof (a as { path?: unknown })?.path === 'string' ? (a as { path: string }).path : '')
          // THE CANONICAL RECEIPT PATH (023's self-critique #3,
          // 2026-09-24): the live row serves route-relative
          // `<run-id>/<rel>` while disk rows serve absolute — the
          // form changes across restarts, and neither joins blindly.
          // The receipt canonicalizes to a directly-usable
          // filesystem path: absolute stays; `./` strips; a row-led
          // `<run-id>/…` gains its out root (test runs live under
          // test-output/). The wire keeps the browser's spelling —
          // the canonical form lives only in this agent-facing text.
          if (p.startsWith('/')) return p
          const bare = p.startsWith('./') ? p.slice(2) : p
          const rid = typeof v.run_id === 'string' ? v.run_id : ''
          // THE LEGACY-DOUBLE COLLAPSE (024's self-critique #2):
          // rows served before the run-dir-relative fix (or by an
          // older worker) spell `<run-id>/<run-id>/…` — collapse
          // the stencil before prefixing the out root.
          const single = rid !== '' && bare.startsWith(rid + '/' + rid + '/')
            ? rid + bare.slice((rid + '/' + rid).length) : bare
          if (rid !== '' && (single === rid || single.startsWith(rid + '/'))) {
            return (v.test === true ? 'test-output/' : 'output/') + single
          }
          return single
        }).filter(Boolean) : []
        const artVoice = artPaths.length
          ? '\nartifacts: ' + artPaths.join('\n  ')
            + (artifacts.length > 4 ? `\n  (+${artifacts.length - 4} more)` : '')
          : ''
        // THE EXPORT-NAME VOICE (023's self-critique #4/#6): a
        // design/export lane's receipt names the mint — the
        // deliverable .qvoice (collision-numbered) rides no artifact
        // list. One line kills the voices-dir timestamp correlation.
        // (2026-09-24: the preview flac now carries the REAL design
        // sample — the 1-sample stub died with BRIEF4's cosmetic
        // defect fix — so the line sells the sample, not the hole.)
        // THE EXPORT-PATH VOICE (roadmap OWED 2026-09-24 — the
        // export FULL PATH, transcript-026 #4): when the engine's
        // harvest carried the minted file's ABSOLUTE path, print IT
        // — the maker feeds the exact collision-numbered file to
        // load lanes with zero voices-dir listing. The newest-match
        // hint stays the fallback for pre-path rows.
        const exportVoice = terminal && typeof v.export_name === 'string' && v.export_name !== ''
          ? `\nexport: '${v.export_name}' — preview audio is the design sample; the deliverable .qvoice is ${typeof v.export_path === 'string' && v.export_path !== '' ? v.export_path : `the newest ${v.export_name}_*.qvoice under the voices root`}`
          : ''
        return [{
          type: 'text',
          text: 'run ' + String(v.run_id ?? '?') + ' ' + String(v.status ?? '?') + pos
            + ' — ' + done + '/' + total + ' stage(s)' + plan
            // hoisted above: the consequent's second ?? could never see
            // nullish (length-truthy implies defined) — same text (2026-09-12).
            + (artifacts.length ? ' · ' + artifacts.length + ' artifact(s)' : '')
            // The wait primitive's two receipts (fix 5): expiry asks for
            // another wait; waited_s proves the single call absorbed the poll.
            + (v.wait_expired ? ' · wait expired (budget spent, not terminal — wait again)' : '')
            + (typeof v.waited_s === 'number' ? ' · waited ' + v.waited_s + 's' : '')
            + stageVoice + artVoice + exportVoice,
        }]
      },
    },
    async execute(args, exec): Promise<RunStatusResult> {
      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object and runId a required string here, so honest casts
      // ride instead of gate-dead typeof fallbacks (2026-09-12).
      const a = args as { runId?: unknown; wait_s?: unknown }
      const runId = a.runId as string
      if (!runId) return jsonClean({ error: 'runId is required' }) as RunStatusResult
      // The wait budget (fix 5): clamp defensively — the schema gate
      // already enforces 0..WAIT_MAX_S; this arm only guards a
      // non-numeric arrival (coerced below) never escaping the cap.
      const waitRaw = typeof a.wait_s === 'number' ? a.wait_s : Number(a.wait_s)
      const waitS = Number.isFinite(waitRaw)
        ? Math.min(Math.max(waitRaw, 0), WAIT_MAX_S)
        : 0
      const deadline = Date.now() + waitS * 1000
      let res: Record<string, unknown>
      let waitExpired = false
      // THE LONG-POLL LOOP: fetch → terminal? return : budget left?
      // sleep 5s (abortable) : mark expiry and return the last row.
      // Every fetch is the same cheap seat read (~200 B of context);
      // the poll loop never touches logs.
      for (;;) {
        try {
          res = await request( 'GET',
            '/v1/flows/status/' + encodeURIComponent(runId),
            undefined, exec.signal, TIMEOUT_MS,
          ) as Record<string, unknown>
        } catch (e) {
          // The seats era (REBUILD-15): status refusals arrive as
          // RemoteErrors — the code+message IS the refusal voice.
          const re = remoteErrorOf(e)
          if (re !== null && re !== undefined) {
            return jsonClean<RunStatusResult>({ run_id: runId, error: `${re.code}: ${re.message}` })
          }
          throw e
        }
        const status = typeof res?.['status'] === 'string' ? res['status'] : ''
        if (TERMINAL.has(status)) break
        if (Date.now() >= deadline) {
          waitExpired = waitS > 0
          break
        }
        await sleepAbortable(WAIT_POLL_S * 1000, exec.signal)
      }
      // THE EMPTY-ERROR TRAP (021's self-critique receipt, 2026-09-24):
      // the registry writes `error: ""` on SUCCESS — a bare typeof
      // string check read that as the refusal shape and returned
      // {run_id, error:""}, which the render voices as "? — 0/0
      // stage(s)" on a COMPLETED run (all four 021 stages). Only a
      // NON-EMPTY error is a refusal; everything else falls through
      // to the rich row.
      if (res && typeof res.error === 'string' && res.error !== '') {
        return jsonClean<RunStatusResult>({ run_id: runId, error: res.error })
      }
      const waitedRow: Record<string, unknown> = waitExpired
        ? { wait_expired: true, wait_budget_s: waitS }
        : (waitS > 0 ? { waited_s: Math.round(waitS - Math.max(0, deadline - Date.now()) / 1000) } : {})
      return jsonClean({
        ...waitedRow,
        run_id: typeof res.run_id === 'string' ? res.run_id : runId,
        status: typeof res.status === 'string' ? res.status : 'unknown',
        stages: Array.isArray(res.stages) ? res.stages : [],
        artifacts: Array.isArray(res.artifacts) ? res.artifacts : [],
        // The res.error string returns at the refusal above — error rides
        // undefined on success by construction, never a second copy (2026-09-12).
        error: undefined,
        queue_position: typeof res.queue_position === 'number' ? res.queue_position : 0,
        // THE LIVE-ROW PLAN (Fix 2): projected through verbatim — the
        // render voices it, older consumers ignore it (additive).
        planned_stages: Array.isArray(res.planned_stages) ? res.planned_stages : undefined,
        card: typeof res.card === 'string' ? res.card : undefined,
        run_age_s: typeof res.run_age_s === 'number' ? res.run_age_s : undefined,
        // THE EXPORT NAME, THREADED (023's self-critique #4/#6) +
        // the test flag (the canonical receipt path needs the out
        // root). Additive — older consumers ignore both. The export
        // PATH rides the same additive law (the FULL-mint voice).
        export_name: typeof res.export_name === 'string' ? res.export_name : undefined,
        export_path: typeof res.export_path === 'string' ? res.export_path : undefined,
        test: typeof res.test === 'boolean' ? res.test : undefined,
      }) as RunStatusResult
    },
  });
  // Re-attach the unconditional presenter over defineTool's
  // soft-validation gate (see the adaptation above).
  def.presentCall = presentCall;
  return def;
}
