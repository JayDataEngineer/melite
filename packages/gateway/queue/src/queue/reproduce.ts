// queue/reproduce.ts — the POST /v1/flows/reproduce/<id> door:
// refusal gates + THE EXACT-RESUBMIT (TS port of python/gateway.py
// Gateway.reproduce 1996-2040 + _h_flows_reproduce 2998-3002).
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
// THE EXACT-RESUBMIT (landed 2026-09-09 — the Phase-5 py-owned gap
// closed; the "stays on the py gateway" preview refusal died with
// the py gateway itself): a REPLAYABLE record re-submits its
// verbatim _request.json through the SAME handleFlowsStart the
// start door rides (draft law, door resolution, registration — one
// code path, zero restatement; the py submit() call 2035). The
// replay is a NEW run id (the original record stays untouched);
// the original draft doc must still exist (CARD BIRTH LAW — no
// door-side auto-mint; start re-validates). Success answers py's
// 200 body {run_id, status, replay_of} after the run.reproduce
// ledger row (2036-2039); a start-side refusal passes through as
// its own 4xx.
//
// SINGLE-MODULE REBASE (2026-09-07 adjudication): the %r formatting
// rides pyReprStr (engine/comfyui.ts, the same source queue.ts
// imports it from) and the envelope rides ./refusals.ts; no helper
// here duplicates queue.ts (this arm needed no lock.ts import —
// nothing to repoint beyond the deleted-module sweep, verified).
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
import { pyReprStr } from "@melite/comfyui-cordis";
import { needComfyUI } from "@melite/comfyui-cordis";
import { getDraftsDomain } from "@melite/gateway-core";
// Runtime-only import of the start arm (the ONE submit both doors
// ride). The doors↔queue module cycle is eval-safe: every binding
// here is called inside listeners, never at module scope.
import { handleFlowsStart } from "@melite/gateway-doors/flows-start";
import { appendLedger } from "./queue.ts";
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
 *  (queue runStatus slot, registered by the flowsRun door); stateRoot/runsRoot are the ctx roots.
 *  Returns the refusal answer, or the REPLAYABLE verdict carrying
 *  the verbatim recorded request body (the exact-resubmit's input). */
export function handleFlowsReproduce(
  runId: string,
  liveStatus: string | null,
  stateRoot: string,
  runsRoot: string,
): QueueAnswer | { replayable: true; request: Record<string, unknown> } {
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
  return { replayable: true, request: request as Record<string, unknown> };
}

/** The flows reproduce door (_h_flows_reproduce) as a
 *  self-registering plugin. Matches its own row inside the
 *  listener — no central table. The exact-resubmit rides the SAME
 *  handleFlowsStart the start door mounts (one submit path: draft
 *  law, door resolution, registration), then ledgers run.reproduce
 *  and answers py's 200 body {run_id, status, replay_of}. */
export const flowsReproduceDoors: Plugin = {
  name: "gateway-flows-reproduce",
  inject: ["gatewayError", "runs", "cardRegistry", "comfyui", "storageDomain", "webServer"],
  apply(ctx: Context): void {
    mountDoorRoutes(ctx, ctx.webServer, ["_h_flows_reproduce"], async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = doorMatch(req, ["_h_flows_reproduce"]);
        if (hit === null) {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const runId: string =
          hit.m !== null && hit.m[1] !== undefined
            ? String(hit.m[1])
            : "";
        const gates = handleFlowsReproduce(
          runId,
          runStatus(runId),
          req.roots.stateRoot,
          req.roots.runsRoot,
        );
        let answered: {
          status: number;
          payload: Record<string, unknown>;
        };
        if ("replayable" in gates) {
          // THE EXACT-RESUBMIT (py reproduce 2035-2040): the recorded
          // body re-rides the ONE start arm — a refusal here (draft
          // gone, card retired, engine down) is the start door's own
          // voice, passed through verbatim.
          const drafts = await getDraftsDomain(ctx);
          const replay = await handleFlowsStart(
            gates.request,
            ctx.runs,
            ctx.cardRegistry,
            needComfyUI(ctx, "flows-reproduce door"),
            (draftId: string): boolean =>
              drafts.table("docs").get(draftId) !== undefined,
          );
          if (replay.status !== 202 || replay.runId === undefined) {
            answered = { status: replay.status, payload: replay.payload };
          } else {
            appendLedger(req.roots.stateRoot, "run.reproduce", {
              run_id: replay.runId,
              replay_of: runId,
            });
            answered = {
              status: 200,
              payload: {
                run_id: replay.runId,
                status: "queued",
                replay_of: runId,
              },
            };
          }
        } else {
          answered = gates;
        }
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
