// queue/resume.ts — the POST /v1/flows/resume/<id> REFUSAL arm (TS
// port of python/gateway.py Gateway.resume's refusal gates 1925-1958 +
// _h_flows_resume 2991-2995).
//
// WHAT THIS PORTS (every text byte-identical, codes/loc/expected/got
// exactly as py raises them — the wall pins them byte-for-byte):
//   - live queued/running  -> 400 run_live / run_id / failed|stopped
//     "run %s is still %s — stop it before resuming" (1926-1931)
//   - no durable record    -> 400 run_unknown / run_id
//     "no durable record for run %r" (1932-1937)
//   - completed            -> 400 run_completed / run_id / failed|stopped
//     "run %s completed — nothing to resume" (1941-1945)
//   - other status         -> 400 run_not_resumable / run_id / failed|stopped
//     "run %s is %r — resume needs failed or stopped" (1946-1952)
//   - rebuild unusable     -> 400 run_record_unusable / run_id
//     "run %s record is unusable (draft doc gone or half-written) —
//     resubmit instead" (1953-1958; usability via queue.ts
//     durableRecordUsable, the single-module core's
//     _rebuild_run_from_record check).
// Order is the contract (live -> record -> completed ->
// resumable -> rebuild), and the live-failed/stopped fresher-truth
// rule rides (1939-1940: a live failed/stopped row overrides the
// sidecar status).
//
// SINGLE-MODULE REBASE (2026-09-07 adjudication): the rebuild check
// rides queue.ts durableRecordUsable (never a parallel rebuild).
// Semantic delta vs the first port (noted, unwalled): usable follows
// the probed py graph rules — a missing/empty graph rebuilds with
// zero rows (FlowGraph({}) succeeds), while NodeRow mistypes
// (non-string/empty id/type, bad refs, non-string map values,
// dup ids) orphan. Every walled leg agrees (the unusable fixture
// has graph [] AND a gone draft; no resumable-happy fixture asserts
// a 200 here).
//
// PREVIEW GAP (documented, not silent): a RESUMABLE record (failed /
// stopped with a usable rebuild) returns 400 preview_scope — the
// re-queue worker (run.status=queued, order append, ledger
// run.resume, sidecar rewrite, 1973-1987) stays py-owned Phase-5
// work. The wall pins refusals only; no resumable fixture asserts
// a 200 here.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute } from "@melite/gateway-core";
import { runStatus } from "./runStatus.ts";
import { pyReprStr } from "@comfyui/cordis";
import { qRefusal } from "./refusals.ts";
import type { QueueAnswer } from "./refusals.ts";
import { durableRecordUsable } from "./queue.ts";

/** Draft-doc existence (CARD BIRTH LAW — the doc is the birth
 *  certificate; py _rebuild 2299-2336 checks the same file). */
function draftDocExists(stateRoot: string, draftId: string): boolean {
  try {
    return statSync(join(stateRoot, "drafts", draftId + ".json")).isFile();
  } catch {
    return false;
  }
}

/** POST /v1/flows/resume/<id> refusal gates. liveStatus is the
 *  registry row's status or null when this process owns no live row
 *  (queue runStatus slot, registered by the flowsRun door); stateRoot/runsRoot are the ctx roots
 *  (<state>/drafts, <state>/output — py STATE_ROOT / OUT_ROOT). */
export function handleFlowsResume(
  runId: string,
  liveStatus: string | null,
  stateRoot: string,
  runsRoot: string,
): QueueAnswer {
  if (liveStatus === "queued" || liveStatus === "running") {
    return qRefusal(
      400,
      "run " + runId + " is still " + liveStatus + " — stop it before resuming",
      "run_live",
      "run_id",
      "failed|stopped",
      liveStatus,
    );
  }
  let sidecar: string;
  try {
    sidecar = readFileSync(join(runsRoot, runId, "_flow.json"), "utf8");
  } catch {
    return qRefusal(
      400,
      "no durable record for run " + pyReprStr(runId),
      "run_unknown",
      "run_id",
    );
  }
  let doc: unknown;
  try {
    doc = JSON.parse(sidecar);
  } catch {
    return qRefusal(
      400,
      "no durable record for run " + pyReprStr(runId),
      "run_unknown",
      "run_id",
    );
  }
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new Error("unparseable sidecar");
  }
  const rec = doc as Record<string, unknown>;
  let status: string = String(rec["status"] ?? "");
  if (liveStatus === "failed" || liveStatus === "stopped") {
    status = liveStatus;
  }
  if (status === "completed") {
    return qRefusal(
      400,
      "run " + runId + " completed — nothing to resume",
      "run_completed",
      "run_id",
      "failed|stopped",
      "completed",
    );
  }
  if (status !== "failed" && status !== "stopped") {
    const got: string = status === "" ? "unknown" : status;
    return qRefusal(
      400,
      "run " + runId + " is " + pyReprStr(got) + " — resume needs failed or stopped",
      "run_not_resumable",
      "run_id",
      "failed|stopped",
      got,
    );
  }
  let requestText = "";
  try {
    requestText = readFileSync(join(runsRoot, runId, "_request.json"), "utf8");
  } catch {
    requestText = "";
  }
  const draftId: unknown = rec["draft_id"];
  const usable: boolean = durableRecordUsable(
    sidecar,
    requestText,
    typeof draftId === "string" && draftId !== ""
      ? draftDocExists(stateRoot, draftId)
      : false,
  );
  if (!usable) {
    return qRefusal(
      400,
      "run " + runId + " record is unusable (draft doc gone or " +
        "half-written) — resubmit instead",
      "run_record_unusable",
      "run_id",
    );
  }
  return qRefusal(
    400,
    "resume execution stays on the py gateway in the TS preview — " +
      "refusal gates are ported, the re-queue worker is Phase-5",
    "preview_scope",
  );
}

/** The flows resume door (_h_flows_resume) as a self-registering
 *  plugin. Matches its own row inside the listener — no central
 *  table. */
export const flowsResumeDoors: Plugin = {
  name: "gateway-flows-resume",
  inject: ["gatewayError"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null || hit.row.handler !== "_h_flows_resume") {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const runId: string =
          hit.m !== null && hit.m[1] !== undefined
            ? String(hit.m[1])
            : "";
        const answered: {
          status: number;
          payload: Record<string, unknown>;
        } = handleFlowsResume(
          runId,
          runStatus(runId),
          req.roots.stateRoot,
          req.roots.runsRoot,
        );
        errors.normalize4xx(answered.status, answered.payload);
        return {
          status: answered.status,
          body: errors.serializePy(answered.payload),
          contentType: "application/json",
          headers: {},
        };
      },
    );
  },
};
