// runsValidateSweeps.ts — batch-row + workflow-pin sweep validators split from
// runsValidate.ts (pure move, zero logic changes).
import { FlowError } from "./runsValidateShared.ts";
import type { CardRegistryLike } from "./runsValidateShared.ts";
import { flowFromBody } from "./runsValidateStages.ts";

// ── batch rows ────────
export function batchRows(body: unknown, firstError: string, cards?: CardRegistryLike | null): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [
    { scope: "flow", error: firstError, code: "flow_compile", loc: "flow" },
  ];
  const stages: unknown =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)["stages"]
      : undefined;
  if (!Array.isArray(stages)) return rows;
  for (let i = 0; i < stages.length; i++) {
    const st: unknown = stages[i];
    // a present null labels "null", not the default.
    const label: string =
      typeof st === "object" && st !== null && !Array.isArray(st)
        ? JSON.stringify("id" in (st as Record<string, unknown>) ? (st as Record<string, unknown>)["id"] : "stage[" + i + "]")
        : "stage[" + i + "]";
    if (typeof st === "object" && st !== null && !Array.isArray(st)) {
      const stripped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(st as Record<string, unknown>)) {
        if (k !== "inputs" && k !== "expected") stripped[k] = v;
      }
      try {
        flowFromBody({ id: "probe", stages: [stripped] }, cards);
      } catch (e) {
        if (e instanceof FlowError) {
          rows.push({ stage: label, error: e.message, code: "flow_compile" });
        } else {
          throw e;
        }
      }
    }
  }
  for (const wrow of sweepWorkflows(body, cards)) rows.push(wrow);
  return rows;
}

// ── pin sweep (validateWorkflow + servedNodeClasses, same file) ──
// STROKE 4b (the stroke-2a followup — same defect class): the
// module-level pinCache singleton (read-once, never refreshed) is
// DEAD. The pin now reads through ctx.cardRegistry.objectInfo()
// (the service owns the snapshot, mtime-keyed — a re-pin is never
// stale, strictly fresher than the old read-once cache).
//
// THE PIN'S THREE ANSWERS. An engine that answered is judged
// against what it said — including an answer of zero classes, which
// is an answer and stays fail-closed. Nobody able to ask (no cards
// seat for a non-plugin caller, or an owner whose objectInfo()
// stayed null because the engine never answered) yields null, and
// the sweep judges shape only: a node with no class_type is still a
// refusal, because that judgment needs no engine.
export function servedNodeClasses(cards?: CardRegistryLike | null): Set<string> | null {
  // NULL, NOT EMPTY, when no pin can judge a class: no cards seat (a
  // non-plugin caller), or the owner is mounted but the engine never
  // answered (objectInfo() null — the snapshot is primed by a live
  // read). An empty set and an absent pin are different facts: the
  // first is the engine serving no classes, the second is nobody
  // able to ask. Collapsing them made a down engine refuse every
  // valid workflow with "class_type X is not in the engine's served
  // node set (0 known classes) — fix the class name or install the
  // node" — a false accusation carrying a wrong instruction. The
  // caller skips the membership judgment on null (the schema-only
  // verdict the compose walk's sibling leg already takes when the
  // engine is unreachable); the start door, which composes before
  // queuing, still refuses a genuinely unserved class.
  if (cards === null || cards === undefined) return null;
  const oi: Record<string, unknown> | null = cards.objectInfo();
  if (oi === null) return null;
  return new Set(Object.keys(oi));
}

export function validateWorkflow(params: unknown, cards?: CardRegistryLike | null): string[] {
  // The sweep proves params is a non-null, non-array object (its guard
  // continues otherwise) — the entry cast is honest.
  const wf: unknown = (params as Record<string, unknown>)["workflow"];
  if (typeof wf !== "object" || wf === null || Array.isArray(wf)) return [];
  const wfRec: Record<string, unknown> = wf as Record<string, unknown>;
  const raw: unknown =
    typeof wfRec["workflow"] === "object" && wfRec["workflow"] !== null && !Array.isArray(wfRec["workflow"])
      ? wfRec["workflow"]
      : wf;
  const known: Set<string> | null = servedNodeClasses(cards);
  const rows: string[] = [];
  for (const [nodeId, node] of Object.entries(raw as Record<string, unknown>)) {
    const cls: unknown =
      typeof node === "object" && node !== null && !Array.isArray(node)
        ? (node as Record<string, unknown>)["class_type"]
        : undefined;
    if (cls === undefined || cls === null) {
      rows.push("workflow node " + JSON.stringify(nodeId) + ": no class_type");
    } else if (known !== null && !known.has(typeof cls === "string" ? cls : String(cls))) {
      rows.push(
        "workflow node " +
          JSON.stringify(nodeId) +
          ": class_type " +
          JSON.stringify(cls) +
          " is not in the engine's served node set (" +
          known.size +
          " known classes) — fix the class name or install the node",
      );
    }
  }
  return rows;
}

export function sweepWorkflows(body: unknown, cards?: CardRegistryLike | null): Array<Record<string, unknown>> {
  const stages: unknown =
    typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)["stages"]
      : /* v8 ignore next -- both callers prove a stages-bearing object
           (batchRows returns early otherwise; the compiled flow always
           carries stages) (2026-09-12) */ undefined;
  /* v8 ignore next -- same proof: stages is always an array here (2026-09-12) */
  if (!Array.isArray(stages)) return [];
  const rows: Array<Record<string, unknown>> = [];
  for (let i = 0; i < stages.length; i++) {
    const st: unknown = stages[i];
    if (typeof st !== "object" || st === null || Array.isArray(st)) continue;
    const rec: Record<string, unknown> = st as Record<string, unknown>;
    const engine: unknown = rec["engine"];
    const label: string = JSON.stringify("id" in rec ? rec["id"] : "stage[" + i + "]");
    if (typeof engine !== "string") continue;
    // Only engines exporting validate_workflow are swept (comfyui today — validateWorkflow above owns the judgment).
    // The bus try/except-continue collapses to this since the table is the bus here.
    if (engine !== "comfyui") continue;
    if (typeof rec["params"] !== "object" || rec["params"] === null || Array.isArray(rec["params"])) {
      continue;
    }
    for (const wrow of validateWorkflow(rec["params"], cards)) {
      rows.push({ stage: label, error: wrow, code: "workflow_pin" });
    }
  }
  return rows;
}
