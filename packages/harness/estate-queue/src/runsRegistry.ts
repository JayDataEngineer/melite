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
import { join, relative } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import {
  executeFlow,
  needComfyUI,
  spliceWorkflow,
} from "@melite/comfyui-cordis";
import type { EngineJson, MergeRow, MergeStageResult } from "@melite/comfyui-cordis";
import type { EngineExecutor, EngineStageRow } from "@melite/engine-contract";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowToInline,
  registryInitialsError,
} from "./flowsData.ts";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { newRunId, outRootFor, pipelineOf, strictBodyCheck, draftIdOk, planResurrect, bootSweep, appendLedger } from "./queue.ts";
import { cardRefusal, toRemoteError, refusePreview } from "./runsRefusalVoices.ts";
import { RUNS_ERROR_CODES } from "./runsErrorCodes.ts";
export { toRemoteError } from "./runsRefusalVoices.ts";
import { readFileSync } from "node:fs";
import {
  CardArmError,
  type ModelFactsRow,
  type Phase1Card,
} from "./cardsRegistry.ts";
import {
  FlowError,
  findDanglingRefs,
  strictBody,
} from "./runsValidate.ts";
import { FLOW_ID_RE } from "./runsGates.ts";
import { engineFilmName, filmMuxPlan, muxWindows, probeDurationSec, shouldMuxWindows } from "./filmMux.ts";
import type { QueueCore, QueueRefusal } from "./queue.ts";
import {
  compileFlowInline,
  envelopeRefusal,
  registerCompiledRun,
  selectSubmitDoor,
  unknownDraftRefusal,
} from "./runsStart.ts";
import type { CompiledStage } from "./runsStart.ts";
import type { StageRow } from "./runsTypes.ts";
import { listRuns, parseIntOrNull } from "./runsList.ts";
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
 *  throws). The codes ride kebab-cased; the byte-pinned prose
 *  rides the message; loc/expected/got ride the details. */
/** Refusal detail rows (the envelope's loc/expected/got,
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
    /** The inline compile refused (flow.voice, batch rows in
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
    /** The lane presence gate refused (2026-09-13): a family's
     * declared lane file is missing from every store folder — the
     * message names the file and the provision's fetch URL. */
    "runs/lane-input-missing": RunsRefusalDetails;
    /** Status on an id this process owns no row for. */
    "runs/unknown-run": { readonly runId: string };
    /** Stop on an id this process owns no row for. */
    "runs/run-unknown": { readonly runId: string };
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    runs: RunsRuntimeService;
  }
}

/** The refusal codes this remote serves, folded to the
 *  protocol's vocabulary — a literal table, no dynamic key. */



/** The runs registry seat: `ctx.runs`. The estate-runs adapters
 *  (Typert) delegate here; the door's registry/pump semantics ride
 *  this service verbatim. */
// ROLE (cookbook adding-a-package role table): Runtime: its contract is dispatch/execution/cancellation (the cookbook role table; a Registry owns membership, which this is not). Key "runs" unchanged (wire-stable).
export class RunsRuntimeService extends Service {
  static inject = ["queue", "draftsRemote", "cardRegistry"];

  /** The pump reentrancy guard (door-verbatim — a public field:
   *  cordis proxies services, and private #fields do not cross the
   *  proxy). */
  pumping: boolean = false;

  /** The boot-reconcile guard (once per boot; the constructor's
   *  fire-and-forget burns it — walls re-arm this PUBLIC field and
   *  await bootReconcile directly, the pumping-field precedent:
   *  private #fields do not cross cordis proxies). */
  reconciled = false;

  constructor(ctx: Context) {
    super(ctx, "runs");
    // STROKE 83 — THE BOOT RECONCILE (resurrect is no longer
    // tested-but-unwired): queued sidecars of a DEAD process are
    // REPLAYED through the start door with their own run ids, then
    // stale running claims sweep. Fire-and-forget with a dispose
    // guard; the walls await bootReconcile() directly.
    let disposed = false;
    this.ctx.effect((): (() => void) => {
      disposed = false;
      return (): void => { disposed = true; };
    }, "estate-runs.reconcile-guard");
    /* v8 ignore next 3 -- defensive-only (the fire-and-forget
     * law's unhandled-rejection guard): planResurrect swallows
     * its own I/O (the readdir try road + per-record reads), so
     * the swallow arms the constructor against FUTURE plan-level
     * faults, never a today-reachable one. The per-run arms own
     * their failure writes; a plan-level fault must never take
     * the fiber down. */
    const swallowPlanFault = (): void => { /* see the ignore above */ };
    void this.bootReconcile((): boolean => disposed).catch(swallowPlanFault);
  }

  /** THE BOOT RECONCILE (stroke 83; boot_resurrect reborn as a
   *  REPLAY, not a hollow requeue): every usable QUEUED record's
   *  _request.json goes back through the START door under its own
   *  run id — the recompiled row carries REAL params (the old
   *  resurrectRuns requeued hollow stage faces and the pump's
   *  splice refused them all: every revived run settled failed
   *  "no inline workflow"). Replay = resubmit-with-same-id: the
   *  draft probe, the strict body, the compile all re-run against
   *  CURRENT truth; a refusal settles that run failed LOUD with
   *  the door's own voice. FIFO holds (plan order = created_at).
   *  After the replay, bootSweep retires stale RUNNING claims of
   *  the dead process (the ledgered dispositions, row-28 law). */
  async bootReconcile(disposed: () => boolean = () => false): Promise<string[]> {
    if (this.reconciled) return [];
    this.reconciled = true;
    const stateRoot = this.ctx.queue.stateRoot;
    // Permissive by intent: the start door owns the draft probe —
    // a deleted draft settles failed LOUD here instead of riding
    // the orphan list silently.
    const plan = planResurrect(stateRoot, undefined, undefined, () => true);
    const revived: string[] = [];
    for (const runId of plan.order) {
      if (disposed()) return revived;
      let body: unknown = null;
      try {
        body = JSON.parse(
          readFileSync(join(stateRoot, "output", runId, "_request.json"), "utf8"),
        );
      } catch {
        /* v8 ignore next 2 -- TOCTOU-only (the settleReplayRefusal
         * law): the request PARSED at plan time or planResurrect
         * orphaned the record (durableRecordUsable's requestText
         * parse); this re-read catches a torn filesystem between
         * the plan read and the replay read. bootSweep owns the
         * genuinely-corrupt case (walled). */
        continue;
      }
      try {
        await this.start(body, new AbortController().signal, { runId });
        revived.push(runId);
        appendLedger(stateRoot, "run.resurrected", {
          run_id: runId,
          note: "replayed _request.json through the start door (stroke 83)",
        });
      } catch (exc: unknown) {
        // LOUD, in place: the sidecar moves to failed with the
        // door's refusal text — a poison request can never haunt
        // the next boot as "queued" forever.
        this.settleReplayRefusal(stateRoot, runId, errText(exc));
      }
    }
    bootSweep(stateRoot, revived);
    if (revived.length > 0) this.kick();
    return revived;
  }

  /** Settle a replay-refused resurrect id: rebuild the row's
   *  identity from its own sidecar (the stage faces ride verbatim)
   *  and persist failed through the canonical terminal writer. */
  private settleReplayRefusal(stateRoot: string, runId: string, error: string): void {
    const dir = join(outRootFor(stateRoot, false), runId);
    let pre: Record<string, unknown> = {};
    try {
      pre = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    } catch {
      /* v8 ignore next 3 -- TOCTOU-only (the agent-engine law):
       * the record was readable+queued at plan time or it never
       * entered the plan; this re-read catches a torn filesystem
       * between the two reads. The zeroed identity below is the
       * honest floor for a vanished sidecar. */
      pre = {};
    }
    const faces: unknown[] = Array.isArray(pre["stages"]) ? pre["stages"] : [];
    const row: RunRecord = {
      runId,
      status: "failed",
      stages: faces as RunRecord["stages"],
      skippedStages: Array.isArray(pre["skipped_stages"])
        ? (pre["skipped_stages"] as unknown[]).map((x): string => typeof x === "string" ? x : "")
        : [],
      artifacts: [],
      error,
      /* v8 ignore next -- planResurrect admits only string sidecar
       * draft_ids (durableRecordUsable's gate); the non-string arm
       * is torn-state defense, unreachable in sequence. */
      draftId: typeof pre["draft_id"] === "string" ? pre["draft_id"] as string : "",
      dir,
      testFlag: false,
      stopFlag: false,
      params: [],
      createdAt: typeof pre["created_at"] === "number" ? pre["created_at"] as number : 0,
      pipeline: typeof pre["pipeline"] === "string" ? pre["pipeline"] as string : "flow_inline",
      graphRows: [],
      outputNodes: [],
    };
    settlePersist(row, stateRoot);
  }

  /** The queue seat's registry (the FIFO SSOT). */
  private get core(): QueueCore {
    return this.ctx.queue.core;
  }

  async start(
    doc: unknown,
    signal: AbortSignal,
    /** INTERNAL (stroke 83 boot resurrect): reuse a dead process's
     *  run id when replaying its _request.json — the remote surface
     *  never passes this (two-arg wire calls only). */
    reuse?: { runId: string },
  ): Promise<{ run_id: string; status: string; queue_position: number }> {
    signal.throwIfAborted();
    // The pre-registration chain, order (queue.ts's envelope
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
    // AWAITED seat hop — the ORDER is preserved exactly.
    const checked = await this.walkEnvelope(doc, draftExists);
    // THE REFUSAL FIRST (stroke 48: the bench read below needs
    // checked.draftId, which only the ok arm carries — refusing here
    // is the same throw, minus the wasted draft probe).
    if (checked.kind === "refusal") throw toRemoteError(checked.refusal);
    // THE BENCH SNAPSHOT (stroke 45d, the operator's question: "the
    // FULL workflow, or just the card that ran?"): the run is born
    // from the bench doc (CARD BIRTH LAW — draft_id = the bench);
    // the doc read at THIS moment is the whole workflow as it stood
    // when the user pressed Run. A read failure stamps nothing (the
    // card snapshot below still carries the exact card + params).
    let benchDoc: Record<string, unknown> | undefined;
    try {
      benchDoc = (await this.ctx.draftsRemote.get(checked.draftId, signal)) as Record<string, unknown>;
    } catch { benchDoc = undefined; }
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
      const mid: string = String(body["model"] ?? "");
      const cards = this.ctx.cardRegistry;
      let p1: Phase1Card;
      try {
        p1 = await cards.phase1Card(body, mid);
      } catch (e) {
        if (e instanceof CardArmError) throw toRemoteError(cardRefusal(e));
        throw e;
      }
      const runId: string = reuse?.runId ?? newRunId();
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
        // The {model:} card door's engine (the compose plane is
        // ComfyUI's — the card arm rides it by construction).
        engine: "comfyui",
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
          benchDoc,
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
      // THE NAMED-FLOW SHIM (REBUILD-13; the dead door's own law):
      // the registry flow expands (from_flow links
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
          "no flow named " + name + " in the registry",
          { loc: "flow" },
        );
      }
      const expanded = expandRegistryFlow(decl);
      // THE COMPILE-TIME INITIAL GATE (REBUILD-21; the dead door's
      // law): present initials refuse BEFORE any run registers —
      // validate runs the same gate, so start can never queue what
      // validate refuses.
      const badInitial: string | null = registryInitialsError(expanded, body, {
        repoRoot: resolveRepoRoot(),
        stateRoot,
      });
      if (badInitial !== null) {
        throw new RemoteError("runs/invalid-request", badInitial, {
          loc: "body",
        });
      }
      const inlineDoc = registryFlowToInline(expanded);
      const rest: Record<string, unknown> = { ...body };
      delete rest["flow"];
      body = { ...rest, flow_inline: inlineDoc };
    }
    const inline: unknown = body["flow_inline"];
    // The engines seat when mounted (stroke 53): the door consults
    // the live registry ids. Absent (fixture/wall boots) the pure
    // default ['comfyui'] governs — the pre-seam voice.
    const enginesSeat: unknown = this.ctx.get("engines");
    const knownEngines: readonly string[] =
      enginesSeat !== undefined && typeof (enginesSeat as { ids?: unknown }).ids === "function"
        ? (enginesSeat as { ids(): string[] }).ids()
        : ["comfyui"];
    const compiled:
      | { stages: CompiledStage[] }
      | QueueRefusal = compileFlowInline(inline, knownEngines);
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
      // The replay arm (stroke 83): same id, no card identity —
      // _request.json/_flow.json rewrite in place, the pump picks
      // the rehydrated (REAL params) row up on the boot kick.
      ...(reuse === undefined
        ? {}
        : { door: { runId: reuse.runId, pipeline: pipelineOf(body), requestBody: body } }),
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
   *  output roots. The raw limit STRING rides from the lane (strict
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
    const parsed: number | null = parseIntOrNull(rawLimit);
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
        // (no model-arm answer stamps loc today — the passthrough
        // rides undefined, verbatim like the inline block below.)
        throw new RemoteError(mapped, p["error"], {
          loc: p["loc"],
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
            "no flow named " + name + " in the registry",
            { loc: "flow" },
          );
        }
        const expanded = expandRegistryFlow(decl);
        // The same compile-time gate at validate (REBUILD-21).
        const badInitial: string | null = registryInitialsError(expanded, body, {
          repoRoot: resolveRepoRoot(),
          stateRoot: this.ctx.queue.stateRoot,
        });
        if (badInitial !== null) {
          throw new RemoteError("runs/invalid-request", badInitial, {
            loc: "body",
          });
        }
        const inlineDoc = registryFlowToInline(expanded);
        const rest: Record<string, unknown> = { ...body };
        delete rest["flow"];
        liveDoc = { ...rest, flow_inline: inlineDoc };
      }
    }
    // The card-stage lattice reads through the primed registry (the
    // cards stroke's CardRegistryService — ctx.cardRegistry, primed
    // at boot). Passing null here refused EVERY card= stage with the
    // LOUD miswire ("no CardRegistryService for cardGate") — the
    // named debt the flow test surfaced (2026-09-13): a bench stage
    // could run but never validate.
    const answer: FlowsValidateAnswer = inlineArm(liveDoc, this.ctx.cardRegistry);
    if (answer.status === 200) return answer.payload;
    const p = answer.payload as {
      error: string;
      code: string;
      loc?: string;
      errors?: unknown;
    };
    const mapped = RUNS_ERROR_CODES[p["code"]];
    /* v8 ignore next -- inlineArm answers stamp flow_compile |
       workflow_pin only (both tabled): the LOUD arm never fires (2026-09-12) */
    if (mapped === undefined) {
      // An answer this table does not name is a bug — LOUD.
      throw new Error(
        "runs validate: unmapped answer code " + p["code"],
      );
    }
    // (inlineArm stamps loc on every 400 — the passthrough never
    // yields undefined here.)
    throw new RemoteError(mapped, p["error"], {
      loc: p["loc"],
      errors: p["errors"],
    });
  }

  /** Map a CardArmError onto the refusal envelope (door-verbatim:
   *  the error verbatim + code + loc/expected/got only when set). */
  async modelValidateArm(
    body: Record<string, unknown>,
  ): Promise<FlowsValidateAnswer> {
    const mid: string = String(body["model"] ?? "");
    try {
      strictBody(body);
    } catch (e) {
      // (strictBody throws FlowError only — checkStrictBody is total
      // string ops over the body's keys — so the cast folds every
      // throw with the door-verbatim text.)
      const flowErr = e as FlowError;
      return {
        status: 400,
        payload: { error: flowErr.message, code: "invalid_request" },
      };
    }
    // resolve_request's door count: the {model} arm
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
            JSON.stringify(doors) +
            " — provide exactly one of flow, flow_inline, model",
          code: "invalid_request",
        },
      };
    }
    // ARTIFACT-REF GATE first.
    const dangling: Array<[string, string, string]> =
      findDanglingRefs(body);
    if (dangling.length > 0) {
      const [location, ref, why] = dangling[0] as [string, string, string];
      return {
        status: 400,
        payload: {
          error:
            "dangling artifact ref at " + JSON.stringify(location) + ": " +
            ref + " (" + why + ")",
          code: "invalid_request",
        },
      };
    }
    if (!FLOW_ID_RE.test(mid)) {
      return {
        status: 400,
        payload: {
          error: "model id " + JSON.stringify(mid) + " is not a legal identifier",
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
      // Non-cordis compose arm (no family row): verdict + code.
      return {
        status: 400,
        payload: {
          error:
            "card_compose phase 1: model " + JSON.stringify(mid) +
            " composes outside the cordis plane (no family row — " +
            "the model resolves but the facts file declares nothing for it)",
          code: "card_compose",
        },
      };
    }
    // THE ROUTE-LENS STAMP OVERLAY (_route_stamp_overlay
    // 705-751): family defaults + the selected variant's
    // resolver_defaults, absent-keys-only, filtered to the card
    // field surface.
    let overlaid: { fam: string; card: string; params: Record<string, unknown> };
    try {
      // (awaited — the overlay is sync today, but the arm owns the
      // rejection either way: an async throw must fold, never float.)
      overlaid = await svc.overlayCardParams(body, mid);
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
    // composed OK — 200 shape verbatim (ok/model/card/cost in
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
      // The card-back-into-flow key (2026-09-11): the draft that
      // produced this run — the tab restores via drafts/get (the
      // draft holds the full card/engine/params stages) + per-stage
      // bench/add-stage. Additive: older consumers ignore it.
      draft_id: run.draftId,
      stages: run.stages,
      skipped_stages: [...run.skippedStages],
      // Route-relative (audit #11, proven live by the stroke-82 e2e):
      // the executor's artifacts are ABSOLUTE DISK PATHS — serving
      // them raw hands the browser strings the media route cannot
      // answer (a leading-/ path rides toRunMediaUrl verbatim). The
      // stage rows' `url` spelling is the truth: <run-id>/<rel>,
      // computed from the same outRoot the record lives under.
      artifacts: [...run.artifacts].map((a: string): string =>
        a.startsWith("/")
          ? [run.runId, relative(outRootFor(this.ctx.queue.stateRoot, run.testFlag), a)].join("/")
          : a,
      ),
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
    if (run.status !== "queued" && run.status !== "running" && run.status !== "stopping") {
      return { error: "cannot stop run in state " + run.status };
    }
    // THE STOPPING STAMP (stroke 83 — the state existed in the
    // union but nothing ever set it): a stop press on a LIVE run
    // moves the row to "stopping" immediately, so the status door
    // reports the truth between the press and the settle (the
    // settle's stopFlag branch overwrites with "stopped"). A
    // re-press on an already-stopping row is idempotent.
    if (run.status === "running") run.status = "stopping";
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
    // ONE ENVELOPE LAW with checkFlowsStartEnvelope (runsGates) and the
    // queue door: absent/null test means false — a chat tool's start
    // doc may carry test:null (LLM serializers emit nulls for omitted
    // booleans) and the retired gate (submit 1179-1270) never refused
    // it. This copy had drifted to a bare read, refusing legal calls
    // (live lane receipt 2026-09-12: h3_timeline chat call refused
    // "test flag must be a boolean (got unknown null)").
    const testFlag: unknown = body["test"] ?? false;
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

  /** The run's engine id (stroke 53): the first stage's engine,
   *  defaulting to 'comfyui' for pre-seam rows (the only engine
   *  that ever was). Single-stage gateway = one engine per run. */
  private static runEngine(run: RunRecord): string {
    const first: StageRow | undefined = run.stages[0];
    const engine: unknown = first?.["engine"];
    return typeof engine === "string" && engine !== "" ? engine : "comfyui";
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
    // THE ENGINE-GENERICS DISPATCH (stroke 53): the 'engines' seat
    // governs when mounted — the executor owns graph surgery
    // (splice inside the adapter), the tap, and the merged submit.
    // Seat-less boots (fixtures, walls) keep the pre-seam direct
    // path byte-for-byte. Runs stay single-engine today: the
    // single-stage gateway constraint means one run names one
    // engine; mixed-engine grouping arrives with the MCP executor
    // (docs/design/engine-generics-mcp.md).
    const enginesSeat: unknown = this.ctx.get("engines");
    let seatExecutor: EngineExecutor | null = null;
    if (
      enginesSeat !== undefined &&
      typeof (enginesSeat as { resolve?: unknown }).resolve === "function"
    ) {
      // resolve() throws LOUD on an unknown id (the contract's
      // miswire voice) — INSIDE the splice-catch scope so the run
      // settles failed and the pump SURVIVES: outside it, the throw
      // escaped runOne with activeId still held, and every future
      // tryDequeue returned null — all inference bricked until
      // restart (audit R1, stroke 82).
      try {
        seatExecutor = (enginesSeat as unknown as { resolve(id: string): { executor: EngineExecutor } }).resolve(
          RunsRuntimeService.runEngine(run),
        ).executor;
      } catch (exc: unknown) {
        const text: string = errText(exc);
        for (const stage of run.stages) {
          /* v8 ignore next */
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
    }
    let rows: MergeRow[];
    try {
      rows = seatExecutor !== null ? [] : run.stages.map(
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
        // (every stage reads running — runOne stamps them just
        // above, so the fence never filters.)
        /* v8 ignore next */
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
      // THE PROGRESS TAP FOLD (2026-09-13, the operator's "forward
      // the comfyui progress webhooks like before"): the engine
      // drains its tap into this callback; the merged submit mints
      // ONE prompt, so every stage row shares the same live fold
      // (status serves stages VERBATIM — the poll rides the
      // existing door, no new wire verb). Hoisted for both paths.
      const report = (updates: Record<string, unknown>): void => {
        const act: unknown = updates["activity"];
        const prog: unknown = updates["progress"];
        const pRec: Record<string, unknown> | null =
          typeof prog === "object" && prog !== null && !Array.isArray(prog)
            ? (prog as Record<string, unknown>)
            : null;
        for (const stage of run.stages) {
          if (typeof act === "string" && act !== "") stage["activity"] = act;
          if (
            pRec !== null &&
            typeof pRec["value"] === "number" &&
            typeof pRec["max"] === "number"
          ) {
            stage["progress"] = { value: pRec["value"], max: pRec["max"] };
          }
        }
      };
      const shouldStop = (): boolean => run.stopFlag;
      let result: { stages: Record<string, MergeStageResult> };
      if (seatExecutor !== null) {
        // The seat path: engine-agnostic rows — the adapter splices
        // (its splice refusal lands in this same catch: the run
        // fails with the planner's text, stages failed, settled).
        const genericRows = run.stages.map(
          (stage, i: number): EngineStageRow => ({
            stageId: stage.id,
            outputs: { ...(stage.outputs as Record<string, EngineJson>) },
            params: { ...(run.params[i] as Record<string, EngineJson>) },
          }),
        );
        const outcome = await seatExecutor.executeStages(
          genericRows,
          run.dir,
          inputNames,
          { shouldStop, report },
        );
        result = {
          stages: Object.fromEntries(
            outcome.stages.map(
              (s): [string, MergeStageResult] => [
                s.stageId,
                { outputs: s.outputs, artifacts: [...s.artifacts] },
              ],
            ),
          ),
        };
      } else {
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
        result = await engine.executeFlow(rows, run.dir, inputNames, {}, {
          shouldStop,
          report,
        });
      }
      for (const stage of run.stages) {
        const row = result.stages[stage.id] ?? { outputs: {}, artifacts: [] };
        const arts: string[] = row.artifacts.filter(
          (a: string): boolean => a !== "",
        );
        run.artifacts.push(...arts);
        if (arts.length > 0) {
          // DIVERGENCE-BY-ORDER: run-relative names, no /v1 prefix
          // (the asset HTTP face died with the app).
          let names: string[] = arts.map((a: string): string =>
            runRel(run, a),
          );
          // THE FILM COMPLETION (2026-09-12, the 4s-stitch defect):
          // when the stitch is shorter than the windows' total, the
          // windows concat (stream copy) into film_video_mux.mp4 and
          // the FILM leads the names — the hero never lies about the
          // timeline. Any probe/mux failure keeps the engine's own
          // stitch (loud, never a fake film).
          // THE ENGINE FILM LEADS (2026-09-17): when the engine
          // composed the film (h3_t4_film), presentation order is the
          // harness's only job — film first, windows after. No mux:
          // composition belongs to the engine, never a shell ffmpeg.
          const engineFilm = engineFilmName(names);
          if (engineFilm !== null) {
            names = [engineFilm, ...names.filter((n): boolean => n !== engineFilm)];
          }
          const plan = filmMuxPlan(names);
          if (plan !== null) {
            if (plan.stitch === null) {
              // THE MERGED FILM (2026-09-17, the seam-wiring stroke):
              // no engine stitch exists — the TS card's windows ARE the
              // film; concat unconditionally so ONE film leads the
              // stage (loud on failure: the windows stay the truth).
              const muxed = muxWindows(run.dir, plan);
              if (muxed !== null) {
                names.unshift(plan.out);
                run.artifacts.push(muxed);
              }
            } else {
              const stitchSec = probeDurationSec(join(run.dir, plan.stitch));
              const windowSecs = plan.windows.map((w): number | null =>
                probeDurationSec(join(run.dir, w)));
              const decidable = stitchSec !== null
                && windowSecs.every((t): t is number => t !== null);
              if (decidable && shouldMuxWindows(stitchSec, windowSecs)) {
                const muxed = muxWindows(run.dir, plan);
                if (muxed !== null) {
                  names.unshift(plan.out);
                  run.artifacts.push(muxed);
                }
              }
            }
          }
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
        // (same fence as the splice-catch above — every stage is
        // still running here.)
        /* v8 ignore next */
        if (stage["status"] === "running") {
          stage["status"] = stopped ? "stopped" : "failed";
          stage["error"] = text;
        }
        delete stage["progress"];
        delete stage["activity"];
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
