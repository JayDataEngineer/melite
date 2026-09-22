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
import { runOne, runEngine as runEngineOf } from "./runsExecute.ts";
import { validate as validateArm, modelValidateArm } from "./runsValidateArms.ts";

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
  /** The validate door (delegates to the extracted arms). */
  async validate(doc: unknown, signal: AbortSignal): Promise<Record<string, unknown>> {
    return validateArm(doc, signal, this.ctx);
  }

  /** The model-validate arm (delegates to the extracted arm). */
  async modelValidateArm(body: Record<string, unknown>): Promise<FlowsValidateAnswer> {
    return modelValidateArm(body, this.ctx);
  }

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
  async status(
    runId: string,
    signal: AbortSignal,
    includeLog = false,
  ): Promise<Record<string, unknown>> {
    signal.throwIfAborted();
    const run: RunRecord | undefined = this.liveRun(runId);
    if (run === undefined) {
      // THE DISK FALLBACK (agent-debt F-5, 2026-09-22): the maker-test
      // lane answered "? — 0/0 stage(s)" / runs/unknown-run for runs
      // whose on-disk _flow.json held status completed + full stage
      // and artifact rows — the live map is the queue's cache, disk
      // is the durable record. A status read crossing a registry
      // reload (or a husk in-memory row) must still answer the truth
      // the run tree holds. Never fabricated: no disk row → the same
      // runs/unknown-run refusal as before.
      const disk: Record<string, unknown> | undefined = this.diskRunRow(runId);
      if (disk === undefined) {
        throw new RemoteError(
          "runs/unknown-run",
          "unknown run_id",
          { runId },
        );
      }
      return { ...disk, from_disk: true, queue_position: 0 };
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
    // THE TERMINAL-HUSK RECOVERY (F-5's second face): a live row that
    // is terminal (completed/failed) yet carries NO stages and NO
    // artifacts is the husk signature — the queue settled the record
    // before the executor's rows landed (or a reload raced). Disk
    // holds the rich row; serve it (marked). A genuinely-empty run
    // (queued/running with nothing yet, or truly bare) stays live —
    // only the terminal+empty+disk-richer triple defers.
    if (
      (run.status === "completed" || run.status === "failed") &&
      run.stages.length === 0 && run.artifacts.length === 0
    ) {
      const disk: Record<string, unknown> | undefined = this.diskRunRow(runId);
      const diskStages = Array.isArray(disk?.["stages"]) ? (disk?.["stages"] as unknown[]).length : 0;
      const diskArts = Array.isArray(disk?.["artifacts"]) ? (disk?.["artifacts"] as unknown[]).length : 0;
      if (disk !== undefined && (diskStages > 0 || diskArts > 0)) {
        return { ...disk, from_disk: true, queue_position: payload["queue_position"] };
      }
    }
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
  private liveRun(runId: RunRecord["runId"]): RunRecord | undefined {
    return (this.core.runs as Map<string, RunRecord>).get(runId);
  }

  /** The durable record under the run tree (F-5's fallback read):
   *  the on-disk _flow.json for a run — the SAME file the maker
   *  verified byte-by-byte while status answered husks. Both
   *  out-roots are probed (production first, then test) since the
   *  fallback may not know the row's testFlag. Unparseable/absent →
   *  undefined — never a fabricated row. */
  private diskRunRow(runId: string): Record<string, unknown> | undefined {
    const root = this.ctx.queue.stateRoot;
    for (const dir of [join(root, "output", runId), join(root, "test-output", runId)]) {
      try {
        const doc: unknown = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8"));
        if (typeof doc === "object" && doc !== null && !Array.isArray(doc)) {
          return doc as Record<string, unknown>;
        }
      } catch {
        /* absent/unreadable in this root — try the next */
      }
    }
    return undefined;
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
        await runOne(run, this.ctx, (r) => this.settle(r));
      }
    } finally {
      this.pumping = false;
    }
  }

  /** The run's engine id (stroke 53): the first stage's engine,
   *  defaulting to 'comfyui' for pre-seam rows (the only engine
   *  that ever was). Single-stage gateway = one engine per run. */

  /** The engine read (static delegate to the extracted plane). */
  static runEngine(run: RunRecord): string {
    return runEngineOf(run);
  }

  /** Terminal settle (queue core row + the settle persist). */
  private settle(run: RunRecord): void {
    const stateRoot = this.ctx.queue.stateRoot;
    settlePersist(run, stateRoot);
    this.core.releaseActive();
    this.core.evictSettled();
  }
}
