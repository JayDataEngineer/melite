import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage"
// runsStart.ts — the start arm's pure chain, re-homed VERBATIM from
// the dead flowsRun door (REBUILD-6): the flow_inline structural
// compile (frozen texts over the admission verdicts in
// ./runsGates.ts) and the registration tail (mint + dir + the rich
// run row). Refusals keep the door's byte-pinned prose as tagged
// unions — the remote maps them to the protocol's ONE RemoteError.
//
// SCOPE (2026-10-10, the records audit's S1 — this header described
// a scope two strokes out of date and now contradicted its own body):
// this module is the start arm's chain for EVERY run shape the runs
// service registers — {model:} card runs, {flow:} registry runs,
// {flow_inline:} inline runs, and MULTI-STAGE bench rows. The
// refusals that remain are the ones listed at their own arms: the
// compile gates (an unknown node, an undeclared input, a dead wire,
// a self-wire) and the initial gate (a missing FromStage initial).

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { EngineJson } from "@melite/comfyui-cordis";
import { engineIdOk } from "@melite/engine-contract";
import {
  FLOW_INLINE_TOP_VOICE,
  INLINE_TOP_KEYS,
  STAGE_KEYS,
  checkFlowInlineTop,
  checkFlowStage,
} from "./runsGates.ts";
import { appendLedger, atomicWriteJson, newRunId, outRootFor, refusal, sidecarDoc, sidecarStageOf, variantOfBodies } from "./queue.ts";
import type { QueueRefusal } from "./queue.ts";
import { rootsManifest } from "./rootsManifest.ts";
import { saveBenchSnapshotStages } from "@melite/contracts/benchSnapshot";
import { collectSourceRefs, resolveSourceRefs } from "./runsSourceEcho.ts";
import type { SourceEchoRef } from "./runsSourceEcho.ts";
import type { GraphRow } from "./queue.ts";
import type { RunRecord, RunStageRow } from "./runsTypes.ts";

/** The door's refusal shape (status carries the HTTP class; the
 *  remote folds it into RemoteError details). */
export type StartRefusal = QueueRefusal;

/** One compiled stage (the rim the worker splices). */
export interface CompiledStage {
  readonly id: string;
  /** The stage's engine id (stroke 53): the card plane's engine or 'mcp:<server>'
   *  — the door's engine gate admits exactly these; carried through
   *  to the run rows so the worker dispatches by it. */
  readonly engine: string;
  readonly params: Record<string, EngineJson>;
  readonly outputs: Record<string, EngineJson>;
  readonly expected: Record<string, EngineJson>;
  readonly outputNodes: Record<string, EngineJson>;
  readonly inputNames: Record<string, string>;
}

/** flow_inline structural compile — door-verbatim (structure via
 *  the admission verdicts, voice here; the engine policy +
 *  default-fills below are value-domain, not type structure).
 *
 *  THE ENGINE GATE (stroke 53, the engine-generics seam): the
 *  engine id must be GRAMMATICAL (the card plane's engine or 'mcp:<server>',
 *  engine-contract's engineIdOk) AND known to the caller. The
 *  caller passes the live registry ids (the 'engines' seat when
 *  mounted); the default (CARD_PLANE_ENGINE) keeps every seat-less boot
 *  (fixtures, walls) on the pre-seam voice. */
export function compileFlowInline(
  inline: unknown,
  knownEngines: readonly string[] = [CARD_PLANE_ENGINE],
): { stages: CompiledStage[] } | StartRefusal {
  const top = checkFlowInlineTop(inline);
  if (top.kind === "not-object" || top.kind === "bad-stages") {
    return refusal(400, FLOW_INLINE_TOP_VOICE[top.kind], "invalid_request");
  }
  if (top.kind === "unknown-keys") {
    return refusal(
      400,
      "flow body carries unknown keys " +
        JSON.stringify(top.dead) +
        " — allowed: " +
        JSON.stringify([...INLINE_TOP_KEYS].sort()),
      "invalid_request",
    );
  }
  if (top.kind === "missing-id-stages") {
    return refusal(
      400,
      "flow body needs at least id and stages — got keys " +
        JSON.stringify(top.keys),
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
          JSON.stringify(String(st["id"] ?? "<no id>")) +
          ": body carries unknown field(s) " +
          JSON.stringify(checked.extras) +
          " — the schema declares " +
          JSON.stringify([...STAGE_KEYS].sort()) +
          " (extra=forbid at the door)",
        "invalid_request",
      );
    }
    if (checked.kind === "bad-id") {
      const sid: string = String(checked.st["id"] ?? "");
      return refusal(
        400,
        "stage id " + JSON.stringify(sid) + " is not a legal identifier",
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
        "stage " + JSON.stringify(sid) + ": no engine named",
        "invalid_request",
      );
    }
    if (engine !== CARD_PLANE_ENGINE) {
      // Grammar first (drift in the id itself), then membership
      // (an id the gateway cannot serve). Both refuse with the
      // engine named — never a silent skip. The seat-less default
      // (the card plane's engine) keeps the pre-seam refusal for foreign ids.
      if (!engineIdOk(engine)) {
        return refusal(
          400,
          "flow_inline stage " +
            JSON.stringify(sid) +
            " names engine " +
            JSON.stringify(engine) +
            " — engine ids are '" + CARD_PLANE_ENGINE + "' or 'mcp:<server>' ([A-Za-z0-9_-]{1,32})",
          "invalid_request",
        );
      }
      if (!knownEngines.includes(engine)) {
        return refusal(
          400,
          "flow_inline stage " +
            JSON.stringify(sid) +
            " names engine " +
            JSON.stringify(engine) +
            " — this gateway serves registered engines only (" +
            (knownEngines.length === 0
              ? "none registered"
              : knownEngines.slice().sort().join(", ")) +
            ")",
          "preview_scope",
        );
      }
    }
    // No branch pruning on this gateway: skip_when is unported.
    if (st["skip_when"] !== undefined && st["skip_when"] !== null) {
      return refusal(
        400,
        "flow_inline stage " +
          JSON.stringify(sid) +
          ": skip_when is unported on this gateway",
        "preview_scope",
      );
    }
    // (the undefined guard above fired — the ?? below is dead.)
    if (st["card"] !== undefined && String(st["card"]) !== "") {
      return refusal(
        400,
        "flow_inline stage " +
          JSON.stringify(sid) +
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
    // THE SPELL GATE (2026-10-09, the operator's live refusal): a
    // $spell in params resolves against EXACTLY this inputNames map
    // at the merge (rewriteSpells) — a spell naming no wired input
    // used to pass this door and die mid-run with 'workflow carries
    // $image1'. THE DOOR COVERS WHAT THE RUN WILL DO: refuse here,
    // in the door's voice, naming the spell and the fix.
    const ghosts: string[] = [];
    const sweep = (v: unknown): void => {
      if (typeof v === "string") {
        if (v.startsWith("$") && !(v.slice(1) in inputNames)) ghosts.push(v);
      } else if (Array.isArray(v)) {
        for (const x of v) sweep(x);
      } else if (typeof v === "object" && v !== null) {
        for (const x of Object.values(v as Record<string, unknown>)) sweep(x);
      }
    };
    sweep(params);
    if (ghosts.length > 0) {
      return refusal(
        400,
        "flow_inline stage " +
          JSON.stringify(sid) +
          ": params carry " +
          JSON.stringify([...new Set(ghosts)].sort()) +
          " but the stage wires no input of that name — the merge would refuse it at run time ('$name' must name a FromStage-wired input or a request initial; name it or wire it)",
        "invalid_request",
      );
    }
    stages.push({ id: sid, engine, params, outputs, expected, outputNodes, inputNames });
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
        JSON.stringify(doors) +
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
        Array.isArray(doc) ? "array" : typeof doc,
      );
    case "bad-test":
      return refusal(
        400,
        "test flag must be a boolean (got " +
          (typeof detail?.testFlag) +
          " " +
          JSON.stringify(detail?.testFlag) +
          ")",
        "bad_envelope",
        "test",
        "boolean",
        (typeof detail?.testFlag),
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
          JSON.stringify(detail?.draftId ?? ""),
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
      JSON.stringify(draftId) +
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
  /** F-6(b) admission warnings (computed pre-registration by the
   *  start door — the film lane's VRAM-pressure warn): stamped on
   *  the record and the queued sidecar. Absent means none. */
  warnings?: string[];
  /** The {model:} card door carries its own run identity (minted
   *  BEFORE phase-2 compose — a refusal names its field, never a
   *  zombie slot) + the pipeline/cardId/request body for the
   *  registration writes. */
  door?: {
    runId: string;
    pipeline: string;
    /** The card arm's identity (card snapshot law). The inline
     *  REPLAY arm (stroke 83 boot resurrect) reuses a run id with
     *  NO card identity — cardId undefined means no snapshot is
     *  stamped and pipeline still rides the door. */
    cardId?: string;
    requestBody: Record<string, unknown>;
    /** The bench doc read at submit (stroke 45d) — the FULL workflow
     *  the run was born from (all stages + intent), stamped verbatim
     *  so the wand restores the whole flow, not just the ran card. */
    benchDoc?: Record<string, unknown>;
  };
}): { run: RunRecord; queuePosition: number } | StartRefusal {
  const { compiled, testFlag, draftId, stateRoot, enqueue, door } = args;
  const runId: string = door?.runId ?? newRunId();
  // THE SOURCE-ECHO GUARD (the source-echo law, 2026-09-23): every
  // compiled stage's params are swept for source pointers BEFORE the
  // run dir exists — a dead source refuses here with its URL named,
  // never mid-render, and nothing registers. The roots are the
  // manifest (own root first — the media server's own walk); tails
  // fall through to the lane cwd, the stager's own order. The run's
  // own id is exempt (the compose writes its future output path
  // into the graph — a forward reference, not a source).
  const roots: string[] = rootsManifest(stateRoot);
  let sources: SourceEchoRef[];
  try {
    sources = resolveSourceRefs(
      collectSourceRefs(compiled.stages.map((s) => s.params)),
      roots,
      process.cwd(),
      runId,
    );
  } catch (e) {
    return refusal(400, (e as Error).message, "invalid_request", "params");
  }
  const dir: string = join(outRootFor(stateRoot, testFlag), runId);
  mkdirSync(dir, { recursive: true });
  // THE MULTI-STAGE ROW (2026-09-25, the curated-lane lift): every
  // compiled stage rides the run row — one GraphRow + one RunStageRow +
  // one params/outputNodes slot each, input_names carrying the
  // cross-stage wiring the merged walk consumes. The single-stage
  // shape is the N=1 case of this SAME loop (byte-identical row for
  // the one-stage docs the gateway served before).
  const createdAt: number = Date.now() / 1000;
  const graphRows: GraphRow[] = compiled.stages.map((st: CompiledStage): GraphRow => ({
    id: st.id,
    type: st.engine,
    input_from: [],
    input_names: { ...st.inputNames },
    outputs: { ...st.outputs },
    params: { ...st.params },
  }));
  const run: RunRecord = {
    runId,
    status: "queued",
    stages: compiled.stages.map((st: CompiledStage, i: number) => ({
      id: st.id,
      name: st.id,
      index: i,
      status: "pending",
      engine: st.engine,
      outputs: { ...st.outputs },
      expected: { ...st.expected },
    })),
    skippedStages: [],
    artifacts: [],
    error: "",
    draftId,
    dir,
    testFlag,
    stopFlag: false,
    params: compiled.stages.map((st: CompiledStage): Record<string, EngineJson> => ({ ...st.params })),
    createdAt,
    pipeline: "flow_inline",
    graphRows,
    outputNodes: compiled.stages.map((st: CompiledStage): Record<string, EngineJson> => ({ ...st.outputNodes })),
  };
  run.inputNames = Object.fromEntries(
    compiled.stages.map((st: CompiledStage): [string, Record<string, string>] => [st.id, { ...st.inputNames }]),
  );
  if (args.warnings !== undefined && args.warnings.length > 0) {
    run.warnings = [...args.warnings];
  }
  if (door !== undefined) {
    run.pipeline = door.pipeline;
    if (door.cardId !== undefined) run.cardId = door.cardId;
  }
  // THE CARD SNAPSHOT LAW (stroke 45, the operator's wand complaint):
  // _flow.json's stage faces are HOLLOW (ids/status only) — the card
  // + params that actually ran were recorded nowhere, so "restore the
  // workflow that made this image" could only re-read the MUTABLE
  // bench draft and serve whatever it holds NOW. The card arm knows
  // the exact card + body here; they ride the sidecar verbatim. The
  // wand reconstructs from THIS, never from the living bench.
  if (door !== undefined && door.cardId !== undefined) {
    run.cardSnapshot = {
      card: door.cardId,
      params: door.requestBody,
    };
    const benchStages = Array.isArray(door.benchDoc?.["stages"])
      ? door.benchDoc?.["stages"]
      : undefined;
    if (benchStages !== undefined && (benchStages as unknown[]).length > 0) {
      // THE PROVENANCE HEAD (2026-09-25, the maker's fabrication
      // finding): card-mode runs MINT their bench (the CARD BIRTH
      // law wants a doc-backed draft) while a studio user HAND-
      // COMPOSES one through melite_construct — and the snapshot
      // alone could not tell them apart. The bench's OWN log head
      // can: its author + kind say who wrote the bench the run was
      // born from, verbatim from the domain row (never a synthesized
      // label, never a guess — absent log, the key rides undefined
      // and the snapshot says only what was provably read).
      const benchLog: unknown = door.benchDoc?.["log"];
      const head: Record<string, unknown> | undefined =
        Array.isArray(benchLog) && benchLog.length > 0 &&
        typeof benchLog[0] === "object" && benchLog[0] !== null &&
        !Array.isArray(benchLog[0])
          ? { ...(benchLog[0] as Record<string, unknown>) }
          : undefined;
      // THE SNAPSHOT CONTRACT (the operator's order, 2026-09-26:
      // "the saving should 100% be a schemamaster contract, that
      // way we know 100% if it will load again"): the writer stamps
      // bench_snapshot THROUGH the shared contract in
      // @melite/contracts/benchSnapshot, never raw — run memory and
      // the era's self-naming model strip AT SAVE, provenance rides
      // 'restored' (the admission repair law's coordinate), and a
      // row that cannot load is DROPPED with a warning on the
      // sidecar (visible loss, never persisted-unloadable). The
      // guarantee is exact: everything saved under the contract
      // parses on the load side.
      const contracted = saveBenchSnapshotStages(benchStages);
      if (contracted.warnings.length > 0) {
        run.warnings = [
          ...(run.warnings ?? []),
          ...contracted.warnings.map((w: string): string => `bench snapshot: ${w}`),
        ];
      }
      if (contracted.stages.length > 0) {
        run.benchSnapshot = {
          stages: contracted.stages,
          intent: typeof door.benchDoc?.["intent"] === "string"
            ? door.benchDoc?.["intent"]
            : "",
          ...(head !== undefined ? { bench_head: head } : {}),
        };
      }
    }
  }
  // R3 durable queue (submit 1317-1351): the request rides
  // _request.json, the compiled document rides _flow.json,
  // and run.queued in the ledger is what a restart reconciles
  // against. The card door passes its body — coerced through the
  // snapshot-coercion law at the door (declared numerics restored,
  // BRIEF14 finding #2: the sidecar proves type integrity, the
  // seam/structure evidence rides unchanged); the inline door passes
  // the envelope's flow_inline doc below (same writes, same order).
  const requestBody: unknown = door?.requestBody ?? compiled;
  // THE COMPOSE ECHO (the one-press/one-engine law, 2026-09-23: the
  // operator pressed carried, the engine received cut, and the run
  // left NO voice saying which — the film was 15 minutes of the
  // wrong seam and the post-mortem could only infer). Computed BEFORE
  // the durable writes, stamped ON them: the run record + the console
  // + the ledger row name the doc revision the compose read and the
  // seam values the engine actually received. "What did ComfyUI get?"
  // is one grep away, forever, on every run — the read-side half of
  // the law (the write-side half is the client's run gate: the engine
  // never composes from a doc the press has not confirmed).
  const bodyRec = requestBody as Record<string, unknown>;
  const echoCalls: Array<Record<string, unknown>> = Array.isArray(bodyRec?.["calls"])
    ? bodyRec["calls"] as Array<Record<string, unknown>>
    : [];
  const benchRec = door?.benchDoc as { bench?: { rev?: unknown } } | undefined;
  const benchRev = typeof benchRec?.bench?.rev === "number" ? benchRec.bench.rev : null;
  if (echoCalls.length > 0) {
    const seam = echoCalls
      .map((c) => (typeof c["transition"] === "string" ? c["transition"] : "carry"))
      .join(",");
    run.composeEcho = { seam, calls: echoCalls.length, benchRev };
    console.log(`[compose] run=${runId} draft=${draftId} calls=${echoCalls.length} seam=${seam} bench_rev=${benchRev ?? "?"}`);
  }
  // THE SOURCE ECHO STAMP (the same law, source-side): the resolved
  // files ride the record, the console, and the ledger row — "what
  // created this run" is one grep away, forever. Sourceless runs
  // stamp nothing.
  if (sources.length > 0) {
    run.sourceEcho = { refs: sources.map((s) => ({ url: s.url, file: s.file })) };
    console.log(`[sources] run=${runId} draft=${draftId} refs=${sources.length} ${sources.map((s) => s.url).join(",")}`);
  }
  // THE VARIANT STAMP (commission 033's self-critique #5,
  // 2026-09-24): the lane the run rides (voicedesign vs
  // customvoice) names itself at BIRTH — the 033 ledger read
  // pipeline qwen3-tts-voicedesign on both a design run and a
  // performing run, indistinguishable. run.params first, the exact
  // submitted body (card snapshot / request body) as fallback —
  // the export-name stamp's 024 lesson. Variant-less runs stamp
  // nothing (the lift returns undefined; absent, never guessed).
  const regVariant = variantOfBodies([...run.params, door?.requestBody])
  if (regVariant !== undefined) {
    run.variant = regVariant;
    console.log(`[variant] run=${runId} draft=${draftId} variant=${regVariant}`);
  }
  atomicWriteJson(join(dir, "_request.json"), requestBody);
  atomicWriteJson(join(dir, "_flow.json"), sidecarDocFor(run));
  if (echoCalls.length > 0) {
    appendLedger(stateRoot, "run.queued", {
      run_id: runId,
      draft_id: draftId,
      pipeline: run.pipeline,
      ...(regVariant !== undefined ? { variant: regVariant } : {}),
      seam: run.composeEcho?.seam,
      calls: echoCalls.length,
      bench_rev: benchRev,
      sources: sources.length,
    });
  } else {
    appendLedger(stateRoot, "run.queued", {
      run_id: runId,
      draft_id: draftId,
      pipeline: run.pipeline,
      ...(regVariant !== undefined ? { variant: regVariant } : {}),
      sources: sources.length,
    });
  }
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
    stages: run.stages.map((s) => sidecarStageOf(s)),
    skippedStages: [],
    artifacts: [],
    createdAt: run.createdAt,
    testFlag: run.testFlag,
    draftId: run.draftId,
    pipeline: run.pipeline,
    graph: run.graphRows,
    cardSnapshot: run.cardSnapshot,
    benchSnapshot: run.benchSnapshot,
    // F-6(b): admission warnings ride the queued sidecar (disk
    // rows carry them after a reload).
    warnings: run.warnings,
    // THE COMPOSE ECHO: what the engine received rides the queued
    // sidecar too (the wand/restore reads disk, not memory).
    composeEcho: run.composeEcho,
    // THE SOURCE ECHO: the files that created the run ride the
    // queued sidecar too.
    sourceEcho: run.sourceEcho,
    // THE VARIANT: the lane rides the queued sidecar too (the
    // wand/restore reads disk, not memory).
    variant: run.variant,
  });
}
