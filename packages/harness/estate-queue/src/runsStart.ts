// runsStart.ts — the start arm's pure chain, re-homed VERBATIM from
// the dead flowsRun door (REBUILD-6): the flow_inline structural
// compile (frozen texts over the admission verdicts in
// ./runsGates.ts) and the registration tail (mint + dir + the rich
// run row). Refusals keep the door's byte-pinned prose as tagged
// unions — the remote maps them to the protocol's ONE RemoteError.
//
// SCOPE (the preview-scope law rides on): this stroke serves
// single-stage comfyui flow_inline runs. {model:} (the card arm)
// and {flow:} (the registry lane) refuse LOUD with the door's
// preview-scope posture — their remotes land in later strokes;
// multi-stage / card= / skip_when / non-comfyui refuse at the
// compile gates exactly as the door did.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { EngineJson } from "@melite/comfyui-cordis";
import { pyReprStr, pyReprStrList } from "@melite/comfyui-cordis";
import {
  FLOW_INLINE_TOP_VOICE,
  INLINE_TOP_KEYS,
  STAGE_KEYS,
  checkFlowInlineTop,
  checkFlowStage,
} from "./runsGates.ts";
import { appendLedger, atomicWriteJson, newRunId, outRootFor, refusal, pyTypeName, pyRepr, sidecarDoc } from "./queue.ts";
import type { QueueRefusal } from "./queue.ts";
import type { GraphRow } from "./queue.ts";
import type { RunRecord, StageRow } from "./runsTypes.ts";

/** The door's refusal shape (status carries the py HTTP class; the
 *  remote folds it into RemoteError details). */
export type StartRefusal = QueueRefusal;

/** One compiled stage (the rim the worker splices). */
export interface CompiledStage {
  readonly id: string;
  readonly params: Record<string, EngineJson>;
  readonly outputs: Record<string, EngineJson>;
  readonly expected: Record<string, EngineJson>;
  readonly outputNodes: Record<string, EngineJson>;
  readonly inputNames: Record<string, string>;
}

/** flow_inline structural compile — door-verbatim (structure via
 *  the admission verdicts, voice here; the engine policy +
 *  default-fills below are value-domain, not type structure). */
export function compileFlowInline(
  inline: unknown,
): { stages: CompiledStage[] } | StartRefusal {
  const top = checkFlowInlineTop(inline);
  if (top.kind === "not-object" || top.kind === "bad-stages") {
    return refusal(400, FLOW_INLINE_TOP_VOICE[top.kind], "invalid_request");
  }
  if (top.kind === "unknown-keys") {
    return refusal(
      400,
      "flow body carries unknown keys " +
        pyReprStrList(top.dead) +
        " — allowed: " +
        pyReprStrList([...INLINE_TOP_KEYS].sort()),
      "invalid_request",
    );
  }
  if (top.kind === "missing-id-stages") {
    return refusal(
      400,
      "flow body needs at least id and stages — got keys " +
        pyReprStrList(top.keys),
      "invalid_request",
    );
  }
  const rec: Record<string, unknown> = top.rec;
  const stages: CompiledStage[] = [];
  const rows = rec["stages"] as Record<string, unknown>[];
  for (let i: number = 0; i < rows.length; i++) {
    const checked = checkFlowStage(rows[i] as unknown);
    if (checked.kind === "not-object") {
      return refusal(
        400,
        "stage[" + i + "] must be an object",
        "invalid_request",
      );
    }
    if (checked.kind === "unknown-fields") {
      const st: Record<string, unknown> = checked.st;
      return refusal(
        400,
        "stage[" +
          i +
          "] " +
          pyReprStr(String(st["id"] ?? "<no id>")) +
          ": body carries unknown field(s) " +
          pyReprStrList(checked.extras) +
          " — the schema declares " +
          pyReprStrList([...STAGE_KEYS].sort()) +
          " (extra=forbid at the door)",
        "invalid_request",
      );
    }
    if (checked.kind === "bad-id") {
      const sid: string = String(checked.st["id"] ?? "");
      return refusal(
        400,
        "stage id " + pyReprStr(sid) + " is not a legal identifier",
        "invalid_request",
      );
    }
    const st: Record<string, unknown> = checked.st;
    // (the bad-id gate above refuses id-less stages — the id is a
    // string here.)
    const sid: string = st["id"] as string;
    const engine: string = String(st["engine"] ?? "");
    if (engine === "") {
      return refusal(
        400,
        "stage " + pyReprStr(sid) + ": no engine named",
        "invalid_request",
      );
    }
    if (engine !== "comfyui") {
      return refusal(
        400,
        "flow_inline stage " +
          pyReprStr(sid) +
          " names engine " +
          pyReprStr(engine) +
          " — this gateway serves comfyui stages only (other engines are unported)",
        "preview_scope",
      );
    }
    // No branch pruning on this gateway: skip_when is unported.
    if (st["skip_when"] !== undefined && st["skip_when"] !== null) {
      return refusal(
        400,
        "flow_inline stage " +
          pyReprStr(sid) +
          ": skip_when is unported on this gateway",
        "preview_scope",
      );
    }
    // (the undefined guard above fired — the ?? below is dead.)
    if (st["card"] !== undefined && String(st["card"]) !== "") {
      return refusal(
        400,
        "flow_inline stage " +
          pyReprStr(sid) +
          ": card= stages are unported on this gateway",
        "preview_scope",
      );
    }
    const params: Record<string, EngineJson> =
      typeof st["params"] === "object" && st["params"] !== null && !Array.isArray(st["params"])
        ? (st["params"] as Record<string, EngineJson>)
        : {};
    const outputs: Record<string, EngineJson> =
      typeof st["outputs"] === "object" && st["outputs"] !== null && !Array.isArray(st["outputs"])
        ? (st["outputs"] as Record<string, EngineJson>)
        : { default: "image" }; // the engine DEFAULT_OUTPUT fill
    const expected: Record<string, EngineJson> =
      typeof st["expected"] === "object" && st["expected"] !== null && !Array.isArray(st["expected"])
        ? (st["expected"] as Record<string, EngineJson>)
        : {};
    const outputNodes: Record<string, EngineJson> =
      typeof params["output_nodes"] === "object" &&
      params["output_nodes"] !== null &&
      !Array.isArray(params["output_nodes"])
        ? (params["output_nodes"] as Record<string, EngineJson>)
        : {};
    const inputNames: Record<string, string> = {};
    const inputs = st["inputs"];
    if (typeof inputs === "object" && inputs !== null && !Array.isArray(inputs)) {
      for (const [name, ref] of Object.entries(inputs as Record<string, unknown>)) {
        const rr = ref as Record<string, unknown>;
        if (
          typeof rr === "object" && rr !== null && !Array.isArray(rr) &&
          typeof rr["stage"] === "string" && typeof rr["output"] === "string"
        ) {
          inputNames[name] = String(rr["stage"]) + "." + String(rr["output"]);
        } else if (typeof rr === "object" && rr !== null && !Array.isArray(rr) && typeof rr["initial"] === "string") {
          inputNames[name] = "__initial__." + String(rr["initial"]);
        }
      }
    }
    stages.push({ id: sid, params, outputs, expected, outputNodes, inputNames });
  }
  return { stages };
}

/** The door-selection gate: exactly one of flow / flow_inline /
 *  model, in DOOR order for the ambiguity text (resolve_request
 *  302). Returns the selected door key, or the refusal. */
export function selectSubmitDoor(
  body: Record<string, unknown>,
): { door: "flow" | "flow_inline" | "model" } | StartRefusal {
  const doors: string[] = (["flow", "flow_inline", "model"] as const).filter(
    (k: string): boolean => k in body,
  );
  if (doors.length > 1) {
    return refusal(
      400,
      "ambiguous request: names " +
        pyReprStrList(doors) +
        " — provide exactly one of flow, flow_inline, model",
      "invalid_request",
    );
  }
  if (doors.length === 0) {
    return refusal(
      400,
      "no flow selected: provide flow, flow_inline or model",
      "invalid_request",
    );
  }
  return { door: doors[0] as "flow" | "flow_inline" | "model" };
}

/** The envelope refusal texts (door-verbatim, for the remote's
 *  envelope walk). Kept as a table — one voice each, like the
 *  admission gate's static tables. */
export function envelopeRefusal(
  kind: "not-object" | "bad-test" | "missing-draft" | "malformed-draft",
  doc: unknown,
  detail?: { testFlag?: unknown; draftId?: string },
): StartRefusal {
  switch (kind) {
    case "not-object":
      return refusal(
        400,
        "request body must be a JSON object",
        "bad_envelope",
        "body",
        "object",
        pyTypeName(doc),
      );
    case "bad-test":
      return refusal(
        400,
        "test flag must be a boolean (got " +
          pyTypeName(detail?.testFlag) +
          " " +
          pyRepr(detail?.testFlag) +
          ")",
        "bad_envelope",
        "test",
        "boolean",
        pyTypeName(detail?.testFlag),
      );
    case "missing-draft":
      return refusal(
        400,
        "draft_id is required — every run is born from an " +
          "action card (CARD BIRTH LAW); compose the card first: " +
          "POST /v1/flows/drafts, then start with its draft_id " +
          "(docs/cards/draft-door.md)",
        "draft_required",
        "draft_id",
        "doc-backed draft id",
        "absent",
      );
    case "malformed-draft":
      return refusal(
        400,
        "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): " +
          pyReprStr(detail?.draftId ?? ""),
        "draft_malformed",
        "draft_id",
        "[A-Za-z0-9_-]{1,96}",
        (detail?.draftId ?? "").slice(0, 60),
      );
  }
}

/** The unknown-draft refusal (door-verbatim; the probe rides the
 *  caller's drafts domain — the remote hops the ctx seat). */
export function unknownDraftRefusal(draftId: string): StartRefusal {
  return refusal(
    400,
    "unknown draft_id " +
      pyReprStr(draftId) +
      " — no card doc at drafts/" +
      draftId +
      ".json; compose the card first: POST /v1/flows/drafts",
    "draft_unknown",
    "draft_id",
    "existing card doc",
    draftId.slice(0, 60),
  );
}

/** The registration tail (door-verbatim): mint the id, route the
 *  out root on the test flag, build the rich run row. The caller
 *  (the remote) enqueues it on the queue core + kicks the pump.
 *  Returns the row and its queue position. */
export function registerCompiledRun(args: {
  compiled: { stages: CompiledStage[] };
  testFlag: boolean;
  draftId: string;
  stateRoot: string;
  enqueue: (row: { runId: string; status: string; error: string; createdAt: number; draftId: string; testFlag: boolean; stopFlag: boolean }) => number;
  /** The {model:} card door carries its own run identity (minted
   *  BEFORE phase-2 compose — a refusal names its field, never a
   *  zombie slot) + the pipeline/cardId/request body for the
   *  registration writes. */
  door?: {
    runId: string;
    pipeline: string;
    cardId: string;
    requestBody: Record<string, unknown>;
    /** The bench doc read at submit (stroke 45d) — the FULL workflow
     *  the run was born from (all stages + intent), stamped verbatim
     *  so the wand restores the whole flow, not just the ran card. */
    benchDoc?: Record<string, unknown>;
  };
}): { run: RunRecord; queuePosition: number } {
  const { compiled, testFlag, draftId, stateRoot, enqueue, door } = args;
  const runId: string = door?.runId ?? newRunId();
  const dir: string = join(outRootFor(stateRoot, testFlag), runId);
  mkdirSync(dir, { recursive: true });
  const st: CompiledStage = compiled.stages[0] as CompiledStage;
  const createdAt: number = Date.now() / 1000;
  const graphRows: GraphRow[] = [
    {
      id: st.id,
      type: "comfyui",
      input_from: [],
      input_names: {},
      outputs: { ...st.outputs },
      params: { ...st.params },
    },
  ];
  const run: RunRecord = {
    runId,
    status: "queued",
    stages: [
      {
        id: st.id,
        name: st.id,
        index: 0,
        status: "pending",
        outputs: { ...st.outputs },
        expected: { ...st.expected },
      },
    ],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId,
    dir,
    testFlag,
    stopFlag: false,
    params: [st.params],
    createdAt,
    pipeline: "flow_inline",
    graphRows,
    outputNodes: [st.outputNodes],
  };
  run.inputNames = { [st.id]: st.inputNames };
  if (door !== undefined) {
    run.cardId = door.cardId;
    run.pipeline = door.pipeline;
  }
  // THE CARD SNAPSHOT LAW (stroke 45, the operator's wand complaint):
  // _flow.json's stage faces are HOLLOW (ids/status only) — the card
  // + params that actually ran were recorded nowhere, so "restore the
  // workflow that made this image" could only re-read the MUTABLE
  // bench draft and serve whatever it holds NOW. The card arm knows
  // the exact card + body here; they ride the sidecar verbatim. The
  // wand reconstructs from THIS, never from the living bench.
  if (door !== undefined) {
    run.cardSnapshot = {
      card: door.cardId,
      params: door.requestBody,
    };
    const benchStages = Array.isArray(door.benchDoc?.["stages"])
      ? door.benchDoc?.["stages"]
      : undefined;
    if (benchStages !== undefined && (benchStages as unknown[]).length > 0) {
      run.benchSnapshot = {
        stages: benchStages,
        intent: typeof door.benchDoc?.["intent"] === "string"
          ? door.benchDoc?.["intent"]
          : "",
      };
    }
  }
  // R3 durable queue (submit 1317-1351): the verbatim request
  // rides _request.json, the compiled document rides _flow.json,
  // and run.queued in the ledger is what a restart reconciles
  // against. The card door passes its body; the inline door passes
  // the envelope's flow_inline doc below (same writes, same order).
  const requestBody: unknown = door?.requestBody ?? compiled;
  atomicWriteJson(join(dir, "_request.json"), requestBody);
  atomicWriteJson(join(dir, "_flow.json"), sidecarDocFor(run));
  appendLedger(stateRoot, "run.queued", {
    run_id: runId,
    draft_id: draftId,
    pipeline: run.pipeline,
  });
  const queuePosition: number = enqueue(run);
  return { run, queuePosition };
}

/** The queued sidecar doc for a registered run (the queue.ts
 *  sidecarDoc over the row's live stage faces — the same writer
 *  the settle path rides). */
function sidecarDocFor(run: RunRecord): Record<string, unknown> {
  return sidecarDoc({
    runId: run.runId,
    status: "queued",
    error: "",
    stages: run.stages.map((s) => ({
      id: s.id,
      name: s.name,
      index: s.index,
      status: s.status,
      outputs: { ...(s.outputs as Record<string, unknown>) },
      expected: { ...(s.expected as Record<string, unknown>) },
    })),
    skippedStages: [],
    artifacts: [],
    createdAt: run.createdAt,
    testFlag: run.testFlag,
    draftId: run.draftId,
    pipeline: run.pipeline,
    graph: run.graphRows,
    cardSnapshot: run.cardSnapshot,
    benchSnapshot: run.benchSnapshot,
  });
}
