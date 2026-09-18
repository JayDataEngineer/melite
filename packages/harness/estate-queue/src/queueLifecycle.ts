// queueLifecycle.ts — stop / resume / reproduce refusal arms (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { refusal } from "./queueSubmit.ts";
import type { QueueRefusal } from "./queueSubmit.ts";
// ── stop / resume / reproduce refusals ───────────────────────────

export type LifecycleState =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "stopping";

/** stop, unknown run (Gateway.stop 2042-2045). */
export function refuseUnknownStop(runId: string): QueueRefusal {
  return refusal(
    400,
    "unknown run_id " + JSON.stringify(runId),
    "run_unknown",
    "run_id",
  );
}

/** stop, settled run: 200 with error ONLY (no code
 *  the dispatcher normalizes 4xx alone, and this is a 200). */
export function refuseTerminalStop(state: string): QueueRefusal {
  return {
    status: 200,
    payload: { error: "cannot stop run in state " + state },
  };
}

/** resume, live run (resume 1919-1925). */
export function refuseLiveResume(
  runId: string,
  liveStatus: string,
): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " is still " + liveStatus + " — stop it before resuming",
    "run_live",
    "run_id",
    "failed|stopped",
    liveStatus,
  );
}

/** resume/reproduce, no durable record (1930-1932 / 2011-2014). */
export function refuseNoDurableRecord(runId: string): QueueRefusal {
  return refusal(
    400,
    "no durable record for run " + JSON.stringify(runId),
    "run_unknown",
    "run_id",
  );
}

/** resume, completed run. */
export function refuseCompletedResume(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " completed — nothing to resume",
    "run_completed",
    "run_id",
    "failed|stopped",
    "completed",
  );
}

/** resume, neither failed nor stopped. */
export function refuseUnresumable(runId: string, status: string): QueueRefusal {
  const got: string = status === "" ? "unknown" : status;
  return refusal(
    400,
    "run " + runId + " is " + JSON.stringify(got) + " — resume needs failed or stopped",
    "run_not_resumable",
    "run_id",
    "failed|stopped",
    got,
  );
}

/** resume, draft gone or half-written. */
export function refuseUnusableRecord(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " +
      runId +
      " record is unusable (draft doc gone or half-written) — resubmit instead",
    "run_record_unusable",
    "run_id",
  );
}

/** reproduce, live run. */
export function refuseLiveReproduce(
  runId: string,
  liveStatus: string,
): QueueRefusal {
  return refusal(
    400,
    "run " +
      runId +
      " is still " +
      liveStatus +
      " — wait for it to settle or stop it first",
    "run_live",
    "run_id",
    "completed|failed|stopped",
    liveStatus,
  );
}

/** reproduce, cardless legacy row. */
export function refuseCardlessReplay(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " +
      runId +
      " is a cardless legacy row (no draft_id) — compose a fresh card to replay it",
    "run_cardless",
    "draft_id",
    "doc-backed draft id",
    "absent",
  );
}

/** reproduce, request body missing. */
export function refuseMissingRequest(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " has no recorded request body — cannot replay",
    "run_record_unusable",
    "run_id",
  );
}

/** reproduce, request non-object. */
export function refuseNonObjectRequest(
  runId: string,
  gotType: string,
): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " recorded a non-object request body",
    "run_record_unusable",
    "run_id",
    "object",
    gotType,
  );
}
