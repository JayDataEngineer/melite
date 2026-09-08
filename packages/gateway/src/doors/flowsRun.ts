// doors/flowsRun.ts — the POST /v1/flows/start, GET
// /v1/flows/status/<id>, POST /v1/flows/stop/<id> arms (the serving
// owner since the oracle death 2026-09-08 — the retired py oracle's
// start/status/stop behavior, frozen by
// the walls below).
//
// SERVED CONTRACT (frozen — the walls pin every row):
//   - submit envelope order: body-must-be-object
//     (bad_envelope/body), test-must-be-bool (bad_envelope/test),
//     CARD BIRTH LAW draft_id required (draft_required) / malformed
//     (draft_malformed, editor_runs.draft_id_ok: <=96
//     [A-Za-z0-9_-]) / unknown doc (draft_unknown, drafts/<id>.json
//     is_file), then resolve_request's _strict_body (retired runner
//     knobs + retired pipe-carry keys) + the flow/flow_inline/model
//     exclusivity refusal.
//   - flow_inline structural compile for the SERVED shape
//     (keeper flow_from_body: top keys {id, description,
//     stages}, non-empty stages, STAGE_KEYS extras, FLOW_ID_RE
//     stage ids) with the frozen texts for those gates.
//   - registration: run-<12hex>-<8hex> ids,
//     {id,name,index,status:pending,outputs,expected} stage rows
//     (engine DEFAULT_OUTPUT fills omitted outputs —
//     "image" for comfyui), skipped_stages [], TEST_OUT_ROOT vs
//     OUT_ROOT routing on test:true (L3), 202 {run_id, status}.
//   - the serial worker over the MERGED path: stages -> running +
//     merged:true, engine executeFlow (ONE submit), per-stage
//     url/gallery (ASSET_URL_PREFIX /v1/assets/runs/<run>/<rel>) +
//     result_outputs + completed; merged failure ->
//     running stages failed/stopped + error, stop-gated ("stop" in
//     the lowercased error AND the flag set); the worker's terminal
//     mapping (stopped if the flag set else completed/failed,
//     "<Type>: <msg>" error).
//   - status body: {run_id, status, stages,
//     skipped_stages, artifacts, error, queue_position} (+ log_tail
//     on ?include_log=1/true/yes), unknown -> 404 {error:
//     "unknown run_id"}; the log tail synthesis is ported verbatim.
//   - stop: unknown -> 400 run_unknown refusal; terminal -> 200
//     {error: "cannot stop run in state %s"}; live -> flag + engine
//     interrupt, 200 {run_id, status: "stopping"}. Receipt-timing
//     note: the retired oracle awaited engine.stop() before
//     answering; this door sets the flag, kicks the interrupt
//     in-flight, and answers immediately (the dispatcher stays
//     synchronous like every other door — the wall pins the receipt
//     BODY and the terminal "stopped" convergence, not the latency).
//
// SERVED SHAPE: single-stage flow_inline runs whose stage engine is
// "comfyui" with params.workflow (+ optional inject, timeout_s,
// output_nodes), AND card-model runs ({model:} — the card composer
// arm in ./flowsCard.ts: resolve -> sweep -> overlay -> in-process
// compose -> the single stage row -> the same engine layer).
// Named flows ({flow:}) and multi-stage graphs are UNPORTED —
// those doors refuse here with an explicit preview_scope 400
// (never a silent accept, QUEUE LANE LAW; the flows-port lane owns
// the rails).
// DOCUMENTED GAPS (oracle retired 2026-09-08 — no py fallback exists):
//   - flow_inline runs write no sidecar (_request.json/_flow.json)
//     and no ledger rows: status reads are registry-live; a
//     restarted process reports unknown run_id (the retired oracle
//     fell back to sidecar_status). CARD RUNS close this gap: the
//     card arm writes the verbatim _request.json + the _flow.json
//     sidecar document (queue.ts sidecarDoc) and the run.queued
//     ledger row.
//   - progress/activity ticks stay tap-less: the engine poll reports
//     nothing mid-run, so mid-run activity frames have no TS source
//     (the retired oracle emitted them) — the bus carries the
//     running/completed/failed/stopped flips + the terminal run frame
//     only.
//   - no engine-boundary unload bookkeeping (single-engine preview).
//   - no per-stage fallback loop: a row the merge planner refuses
//     fails the run with the planner's text (the retired oracle fell
//     back to the per-stage loop before any submit — flows-port
//     lane scope).
//   - no resume/reproduce doors (Phase-5+).
//   - 1.0-style floats serialize as "1" (JSON.stringify) where the
//     retired oracle wrote "1.0" — the served bodies carry no floats.
//
// Engine base URL: engine/comfyui.ts resolveEngineBaseUrl (COMFYUI_URL
// env > endpoint config; no hardcodes). State root: MELITE_STATE_ROOT
// env else the file-anchored repo tree's data/runs — live env reads
// so hermetic walls isolate.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  executeFlow,
  pyReprStr,
  pyReprStrList,
  spliceWorkflow,
  stopForRunDir,
} from "../engine/comfyui.ts";
import type { EngineJson, MergeRow } from "../engine/comfyui.ts";
import { applyRunContract } from "../schema/verbs.ts";
import {
  appendLedger,
  atomicWriteJson,
  pipelineOf,
  sidecarDoc,
} from "../queue/queue.ts";
import type { GraphRow } from "../queue/queue.ts";
import {
  CardArmError,
  phase1Card,
  phase2Card,
  pyStrMid,
} from "./flowsCard.ts";
import type { Phase1Card } from "./flowsCard.ts";
import { terminalFrame } from "../queue/queue.ts";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "../core/errors.ts";
import type { GatewayRequest } from "../ctx.ts";
import { matchRoute } from "../routeUtil.ts";
import {
  checkFlowInlineTop,
  checkFlowsStartEnvelope,
  checkFlowStage,
  checkStrictBody,
  draftIdOk,
  FLOW_INLINE_TOP_VOICE,
  INLINE_TOP_KEYS,
  parseStrictJson,
  STAGE_KEYS,
} from "../core/params.ts";

/** draft_id_ok's old address (owned by the admission gate now). */
export { draftIdOk };

/** Asset URL prefix — owned by editor_runs. */
export const ASSET_URL_PREFIX: string = "/v1/assets/runs";

/** Stage statuses — the run worker's vocabulary (inherited from the retired oracle). */
export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "stopping";

/** One stage row — key order mirrors submit's literal. */
export interface StageRow {
  id: string;
  name: string;
  index: number;
  status: string;
  outputs: Record<string, EngineJson>;
  expected: Record<string, EngineJson>;
  [key: string]: EngineJson | undefined;
}

/** One registry run. */
export interface RunRecord {
  runId: string;
  status: RunStatus;
  stages: StageRow[];
  skippedStages: string[];
  artifacts: string[];
  error: string;
  draftId: string;
  dir: string;
  testFlag: boolean;
  stopFlag: boolean;
  params: Record<string, EngineJson>[];
  outputNodes: Record<string, EngineJson>[];
  /** P6 OUTPUT CONTRACT context: the card whose promise the settle
   *  gate enforces (the retired oracle's worker run-level arm).
   *  Set by the {model:} card arm (the composed card id); absent on
   *  flow_inline rows. The status body builder names explicit keys
   *  and never leaks it. */
  cardId?: string;
}

/** The preview registry (process-local run rows). */
const RUNS: Map<string, RunRecord> = new Map();
const ORDER: string[] = [];
let PUMPING: boolean = false;

/** Test seam: drop all registry state (the wall boots fresh
 *  processes, so this is belt-and-braces for in-process reuse). */
export function resetFlowsRunForTests(): void {
  RUNS.clear();
  ORDER.length = 0;
  PUMPING = false;
}

/** Live-registry probe for the P5 queue refusal seam (ctx.ts
 *  refuseResumeDoor/refuseReproduceDoor over queue.ts): the row's
 *  status, or null when this process owns no live row — mirrors
 *  `gw.runs.get(rid)` (the retired resume/reproduce doors). */
export function liveRunStatus(runId: string): string | null {
  const run: RunRecord | undefined = RUNS.get(runId);
  return run === undefined ? null : run.status;
}

/** The P6 live-bus publisher seam (runs.ts owns the sockets): the
 *  worker publishes stage flips + the terminal run frame here; the
 *  bus door (handleWsUpgrade) registers its deliver fn at import, so
 *  flowsRun never imports the WS framing (no import cycle — the
 *  framing + subscriber sets live in runs.ts). Null until the door
 *  registers (unit callers of runOne see a no-op publish). The bus
 *  never takes the worker down (publish is guarded). */
export type BusPublisher = (
  runId: string,
  event: Record<string, unknown>,
) => void;

let BUS: BusPublisher | null = null;

export function setBusPublisher(fn: BusPublisher | null): void {
  BUS = fn;
}

function publishBus(runId: string, event: Record<string, unknown>): void {
  try {
    BUS?.(runId, event);
  } catch {
    /* the bus never takes the worker down */
  }
}

/** The boot-resurrect registry seam (P5, queue/resurrect.ts): one
 *  rebuilt queued run joins the FIFO. Stages/skipped ride VERBATIM
 *  from the sidecar (list(doc.get(...) or [])) so the live status
 *  door serves the same rows the registry would; error restarts as
 *  "" (the sidecar error is never copied).
 *  Dir always routes to the production output root (the retired
 *  oracle never restored out_root either — test-flag routing is a
 *  submit-time shape, not a record shape). The pump is NOT kicked
 *  here (server.ts boots the queue but starts no worker — the next
 *  start door's pump drains the FIFO in order; PREVIEW GAP: the TS
 *  worker serves preview-scope graphs only, a resurrected foreign
 *  graph fails at the splice with the planner's text instead of
 *  executing per-stage like py). */
export function enqueueResurrected(rec: {
  readonly runId: string;
  readonly draftId: string;
  readonly stages: unknown[];
  readonly skippedStages: unknown[];
  readonly artifacts: string[];
}): void {
  const run: RunRecord = {
    runId: rec.runId,
    status: "queued",
    stages: rec.stages as unknown as StageRow[],
    skippedStages: rec.skippedStages as unknown as string[],
    artifacts: [...rec.artifacts],
    error: "",
    draftId: rec.draftId,
    dir: join(resolveOutRoot(false), rec.runId),
    testFlag: false,
    stopFlag: false,
    params: [],
    outputNodes: [],
  };
  RUNS.set(rec.runId, run);
  if (!ORDER.includes(rec.runId)) ORDER.push(rec.runId);
}

/** The queue snapshot (queued=len(order),
 *  running=1/0, active=run_id/"", queued_ids=list(order)). The TS
 *  registry holds many running rows at most transiently (serial
 *  pump), so running counts rows and active is the first of them. */
export function queueSnapshot(): {
  queued: number;
  running: number;
  active: string;
  queued_ids: string[];
} {
  let running = 0;
  let active = "";
  for (const run of RUNS.values()) {
    if (run.status === "running") {
      running++;
      if (active === "") active = run.runId;
    }
  }
  return { queued: ORDER.length, running, active, queued_ids: [...ORDER] };
}

/** The WS hydrate snapshot (the run
 *  frame for an owned id, plus per-stage patches when the run is
 *  terminal). undefined = unowned (the unknown-run answer). */
export function hydrateSnapshot(
  runId: string,
): { status: string; stages: StageRow[] } | undefined {
  const run: RunRecord | undefined = RUNS.get(runId);
  if (run === undefined) return undefined;
  return { status: run.status, stages: run.stages };
}

// ── roots (STATE_ROOT / OUT_ROOT / TEST_OUT_ROOT) ──

/** State root — MELITE_STATE_ROOT else <repo>/data/runs. The hop
 *  count is DOORS→src→gateway→plugins→repo (4): the doors hop
 *  transcription (parent.parent) landed 3 hops at packages/ — caught
 *  LIVE by the flip (walls always set MELITE_STATE_ROOT on scratch
 *  boots, so the default branch was never exercised on the estate). */
export function resolveStateRoot(): string {
  const override: string = process.env["MELITE_STATE_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..", "data", "runs");
}

/** Output root — test runs route to the sibling root (L3). */
export function resolveOutRoot(testFlag: boolean): string {
  const root: string = resolveStateRoot();
  return testFlag ? join(root, "test-output") : join(root, "output");
}

// ── refusal envelope (error, code, then loc/expected/got) ──

export interface Refusal {
  status: number;
  payload: Record<string, unknown>;
}

function refusal(
  status: number,
  error: string,
  code: string,
  loc?: string,
  expected?: string,
  got?: string,
): Refusal {
  const payload: Record<string, unknown> = { error, code };
  if (loc !== undefined) payload["loc"] = loc;
  if (expected !== undefined) payload["expected"] = expected;
  if (got !== undefined) payload["got"] = got;
  return { status, payload };
}

/** Python type(body).__name__ for the got fields. */
export function pyTypeName(v: unknown): string {
  if (v === null) return "NoneType";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
  if (Array.isArray(v)) return "list";
  if (typeof v === "object") return "dict";
  return "unknown";
}

/** Python %r for short scalars (test-flag text). */
function pyRepr(v: unknown): string {
  if (typeof v === "string") return pyReprStr(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (v === null || v === undefined) return "None";
  return String(v);
}

/** The strict-body gate — vocab + key
 *  split owned by the admission gate; the pinned prose stays here. */
function strictBody(body: Record<string, unknown>): Refusal | null {
  const { bad, carry } = checkStrictBody(body);
  if (bad.length > 0) {
    return refusal(
      400,
      "request body carries retired runner knob(s) " +
        pyReprStrList(bad.sort()) +
        " — the runner never reads these (silent-drop class); remove them",
      "invalid_request",
    );
  }
  if (carry.length > 0) {
    return refusal(
      400,
      "request body carries retired pipe-carry key(s) " +
        pyReprStrList(carry.sort()) +
        " — the 2026-08-10 stowaway wire: no gateway ever " +
        "stashed it (flow_doc was never emitted). The revive " +
        "rail is the draft (draft_id) + the run registry; card " +
        "bodies carry params only",
      "invalid_request",
    );
  }
  return null;
}

// ── flow_inline structural compile (the served shape) ──
// Top/stage key tables owned by the admission gate (imported above);
// the engine/preview_scope policy + params/outputs default-fills
// below stay here (value-domain, not type structure).

export interface CompiledStage {
  readonly id: string;
  readonly params: Record<string, EngineJson>;
  readonly outputs: Record<string, EngineJson>;
  readonly expected: Record<string, EngineJson>;
  readonly outputNodes: Record<string, EngineJson>;
  readonly inputNames: Record<string, string>;
}

function compileFlowInline(
  inline: unknown,
): { stages: CompiledStage[] } | Refusal {
  // Door-level structure rides the admission gate (schemastery);
  // static refusal texts ride its voice table (one lookup).
  // Engine/preview_scope policy + default-fills stay here.
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
    const sid: string = String(st["id"] ?? "");
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
    if (st["card"] !== undefined && String(st["card"] ?? "") !== "") {
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

// ── the start arm ──

function newRunId(): string {
  const rand: string = randomBytes(6).toString("hex");
  const ts: string = ((Date.now() & 0xffffffff) >>> 0)
    .toString(16)
    .padStart(8, "0");
  return "run-" + rand + "-" + ts;
}

/** POST /v1/flows/start — submit's
 *  pre-registration chain. Returns the (status, payload) pair; the
 *  dispatcher serializes via serializePy (byte-identical bodies).
 *  Async: the {model:} arm composes in-process (flowsCard.ts). */
export async function handleFlowsStart(
  doc: unknown,
): Promise<Refusal & { runId?: string }> {
  // Envelope structure rides the admission gate (schemastery);
  // every refusal below keeps its pinned text, in the original
  // order. The on-disk draft lookup stays here (domain, not type).
  const envelope = checkFlowsStartEnvelope(doc);
  if (envelope.kind === "not-object") {
    return refusal(
      400,
      "request body must be a JSON object",
      "bad_envelope",
      "body",
      "object",
      pyTypeName(doc),
    );
  }
  if (envelope.kind === "bad-test") {
    return refusal(
      400,
      "test flag must be a boolean (got " +
        pyTypeName(envelope.testFlag) +
        " " +
        pyRepr(envelope.testFlag) +
        ")",
      "bad_envelope",
      "test",
      "boolean",
      pyTypeName(envelope.testFlag),
    );
  }
  if (envelope.kind === "missing-draft") {
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
  }
  if (envelope.kind === "malformed-draft") {
    return refusal(
      400,
      "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): " +
        pyReprStr(envelope.draftId),
      "draft_malformed",
      "draft_id",
      "[A-Za-z0-9_-]{1,96}",
      envelope.draftId.slice(0, 60),
    );
  }
  const body: Record<string, unknown> = envelope.body;
  const testFlag: boolean = envelope.testFlag;
  const draftId: string = body["draft_id"] as string;
  if (!existsSync(join(resolveStateRoot(), "drafts", draftId + ".json"))) {
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
  const strict: Refusal | null = strictBody(body);
  if (strict !== null) return strict;
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
  if ("model" in body) {
    return handleCardStart(body, testFlag, draftId);
  }
  if (!("flow_inline" in body)) {
    if ("flow" in body) {
      return refusal(
        400,
        "{flow} runs are unported on this gateway — " +
          "serve flow_inline comfyui runs here",
        "preview_scope",
      );
    }
    return refusal(
      400,
      "no flow selected: provide flow, flow_inline or model",
      "invalid_request",
    );
  }
  const compiled: { stages: CompiledStage[] } | Refusal = compileFlowInline(
    body["flow_inline"],
  );
  if (!("stages" in compiled)) return compiled;
  if (compiled.stages.length !== 1) {
    return refusal(
      400,
      "this gateway serves single-stage flow_inline runs only (" +
        compiled.stages.length +
        " stages) — multi-stage graphs are unported",
      "preview_scope",
    );
  }
  const runId: string = newRunId();
  const dir: string = join(resolveOutRoot(testFlag), runId);
  mkdirSync(dir, { recursive: true });
  const st: CompiledStage = compiled.stages[0] as CompiledStage;
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
    outputNodes: [st.outputNodes],
  };
  (run as { inputNames?: Record<string, Record<string, string>> }).inputNames =
    { [st.id]: st.inputNames };
  RUNS.set(runId, run);
  ORDER.push(runId);
  void pump();
  return {
    status: 202,
    payload: { run_id: runId, status: "queued" },
    runId,
  };
}

// ── the {model:} card arm (resolve -> compose -> register) ──

/** Map a CardArmError onto the refusal envelope (byte parity: the
 *  error verbatim + code + loc/expected/got only when set). */
function cardRefusal(err: CardArmError): Refusal {
  return refusal(
    err.status,
    err.message,
    err.code,
    err.loc,
    err.expected,
    err.got,
  );
}

/** The card start arm (the {model:} path):
 *  phase-1 compose (run_id "") BEFORE registration (a params
 *  refusal names its field, never a zombie slot), mint the run id,
 *  phase-2 compose the SAME overlaid body with the real id, wrap
 *  the PromptGraph as the single stage row (the rim), register +
 *  sidecar (_request.json verbatim + _flow.json) + the run.queued
 *  ledger row, pump. Every compose failure refuses with the phase-N
 *  voice and registers nothing. */
async function handleCardStart(
  body: Record<string, unknown>,
  testFlag: boolean,
  draftId: string,
): Promise<Refusal & { runId?: string }> {
  const mid: string = pyStrMid(body["model"]);
  let p1: Phase1Card;
  try {
    p1 = await phase1Card(body, mid);
  } catch (e) {
    if (e instanceof CardArmError) return cardRefusal(e);
    throw e;
  }
  const runId: string = newRunId();
  let graph: Record<string, unknown>;
  try {
    graph = (await phase2Card(p1, runId)).graph;
  } catch (e) {
    if (e instanceof CardArmError) return cardRefusal(e);
    throw e;
  }
  const skeleton: string = p1.skeleton;
  const dir: string = join(resolveOutRoot(testFlag), runId);
  mkdirSync(dir, { recursive: true });
  const params: Record<string, EngineJson> = {
    workflow: graph as unknown as EngineJson,
  };
  const run: RunRecord = {
    runId,
    status: "queued",
    stages: [
      {
        id: skeleton,
        name: skeleton,
        index: 0,
        status: "pending",
        outputs: {},
        expected: {},
      },
    ],
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId,
    dir,
    testFlag,
    stopFlag: false,
    params: [params],
    outputNodes: [{}],
    cardId: p1.card,
  };
  (run as { inputNames?: Record<string, Record<string, string>> }).inputNames =
    { [skeleton]: {} };
  const createdAt: number = Date.now() / 1000;
  const graphRows: GraphRow[] = [
    {
      id: skeleton,
      type: "comfyui",
      input_from: [],
      input_names: {},
      outputs: {},
      params: { workflow: graph },
    },
  ];
  RUNS.set(runId, run);
  ORDER.push(runId);
  // R3 durable queue (submit 1322 + 1347-1351): the verbatim request
  // rides _request.json, the compiled document rides _flow.json, and
  // run.queued in the ledger is what a restart reconciles against.
  const stateRoot: string = resolveStateRoot();
  try {
    atomicWriteJson(join(dir, "_request.json"), body);
  } catch {
    /* the sidecar must never take registration down */
  }
  try {
    atomicWriteJson(
      join(dir, "_flow.json"),
      sidecarDoc({
        runId,
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
        createdAt,
        testFlag,
        draftId,
        pipeline: pipelineOf(body),
        graph: graphRows,
      }),
    );
  } catch {
    /* the sidecar must never take registration down */
  }
  appendLedger(stateRoot, "run.queued", {
    run_id: runId,
    draft_id: draftId,
    pipeline: pipelineOf(body),
  });
  void pump();
  return {
    status: 202,
    payload: { run_id: runId, status: "queued" },
    runId,
  };
}

// ── the worker (the merged path) ──

function runRel(run: RunRecord, art: string): string {
  if (art === run.dir) return basenameSafe(art);
  const prefix: string = run.dir + "/";
  if (art.startsWith(prefix)) return art.slice(prefix.length);
  const base: string = basenameSafe(art);
  return base === "" || base === "." ? basenameSafe(art) : base;
}

function basenameSafe(p: string): string {
  const i: number = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i < 0 ? p : p.slice(i + 1);
}

function errName(err: unknown): string {
  if (err instanceof Error && typeof err.name === "string" && err.name !== "") {
    return err.name;
  }
  return "Error";
}

function errText(err: unknown): string {
  const msg: string = err instanceof Error ? err.message : String(err);
  return errName(err) + ": " + msg;
}

async function pump(): Promise<void> {
  if (PUMPING) return;
  PUMPING = true;
  try {
    for (;;) {
      const next: string | undefined = ORDER.shift();
      if (next === undefined) return;
      const run: RunRecord | undefined = RUNS.get(next);
      if (run === undefined) continue;
      await runOne(run);
    }
  } finally {
    PUMPING = false;
  }
}

async function runOne(run: RunRecord): Promise<void> {
  run.status = "running";
  for (const stage of run.stages) {
    stage["status"] = "running";
    stage["merged"] = true;
    // P6 live bus (the worker): the running flip rides
    // the run's channel the moment it lands (key order as py).
    publishBus(run.runId, {
      type: "stage",
      stage: stage.id,
      index: stage.index,
      status: "running",
    });
  }
  const inputNames: Record<string, Record<string, string>> =
    ((run as { inputNames?: Record<string, Record<string, string>> }).inputNames ??
      {}) as Record<string, Record<string, string>>;
  let rows: MergeRow[];
  try {
    rows = run.stages.map(
      (stage, i: number): MergeRow => ({
        stageId: stage.id,
        workflow: spliceWorkflow(run.params[i] as Record<string, EngineJson>),
        outputs: { ...(stage.outputs as Record<string, EngineJson>) },
        outputNodes: { ...(run.outputNodes[i] as Record<string, EngineJson>) },
        params: { ...(run.params[i] as Record<string, EngineJson>) },
      }),
    );
  } catch (exc: unknown) {
    // splice refusal pre-submit: the run fails with the planner's
    // text (the per-stage fallback loop is Phase-5 scope).
    const text: string = errText(exc);
    for (const stage of run.stages) {
      if (stage["status"] === "running") {
        stage["status"] = "failed";
        stage["error"] = text;
        // P6 live bus (merged-failure shape): the failed
        // flip rides before the terminal broadcast below.
        publishBus(run.runId, {
          type: "stage",
          stage: stage.id,
          index: stage.index,
          status: "failed",
          error: text,
        });
      }
    }
    run.status = "failed";
    run.error = text;
    // P6 live bus (the worker: every subscriber gets the
    // final status exactly once — the terminalFrame shape is inherited
    // from queue.ts; the door closes the socket after delivering it.
    publishBus(run.runId, terminalFrame("failed"));
    return;
  }
  try {
    // the merged-submit activity frame (mergegraph execute_flow's
    // silent({"activity": "merged submit (%d stages, %d nodes)"})
    // via the gateway _report: stamped pre-submit, popped on
    // completion is popped on settle, LEFT on failure — the
    // stopped-body agreement depends on this key riding along).
    const nodeCount: number = rows.reduce(
      (n: number, r: MergeRow): number =>
        n + Object.keys(r.workflow).length,
      0,
    );
    for (const stage of run.stages) {
      stage["activity"] =
        "merged submit (" + rows.length + " stages, " + nodeCount + " nodes)";
    }
    const result = await executeFlow(
      rows,
      run.dir,
      inputNames,
      {},
      { shouldStop: (): boolean => run.stopFlag },
    );
    for (const stage of run.stages) {
      const row = result.stages[stage.id] ?? { outputs: {}, artifacts: [] };
      const arts: string[] = row.artifacts.filter(
        (a: string): boolean => a !== "",
      );
      run.artifacts.push(...arts);
      if (arts.length > 0) {
        const base: string = ASSET_URL_PREFIX + "/" + run.runId + "/";
        const names: string[] = arts.map((a: string): string => runRel(run, a));
        stage["url"] = base + names[0];
        stage["gallery"] = names.map(
          (n: string): EngineJson => ({ url: base + n, name: n }),
        ) as unknown as EngineJson;
      }
      stage["result_outputs"] = { ...row.outputs } as unknown as EngineJson;
      stage["status"] = "completed";
      delete stage["progress"];
      delete stage["activity"];
      // P6 live bus (the worker): per-stage completed
      // harvest frame, key order as py.
      publishBus(run.runId, {
        type: "stage",
        stage: stage.id,
        index: stage.index,
        status: "completed",
      });
    }
    run.status = run.stopFlag ? "stopped" : "completed";
    // P6 OUTPUT CONTRACT, run-level arm (the worker): a
    // completed run carrying card context must have delivered what
    // its card promises — the violation flips it to failed with the
    // exact refusal (documented failure, the queue continues). No
    // per-stage arm here: the merged path has none —
    // the per-stage gate lives in the per-stage loop the retired oracle ran)
    // this preview worker does not run. cardId rides the {model:}
    // card arm (absent on flow_inline rows, where the gate stays a
    // no-op — the wall exercises applyRunContract directly,
    // py-vs-TS byte-equal).
    if (run.status === "completed") {
      const settled = applyRunContract(
        { status: run.status, error: run.error },
        run.artifacts,
        run.cardId,
      );
      run.status = settled.status as RunStatus;
      run.error = settled.error;
    }
    // P6 live bus (the worker): the terminal broadcast rides
    // the SETTLED status (post contract-gate above) — then the door
    // closes the socket.
    publishBus(run.runId, terminalFrame(run.status));
  } catch (exc: unknown) {
    const text: string = errText(exc);
    const stopped: boolean =
      run.stopFlag && text.toLowerCase().includes("stop");
    for (const stage of run.stages) {
      if (stage["status"] === "running") {
        stage["status"] = stopped ? "stopped" : "failed";
        stage["error"] = text;
        // P6 live bus (merged-failure shape).
        publishBus(run.runId, {
          type: "stage",
          stage: stage.id,
          index: stage.index,
          status: stage["status"],
          error: text,
        });
      }
    }
    if (stopped) {
      run.status = "stopped";
      publishBus(run.runId, terminalFrame("stopped"));
      return;
    }
    run.status = "failed";
    run.error = text;
    publishBus(run.runId, terminalFrame("failed"));
  }
}

// ── the log tail (verbatim logic) ──

export function runLogTail(obj: {
  status?: unknown;
  queue_position?: unknown;
  error?: unknown;
  stages?: unknown;
  artifacts?: unknown;
}): string {
  const lines: string[] = [];
  const status: string = String(obj.status ?? "?");
  const qp: unknown = obj.queue_position;
  let head: string = "run: " + status;
  if (status === "queued" && typeof qp === "number" && qp > 0) {
    head += " (queue position " + qp + ")";
  }
  if (obj.error) head += " — " + String(obj.error).slice(0, 300);
  lines.push(head);
  const stages: unknown = obj.stages;
  if (Array.isArray(stages)) {
    for (const st of stages as Record<string, unknown>[]) {
      if (typeof st !== "object" || st === null || Array.isArray(st)) continue;
      const name: string = String(st["name"] ?? st["id"] ?? "stage");
      let line: string = name + ": " + String(st["status"] ?? "?");
      const p: unknown = st["progress"];
      if (
        typeof p === "object" && p !== null && !Array.isArray(p) &&
        (p as Record<string, unknown>)["max"]
      ) {
        line +=
          " — " +
          String((p as Record<string, unknown>)["value"]) +
          "/" +
          String((p as Record<string, unknown>)["max"]);
      }
      const a: unknown = st["activity"];
      if (typeof a === "object" && a !== null && !Array.isArray(a)) {
        const rec = a as Record<string, unknown>;
        const ph: string = String(rec["phase"] ?? "");
        const msg: unknown = rec["message"] ?? rec["node_class"];
        line += " [" + ph + (msg ? ": " + String(msg) : "") + "]";
      }
      if (st["error"]) line += "\n  error: " + String(st["error"]).slice(0, 300);
      lines.push(line);
    }
  }
  const arts: unknown = obj.artifacts;
  if (Array.isArray(arts) && (arts as unknown[]).length > 0) {
    const names: string[] = [];
    for (const a of (arts as unknown[]).slice(0, 6)) {
      const v: unknown =
        typeof a === "object" && a !== null && !Array.isArray(a)
          ? ((a as Record<string, unknown>)["url"] ??
            (a as Record<string, unknown>)["name"])
          : a;
      const s: string = String(v ?? "").split("/").pop() ?? "";
      if (s !== "") names.push(s);
    }
    if (names.length > 0) lines.push("artifacts: " + names.join(", "));
  }
  return lines.slice(-80).join("\n");
}

// ── the status arm ──

/** GET /v1/flows/status/<id> (live rows only; restarted processes
 *  report unknown — no sidecar fallback exists, see the header). */
export function handleFlowsStatus(
  runId: string,
  includeLog: boolean,
): Refusal {
  const run: RunRecord | undefined = RUNS.get(runId);
  if (run === undefined) {
    return refusal(404, "unknown run_id", "invalid_request");
  }
  const payload: Record<string, unknown> = {
    run_id: run.runId,
    status: run.status,
    stages: run.stages,
    skipped_stages: [...run.skippedStages],
    artifacts: [...run.artifacts],
    error: run.error,
    queue_position: ORDER.includes(run.runId) ? ORDER.indexOf(run.runId) : 0,
  };
  if (includeLog) payload["log_tail"] = runLogTail(payload as never);
  return { status: 200, payload };
}

/** POST /v1/flows/stop/<id>:
 *  unknown -> 400 run_unknown; terminal -> 200 {error}; live ->
 *  flag + engine interrupt (kicked in-flight; the dispatcher
 *  stays synchronous — the wall pins the receipt BODY and the
 *  terminal "stopped" convergence, not the latency). */
export function handleFlowsStop(runId: string): Refusal {
  const run: RunRecord | undefined = RUNS.get(runId);
  if (run === undefined) {
    return refusal(400, "unknown run_id " + pyReprStr(runId), "run_unknown", "run_id");
  }
  if (run.status !== "queued" && run.status !== "running") {
    return {
      status: 200,
      payload: { error: "cannot stop run in state " + run.status },
    };
  }
  run.stopFlag = true;
  void stopForRunDir(run.dir).catch((): void => {
    // the flag is the authority; a failed interrupt POST still
    // lands via the worker's stop check (best-effort, as py).
  });
  return { status: 200, payload: { run_id: runId, status: "stopping" } };
}

/** ?include_log= truth set — mirrors str(q).lower() in
 *  ("1","true","yes"). */
export function parseIncludeLog(first: string | null): boolean {
  return (
    first !== null && ["1", "true", "yes"].includes(first.toLowerCase())
  );
}

/** The flows start door as a self-registering
 *  plugin: registry-live runs over the engine/comfyui.ts client;
 *  start strict-parses under route()'s strict contract. Matches its
 *  own row inside the listener — no central table. */
export const flowsStartDoors: Plugin = {
  name: "gateway-flows-start",
  inject: ["gatewayError"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null || hit.row.handler !== "_h_flows_start") {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const parsed: { doc: unknown } | {
          status: number;
          payload: Record<string, unknown>;
        } = parseStrictJson(req.body);
        if (!("doc" in parsed)) {
          return {
            status: parsed.status,
            body: errors.serializePy(parsed.payload),
            contentType: "application/json",
            headers: {},
          };
        }
        const answered: {
          status: number;
          payload: Record<string, unknown>;
        } = await handleFlowsStart(parsed.doc);
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

/** The flows stop door as a self-registering
 *  plugin: regex arms ride the match groups. Matches its own row
 *  inside the listener — no central table. */
export const flowsStopDoors: Plugin = {
  name: "gateway-flows-stop",
  inject: ["gatewayError"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null || hit.row.handler !== "_h_flows_stop") {
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
        } = handleFlowsStop(runId);
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
