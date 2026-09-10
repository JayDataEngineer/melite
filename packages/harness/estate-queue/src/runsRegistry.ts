// runsRegistry.ts — the live-run registry as a HOST Cordis service
// (REBUILD-6, gateway kill). Owns the rich run map + the serial
// pump over the queue seat's QueueCore (one machine — the door's
// RunsService map and the queue's core are one object now) and the
// start/status/stop business arms. DECORATOR-FREE on purpose: this
// package runs from source (node --experimental-strip-types), and
// decorators are not erasable syntax — the thin Typert adapters
// live in @melite/estate-runs (a built package, the drafts recipe),
// delegating to this seat. Failures throw the protocol's ONE
// RemoteError with the runs/* codes declared HERE (the producing
// package, next to the throws).
import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import {
  executeFlow,
  needComfyUI,
  spliceWorkflow,
} from "@melite/comfyui-cordis";
import type { EngineJson, MergeRow } from "@melite/comfyui-cordis";
import { pyReprStr } from "@melite/comfyui-cordis";
import { expandRegistryFlow, getRegistryFlow, registryFlowToInline } from "./flowsData.ts";
import { newRunId, pipelineOf, pyStr, strictBodyCheck, draftIdOk } from "./queue.ts";
import {
  CardArmError,
  pyStrMid,
  type ModelFactsRow,
  type Phase1Card,
} from "./cardsRegistry.ts";
import {
  FlowError,
  findDanglingRefs,
  pyReprJson,
  strictBody,
} from "./runsValidate.ts";
import { FLOW_ID_RE } from "./runsGates.ts";
import type { QueueCore, QueueRefusal } from "./queue.ts";
import {
  compileFlowInline,
  envelopeRefusal,
  registerCompiledRun,
  selectSubmitDoor,
  unknownDraftRefusal,
} from "./runsStart.ts";
import type { CompiledStage } from "./runsStart.ts";
import { listRuns, parseIntPy } from "./runsList.ts";
import { inlineArm } from "./runsValidate.ts";
import type { FlowsValidateAnswer } from "./runsValidate.ts";
import {
  errText,
  runLogTail,
  runRel,
  settlePersist,
} from "./runsTypes.ts";
import type { RunRecord } from "./runsTypes.ts";

// CROSS-COPY LAW (the estate's documented topology): the engine
// package resolves the registry cordis instance; this package's
// typert-protocol resolves the vendor instance. The engine seam
// below casts STRUCTURALLY (never instanceof across copies).
type EngineCtx = Parameters<typeof needComfyUI>[0];
/** The runs Remote failure codes, merged into the protocol's ONE
 *  vocabulary (cookbook §2: declaration merging, next to the
 *  throws). The py codes ride kebab-cased; the byte-pinned prose
 *  rides the message; loc/expected/got ride the details. */
/** Refusal detail rows (the py envelope's loc/expected/got,
 *  present when the door set them). */
export interface RunsRefusalDetails {
  readonly loc?: string;
  readonly expected?: string;
  readonly got?: string;
}

declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** The start body is not a JSON object (bad_envelope/body). */
    "runs/bad-envelope": RunsRefusalDetails;
    /** The draft law failed before any run registered. */
    "runs/draft-required": RunsRefusalDetails;
    "runs/draft-malformed": RunsRefusalDetails;
    "runs/draft-unknown": RunsRefusalDetails;
    /** Structure/policy refusals (strict body, doors, compile). */
    "runs/invalid-request": RunsRefusalDetails;
    /** Beyond the served preview scope — names what's missing. */
    "runs/preview-scope": RunsRefusalDetails;
    /** The inline compile refused (flow.py voice, batch rows in
     *  details.errors — the validate door's 400 payload). */
    "runs/flow-compile": RunsRefusalDetails & { readonly errors?: unknown };
    /** The comfyui workflow pin sweep refused (the validate
     *  door's workflow_pin payload). */
    "runs/workflow-pin": RunsRefusalDetails & { readonly errors?: unknown };
    "runs/card-compose": RunsRefusalDetails & {
      readonly loc?: string;
      readonly expected?: string;
      readonly got?: string;
    };
    /** Status on an id this process owns no row for. */
    "runs/unknown-run": { readonly runId: string };
    /** Stop on an id this process owns no row for. */
    "runs/run-unknown": { readonly runId: string };
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    runs: RunsRegistryService;
  }
}

/** The py refusal codes this remote serves, folded to the
 *  protocol's vocabulary — a literal table, no dynamic key. */
const RUNS_ERROR_CODES: Readonly<
  Record<string, "runs/bad-envelope" | "runs/draft-required" | "runs/draft-malformed" | "runs/draft-unknown" | "runs/invalid-request" | "runs/preview-scope" | "runs/flow-compile" | "runs/workflow-pin" | "runs/card-compose">
> = {
  bad_envelope: "runs/bad-envelope",
  draft_required: "runs/draft-required",
  draft_malformed: "runs/draft-malformed",
  draft_unknown: "runs/draft-unknown",
  invalid_request: "runs/invalid-request",
  preview_scope: "runs/preview-scope",
  flow_compile: "runs/flow-compile",
  workflow_pin: "runs/workflow-pin",
  card_compose: "runs/card-compose",
};

/** Map a CardArmError onto the refusal envelope (door-verbatim:
 *  the error verbatim + code + loc/expected/got only when set). */
function cardRefusal(err: CardArmError): QueueRefusal {
  return {
    status: err.status,
    payload: refusalEnvelopeOf(err),
  };
}
function refusalEnvelopeOf(err: CardArmError): Record<string, unknown> {
  const p: Record<string, unknown> = { error: err.message, code: err.code };
  if (err.loc !== undefined) p["loc"] = err.loc;
  if (err.expected !== undefined) p["expected"] = err.expected;
  if (err.got !== undefined) p["got"] = err.got;
  return p;
}

/** Fold a door refusal into the protocol's one error class. */
function toRemoteError(r: QueueRefusal): RemoteError {
  const p = r.payload as {
    error: string;
    code: string;
    loc?: string;
    expected?: string;
    got?: string;
  };
  const mapped = RUNS_ERROR_CODES[p["code"]];
  if (mapped === undefined) {
    // A refusal this table does not name is a bug — LOUD, never
    // a silent generic.
    throw new Error("runs remote: unmapped refusal code " + p["code"]);
  }
  const details: {
    loc?: string;
    expected?: string;
    got?: string;
  } = {};
  if (p["loc"] !== undefined) details["loc"] = p["loc"];
  if (p["expected"] !== undefined) details["expected"] = p["expected"];
  if (p["got"] !== undefined) details["got"] = p["got"];
  return new RemoteError(mapped, p["error"], details);
}

/** The runs registry seat: `ctx.runs`. The estate-runs adapters
 *  (Typert) delegate here; the door's registry/pump semantics ride
 *  this service verbatim. */
export class RunsRegistryService extends Service {
  static inject = ["queue", "draftsRemote", "cardRegistry"];

  /** The pump reentrancy guard (door-verbatim — a public field:
   *  cordis proxies services, and private #fields do not cross the
   *  proxy). */
  pumping: boolean = false;

  constructor(ctx: Context) {
    super(ctx, "runs");
  }

  /** The queue seat's registry (the FIFO SSOT). */
  private get core(): QueueCore {
    return this.ctx.queue.core;
  }

  async start(
    doc: unknown,
    signal: AbortSignal,
  ): Promise<{ run_id: string; status: string; queue_position: number }> {
    signal.throwIfAborted();
    // The pre-registration chain, py order (queue.ts's envelope
    // walk with the draft probe handed in): non-object, test-bool,
    // draft required/malformed, then the AWAITED domain probe
    // (unknown doc), then the strict body.
    const draftExists = async (draftId: string): Promise<boolean> => {
      try {
        await this.ctx.draftsRemote.get(draftId, signal);
        return true;
      } catch (error: unknown) {
        const remote = remoteErrorOf(error);
        if (remote !== undefined && remote.code === "draft/not-found") {
          return false;
        }
        throw error;
      }
    };
    // The envelope walk sits HERE (not queue.ts's sync
    // validateSubmitEnvelope) because the draft probe is an
    // AWAITED seat hop — the py ORDER is preserved exactly.
    const checked = await this.walkEnvelope(doc, draftExists);
    if (checked.kind === "refusal") throw toRemoteError(checked.refusal);
    let body: Record<string, unknown> = checked.body;
    const strict = strictBodyCheck(body);
    if (strict !== null) throw toRemoteError(strict);
    const selected = selectSubmitDoor(body);
    if ("payload" in selected) throw toRemoteError(selected);
    // Later strokes own these lanes; both refuse LOUD here (the
    // preview-scope posture — never a silent accept).
    const stateRoot: string = this.ctx.queue.stateRoot;
    if (selected.door === "model") {
      // The card start arm (handleCardStart 1016-1136, second
      // move): phase-1 compose (run_id "") BEFORE registration — a
      // params refusal names its field, never a zombie slot — then
      // phase-2 with the minted id, register + sidecars + ledger,
      // pump. Every compose failure refuses with the phase-N voice
      // and registers nothing.
      const mid: string = pyStrMid(body["model"]);
      const cards = this.ctx.cardRegistry;
      let p1: Phase1Card;
      try {
        p1 = await cards.phase1Card(body, mid);
      } catch (e) {
        if (e instanceof CardArmError) throw toRemoteError(cardRefusal(e));
        throw e;
      }
      const runId: string = newRunId();
      let graph: Record<string, unknown>;
      try {
        graph = (await cards.phase2Card(p1, runId)).graph;
      } catch (e) {
        if (e instanceof CardArmError) throw toRemoteError(cardRefusal(e));
        throw e;
      }
      const skeleton: string = p1.skeleton;
      const cardStage: CompiledStage = {
        id: skeleton,
        params: { workflow: graph as unknown as EngineJson },
        outputs: {},
        expected: {},
        outputNodes: {},
        inputNames: {},
      };
      const { run } = registerCompiledRun({
        compiled: { stages: [cardStage] },
        testFlag: checked.testFlag,
        draftId: checked.draftId,
        stateRoot,
        enqueue: (row): number => this.core.enqueue(row as never),
        door: {
          runId,
          pipeline: pipelineOf(body),
          cardId: p1.card,
          requestBody: body,
        },
      });
      void run;
      this.kick();
      return {
        run_id: run.runId,
        status: "queued",
        queue_position: this.core.queuePosition(run.runId),
      };
    }
    if (selected.door === "flow") {
      // THE NAMED-FLOW SHIM (REBUILD-13; the dead door's own law,
      // flowsRun.ts:745): the registry flow expands (from_flow links
      // resolved live) and lands as the flow_inline doc; every gate
      // after this point — structural compile, single-stage policy,
      // registration, the merged worker — runs untouched. Multi-stage
      // and card= shapes refuse at those EXISTING gates with their
      // preview_scope voices (never silent).
      const name: string = typeof body["flow"] === "string" ? body["flow"] : "";
      const decl = getRegistryFlow(name);
      if (decl === undefined) {
        // The door's unknown-name voice (rendered invalid_request —
        // the start-door envelope norm for bad requests).
        throw new RemoteError(
          "runs/invalid-request",
          "no flow at flows/" + name + "/flow.py",
          { loc: "flow" },
        );
      }
      const inlineDoc = registryFlowToInline(expandRegistryFlow(decl));
      const rest: Record<string, unknown> = { ...body };
      delete rest["flow"];
      body = { ...rest, flow_inline: inlineDoc };
    }
    const inline: unknown = body["flow_inline"];
    const compiled:
      | { stages: CompiledStage[] }
      | QueueRefusal = compileFlowInline(inline);
    if ("payload" in compiled) throw toRemoteError(compiled);
    if (compiled.stages.length !== 1) {
      throw toRemoteError(
        refusePreview(
          "this gateway serves single-stage flow_inline runs only (" +
            compiled.stages.length +
            " stages) — multi-stage graphs are unported",
        ),
      );
    }
    const { run } = registerCompiledRun({
      compiled,
      testFlag: checked.testFlag,
      draftId: checked.draftId,
      stateRoot,
      enqueue: (row): number => this.core.enqueue(row as never),
    });
    void run;
    this.kick();
    return {
      run_id: run.runId,
      status: "queued",
      queue_position: this.core.queuePosition(run.runId),
    };
  }

  /** The list arm (REBUILD-7): the restore-port envelope over the
   *  output roots. The raw limit STRING rides from the lane (py
   *  int() semantics: underscores parse, junk refuses). The drafts
   *  probe rides the drafts remote. */
  async list(
    rawLimit: string,
    signal: AbortSignal,
    test = false,
  ): Promise<{ count: number; runs: Record<string, unknown>[] }> {
    signal.throwIfAborted();
    // The door's 400 text (editor_runs int()) — the runs face's
    // invalid-request refusal. ONLY this parse folds; every other
    // failure stays loud (no absorb).
    const parsed: number | null = parseIntPy(rawLimit);
    if (parsed === null) {
      throw new RemoteError(
        "runs/invalid-request",
        "limit must be an integer (got '" + rawLimit + "')",
        { loc: "query.limit", expected: "integer", got: rawLimit },
      );
    }
    const limit: number = Math.max(1, Math.min(500, parsed));
    return await listRuns(
      this.ctx.queue.stateRoot,
      limit,
      async (draftId) => {
        try {
          await this.ctx.draftsRemote.get(draftId, signal);
          return true;
        } catch {
          return false;
        }
      },
    );
  }

  /** The validate arm (REBUILD-8): the PURE compile pipeline
   *  (flowFromBody → compile → pin sweep → the 200 row) over the
   *  door's own bodies. The {model}/{flow} arms refuse the
   *  preview refusal (their remotes are later strokes); a 4xx
   *  answer folds to runs/flow-compile | runs/workflow-pin with
   *  the door's payload voices; the 200 serves verbatim. */
  async validate(
    doc: unknown,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    signal.throwIfAborted();
    // the {flow:} shim may REPLACE the body (flow → flow_inline):
    // the inline arm compiles the LIVE body, not the original doc.
    let liveDoc: unknown = doc;
    if (typeof doc === "object" && doc !== null && !Array.isArray(doc)) {
      let body = doc as Record<string, unknown>;
      if ("model" in body) {
        const answer: FlowsValidateAnswer = await this.modelValidateArm(body);
        if (answer.status === 200) return answer.payload;
        const p = answer.payload as {
          error: string;
          code: string;
          loc?: string;
        };
        const mapped = RUNS_ERROR_CODES[p["code"]];
        if (mapped === undefined) {
          throw new Error(
            "runs validate: unmapped answer code " + p["code"],
          );
        }
        throw new RemoteError(mapped, p["error"], {
          loc: typeof p["loc"] === "string" ? p["loc"] : undefined,
        });
      }
      if (
        "flow" in body && !("flow_inline" in body) &&
        !("model" in body) && !("stages" in body)
      ) {
        // THE NAMED-FLOW SHIM at validate (REBUILD-13; the dead
        // door's law): expand the registry flow live and compile it
        // through the SAME inline arm — no second validator. Unknown
        // names keep the door's own voice.
        const name: string = typeof body["flow"] === "string" ? body["flow"] : "";
        const decl = getRegistryFlow(name);
        if (decl === undefined) {
          throw new RemoteError(
            "runs/invalid-request",
            "no flow at flows/" + name + "/flow.py",
            { loc: "flow" },
          );
        }
        const inlineDoc = registryFlowToInline(expandRegistryFlow(decl));
        const rest: Record<string, unknown> = { ...body };
        delete rest["flow"];
        liveDoc = { ...rest, flow_inline: inlineDoc };
      }
    }
    const answer: FlowsValidateAnswer = inlineArm(liveDoc, null);
    if (answer.status === 200) return answer.payload;
    const p = answer.payload as {
      error: string;
      code: string;
      loc?: string;
      errors?: unknown;
    };
    const mapped = RUNS_ERROR_CODES[p["code"]];
    if (mapped === undefined) {
      // An answer this table does not name is a bug — LOUD.
      throw new Error(
        "runs validate: unmapped answer code " + p["code"],
      );
    }
    throw new RemoteError(mapped, p["error"], {
      loc: typeof p["loc"] === "string" ? p["loc"] : undefined,
      errors: p["errors"],
    });
  }

  /** Map a CardArmError onto the refusal envelope (door-verbatim:
   *  the error verbatim + code + loc/expected/got only when set). */
  async modelValidateArm(
    body: Record<string, unknown>,
  ): Promise<FlowsValidateAnswer> {
    const mid: string = pyStr(body["model"]);
    try {
      strictBody(body);
    } catch (e) {
      if (e instanceof FlowError) {
        return {
          status: 400,
          payload: { error: e.message, code: "invalid_request" },
        };
      }
      throw e;
    }
    // resolve_request's door count (gateway.py:279): the {model} arm
    // re-checks ambiguity — a body naming two doors refuses here,
    // before the artifact sweep.
    const doors: string[] = (["flow", "flow_inline", "model"] as string[])
      .filter((k) => k in body);
    if (doors.length > 1) {
      return {
        status: 400,
        payload: {
          error:
            "ambiguous request: names " +
            pyReprJson(doors) +
            " — provide exactly one of flow, flow_inline, model",
          code: "invalid_request",
        },
      };
    }
    // ARTIFACT-REF GATE first (gateway.py:617).
    const dangling: Array<[string, string, string]> =
      findDanglingRefs(body);
    if (dangling.length > 0) {
      const [location, ref, why] = dangling[0] as [string, string, string];
      return {
        status: 400,
        payload: {
          error:
            "dangling artifact ref at " + pyReprStr(location) + ": " +
            ref + " (" + why + ")",
          code: "invalid_request",
        },
      };
    }
    if (!FLOW_ID_RE.test(mid)) {
      return {
        status: 400,
        payload: {
          error: "model id " + pyReprStr(mid) + " is not a legal identifier",
          code: "invalid_request",
        },
      };
    }
    const svc = this.ctx.cardRegistry;
    // Resolution degrades to {} when the facts file is absent (the
    // old cordisFacts degrade — the resolves check below then
    // answers from the catalog alone; the strict overlay further
    // down still throws LOUD).
    let facts: Record<string, ModelFactsRow>;
    try {
      facts = svc.modelFacts();
    } catch {
      facts = {};
    }
    const resolves: boolean =
      mid in facts ||
      svc.resolveCardFamily(mid, facts) in facts ||
      svc.modelMids().has(mid);
    if (!resolves) {
      return {
        status: 400,
        payload: {
          error:
            "no model unit for model: " + mid +
            " (no .catalog.models row " + mid +
            " in the frozen discovery catalog and no family declares route " +
            mid + " in its variants' cells — checked the class tree's _routes map)",
          code: "invalid_request",
        },
      };
    }
    const fam: string = svc.resolveCardFamily(mid, facts);
    const famRow: ModelFactsRow | undefined = facts[fam];
    if (famRow === undefined) {
      // Non-cordis compose arm (python schema registry — unported
      // half): verdict + code parity, native text.
      return {
        status: 400,
        payload: {
          error:
            "card_compose phase 1: model " + pyReprStr(mid) +
            " composes outside the cordis plane (python schema arm — " +
            "unported half in this stroke)",
          code: "card_compose",
        },
      };
    }
    // THE ROUTE-LENS STAMP OVERLAY (gateway.py _route_stamp_overlay
    // 705-751): family defaults + the selected variant's
    // resolver_defaults, absent-keys-only, filtered to the card
    // field surface.
    let overlaid: { fam: string; card: string; params: Record<string, unknown> };
    try {
      overlaid = svc.overlayCardParams(body, mid);
    } catch (e) {
      if (e instanceof CardArmError) {
        return { status: 400, payload: { error: e.message, code: e.code } };
      }
      throw e;
    }
    const params: Record<string, unknown> = overlaid.params;
    // IN-PROCESS COMPOSE: the SAME registry compose pipeline the
    // start arm rides composes for validate (one plane, both arms).
    const refused: { message: string; code: string } | null =
      await svc.composeValidateCard(overlaid.card, overlaid.fam, params);
    if (refused !== null) {
      return {
        status: 400,
        payload: { error: refused.message, code: refused.code },
      };
    }
    // composed OK — py's 200 shape verbatim (ok/model/card/cost in
    // wire order; engine medians unknown at validate time so the
    // stages list is empty).
    return {
      status: 200,
      payload: {
        ok: true,
        model: mid,
        card: true,
        cost: { queue_depth: 0, eta_queue_s: null, stages: [] },
      },
    };
  }

  async status(
    runId: string,
    signal: AbortSignal,
    includeLog = false,
  ): Promise<Record<string, unknown>> {
    signal.throwIfAborted();
    const run: RunRecord | undefined = this.liveRun(runId);
    if (run === undefined) {
      throw new RemoteError(
        "runs/unknown-run",
        "unknown run_id",
        { runId },
      );
    }
    const payload: Record<string, unknown> = {
      run_id: run.runId,
      status: run.status,
      stages: run.stages,
      skipped_stages: [...run.skippedStages],
      artifacts: [...run.artifacts],
      error: run.error,
      queue_position: this.core.queuePosition(run.runId),
    };
    if (includeLog) payload["log_tail"] = runLogTail(payload as never);
    return payload;
  }

  async stop(
    runId: string,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    signal.throwIfAborted();
    const run: RunRecord | undefined = this.liveRun(runId);
    if (run === undefined) {
      throw new RemoteError(
        "runs/run-unknown",
        "unknown run_id " + JSON.stringify(runId),
        { runId },
      );
    }
    if (run.status !== "queued" && run.status !== "running") {
      return { error: "cannot stop run in state " + run.status };
    }
    run.stopFlag = true;
    // The interrupt rides the injected engine service when the
    // seat exists (best-effort — the flag is the authority).
    try {
      const comfy = needComfyUI(this.ctx as unknown as EngineCtx, "runsRemote stop");
      void comfy.stopForRunDir(run.dir).catch((): void => {});
    } catch {
      /* no seat: the worker's stop check converges the state */
    }
    return { run_id: runId, status: "stopping" };
  }

  /** The live map (the queue seat's core registry — rich rows). */
  private liveRun(runId: string): RunRecord | undefined {
    return (this.core.runs as Map<string, RunRecord>).get(runId);
  }

  /** The envelope walk with the AWAITED draft probe (door order
   *  preserved: the probe sits between malformed and unknown). */
  private async walkEnvelope(
    doc: unknown,
    draftExists: (draftId: string) => Promise<boolean>,
  ): Promise<
    | {
        kind: "ok";
        body: Record<string, unknown>;
        testFlag: boolean;
        draftId: string;
      }
    | { kind: "refusal"; refusal: QueueRefusal }
  > {
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      return { kind: "refusal", refusal: envelopeRefusal("not-object", doc) };
    }
    const body: Record<string, unknown> = doc as Record<string, unknown>;
    const testFlag: unknown = body["test"];
    if (typeof testFlag !== "boolean") {
      return {
        kind: "refusal",
        refusal: envelopeRefusal("bad-test", doc, { testFlag }),
      };
    }
    const draftId: unknown = body["draft_id"];
    if (typeof draftId !== "string" || draftId === "") {
      return {
        kind: "refusal",
        refusal: envelopeRefusal("missing-draft", doc),
      };
    }
    if (!draftIdOk(draftId)) {
      return {
        kind: "refusal",
        refusal: envelopeRefusal("malformed-draft", doc, { draftId }),
      };
    }
    if (!(await draftExists(draftId))) {
      return { kind: "refusal", refusal: unknownDraftRefusal(draftId) };
    }
    return { kind: "ok", body, testFlag: testFlag as boolean, draftId };
  }

  /** Kick the serial pump (door-verbatim guard). */
  private kick(): void {
    void this.pump();
  }

  /** The serial worker: claim the FIFO head, execute, settle —
   *  one GPU run machine-wide, strict submit order. */
  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      for (;;) {
        // The remote only ever enqueues RICH rows (RunRecord
        // extends the core's row — one object, one voice), so the
        // claim is this map's own row.
        const run: RunRecord | null = this.core.tryDequeue() as RunRecord | null;
        if (run === null) return;
        await this.runOne(run);
      }
    } finally {
      this.pumping = false;
    }
  }

  /** One run through the merged path (door-verbatim: stages ->
   *  running + merged:true, splice rows, ONE executeFlow submit,
   *  per-stage harvest + result_outputs, the stop-gated terminal
   *  mapping, the settle persist). */
  private async runOne(run: RunRecord): Promise<void> {
    run.status = "running";
    for (const stage of run.stages) {
      stage["status"] = "running";
      stage["merged"] = true;
    }
    const inputNames: Record<string, Record<string, string>> =
      run.inputNames ?? {};
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
      // splice refusal pre-submit: the run fails with the
      // planner's text (the per-stage fallback loop is later
      // scope).
      const text: string = errText(exc);
      for (const stage of run.stages) {
        if (stage["status"] === "running") {
          stage["status"] = "failed";
          stage["error"] = text;
        }
      }
      run.status = "failed";
      run.error = text;
      this.settle(run);
      return;
    }
    try {
      const engine = needComfyUI(this.ctx as unknown as EngineCtx, "runsRemote worker");
      const nodeCount: number = rows.reduce(
        (n: number, r: MergeRow): number =>
          n + Object.keys(r.workflow).length,
        0,
      );
      for (const stage of run.stages) {
        stage["activity"] =
          "merged submit (" + rows.length + " stages, " + nodeCount + " nodes)";
      }
      const result = await engine.executeFlow(rows, run.dir, inputNames, {}, {
        shouldStop: (): boolean => run.stopFlag,
      });
      for (const stage of run.stages) {
        const row = result.stages[stage.id] ?? { outputs: {}, artifacts: [] };
        const arts: string[] = row.artifacts.filter(
          (a: string): boolean => a !== "",
        );
        run.artifacts.push(...arts);
        if (arts.length > 0) {
          // DIVERGENCE-BY-ORDER: run-relative names, no /v1 prefix
          // (the asset HTTP face died with the app).
          const names: string[] = arts.map((a: string): string =>
            runRel(run, a),
          );
          stage["url"] = names[0];
          stage["gallery"] = names.map(
            (n: string): EngineJson => ({ name: n }) as unknown as EngineJson,
          );
        }
        stage["result_outputs"] = { ...row.outputs } as unknown as EngineJson;
        stage["status"] = "completed";
        delete stage["progress"];
        delete stage["activity"];
      }
      run.status = run.stopFlag ? "stopped" : "completed";
      this.settle(run);
    } catch (exc: unknown) {
      const text: string = errText(exc);
      const stopped: boolean =
        run.stopFlag && text.toLowerCase().includes("stop");
      for (const stage of run.stages) {
        if (stage["status"] === "running") {
          stage["status"] = stopped ? "stopped" : "failed";
          stage["error"] = text;
        }
      }
      run.status = stopped ? "stopped" : "failed";
      if (!stopped) run.error = text;
      this.settle(run);
    }
  }

  /** Terminal settle (queue core row + the settle persist). */
  private settle(run: RunRecord): void {
    const stateRoot = this.ctx.queue.stateRoot;
    settlePersist(run, stateRoot);
    this.core.releaseActive();
    this.core.evictSettled();
  }
}

/** The preview-scope refusal (door posture). */
function refusePreview(message: string): QueueRefusal {
  return { status: 400, payload: { error: message, code: "preview_scope" } };
}
