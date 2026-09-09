// queue/reproduce.ts — the POST /v1/flows/reproduce/<id> REFUSAL
// arm (TS port of python/gateway.py Gateway.reproduce's refusal gates
// 2002-2033 + _h_flows_reproduce 2998-3002).
//
// WHAT THIS PORTS (every text byte-identical, codes/loc/expected/got
// exactly as py raises them — the wall pins them byte-for-byte):
//   - live queued/running  -> 400 run_live / run_id / completed|failed|stopped
//     "run %s is still %s — wait for it to settle or stop it first"
//     (2002-2008)
//   - no durable record    -> 400 run_unknown / run_id
//     "no durable record for run %r" (2009-2014)
//   - cardless legacy row  -> 400 run_cardless / draft_id / doc-backed draft id
//     "run %s is a cardless legacy row (no draft_id) — compose a
//     fresh card to replay it" (2015-2020)
//   - no recorded request  -> 400 run_record_unusable / run_id
//     "run %s has no recorded request body — cannot replay"
//     (2021-2028)
//   - non-object request   -> 400 run_record_unusable / run_id / object
//     "run %s recorded a non-object request body" (2029-2033)
// Order is the contract (live -> record -> cardless -> request).
//
// SINGLE-MODULE REBASE (2026-09-07 adjudication): the %r formatting
// rides pyReprStr (engine/comfyui.ts, the same source queue.ts
// imports it from) and the envelope rides ./refusals.ts; no helper
// here duplicates queue.ts (this arm needed no lock.ts import —
// nothing to repoint beyond the deleted-module sweep, verified).
//
// PREVIEW GAP (documented, not silent): a REPLAYABLE record (live
// settled, card-backed, object request) returns 400 preview_scope —
// the exact-resubmit through submit() (2034-2038) stays py-owned
// Phase-5 work. The wall pins refusals only; no replayable fixture
// asserts a 200 here.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { doorMatch, mountDoorRoutes } from "@melite/gateway-doors/route-mount";
import { runStatus } from "./runStatus.ts";
import { pyReprStr } from "@melite/comfyui";
import { qRefusal } from "./refusals.ts";
import type { QueueAnswer } from "./refusals.ts";

/** Python type(x).__name__ for the got field (non-object request). */
function pyTypeName(v: unknown): string {
  if (v === null) return "NoneType";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") {
    return Number.isInteger(v) ? "int" : "float";
  }
  if (Array.isArray(v)) return "list";
  if (typeof v === "object") return "dict";
  return "unknown";
}

/** POST /v1/flows/reproduce/<id> refusal gates. liveStatus is the
 *  registry row's status or null when this process owns no live row
 *  (queue runStatus slot, registered by the flowsRun door); stateRoot/runsRoot are the ctx roots. */
export function handleFlowsReproduce(
  runId: string,
  liveStatus: string | null,
  stateRoot: string,
  runsRoot: string,
): QueueAnswer {
  if (liveStatus === "queued" || liveStatus === "running") {
    return qRefusal(
      400,
      "run " + runId + " is still " + liveStatus + " — wait for it to " +
        "settle or stop it first",
      "run_live",
      "run_id",
      "completed|failed|stopped",
      liveStatus,
    );
  }
  let doc: unknown;
  try {
    doc = JSON.parse(
      readFileSync(join(runsRoot, runId, "_flow.json"), "utf8"),
    );
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
  if (String(rec["draft_id"] ?? "") === "") {
    return qRefusal(
      400,
      "run " + runId + " is a cardless legacy row (no draft_id) — " +
        "compose a fresh card to replay it",
      "run_cardless",
      "draft_id",
      "doc-backed draft id",
      "absent",
    );
  }
  let request: unknown;
  try {
    request = JSON.parse(
      readFileSync(join(runsRoot, runId, "_request.json"), "utf8"),
    );
  } catch {
    return qRefusal(
      400,
      "run " + runId + " has no recorded request body — cannot replay",
      "run_record_unusable",
      "run_id",
    );
  }
  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    return qRefusal(
      400,
      "run " + runId + " recorded a non-object request body",
      "run_record_unusable",
      "run_id",
      "object",
      pyTypeName(request),
    );
  }
  return qRefusal(
    400,
    "reproduce execution stays on the py gateway in the TS preview — " +
      "refusal gates are ported, the exact-resubmit worker is Phase-5",
    "preview_scope",
  );
}

/** The flows reproduce door (_h_flows_reproduce) as a
 *  self-registering plugin. Matches its own row inside the
 *  listener — no central table. */
export const flowsReproduceDoors: Plugin = {
  name: "gateway-flows-reproduce",
  inject: ["webServer", "gatewayError"],
  apply(ctx: Context): void {
    mountDoorRoutes(ctx, ctx.webServer, ["_h_flows_reproduce"], (req: GatewayRequest): DispatchResult | undefined => {
        const hit = doorMatch(req, ["_h_flows_reproduce"]);
        if (hit === null) {
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
        } = handleFlowsReproduce(
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
    });
  },
};
