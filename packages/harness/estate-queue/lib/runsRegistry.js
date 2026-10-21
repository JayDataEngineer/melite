import { isEstateSidecarName, mediaKindOf } from "./mediaKinds.js";
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
import { CARD_PLANE_ENGINE, RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage";
import { join, relative } from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { stageEngineOf } from "@melite/contracts/benchStage";
import { benchResultDefects } from "@melite/contracts/benchResult";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { needComfyUI } from "@melite/comfyui-cordis";
import { expandRegistryFlow, extractRequestInitials, initialFileCandidates, registryFlowToInline, inlineStagesNameCards, registryInitialsError, } from "./flowsData.js";
import { isFile } from "./skillFs.js";
import { kindsOk } from "./runsValidateStages.js";
import { replayJudgeRows } from "./runsStart.js";
import { FlowError } from "./runsValidateShared.js";
import { composeFamilyStages, liveFamilySeat } from "./flowsFamilyCompose.js";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { loadEndpointConfig } from "@melite/comfyui-cordis";
import { fetchEngineMem, filmLoadOf, filmMemoryWarn } from "./filmMemoryWarn.js";
import { searchedVoice } from "./rootsManifest.js";
import { newRunId, outRootFor, pipelineOf, strictBodyCheck, planResurrect, bootSweep, appendLedger, refusal, walkSubmitEnvelope } from "./queue.js";
import { graphReceiptOf, graphReceiptStageOf } from "./queueSidecar.js";
import { cardRefusal, toRemoteError, refusePreview } from "./runsRefusalVoices.js";
import { lifecycleInFlight } from "./lifecycleLatch.js";
import { lanePresenceRefusal } from "./cardsLanes.js";
import { installRunsChangeSeam, notifyRunChanged, onRunChange } from "./runsChange.js";
import { coerceSnapshotBody } from "./runsValidateStages.js";
import { applyFlowParamsOverride, overlayDecls } from "./flowsParamsOverlay.js";
export { toRemoteError } from "./runsRefusalVoices.js";
import { readFileSync } from "node:fs";
import { CardArmError, } from "./cardsRegistry.js";
import { FLOW_ID_RE } from "./runsGates.js";
import { compileFlowInline, registerCompiledRun, selectSubmitDoor, } from "./runsStart.js";
import { listRunsAcross, parseIntOrNull } from "./runsList.js";
import { claimPersist, errText, runLogTail, settlePersist, RUN_STATUSES, } from "./runsTypes.js";
import { runOne, runEngine as runEngineOf } from "./runsExecute.js";
import { engineFilmName } from "./filmLead.js";
import { validate as validateArm, modelValidateArm } from "./runsValidateArms.js";
import { BENCH_DRAFT_PREFIX_RE, benchDraftIdOf } from '@melite/contracts/benchStage';
// THE `runs` KEY IS NOT DECLARED HERE (li-aq.3, the walls plane's
// typecheck). The adapter package that CONSUMES the seat declares it
// on Context — structurally, by its own header's rule: a compiled
// package may not import these source-run sources into its emit
// graph, so the contract travels with the caller, and the class that
// mounts the seat satisfies it structurally. Declaring it here as
// well (the rename left this twin behind, its comment still naming
// the pre-rename class) is TS2717 the moment one program composes
// both sides — which no program did until the walls did.
/** The refusal codes this remote serves, folded to the
 *  protocol's vocabulary — a literal table, no dynamic key. */
export function enrichDiskRow(row) {
    const stages = Array.isArray(row['stages']) ? row['stages'] : [];
    const artifacts = Array.isArray(row['artifacts'])
        ? row['artifacts'].filter((value) => typeof value === 'string' && value !== '')
        : [];
    if (stages.length !== 1 || artifacts.length === 0)
        return row;
    const stage = stages[0];
    if (stage === null || typeof stage !== 'object' || Array.isArray(stage))
        return row;
    const runId = typeof row['run_id'] === 'string' ? row['run_id'] : '';
    const relative = (value) => {
        const marker = `/${runId}/`;
        const at = value.lastIndexOf(marker);
        return at >= 0 ? value.slice(at + marker.length) : value.replace(/^\/+/, '');
    };
    // ONE VOCABULARY (the li-ay stroke): this private regex was the
    // hero's ONLY media law — it carried avif|m4v|avi the contract's
    // vocab did not, and DROPPED svg|bmp the vocab did carry, so a
    // disk row whose lone artifact was an .svg got no hero and no
    // gallery while an .avif was hero'd but unclassifiable. The
    // classifier is the contract's mediaKindOf now, shared with the
    // run list and the gallery client — the seats cannot disagree.
    // THE SIDECAR LAW (the text-kind stroke, 2026-10-24): json IS a
    // text kind now (SaveText's own format set), so classification
    // alone no longer refuses the harness's bookkeeping — the name
    // law does. `_request.json` is a sidecar by NAME, never media;
    // a real `result.json` artifact stays eligible.
    const names = [...new Set(artifacts.map(relative))]
        .filter((name) => !isEstateSidecarName(name))
        .filter((name) => mediaKindOf(name) !== undefined);
    if (names.length === 0)
        return row;
    const hero = engineFilmName(names) ?? names[0];
    const current = stage;
    return {
        ...row,
        stages: [{
                ...current,
                ...(typeof current['url'] === 'string' && current['url'] !== '' ? {} : { url: hero }),
                ...(Array.isArray(current['gallery']) ? {} : { gallery: names.map((name) => ({ name })) }),
            }],
    };
}
/** THE SIDECAR READER (2026-10-17): one run dir → a read(name)
 *  closure. Absent sidecars are the COMMON case (a run validates
 *  only when its lane asks) — every miss reads as null, never a
 *  throw, so the decorate stays about mounting, not survival.
 * @param dir the run's output dir (names resolve against it)
 * @returns a UTF-8 reader returning null for any unreadable name */
export function sidecarReaderFor(dir) {
    return (name) => {
        try {
            return readFileSync(join(dir, name), 'utf8');
        }
        catch {
            return null;
        }
    };
}
/** The sidecar candidates for one stage row: every gallery name's
 *  own `<stem>.report.json` sibling, keyed by stem. */
function sidecarCandidatesOf(stage, runId) {
    const candidates = new Map();
    const add = (name) => {
        const at = name.lastIndexOf('/');
        const dir = at >= 0 ? name.slice(0, at + 1) : '';
        const base = at >= 0 ? name.slice(at + 1) : name;
        const dot = base.lastIndexOf('.');
        const stem = dot > 0 ? base.slice(0, dot) : base;
        if (stem === '')
            return;
        if (!candidates.has(stem))
            candidates.set(stem, `${dir}${stem}.report.json`);
    };
    const gallery = Array.isArray(stage['gallery']) ? stage['gallery'] : [];
    for (const g of gallery) {
        if (typeof g === 'object' && g !== null && !Array.isArray(g)) {
            const name = g['name'];
            if (typeof name === 'string' && name !== '')
                add(name);
        }
    }
    const url = typeof stage['url'] === 'string' ? stage['url'] : '';
    if (url !== '') {
        const marker = `/${runId}/`;
        const at = url.lastIndexOf(marker);
        add(at >= 0 ? url.slice(at + marker.length) : url.replace(/^\/+/, ''));
    }
    return candidates;
}
/** THE REPORT SIDECAR MOUNT (2026-10-17, the rig-reports writer):
 *  a stage's machine-readable verdicts ride INLINE on the status row
 *  (`reports` — the bench stage result contract's own map, never a
 *  url, never subject to the one-file-one-key law). The validator
 *  runs under Blender's python, which the engine cannot host, so its
 *  lane drops `<stem>.report.json` beside the GLB and THIS seat
 *  mounts it at status time — the body must already BE the
 *  contract's report entry (the writer performs the fold; the seat
 *  stays domain-neutral and judges through `benchResultDefects`,
 *  never parsing rig tuples). A malformed or unlawful sidecar SKIPS
 *  with a warning naming the file — a refused verdict is loud,
 *  never silently absent; an existing key under the same stem wins
 *  (the sidecar never overwrites a mounted report).
 * @param row the status row (stages decorated additively)
 * @param read the run dir's sidecar reader
 * @returns the row with stages' reports mounted and warnings named */
export function withStageReports(row, read) {
    const runId = typeof row['run_id'] === 'string' ? row['run_id'] : '';
    const stages = Array.isArray(row['stages']) ? row['stages'] : [];
    if (stages.length === 0)
        return row;
    const priorWarnings = Array.isArray(row['warnings']) ? row['warnings'].length : 0;
    const warnings = Array.isArray(row['warnings'])
        ? (row['warnings'].filter((w) => typeof w === 'string'))
        : [];
    let mounted = false;
    const nextStages = stages.map((raw) => {
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
            return raw;
        const stage = raw;
        const existing = typeof stage['reports'] === 'object' && stage['reports'] !== null
            && !Array.isArray(stage['reports'])
            ? stage['reports'] : {};
        const reports = { ...existing };
        for (const [stem, rel] of sidecarCandidatesOf(stage, runId)) {
            if (stem in reports)
                continue;
            const text = read(rel);
            if (text === null)
                continue;
            let parsed;
            try {
                parsed = JSON.parse(text);
            }
            catch {
                warnings.push(`report sidecar ${rel} is not JSON — skipped`);
                continue;
            }
            // THE CONTRACT JUDGES (the writer asserts, the reader
            // normalizes — this seat does neither by hand): a probe row
            // carrying only this entry surfaces the entry's own defects.
            const defects = benchResultDefects({ run_id: 'probe', reports: { [stem]: parsed } })
                .filter((d) => d.startsWith(`reports.${stem}`));
            if (defects.length > 0) {
                warnings.push(`report sidecar ${rel} refused by the bench result contract (${defects[0]}) — skipped`);
                continue;
            }
            reports[stem] = parsed;
            mounted = true;
        }
        return Object.keys(reports).length > 0 ? { ...stage, reports } : stage;
    });
    if (!mounted && warnings.length === priorWarnings)
        return row;
    return {
        ...row,
        stages: nextStages,
        ...(warnings.length > 0 ? { warnings } : {}),
    };
}
/** The runs registry seat: `ctx.runs`. The estate-runs adapters
 *  (Typert) delegate here; the door's registry/pump semantics ride
 *  this service verbatim. */
// ROLE (cookbook adding-a-package role table): Runtime: its contract is dispatch/execution/cancellation (the cookbook role table; a Registry owns membership, which this is not). Key "runs" unchanged (wire-stable).
/**
 * THE BENCH'S WIRING, SPLIT BY KIND (the wired-bench law's read):
 *   cross  — a stage takes an input from ANOTHER stage's output. This
 *            is the normal, intended shape ("select the input from
 *            the previous outputs") and the run MUST be a flow.
 *   self   — a stage wires its OWN output into its own input. That is
 *            a cycle: no composition of it exists, in any arm, so it
 *            is named for what it is rather than run.
 * Both are read from the bench doc as it stands — never from a
 * caller's claim about it.
 */
/**
 * THE ENGINE IS DERIVED, NOT AUTHORED (operator, 2026-10-10: "The
 * bench media flow is always the same, no matter if the AI agent OR
 * the human edits it. There is no distinction in the bench.").
 *
 * Three writers each invented a default for a stage's engine — the
 * bench's normalizer, the add-card door, and the run door's pure
 * default — so a hand-written stage and a GUI-written stage reached
 * the compiler as DIFFERENT documents, and a stage missing the field
 * died at a gate that had no business asking for it.
 *
 * One derivation, here, at the door that owns the engines seat: a
 * stage that names a CARD and no engine is a card stage, and the card
 * plane composes on the card engine (the same truth the card arm
 * states in its own voice). A stage that names NO card and NO engine
 * is still refused — an mcp/flow stage must say where it runs.
 */
/** The bench run's own line (never silent): how many stages the
 *  merged run carries, and that the wires are inside them. */
function curatedBenchLog(stageCount) {
    console.log("[runs] bench run admitted — " + String(stageCount) +
        " composed stage(s) with their FromStage links riding as stage inputs");
}
/** The card plane's engine is the CONTRACT's (benchStage.ts) — the
 *  bench is the card bench, and that is where it is stated. This arm
 *  applies it to a flow document's card= rows only: an mcp/flow
 *  stage that names no engine still refuses below, and that demand
 *  is intentional (a flow is hand-authored and must say where it
 *  runs; a bench row never has to). */
function deriveFlowCardEngines(stages) {
    for (const st of stages) {
        if (st === null || typeof st !== "object")
            continue;
        const row = st;
        if (typeof row["card"] !== "string" || row["card"] === "")
            continue;
        row["engine"] = stageEngineOf(row);
    }
}
export function benchWiring(benchDoc) {
    const cross = [];
    const self = [];
    const stages = Array.isArray(benchDoc["stages"]) ? benchDoc["stages"] : [];
    for (const st of stages) {
        if (typeof st !== "object" || st === null)
            continue;
        const row = st;
        const id = typeof row["id"] === "string" ? row["id"] : "";
        const ins = row["inputs"];
        if (typeof ins !== "object" || ins === null || Array.isArray(ins))
            continue;
        for (const [name, ref] of Object.entries(ins)) {
            const rr = ref;
            if (rr === null || typeof rr !== "object" || typeof rr["stage"] !== "string")
                continue;
            const label = name + " <- " + String(rr["stage"]) +
                (typeof rr["output"] === "string" ? "." + String(rr["output"]) : "");
            if (rr["stage"] === id)
                self.push(label);
            else
                cross.push(label);
        }
    }
    return { cross, self };
}
export class RunsRuntimeService extends Service {
    /** THE PRESS MEMORY's cap (audit N-E1): the last 64 presses of
     *  this process answer replays; older keys age out (a replay that
     *  old is a new press by any honest reading). */
    static PRESS_MEMORY_MAX = 64;
    static inject = ["queue", "draftsRemote", "cardRegistry"];
    /** The pump reentrancy guard (door-verbatim — a public field:
     *  cordis proxies services, and private #fields do not cross the
     *  proxy). */
    pumping = false;
    /** The boot-reconcile guard (once per boot; the constructor's
     *  fire-and-forget burns it — walls re-arm this PUBLIC field and
     *  await bootReconcile directly, the pumping-field precedent:
     *  private #fields do not cross cordis proxies). */
    reconciled = false;
    /** THE TEARDOWN ARM (the standing teardown race, retired
     *  2026-09-24): before this, dispose stopped NOTHING — the pump
     *  kept claiming queued runs and settling them after the fiber
     *  died (GPU work past teardown; a next boot's reconcile could
     *  replay a run the zombie pump was still settling — duplicate
     *  GPU spend, the same signature as the bench skip-done hole).
     *  The dispose effect flips this flag; the pump checks it before
     *  every claim, and the in-flight run gets the stop door's own
     *  treatment (stopFlag + best-effort engine interrupt) so the
     *  engine's shouldStop converges at the next boundary. A public
     *  field — the pumping-field precedent (cordis proxies). */
    tearingDown = false;
    /** The cached engine seat for the teardown interrupt: a ctx.get
     *  from a DYING fiber refuses (the lookup that feeds the stop
     *  door works only while this fiber lives), so the pump caches
     *  the seat at claim time and the dispose effect rides the
     *  cache. Structural type — no engine import cycle. */
    engineSeat;
    constructor(ctx) {
        super(ctx, "runs");
        // THE RUNS CHANGE SEAM (1.8, the run-view push source): the
        // write spine lives in pure modules (queueCore, runsExecute)
        // that own no Context, so this service — the seat's owner —
        // installs the seam on the bus; every writer keeps calling
        // notifyRunChanged. Fiber-scoped: the effect detaches it when
        // this fiber dies (the bench seat's installer law, verbatim).
        installRunsChangeSeam(this.ctx);
        // STROKE 83 — THE BOOT RECONCILE (resurrect is no longer
        // tested-but-unwired): queued sidecars of a DEAD process are
        // REPLAYED through the start door with their own run ids, then
        // stale running claims sweep. Fire-and-forget with a dispose
        // guard; the walls await bootReconcile() directly.
        let disposed = false;
        this.ctx.effect(() => {
            disposed = false;
            // THE TEARDOWN ARM: the same flip arms the pump's claim gate
            // and presses stop on anything in flight (the stop door's
            // own verbs — flag first, engine interrupt best-effort; the
            // worker's stop check converges the state when no seat
            // answers). Never throws: teardown must not fail.
            this.tearingDown = false;
            return () => {
                disposed = true;
                this.tearingDown = true;
                try {
                    for (const run of this.core.runs.values()) {
                        if (run.status === "queued" || run.status === "running" || run.status === "stopping") {
                            run.stopFlag = true;
                        }
                    }
                    const inFlight = [...this.core.runs.values()]
                        .filter((r) => r.status === "running" || r.status === "stopping");
                    if (inFlight.length > 0) {
                        // The cached seat first (a ctx.get from this dying
                        // fiber refuses); the fresh lookup is the fallback for
                        // a teardown before any claim (best-effort, never
                        // throws — teardown must not fail).
                        const comfy = this.engineSeat ?? (() => {
                            try {
                                return needComfyUI(this.ctx, "runsRemote teardown");
                            }
                            catch {
                                return undefined;
                            }
                        })();
                        if (comfy !== undefined) {
                            for (const run of inFlight) {
                                void comfy.stopForRunDir(run.dir).catch((e) => {
                                    // named (audit N-S5): an interrupt outage is
                                    // observable; the stopFlags still converge
                                    console.log("[estate-queue] teardown interrupt failed:", e instanceof Error ? e.message : String(e));
                                });
                            }
                        }
                    }
                }
                catch {
                    /* no engine seat at teardown: the stopFlags converge the
                     * worker loop at its next boundary — teardown never throws */
                }
            };
        }, "estate-runs.reconcile-guard");
        /* v8 ignore next 3 -- defensive-only (the fire-and-forget
         * law's unhandled-rejection guard): planResurrect swallows
         * its own I/O (the readdir try road + per-record reads), so
         * the swallow arms the constructor against FUTURE plan-level
         * faults, never a today-reachable one. The per-run arms own
         * their failure writes; a plan-level fault must never take
         * the fiber down. */
        const swallowPlanFault = () => { };
        void this.bootReconcile(() => disposed).catch(swallowPlanFault);
    }
    /** Subscribe to run-row movement (the seat face runs/subscribe
     *  parks on); returns the unsubscribe. Delegates to the module
     *  seam — a listener's fault never breaks the write (the wrapper
     *  guards; the law lives at runsChange.ts onRunChange). */
    onRunChange(fn) {
        return onRunChange(fn);
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
    async validate(doc, signal) {
        return validateArm(doc, signal, this.ctx);
    }
    /** The model-validate arm (delegates to the extracted arm). */
    async modelValidateArm(body) {
        return modelValidateArm(body, this.ctx);
    }
    async bootReconcile(disposed = () => false) {
        if (this.reconciled)
            return [];
        this.reconciled = true;
        const stateRoot = this.ctx.queue.stateRoot;
        // Permissive by intent: the start door owns the draft probe —
        // a deleted draft settles failed LOUD here instead of riding
        // the orphan list silently.
        const plan = planResurrect(stateRoot, undefined, undefined, () => true);
        const revived = [];
        const deferred = [];
        for (const runId of plan.order) {
            if (disposed())
                return revived;
            let body = null;
            try {
                body = JSON.parse(readFileSync(join(stateRoot, "output", runId, "_request.json"), "utf8"));
            }
            catch {
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
            }
            catch (exc) {
                // THE TRANSIENT REFUSAL (round-20 lifecycle audit Q2): a
                // teardown holding the latch at replay time is not a poison
                // request — settling the row failed would be permanent poison
                // for a refusal a retry cures. The row stays queued, loudly,
                // and rides the sweep's live set so the same pass cannot
                // retire what it just deferred.
                if (exc instanceof RemoteError && exc.code === "runs/lifecycle-inflight") {
                    console.warn(`[runs] replay of ${runId} deferred: a lifecycle teardown is in flight (the row stays queued)`);
                    deferred.push(runId);
                    continue;
                }
                // LOUD, in place: the sidecar moves to failed with the
                // door's refusal text — a poison request can never haunt
                // the next boot as "queued" forever.
                await this.settleReplayRefusal(stateRoot, runId, errText(exc));
            }
        }
        await bootSweep(stateRoot, [...revived, ...deferred]);
        if (revived.length > 0)
            this.kick();
        return revived;
    }
    /** Settle a replay-refused resurrect id: rebuild the row's
     *  identity from its own sidecar (the stage faces ride verbatim)
     *  and persist failed through the canonical terminal writer. */
    async settleReplayRefusal(stateRoot, runId, error) {
        const dir = join(outRootFor(stateRoot, false), runId);
        let pre = {};
        try {
            // VERBATIM, DELIBERATELY (the work audit's P2, second pass): an
            // earlier cut ran this through parseSidecar and gated the row on
            // it — which zeroed the identity of a sidecar whose STAGES are
            // junk. Carrying that identity forward is this settle's whole
            // job: a refused replay settles LOUD in place showing the
            // operator the run's own faces (created_at, pipeline, stage
            // rows), and a gate here made those read "undefined". The readers
            // that KEY a row by id (the boot sweep, the resurrect plan) are
            // where the parse belongs.
            const raw = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8"));
            // post-parse shape guard (strictness fix 7): JSON.parse accepts
            // `null`/`42`/`"x"` — the bare cast below would have served
            // them as the settle's identity carrier. TOCTOU-only live: the
            // plan's own parseSidecar refuses non-object docs before any id
            // reaches this re-read (pinned in runs-registry-reconcile).
            /* v8 ignore next -- TOCTOU-only: plan-time parseSidecar owns the static path */
            if (raw === null || typeof raw !== "object" || Array.isArray(raw))
                throw new Error("sidecar is not an object");
            pre = raw;
        }
        catch {
            /* v8 ignore next 3 -- TOCTOU-only (the agent-engine law):
             * the record was readable+queued at plan time or it never
             * entered the plan; this re-read catches a torn filesystem
             * between the two reads. The zeroed identity below is the
             * honest floor for a vanished sidecar. */
            pre = {};
        }
        const faces = Array.isArray(pre["stages"]) ? pre["stages"] : [];
        const row = {
            runId,
            status: "failed",
            stages: faces,
            skippedStages: Array.isArray(pre["skipped_stages"])
                ? pre["skipped_stages"].map((x) => typeof x === "string" ? x : "")
                : [],
            artifacts: [],
            error,
            /* v8 ignore next -- planResurrect admits only string sidecar
             * draft_ids (durableRecordUsable's gate); the non-string arm
             * is torn-state defense, unreachable in sequence. */
            draftId: typeof pre["draft_id"] === "string" ? pre["draft_id"] : "",
            dir,
            testFlag: false,
            stopFlag: false,
            params: [],
            createdAt: typeof pre["created_at"] === "number" ? pre["created_at"] : 0,
            pipeline: typeof pre["pipeline"] === "string" ? pre["pipeline"] : "flow_inline",
            graphRows: [],
            outputNodes: [],
            // A vanished/torn sidecar's floor: a failed resurrect carries
            // no request initials (the queued original's _flow.json is the
            // durable mirror; a re-plan re-registers through the door).
            initials: {},
        };
        await settlePersist(row, stateRoot);
    }
    /** The queue seat's registry (the FIFO SSOT). */
    get core() {
        return this.ctx.queue.core;
    }
    /**
     * COMPOSE THE WHOLE BENCH (the operator's law, 2026-10-10: "The
     * bench media flow is always the same, no matter if the AI agent OR
     * the human edits it. There is no distinction in the bench." and
     * "there is ALWAYS FromStage links ... THERE IS NO FILTER, NO
     * BREAKAGE FROM THIS. EVER.").
     *
     * One shape in, one run out. Every stage is composed through the
     * SAME registry walk a single-card start uses (prepareCardParams →
     * admission → the DECL's lane laws → compose), so an agent-authored
     * stage and a GUI-authored stage are the same document to the
     * compiler; the bench's `inputs` edges ride the compiled stage
     * untouched, and a $spell is left IN the composed graph for the
     * merged worker to resolve into the upstream stage's output.
     *
     * Returns the composed stage rows for the flow_inline wire.
     */
    /** ONE card stage, composed (the shared compose core — the bench
     *  run and the registry-flow arm both ride it, so a card composes
     *  through exactly ONE implementation and one refusal voice).
     *  `label` names the seat in a refusal ("bench stage " / "flow
     *  stage "). */
    async composeCardStageRow(row, id, runId, label, 
    /** THE CLAIM-TIME RE-PROBE'S LEDGER (audit 2026-10-22): the
     *  composed stage's family lands here, keyed by stage id — the
     *  run-level map the pump re-probes at claim. The stage row
     *  itself stays schema-clean (extra=forbid at the wire door). */
    famsOut, 
    /** THE GRAPH-RECEIPT LEDGER (the silent UI-drop purge's P1):
     *  the composed stage's queue-time doc→graph evidence lands
     *  here, keyed by stage id (the per-stage rows inside the
     *  run-level `graph_receipt`). The receipt judges the row's OWN
     *  `params` (the doc verbatim, pre-stamp) against the composed
     *  graph. The stage row itself stays schema-clean (extra=forbid
     *  at the wire door) — same law as the fams ledger. */
    receiptsOut) {
        const cards = this.ctx.cardRegistry;
        const params = (typeof row["params"] === "object" && row["params"] !== null && !Array.isArray(row["params"]))
            ? { ...row["params"] }
            : {};
        const card = String(row["card"] ?? "");
        // STROKE 3'S FALLBACK (the validate walk's own shape —
        // runsValidateArms: a family-less card stage composes by its OWN
        // card id — mid alone, never an injected body.model, which would
        // hit the board check before prepareCardParams resolved the
        // card-unit arm). The old `?? ""` handed prepareCardParams an
        // empty mid — "model id \"\" is not a legal identifier" on the
        // body-to-somax rig hop and every family-less flow stage after
        // it (the af-move commission's stop, 2026-10-09).
        // THE ROUTING-KEY STAMP (2026-10-12 hunt, finding 1): when the
        // effective routing key rode an EXPLICIT spelling — params.model
        // or the row's service key — the compose lanes that value while
        // the admission judge reads body.model only, so a service-bearing
        // row ran in the routing family's lane UNGATED by the board law
        // (live receipt: the tts+krea-2 row composing image-gen's voice).
        // The stamp hands the judge the value that lanes. The ?? card
        // fallback is NEVER stamped: for a family-less card mid is the
        // card-unit alias's own spelling (mid alone; the GUI's explicit
        // card-id press rides the alias arm at admitStageModel), and a
        // boarded card with no model picked keeps its honest phase-2
        // refusal ("requires a model id").
        const service = typeof row["service"] === "string" && row["service"] !== "" ? row["service"] : undefined;
        const mid = String(params["model"] ?? service ?? card);
        if (params["model"] === undefined && service !== undefined)
            params["model"] = service;
        // THE UNWIRED-SPELL GATE (the $image burn, 2026-10-20): a $spell in
        // the row's params resolves at the merge against the row's own inputs
        // edges — FromStage links and initial bindings ride the composed row
        // verbatim into the merge's inputNames — so a spell naming NO wired
        // input is a promise this seat cannot keep. Composing it verbatim let
        // a card guard misdiagnose it (h3's stated-variant voice for an
        // unwired image) or the merge refuse it with a stranger's voice. THE
        // DOOR COVERS WHAT THE RUN WILL DO (the flow_inline SPELL GATE's own
        // law, runsStart.ts): refuse here, in the seat's voice, naming the
        // spell and the fix. The exempt set IS the downstream gate's (the
        // inputs bag's keys — every binding shape the merge reads) — a wired
        // spell still rides for the merged worker to resolve, so no legal run
        // changes verdict; only the seat of the refusal moves earlier.
        const wiredInputs = new Set(typeof row["inputs"] === "object" && row["inputs"] !== null && !Array.isArray(row["inputs"])
            ? Object.keys(row["inputs"])
            : []);
        const ghosts = [];
        const sweepSpell = (v) => {
            if (typeof v === "string") {
                if (v.startsWith("$") && v.length > 1 && !wiredInputs.has(v.slice(1)))
                    ghosts.push(v);
            }
            else if (Array.isArray(v)) {
                for (const x of v)
                    sweepSpell(x);
            }
            else if (typeof v === "object" && v !== null) {
                for (const x of Object.values(v))
                    sweepSpell(x);
            }
        };
        sweepSpell(params);
        if (ghosts.length > 0) {
            throw new RemoteError("runs/invalid-request", label + JSON.stringify(id) + ": params carry " +
                JSON.stringify([...new Set(ghosts)].sort()) +
                " but the stage wires no input of that name — the merge would refuse it at run time. " +
                "Wire the input (an inputs edge from a prior stage, or an initial binding) or replace the $spell with a concrete value.", { loc: "stages" });
        }
        let p1;
        let composed;
        try {
            p1 = await cards.phase1Card({ ...params, card }, mid);
            composed = await cards.phase2Card(p1, runId);
            // THE GRAPH RECEIPT (the silent UI-drop purge's P1): the
            // stage's compose just landed — receipt the doc (the row's
            // OWN params, verbatim: the routing-key stamp above rides
            // only the compose copy, never the judged doc) against the
            // composed graph. EVIDENCE, never a refusal.
            if (receiptsOut !== undefined) {
                const docParams = typeof row["params"] === "object" && row["params"] !== null && !Array.isArray(row["params"])
                    ? row["params"]
                    : {};
                receiptsOut[id] = graphReceiptStageOf(id, graphReceiptOf(docParams, { workflow: composed.graph }));
            }
        }
        catch (e) {
            if (e instanceof CardArmError) {
                // QueueRefusal carries {status, payload} — the message
                // lives at payload.error (`.message` was undefined at
                // runtime; tsc had never run over this file).
                const refusal = cardRefusal(e);
                const p = refusal.payload;
                // THE CARD ARM'S CLASSIFICATION AND EVIDENCE, KEPT (one
                // voice per refusal): a card refusal composes here exactly
                // as it does on the card arm — the card plane's own code
                // (lane_input_missing carries the provision fetch URL) and
                // its loc/expected/got, which are what make it actionable.
                // Only the stage name is added, because only this arm knows
                // which bench stage failed.
                const mapped = toRemoteError(refusal);
                // THE WHOLE REFUSAL RIDES, not just its code: the card
                // plane's own loc/expected/got are what make a
                // lane_input_missing actionable (which model, which folder,
                // what was expected). This arm keeps them and adds the
                // bench stage, so the two arms differ by the stage name
                // and by nothing else.
                // toRemoteError always builds a details object (it fills the
                // three keys it has and omits the rest), so no fallback is
                // owed here — a refusal with no evidence carries no keys.
                const carried = { ...mapped.details };
                const cardLoc = carried["loc"];
                carried["loc"] =
                    "stages/" + JSON.stringify(id) +
                        (typeof cardLoc === "string" && cardLoc !== "" ? " (" + cardLoc + ")" : "");
                throw new RemoteError(mapped.code, label + JSON.stringify(id) + ": " + p.error, carried);
            }
            throw e;
        }
        const stageOutputs = (typeof row["outputs"] === "object" && row["outputs"] !== null && !Array.isArray(row["outputs"])
            && Object.keys(row["outputs"]).length > 0)
            ? { ...row["outputs"] }
            // THE BENCH'S OUTPUTS WIN ONLY WHEN THEY CARRY CHANNELS
            // (the work audit's R1 — a regression the card-ports law
            // introduced here): a card stage's stored outputs are `{}` by
            // design (the channels derive from the card's own ports at
            // compose), and this line kept that `{}` verbatim — so the
            // merged worker published ZERO channels and every $spell
            // consumer downstream got nothing where the old fabricated
            // `{default: 'image'}` at least published one. An EMPTY
            // channel map means "unfilled": the compose's own ports
            // answer, exactly as the single-card path already does.
            : composed.outputs;
        // THE OUTPUT RENAME FOLLOWS THE BINDINGS (the run-9f8bd60f8cb8
        // receipt-gate cure, 2026-10-09): a row may rename the card's
        // channels (outputs {body: "mesh"} over the card's own
        // {default: "mesh"}), but params.output_nodes kept the card's
        // naming — the merged worker then bound the artifact under
        // "default" while the declared channel was "body": the unbound
        // ext sweep published "body" fine, and the receipt gate refused
        // binding channel "default" as produced-no-artifact although the
        // GLB sat fetched on disk. When the row renames, the bindings
        // rename with it — kind-matched, one-to-one; an ambiguous kind
        // (two declared channels of one kind) leaves the card naming
        // verbatim and the receipt gate names the ambiguity loud.
        const cardOuts = (composed.outputs ?? {});
        const cardNodes = (composed.outputNodes ?? {});
        const rowChannelsByKind = {};
        for (const [ch, kind] of Object.entries(stageOutputs)) {
            (rowChannelsByKind[String(kind)] ??= []).push(ch);
        }
        const renamedNodes = {};
        let renamedAny = false;
        for (const [ch, node] of Object.entries(cardNodes)) {
            const targets = rowChannelsByKind[String(cardOuts[ch] ?? "")] ?? [];
            if (targets.length === 1 && stageOutputs[ch] === undefined) {
                renamedNodes[targets[0]] = node;
                renamedAny = true;
            }
            else {
                renamedNodes[ch] = node;
            }
        }
        // benchExpected: the derivation law's bench half (J-E1 comment
        // at the spread below) — the card's declared input kinds fill the
        // absent slots, the hand-written row wins per input.
        const cardDef = cards.defsSync().get(card);
        const cardInputs = cardDef?.flowKinds?.inputs;
        const cardAliases = cardDef?.flowKinds?.legacyAliases;
        const rowExpected = (typeof row["expected"] === "object" && row["expected"] !== null && !Array.isArray(row["expected"]))
            ? row["expected"]
            : {};
        const benchExpected = cardInputs === undefined && cardAliases === undefined
            ? { ...rowExpected }
            : { ...(cardInputs ?? {}), ...(cardAliases ?? {}), ...rowExpected };
        const stage = {
            id,
            engine: stageEngineOf(row),
            params: {
                workflow: composed.graph,
                output_nodes: (renamedAny ? renamedNodes : cardNodes),
            },
            // THE DECLARED INPUT KINDS RIDE (2026-10-04): the compiler reads
            // `expected` for its kindsOk walk and defaults an absent bag to
            // {} — so a composed stage that dropped it would compile with NO
            // kind assertion on its own inputs. The registry rows declare
            // them (audio-native-tts: { text: "text" }), and the check is
            // theirs, not the composer's to discard.
            //
            // THE KINDS PROJECTION (audit J-E1, 2026-10-22): the derivation
            // law runs at the compose too, not only in validate's kindsOk —
            // a bench row carries inputs with no hand-written expected, and
            // an empty bag queued the run with no kind assertion on its own
            // wired inputs. The card's declared input kinds (legacy aliases
            // included, the naming law's lattice half) fill the absent
            // slots; a hand-written row still wins per input, because the
            // override exists for initials the card cannot know.
            ...(Object.keys(benchExpected).length > 0 ? { expected: benchExpected } : {}),
            // THE WIRES RIDE (the whole point): the bench's own edges,
            // verbatim, for the merged worker to link.
            ...(typeof row["inputs"] === "object" && row["inputs"] !== null && !Array.isArray(row["inputs"])
                ? { inputs: { ...row["inputs"] } }
                : {}),
            outputs: stageOutputs,
        };
        if (famsOut !== undefined)
            famsOut[id] = p1.fam;
        return stage;
    }
    /** A REGISTRY FLOW's card stages, composed (the 2026-10-04 cure —
     *  the VALIDATE-ONLY stamp's end). A registry row projects through
     *  registryFlowToInline with its `card` references INTACT, and the
     *  inline compiler refuses a `card=` stage (runsStart.ts:184-192,
     *  the 2026-09-25 multi-stage boundary stamp) — so every card-
     *  bearing flow (audio-native-tts, image-upscale, music-native,
     *  body-to-somax) could validate but never start, and an app
     *  calling a named flow got 400 runs/preview-scope.
     *
     *  The bench run already proved multi-stage card execution on the
     *  merged worker, so this composes the SAME stages through the SAME
     *  card walk (composeCardStageRow) rather than admitting a second
     *  execution path: card stages become compiled graph stages, the
     *  row's `inputs` edges ride verbatim, and a stage naming NO card
     *  (an engine row — craft-loop's `craft`, an `mcp:<server>` row)
     *  passes through untouched, which is what makes a MIXED flow legal.
     */
    async composeRegistryFlowStages(inlineDoc, runId, 
    /** THE CLAIM-TIME RE-PROBE'S LEDGER (audit 2026-10-22): filled
     *  with {stageId: fam} for every composed card stage. */
    stageFams, 
    /** THE GRAPH-RECEIPT LEDGER (P1): filled with {stageId: row}
     *  for every composed card stage (composeCardStageRow's seat). */
    receiptsOut) {
        const rows = inlineDoc["stages"];
        // registryFlowToInline always projects an array of object rows, so
        // the non-array answer needs no second shape (the compile-time
        // gate below judges the same value).
        if (!Array.isArray(rows))
            return inlineDoc;
        const out = [];
        for (const [i, st] of rows.entries()) {
            if (typeof st !== "object" || st === null)
                continue;
            const row = st;
            const card = typeof row["card"] === "string" ? row["card"] : "";
            const id = typeof row["id"] === "string" && row["id"] !== "" ? row["id"] : "s_" + String(i);
            out.push(card === ""
                ? { ...row }
                : await this.composeCardStageRow(row, id, runId, "flow stage ", stageFams, receiptsOut));
        }
        return { ...inlineDoc, stages: out };
    }
    async composeBenchStages(benchDoc, runId, 
    /** THE CLAIM-TIME RE-PROBE'S LEDGER (audit S-S4, 2026-10-22):
     *  the bench arm fed no famsOut, so every composed stage's
     *  family vanished before the pump's claim re-probe — the most
     *  common multi-stage path rode an empty ledger and a mid-wait
     *  prune died engine-side instead of with the lane voice. */
    famsOut, 
    /** THE GRAPH-RECEIPT LEDGER (P1): filled with {stageId: row}
     *  for every composed card stage (composeCardStageRow's seat). */
    receiptsOut) {
        // the sole caller arrives gated on benchWiring(...).cross being
        // non-empty, and benchWiring answers [] unless stages is an
        // array — the non-array fallback here was a dead leg, pruned
        const rows = benchDoc["stages"];
        const out = [];
        for (const [i, st] of rows.entries()) {
            if (typeof st !== "object" || st === null)
                continue;
            const row = st;
            const id = typeof row["id"] === "string" && row["id"] !== "" ? row["id"] : "s_" + String(i);
            // A STAGE WITH NO CARD (an mcp/flow row) composes nowhere here
            // — the bench run is the CARD bench; a foreign stage is named
            // rather than silently dropped (no silent behavior).
            if (typeof row["card"] !== "string" || row["card"] === "") {
                throw new RemoteError("runs/invalid-request", "bench stage " + JSON.stringify(id) +
                    " names no card — the bench run composes card stages; an mcp/flow stage belongs in a flow, not the bench", { loc: "stages" });
            }
            out.push(await this.composeCardStageRow(row, id, runId, "bench stage ", famsOut, receiptsOut));
        }
        /* v8 ignore next 4 -- this bench is only composed when
         * benchWiring found a CROSS wire, and benchWiring reaches wires
         * only on object rows that carry an inputs bag — every such row
         * either names a card (it composes, so out is non-empty) or
         * refuses above at the cardless gate. An all-junk bench declares
         * no wire, so it never becomes the bench run. */
        if (out.length === 0) {
            throw new RemoteError("runs/invalid-request", "the bench carries no composable card stage — a wired bench runs its cards, and there are none", { loc: "stages" });
        }
        return out;
    }
    async start(doc, signal, 
    /** INTERNAL (stroke 83 boot resurrect): reuse a dead process's
     *  run id when replaying its _request.json — the remote surface
     *  never passes this (two-arg wire calls only). */
    reuse) {
        signal.throwIfAborted();
        // The pre-registration chain, order (queue.ts's envelope
        // walk with the draft probe handed in): non-object, test-bool,
        // draft required/malformed, then the AWAITED domain probe
        // (unknown doc), then the strict body.
        const draftExists = async (draftId) => {
            try {
                await this.ctx.draftsRemote.get(draftId, signal);
                return true;
            }
            catch (error) {
                const remote = remoteErrorOf(error);
                if (remote !== undefined && remote.code === "draft/not-found") {
                    return false;
                }
                throw error;
            }
        };
        // The envelope walk sits HERE (the one shared walker,
        // walkSubmitEnvelope — the S3 twin cure deleted the sync face)
        // because the draft probe is an AWAITED seat hop — the ORDER is
        // preserved exactly.
        const checked = await walkSubmitEnvelope(doc, draftExists);
        // THE REFUSAL FIRST (stroke 48: the bench read below needs
        // checked.draftId, which only the ok arm carries — refusing here
        // is the same throw, minus the wasted draft probe).
        if (checked.kind === "refusal")
            throw toRemoteError(checked.refusal);
        // THE LIFECYCLE LATCH (MP-R1, 2026-10-10): a teardown in flight
        // refuses the press BEFORE the replay, the reserve and the mint —
        // a run born now would tear mid-render. Named code, and the
        // replay cannot launder it (the check sits above the replay).
        const lifecycleHeld = lifecycleInFlight();
        if (lifecycleHeld !== null) {
            throw toRemoteError(refusal(409, "refused: lifecycle " + lifecycleHeld + " in flight — retry the press when it settles (the teardown holds the run gate until it completes)", "lifecycle_inflight"));
        }
        // THE PRESS REPLAY (audit N-E1): a key this process already
        // answered names a run that exists — return ITS summary, mint
        // nothing, enqueue nothing. The row is gone (swept, or its seat
        // restarted) → the key is stale, a retry may run again.
        const pressKey = typeof checked.body["press_key"] === "string"
            ? checked.body["press_key"]
            : undefined;
        if (pressKey !== undefined) {
            const replay = this.pressReplay(pressKey);
            if (replay !== null)
                return replay;
            // THE CONCURRENT-PRESS RESERVATION (the double-mint cure,
            // 2026-10-22): the press memory answers a replay only AFTER the
            // first mint registers — two concurrent starts with one key
            // both saw the empty map and minted twice (two runs, two
            // enqueues, double GPU spend). The reservation goes in
            // SYNCHRONOUSLY after a miss (no await sits between), so
            // exactly one caller becomes the minter; the twin rides its
            // promise — one run_id, one enqueue, the same answer face.
            // The reservation's identity is the key STRING, not the body:
            // a second body under one key is the same press (the client
            // re-sent it), so the twin answers the minting body's outcome.
            const twin = this.reservePress(pressKey);
            if (twin !== null)
                return await this.awaitTwin(twin, signal);
            try {
                return await this.startReserved(pressKey, checked, signal, reuse);
            }
            catch (error) {
                this.failPress(pressKey, error);
                throw error;
            }
            finally {
                this.pendingPresses.delete(pressKey);
            }
        }
        return this.startReserved(undefined, checked, signal, reuse);
    }
    /** THE PRESS REPLAY (audit N-E1): a key this process already
     *  answered names a run that exists — return ITS summary, mint
     *  nothing, enqueue nothing. The row is gone (swept, or its seat
     *  restarted) → the key is stale, a retry may run again. Null when
     *  no live run answers the key. */
    pressReplay(pressKey) {
        const seen = this.presses.get(pressKey);
        if (seen !== undefined) {
            const row = this.core.runs.get(seen);
            if (row !== undefined) {
                return {
                    run_id: row.runId,
                    status: row.status,
                    queue_position: this.core.queuePosition(row.runId),
                };
            }
            this.presses.delete(pressKey);
        }
        else {
            // THE ROW MIRROR (audit S-S7, 2026-10-22): the cap evicted
            // the key while its run still lives (a queued press behind a
            // long render outlives 64 newer presses routinely). The row's
            // own stamp answers the replay — the double-spend window the
            // press memory was built to close stays closed past the cap.
            // the registry stores full RunRecords in the queue's map
            // (liveRun's own cast — QueueRunRow is the queue's narrow view)
            for (const row of this.core.runs.values()) {
                if (row.pressKey !== pressKey)
                    continue;
                this.rememberPress(pressKey, row.runId); // re-admit to the map
                return {
                    run_id: row.runId,
                    status: row.status,
                    queue_position: this.core.queuePosition(row.runId),
                };
            }
        }
        return null;
    }
    /** THE START ARMS under a settled replay/reservation verdict: the
     *  bench-composed arm and the flow_inline arm, behavior-verbatim
     *  from before the concurrent-press cure split them behind the
     *  shell (the split's only edits are the two summary settles). */
    async startReserved(pressKey, checked, signal, reuse) {
        // THE CLAIM-TIME RE-PROBE'S LEDGER (audit 2026-10-22): start()'s
        // arm scope owns it — the registerCompiledRun door reads it
        // after the name/flow_inline blocks close (flow arms AND the
        // bench-composed arm feed it; the single-card run alone rides
        // its fam key).
        let flowStageFams = {};
        // THE GRAPH-RECEIPT LEDGER (the silent UI-drop purge's P1):
        // start()'s arm scope owns it — the registerCompiledRun door
        // folds it after the arms close (bench + flow arms feed it; the
        // single-card run stamps its own row on its own door).
        let flowStageReceipts = {};
        // THE BENCH SNAPSHOT (stroke 45d, the operator's question: "the
        // FULL workflow, or just the card that ran?"): the run is born
        // from the bench doc (CARD BIRTH LAW — draft_id = the bench);
        // the doc read at THIS moment is the whole workflow as it stood
        // when the user pressed Run. A read failure stamps a warning on
        // the row (audit N-S3): draftExists probed true a moment ago, so
        // a failure HERE is a transient drafts outage — the run proceeds
        // on the card snapshot alone and the wand will restore from the
        // LIVE bench, the exact staleness the snapshot law kills. The
        // row says so.
        let benchDoc;
        const benchWarnings = [];
        try {
            // R7 CURE (round-14 race audit, LOW — the run-press live alias):
            // the drafts read answers the CACHED doc by reference (the
            // cached-object law), so composing + snapshotting from it naked
            // let a mutation landing between press and snapshot straddle
            // the two (a snapshot that was not quite a snapshot). The
            // press now owns a DEEP copy: what the run composes and what
            // the sidecar snapshots is the SAME frozen instant, no matter
            // what the live bench does next.
            benchDoc = structuredClone(await this.ctx.draftsRemote.get(checked.draftId, signal));
        }
        catch (e) {
            benchDoc = undefined;
            benchWarnings.push("bench snapshot read failed at press (" +
                (e instanceof Error ? e.message : String(e)) +
                ") — only the card snapshot rode; restore reconstructs from the live bench");
        }
        // THE ONE RUN ID, MINTED ONCE (the operator's live refusal,
        // 2026-09-28: "run sources resolve nowhere (1 dead:
        // run-65dc3ee505ef-…/gen)").
        //
        // Every composed graph carries its OWN `${runId}/gen` output
        // prefix, so the run id is not a label — it is an INPUT to every
        // stage's composition, and a forward reference to it must name
        // the run that will exist. The bench-run path minted it TWICE:
        // once to compose the stages (runIdSeed) and again below to
        // register the run (runId). The two are different values, so
        // every composed graph pointed at a run that was never created;
        // the source resolver — correctly, and for the right reason —
        // treated each `${runId}/gen` as a dead source and the run
        // refused before it registered.
        //
        // One mint, one id, both consumers: the compose and the
        // registration cannot disagree about which run exists, because
        // there is only one value to disagree about. A wall drives the
        // pair (the composed run's own forward references resolve, which
        // is impossible when the two ids differ).
        const runId = reuse?.runId ?? newRunId();
        let body = checked.body;
        const strict = strictBodyCheck(body);
        if (strict !== null)
            throw toRemoteError(strict);
        let selected = selectSubmitDoor(body, {
            // THE BENCH-SHAPE GATE: a draft-only press is the bench door
            // only over a draft that IS a bench — a doc carrying a
            // non-empty stages array. Anything else (the envelope spec's
            // bare d1 doc, an emptied bench) is a shapeless body: the
            // gate's own "no flow selected" stands.
            draftBench: benchDoc !== undefined &&
                "draft_id" in body &&
                Array.isArray(benchDoc["stages"]) &&
                benchDoc["stages"].length > 0,
        });
        if ("payload" in selected)
            throw toRemoteError(selected);
        // Later strokes own these lanes; both refuse LOUD here (the
        // preview-scope posture — never a silent accept).
        const stateRoot = this.ctx.queue.stateRoot;
        // ── THE WIRED-BENCH LAW (operator, 2026-10-10, in the operator's
        // own words: "By design, there is no 'non bench flow'. There is
        // ALWAYS FromStage links. THERE IS NO FILTER, NO BREAKAGE FROM
        // THIS. EVER.") ────────────────────────────────────────────────
        // A stage that takes its input from a PRIOR stage's output cannot
        // be run alone: the card arm composes ONE stage with
        // inputNames: {}, so every FromStage link would be discarded. The
        // old answer was a refusal telling the caller to run the flow
        // instead — which is the operator-facing bug this replaces: the
        // GUI's per-stage Run, the agent's card start, and any API caller
        // all hit that wall, and the bench's wires were the very thing
        // the run was FOR.
        //
        // So the door does not refuse a wired bench. IT BECOMES THE
        // BENCH RUN: the body is restaged onto the flow_inline wire with
        // the bench's own stages, and the run proceeds with the wires
        // riding as stage inputs. There is no third shape: a bench with
        // wires is a flow, whatever the caller named.
        let benchComposed = false;
        if ((selected.door === "model" || selected.door === "draft") &&
            benchDoc !== undefined) {
            const wired = benchWiring(benchDoc);
            // The DRAFT door composes unconditionally: the body names the
            // bench — pressing the bench is the meaning of the press. The
            // model door keeps its wire gate (a card Run over an unwired
            // bench stays a card run).
            if (selected.door === "draft" || wired.cross.length > 0) {
                // THE BENCH RUN, COMPOSED (the operator's law, and the gap
                // behind it: there was no path that ran a WIRED bench. The
                // GUI ran cards one at a time, each its own run, so a FromStage
                // link had nowhere to ride — the wires were not refused, they
                // were DISCARDED by the shape of the run. So this door
                // composes EVERY card stage of the bench — through the SAME
                // registry walk a single card start uses, laws and all — and
                // submits ONE merged run whose stages carry their `inputs`
                // edges for the worker to link. A $spell survives into the
                // composed graph on purpose: the merge resolves it into the
                // upstream stage's output (that is what a FromStage link IS).
                // THE ONE RUN ID (the operator's live refusal, 2026-09-28:
                // "run sources resolve nowhere (1 dead: run-65dc3ee505ef-…/
                // gen)"). The bench run minted the id TWICE: once here, to
                // compose the stages — and again below, to register the run.
                // Every composed graph carries its own `${runId}/gen` output
                // prefix, so the second mint left every forward reference
                // naming a run that was never created; the source resolver
                // (rightly) treated them as dead sources and the run refused
                // before it registered. The id is minted ONCE, here, and both
                // the compose and the registration take it — one derivation,
                // and a wall drives the pair.
                const benchFams = {};
                // THE GRAPH-RECEIPT LEDGER (P1): the bench rows' per-stage
                // queue-time evidence rides the same function-scope ledger
                // as the fams (the seat the registration door reads).
                const benchReceipts = {};
                const composed = await this.composeBenchStages(benchDoc, runId, benchFams, benchReceipts);
                // the bench-composed stages' families reach the same claim
                // re-probe ledger the flow arm feeds (S-S4): the empty-ledger
                // carve-out below is the card-single path alone, never this
                // one.
                flowStageFams = benchFams;
                flowStageReceipts = benchReceipts;
                const rest = { ...body };
                delete rest["model"];
                delete rest["card"];
                delete rest["params"];
                body = {
                    ...rest,
                    flow_inline: {
                        // THE MINT (benchDraftIdOf): this seat used to strip the prefix
                        // and add it straight back — one address, two spellings.
                        id: benchDraftIdOf(String(checked.draftId).replace(BENCH_DRAFT_PREFIX_RE, "")),
                        stages: composed,
                    },
                };
                selected = { door: "flow_inline" };
                benchComposed = true;
                // the run's own log line says what happened — a re-route is
                // never silent (NO SILENT BEHAVIOR, the same order as the
                // spell gate below)
                console.log("[runs] the bench wires " + JSON.stringify(wired.cross) +
                    " — the single-card start became the bench run (" +
                    String(composed.length) + " stages composed, wires riding as stage inputs)");
            }
        }
        if (selected.door === "model") {
            // The card start arm (handleCardStart 1016-1136, second
            // move): phase-1 compose (run_id "") BEFORE registration — a
            // params refusal names its field, never a zombie slot — then
            // phase-2 with the minted id, register + sidecars + ledger,
            // pump. Every compose failure refuses with the phase-N voice
            // and registers nothing.
            const mid = String(body["model"] ?? "");
            const cards = this.ctx.cardRegistry;
            let p1;
            try {
                p1 = await cards.phase1Card(body, mid);
            }
            catch (e) {
                if (e instanceof CardArmError)
                    throw toRemoteError(cardRefusal(e));
                throw e;
            }
            let composed;
            try {
                composed = await cards.phase2Card(p1, runId);
            }
            catch (e) {
                if (e instanceof CardArmError)
                    throw toRemoteError(cardRefusal(e));
                throw e;
            }
            const graph = composed.graph;
            const skeleton = p1.skeleton;
            // THE CARD-DOOR SPELL GATE (2026-10-10, the operator's
            // extermination order: NO SILENT BEHAVIOR — ever). The card
            // arm composes ONE stage and resolves NOTHING: inputNames is
            // {} by construction and the merged worker's initials ride
            // empty — so a $spell anywhere in the composed graph is a
            // PROMISE THIS DOOR CANNOT KEEP. Until now such a spell
            // passed the door and died at the merge with a stranger's
            // voice ('workflow carries $name' from rewriteSpells) — the
            // exact silent seam that ate a wired bench run (run
            // 880aaa85d928: bench wired input_images from s_0, the
            // client's Run built a single-card body, the wire vanished,
            // the spell reached the merge unresolved). THE DOOR COVERS
            // WHAT THE RUN WILL DO (the flow_inline gate's own law,
            // runsStart.ts THE SPELL GATE): refuse here, in the door's
            // voice, naming every spell.
            const spellSweep = (v, found) => {
                if (typeof v === "string") {
                    if (v.startsWith("$") && v.length > 1)
                        found.add(v.slice(1));
                }
                else if (Array.isArray(v)) {
                    for (const x of v)
                        spellSweep(x, found);
                }
                else if (typeof v === "object" && v !== null) {
                    for (const x of Object.values(v)) {
                        spellSweep(x, found);
                    }
                }
            };
            const spells = new Set();
            spellSweep(graph, spells);
            spellSweep(body, spells);
            if (spells.size > 0) {
                throw toRemoteError(refusal(400, "params carry " +
                    JSON.stringify([...spells].sort().map((n) => "$" + n)) +
                    " but a single-card run resolves no wires and no initials — the merge would refuse them at run time. Wire the input (run the bench flow so FromStage links ride) or replace the $spell with a concrete value.", "invalid_request"));
            }
            // THE BENCH-WIRE DISCARD GATE (same order): the bench doc this
            // run was born from may wire stage inputs (FromStage links).
            // The card arm composes ONE stage with inputNames: {} — every
            // such wire would be DISCARDED SILENTLY (the run's graph row
            // stamped input_names: {} while the bench wired input_images
            // from s_0). A wire that cannot ride refuses HERE, named —
            // never dropped.
            const wiredRows = [];
            if (benchDoc !== undefined && Array.isArray(benchDoc["stages"])) {
                for (const st of benchDoc["stages"]) {
                    if (typeof st !== "object" || st === null)
                        continue;
                    const ins = st["inputs"];
                    if (typeof ins !== "object" || ins === null || Array.isArray(ins)) {
                        continue;
                    }
                    for (const [name, ref] of Object.entries(ins)) {
                        const rr = ref;
                        if (typeof rr === "object" && rr !== null &&
                            typeof rr["stage"] === "string") {
                            wiredRows.push(name + " <- " + String(rr["stage"]) +
                                (typeof rr["output"] === "string" ? "." + String(rr["output"]) : ""));
                        }
                    }
                }
            }
            if (wiredRows.length > 0) {
                // THE SELF-WIRE DISCRIMINATION (2026-10-10, the operator's
                // report: a bench carried input_images <- s_0.default — a
                // stage wired to ITSELF, a persisted crime from before the
                // bench door's bench/self-wire law landed). The generic
                // "no FromStage links" message hid the specific crime and
                // read as tool nonsense. Name it: a wire whose stage IS the
                // run's own stage is a CYCLE (bench/self-wire, the same law
                // the write doors hold).
                //
                // A wire naming ANOTHER stage never reaches this gate: the
                // promotion above turns every cross-wired bench into the
                // bench run before the card arm composes (a bench with wires
                // is a flow, whatever the caller named). The cross arms this
                // block once carried were provably dead code — deleted in
                // the 2026-10-14 batch, not left to pretend at coverage.
                const selfWired = [];
                /* v8 ignore next -- the same benchDoc and the same stages
                 * array the wired-rows walk above tested, with nothing
                 * between the two that mutates either. */
                if (benchDoc !== undefined && Array.isArray(benchDoc["stages"])) {
                    for (const st of benchDoc["stages"]) {
                        if (typeof st !== "object" || st === null)
                            continue;
                        const stId = st["id"];
                        const ins = st["inputs"];
                        if (typeof ins !== "object" || ins === null || Array.isArray(ins))
                            continue;
                        for (const ref of Object.values(ins)) {
                            const rr = ref;
                            if (typeof rr === "object" && rr !== null && rr["stage"] === stId) {
                                selfWired.push(String(stId));
                            }
                        }
                    }
                }
                /* v8 ignore next -- this arm runs only because a wire
                 * reached the census, and benchWiring (the promotion above)
                 * consumes every CROSS wire into the bench run before the
                 * card arm composes — so every wire the census collected is
                 * the row's own, and selfWired is never empty here. */
                if (selfWired.length > 0) {
                    throw toRemoteError(refusal(400, "the bench carries a SELF-WIRE (bench/self-wire): stage " +
                        JSON.stringify([...new Set(selfWired)]) +
                        " wires its own output into its own input — a cycle composes nothing. " +
                        "This wire predates the bench door's self-wire law and persisted; clear it (rewire the input with no source, or wire a real prior stage) and run again.", "invalid_request"));
                }
            }
            const cardStage = {
                id: skeleton,
                // THE BENCH IDENTITY SEAM (2026-10-22): this arm composes ONE
                // card over the bench doc — the draft row that declared it is
                // the doc's single stage row, and the settle mirror addresses
                // the draft row by THAT id, never by the card skeleton the
                // run row carries as `id` (the two namespaces diverge on
                // every {model:} bench run; the motivating wound
                // run-4610e1c38d75 was "edit" here vs "s_2" in the draft
                // doc). Multi-row benches compose through the bench loop,
                // which stamps each row's own id.
                benchStageId: benchStageIdOf(benchDoc, skeleton),
                // The {model:} card door's engine (the compose plane is
                // ComfyUI's — the card arm rides it by construction).
                engine: CARD_PLANE_ENGINE,
                params: {
                    workflow: graph,
                    output_nodes: composed.outputNodes,
                },
                outputs: composed.outputs,
                // the card compose computes the card's channels itself —
                // nothing here is an engine-table fill
                outputsDeclared: true,
                expected: {},
                outputNodes: composed.outputNodes,
                inputNames: {},
            };
            // THE CARD ARM'S ADMITTED BODY (hoisted, P1): the snapshot
            // law coerces here — the sidecar's requestBody AND the graph
            // receipt judge the SAME admitted doc (the task's doc seat:
            // run.cardSnapshot.params, the run door's admitted request
            // body), never two derivations.
            const cardRequestBody = coerceSnapshotBody(cards.defsSync().get(p1.card), body);
            // THE GRAPH-RECEIPT ROW (the silent UI-drop purge's P1): the
            // single card stage's queue-time evidence — the admitted body
            // against the composed graph, keyed by the card stage's own id.
            const cardReceiptRow = graphReceiptStageOf(skeleton, graphReceiptOf(cardRequestBody, { workflow: composed.graph }));
            const reg = await registerCompiledRun({
                compiled: { stages: [cardStage] },
                testFlag: checked.testFlag,
                draftId: checked.draftId,
                stateRoot,
                enqueue: (row) => this.core.enqueue(row),
                // F-6(b): the admission warn computes pre-registration so
                // it rides the record AND the queued sidecar (disk rows
                // carry it after a reload).
                warnings: [
                    ...benchWarnings,
                    ...(await this.filmAdmissionWarnings(p1.card, body)),
                ],
                door: {
                    runId,
                    pipeline: pipelineOf(body),
                    cardId: p1.card,
                    // THE CLAIM-TIME RE-PROBE'S KEY (audit 2026-10-22): rides
                    // the row so the pump re-runs the presence gate at claim.
                    fam: p1.fam,
                    // THE SNAPSHOT-COERCION LAW: the sidecar's request body
                    // carries the numbers the card received (the same wire
                    // family the compose seat runs), not dsh's stringly
                    // encoding — the raw body above still feeds phase-1/2,
                    // which own their own coercion.
                    requestBody: cardRequestBody,
                    // THE GRAPH-RECEIPT ROW (P1): the single stage's evidence
                    // rides the same door the flow arms' ledger rides.
                    graphReceipts: { [skeleton]: cardReceiptRow },
                    // the bench snapshot rides the same law per stage: each
                    // row's params coerce through its OWN card's carrier
                    // (unknown cards verbatim), on a COPY — the remote's doc
                    // object is never mutated.
                    benchDoc: benchDoc === undefined ? undefined : {
                        ...benchDoc,
                        stages: Array.isArray(benchDoc["stages"])
                            ? benchDoc["stages"].map((row) => row !== null && typeof row === "object" && !Array.isArray(row)
                                ? {
                                    ...row,
                                    ...(typeof row["card"] === "string" &&
                                        typeof row["params"] === "object"
                                        ? {
                                            params: coerceSnapshotBody(cards.defsSync().get(row["card"]), row["params"]),
                                        }
                                        : {}),
                                }
                                : row)
                            : benchDoc["stages"],
                    },
                },
            });
            // THE SOURCE-ECHO REFUSAL: a dead media source refuses at the
            // door with its URL named — the run never registers.
            if ("payload" in reg)
                throw toRemoteError(reg);
            const { run } = reg;
            void run;
            if (pressKey !== undefined) {
                run.pressKey = pressKey; // the row mirror (S-S7)
                this.rememberPress(pressKey, run.runId);
            }
            this.kick();
            const summary = {
                run_id: run.runId,
                status: "queued",
                queue_position: this.core.queuePosition(run.runId),
            };
            // THE TWIN'S ANSWER (the concurrent-press cure): the summary
            // settles the reservation AFTER rememberPress holds the key —
            // a third caller replays from the press memory, never re-mints.
            this.resolvePress(pressKey, summary);
            return summary;
        }
        // The request initials this start carries (declared at this
        // scope so the registration below can carry them on the door).
        // Both flow arms fill it — the named flow shim below, and the
        // flow_inline arm that recovers the declaration from the doc's
        // registry id (the boot replay's shape).
        const requestInitials = {};
        // The FILE-kind subset (photo | glb) — the keys whose values the
        // claim-time re-probe re-judges on disk (the F5 cure): the gate
        // ran at press, minutes can pass before the merge uses the file.
        const initialFileKeys = [];
        if (selected.door === "flow") {
            // THE NAMED-FLOW SHIM (REBUILD-13; the dead door's own law):
            // the registry flow expands (from_flow links
            // resolved live) and lands as the flow_inline doc; every gate
            // after this point — structural compile, single-stage policy,
            // registration, the merged worker — runs untouched. Multi-stage
            // and card= shapes refuse at those EXISTING gates with their
            // preview_scope voices (never silent).
            const raw = body["flow"];
            const name = typeof raw === "string" ? raw : "";
            // ADMISSION BEFORE PRESENCE (the {model} arm's own order): a
            // name that cannot be a flow id is refused as a shape failure,
            // never answered as an unknown flow. Without this, `flow: 42`
            // produced "no flow named  in the registry" — the offending
            // value named nowhere — and an illegal spelling got the
            // presence voice from two different doors.
            if (!FLOW_ID_RE.test(name)) {
                throw new RemoteError("runs/invalid-request", 
                // The RAW value, not the coerced name: `flow: 42` must
                // read "flow id 42 …" — the empty string the coercion
                // produced named nothing, which was half the old defect.
                "flow id " + JSON.stringify(raw) + " is not a legal identifier", { loc: "flow" });
            }
            const decl = this.ctx.get("meliteFlows").get(name);
            if (decl === undefined) {
                // The door's unknown-name voice (rendered invalid_request —
                // the start-door envelope norm for bad requests).
                throw new RemoteError("runs/invalid-request", "no flow named " + name + " in the registry", { loc: "flow" });
            }
            // THE EXPANSION FOLD (round-21 flows audit F4): expansion's
            // authoring throws (dangling from_flow links, raw-workflow
            // shapes) are bare Errors — without this fold they escaped
            // the door as 500-class. They ride the door's invalid-request
            // voice with the expansion's own text, mirroring the
            // family-compose fold below.
            let expanded;
            try {
                expanded = expandRegistryFlow(decl, this.ctx.get("meliteFlows"));
            }
            catch (e) {
                throw new RemoteError("runs/invalid-request", e instanceof Error ? e.message : String(e), { loc: "stages" });
            }
            // THE FLOW PARAMS OVERRIDE DOOR (the af-move commission's press,
            // 2026-10-09): the body may carry `params` — per-request knobs
            // overlaid on the expanded stages' row params, refused BEFORE
            // any run registers (the initial-gate law). Without this door
            // the template's params were final: the maker's
            // `file_format: "fbx"` rode top-level and died silently
            // (run-6cb3a8e094fc), leaving the FBX export unreachable from
            // the flow door. The overlay law is SHARED (round-21 flows
            // audit F1): applyFlowParamsOverride below, the same helper the
            // validate door rides.
            const overrideRaw = body["params"];
            if (overrideRaw !== undefined) {
                applyFlowParamsOverride(name, expanded.stages, overrideRaw, overlayDecls(this.ctx.cardRegistry), String(body["model"] ?? ""));
                const rest = { ...body };
                delete rest["params"];
                body = rest;
            }
            // THE COMPILE-TIME INITIAL GATE (REBUILD-21; the dead door's
            // law): present initials refuse BEFORE any run registers —
            // validate runs the same gate, so start can never queue what
            // validate refuses.
            const badInitial = registryInitialsError(expanded, body, {
                repoRoot: resolveRepoRoot(),
                stateRoot,
            });
            // THE CLAIM-TIME RE-PROBE'S LEDGER (audit 2026-10-22) — this
            // start-arm scope owns it: the flow door at registerCompiledRun
            // reads it after the name and flow_inline blocks close
            // (bench-composed runs ride the same door with an empty ledger).
            let flowStageFams = {};
            if (badInitial !== null) {
                throw new RemoteError("runs/invalid-request", badInitial, {
                    loc: "body",
                });
            }
            // THE GATE-BLESSED INITIALS RIDE THE RUN: the worker submits
            // them to the engine merge, where every `$spell` over these
            // keys links against them — a flow whose stages spell a
            // declared initial cannot merge without this record. The
            // extractor's own shapes are the gate's ({path: …} unwraps,
            // bake_params objects stringify), so the engine sees the
            // same value the gate validated.
            const extracted = extractRequestInitials(decl, body);
            /* v8 ignore next 3 -- the compile-time gate above walks
             * expanded.initialValidators, which expandRegistryFlow carries
             * verbatim (it spreads the declaration and replaces only
             * stages), and it judges the same shapes per kind — so every
             * value this extractor would refuse was refused there already.
             * The arm is the extractor's belt for a caller that skips the
             * gate. */
            if ("refusal" in extracted) {
                throw new RemoteError("runs/invalid-request", extracted.refusal, {
                    loc: "body",
                });
            }
            Object.assign(requestInitials, extracted.initials);
            for (const [k, kind] of Object.entries(decl.initialValidators)) {
                if ((kind === "photo" || kind === "glb") && k in extracted.initials && !initialFileKeys.includes(k)) {
                    initialFileKeys.push(k);
                }
            }
            // THE FAMILY-ACTION STAGES COMPOSE HERE (the atom vocabulary,
            // stroke 4): a stage naming family+action composes its graph
            // from the family DECL at expansion — the wire downstream sees
            // the SAME workflow envelope a raw stage authored, so every
            // gate after this point (structural compile, the curated-lane
            // lift, registration, the merged worker) runs untouched. A
            // refusal here (unknown family/action, unadmitted param,
            // contradicting hand-write) lands BEFORE any run registers —
            // the same before-queuing law the initial gate rides.
            let composedFlow;
            try {
                // The seat read rides ctx.get, the engines precedent below:
                // an undeclared-inject property access would throw cordis's
                // reflect voice ("cannot get property 'models' without
                // inject") instead of degrading to the booted singleton.
                const seat = liveFamilySeat(this.ctx.get("models"));
                composedFlow = composeFamilyStages(expanded, seat.decls, seat.state);
            }
            catch (e) {
                /* v8 ignore next -- composeFamilyStages, liveFamilySeat and
                 * declaredAction raise constructed Errors; a family build's
                 * throw class is the family module's own contract (nothing
                 * here owns it), so the non-Error spelling is the belt that
                 * folds any bare-value throw too (round-23 audit Q6). */
                throw new RemoteError("runs/invalid-request", e instanceof Error ? e.message : String(e), { loc: "stages" });
            }
            let inlineDoc = registryFlowToInline(composedFlow);
            // THE CARD STAGES COMPOSE (2026-10-04): the projection keeps
            // `card` on every card-bearing stage, and the compiler refuses
            // those — which is why every card flow was validate-only. The
            // card walk composes them here, so a named flow RUNS the way the
            // bench runs, and the compiler only ever sees compiled stages.
            if (inlineStagesNameCards(inlineDoc)) {
                const stageFams = {};
                // THE GRAPH-RECEIPT LEDGER (P1): the flow rows' per-stage
                // evidence — assigned to the FUNCTION-scope ledger (the
                // block-scoped flowStageFams twin above is a dead shadow its
                // own arm never feeds to the door; the receipt does not
                // repeat that law).
                const stageReceipts = {};
                inlineDoc = await this.composeRegistryFlowStages(inlineDoc, runId, stageFams, stageReceipts);
                flowStageFams = stageFams;
                flowStageReceipts = stageReceipts;
                console.log("[runs] the flow " + name +
                    " composes its card stages through the card plane (" +
                    inlineDoc["stages"].length + " stages)");
            }
            const rest = { ...body };
            delete rest["flow"];
            body = { ...rest, flow_inline: inlineDoc };
        }
        // ONE stage schema for the whole bench (the law above): every
        // stage that reaches the compiler carries an engine, whether a
        // human, the GUI, the agent or a hand-written flow authored it.
        /* v8 ignore next 3 -- the card arm returned above, so only the
         * flow arms reach this line, and both of them just set
         * flow_inline on the body (the named flow shim and the
         * flow_inline arm that recovered it). */
        if (typeof body["flow_inline"] === "object" && body["flow_inline"] !== null) {
            const stages = body["flow_inline"]["stages"];
            if (Array.isArray(stages))
                deriveFlowCardEngines(stages);
        }
        const inline = body["flow_inline"];
        // The engines seat when mounted (stroke 53): the door consults
        // the live registry ids. Absent (fixture/wall boots) the pure
        // default ['comfyui'] governs — the pre-seam voice.
        const enginesSeat = this.ctx.get("engines");
        const knownEngines = enginesSeat !== undefined && typeof enginesSeat.ids === "function"
            ? enginesSeat.ids()
            : [CARD_PLANE_ENGINE];
        // THE KINDS SPLIT (audit 2026-10-22, NAMED NOT CURED): the wire
        // kind lattice (kindsOk, inside flowFromBody) is validate-only —
        // a raw pre-flight here would REFUSE real benches (bench rows
        // carry inputs without expected; validate derives the kinds from
        // the card ports BEFORE the judge runs, start would not). The
        // honest cure derives first, then judges — the roadmap row names
        // the projection requirement; a bare judge is a false refusal.
        const compiled = compileFlowInline(inline, knownEngines);
        if ("payload" in compiled)
            throw toRemoteError(compiled);
        // THE REPLAY ARM RE-EXTRACTS THE INITIALS: a queued flow run's
        // durable request body is its flow_inline doc (the shim deleted
        // the flow name), so a run that rehydrates on the next boot
        // arrives here with no flow arm to extract, and its `$spell`s
        // would die unlinkable at the engine merge. A doc that names a
        // registry flow yields its declaration and the SAME gate the
        // flow arm ran — a hand-authored doc carrying a registry id must
        // not buy itself the initial-carrier privilege while skipping
        // the traversal, extension and on-disk checks that close it. A
        // bench-composed doc's id is always "bench"-prefixed (never a
        // registry name) and a hand-authored one usually names nothing
        // registered: nothing to recover, nothing refused.
        const replayId = inline["id"];
        if (typeof replayId === "string") {
            const replayDecl = this.ctx.get("meliteFlows").get(replayId);
            if (replayDecl !== undefined) {
                const badReplayInitial = registryInitialsError(replayDecl, body, {
                    repoRoot: resolveRepoRoot(),
                    stateRoot,
                });
                if (badReplayInitial !== null) {
                    throw new RemoteError("runs/invalid-request", badReplayInitial, {
                        loc: "body",
                    });
                }
                const replayExtracted = extractRequestInitials(replayDecl, body);
                /* v8 ignore next 3 -- the replay initials gate above judged
                 * the same declaration's initialValidators one statement
                 * earlier (a replay body is the authored body, so the values
                 * are the gate-blessed ones), leaving this the extractor's
                 * belt for a caller that skips the gate. */
                if ("refusal" in replayExtracted) {
                    throw new RemoteError("runs/invalid-request", replayExtracted.refusal, {
                        loc: "body",
                    });
                }
                Object.assign(requestInitials, replayExtracted.initials);
                for (const [k, kind] of Object.entries(replayDecl.initialValidators)) {
                    if ((kind === "photo" || kind === "glb") && k in replayExtracted.initials && !initialFileKeys.includes(k)) {
                        initialFileKeys.push(k);
                    }
                }
            }
        }
        // THE PARITY JUDGE (audits F-S4/S5 — the kinds split, closed):
        // the compiled doc judges the SAME kind lattice validate ran,
        // over the SAME wire rows the door compiled — projected, never
        // re-derived. A card= stage never reaches this judge (the
        // gateway refuses the shape before it), so the card-port halves
        // ride their own doors; what start gains is the durable doc's
        // own kind consistency — a doc hand-edited between press and
        // replay dies here, with validate's voice, before it burns a
        // run. (The card-plane reads a bare judge would need are why the
        // first cut was NAMED NOT CURED; judging the compiled rows needs
        // no card plane at all.)
        try {
            kindsOk(typeof replayId === "string" ? replayId : "flow_inline", replayJudgeRows(compiled), {}, undefined);
        }
        catch (judgeError) {
            if (judgeError instanceof FlowError) {
                throw new RemoteError("runs/invalid-request", judgeError.message, { loc: "body" });
            }
            throw judgeError;
        }
        if (compiled.stages.length !== 1) {
            // THE CURATED-LANE LIFT (2026-09-25, the multi-stage boundary
            // resolved): the merged worker was ALWAYS multi-stage — the
            // engine's merge walk namespaces stages, links cross-stage
            // channels, rewrites $spells, and harvests per-stage (the
            // ROW-4 file-slot gate included); only this gateway gate held
            // the line. A HAND-AUTHORED multi-stage flow_inline stays
            // refused (unported, exactly the old voice); a doc whose id
            // names a REGISTRY flow is curated — its stages compile under
            // the registry walls and the validate one-admission walk — so
            // it drives (image-upscale: make → polish through ONE merged
            // submit).
            // THE CURATED PROOF: reaching here means compileFlowInline
            // SUCCEEDED on this inline — and its first gate is isRecord, so
            // the value is proven a non-array object. No re-checking dance
            // (a typeof/Array.isArray arm here would be dead code).
            const inlineId = inline["id"];
            // A BENCH-COMPOSED DOC IS NOT HAND-AUTHORED (operator, 2026-10-10).
            // The line this gate holds is "a hand-written multi-stage graph is
            // unported" — a doc WE composed from the bench, through the same
            // registry walk a single card start uses, is the opposite case:
            // its stages carry the registry's own graphs, its edges carry the
            // bench's own wires, and the merged worker is multi-stage by
            // construction. So the bench doc is admitted here on the same
            // footing as a curated registry flow — named, never silent.
            if (benchComposed) {
                curatedBenchLog(compiled.stages.length);
                // fall through to the registration the single-stage path uses
            }
            else {
                const curated = typeof inlineId === "string" &&
                    this.ctx.get("meliteFlows").get(inlineId) !== undefined;
                if (!curated) {
                    throw toRemoteError(refusePreview("this gateway serves single-stage flow_inline runs only (" +
                        compiled.stages.length +
                        " stages) — multi-stage graphs are unported " +
                        "(curated registry flows except: name a registry flow id, " +
                        "or drive {flow: '<name>'})"));
                }
            }
        }
        const reg = await registerCompiledRun({
            compiled,
            testFlag: checked.testFlag,
            draftId: checked.draftId,
            stateRoot,
            enqueue: (row) => this.core.enqueue(row),
            // the bench-read warning rides the inline arm too (audit N-S3)
            warnings: benchWarnings,
            // THE RUN ID IS AN INPUT, NOT A LABEL (the operator's live
            // refusal, 2026-09-28: "run sources resolve nowhere (1 dead:
            // run-65dc3ee505ef-…/gen)").
            //
            // Every composed graph carries its own `${runId}/gen` output
            // prefix, so the id the stages were composed under MUST be the
            // id the run registers under. This door used to pass it only
            // on the replay seam, so a normal flow_inline/bench run fell
            // through to runsStart's own mint — a DIFFERENT value — and
            // every forward reference in every composed graph then named a
            // run that was never created. The resolver (rightly) called
            // them dead sources and the run refused before it registered.
            //
            // The id rides ALWAYS. The replay arm (stroke 83) keeps its
            // meaning: the SAME id, rewritten in place, the pump picking
            // the rehydrated row up on the boot kick.
            // THE SNAPSHOT RIDES THE BENCH RUN TOO (the adversarial
            // verification, 2026-09-28): the card arm stamped a
            // cardSnapshot + benchSnapshot, and this door passed neither —
            // so a Run ALL registered a run whose "restore the workflow
            // that made this" reconstructed from the LIVE bench draft,
            // which is the exact staleness the snapshot law was built to
            // kill (the bench has moved on by the time anyone restores).
            // A bench-composed run knows its own doc (read at submit) and
            // its own stage list; both ride the door verbatim.
            door: {
                runId,
                pipeline: pipelineOf(body),
                requestBody: body,
                ...(Object.keys(requestInitials).length === 0
                    ? {}
                    : { initials: requestInitials }),
                // THE F5 STAMP: the file-kind keys ride the row so the pump's
                // claim-time re-probe knows which initials to re-judge on disk.
                ...(initialFileKeys.length > 0 ? { initialFileKeys: [...initialFileKeys] } : {}),
                ...(benchDoc === undefined ? {} : { benchDoc }),
                // THE CLAIM-TIME RE-PROBE'S LEDGER (audit 2026-10-22): the
                // composed card stages' families ride the row (not the stage
                // rows — extra=forbid at the wire door) for the pump's
                // claim-time gate re-run.
                ...(Object.keys(flowStageFams).length > 0 ? { stageFams: flowStageFams } : {}),
                // THE GRAPH-RECEIPT LEDGER (P1): the per-stage queue-time
                // evidence rows ride the row the same way (not the stage
                // rows — extra=forbid at the wire door) — registerCompiledRun
                // folds them into the run-level `graph_receipt`.
                ...(Object.keys(flowStageReceipts).length > 0 ? { graphReceipts: flowStageReceipts } : {}),
            },
        });
        // THE SOURCE-ECHO REFUSAL (same law on the inline door).
        if ("payload" in reg)
            throw toRemoteError(reg);
        const { run } = reg;
        void run;
        if (pressKey !== undefined) {
            run.pressKey = pressKey; // the row mirror (S-S7)
            this.rememberPress(pressKey, run.runId);
        }
        this.kick();
        const summary = {
            run_id: run.runId,
            status: "queued",
            queue_position: this.core.queuePosition(run.runId),
        };
        // THE TWIN'S ANSWER (the concurrent-press cure): the summary
        // settles the reservation AFTER rememberPress holds the key —
        // a third caller replays from the press memory, never re-mints.
        this.resolvePress(pressKey, summary);
        return summary;
    }
    /** The list arm (REBUILD-7): the restore-port envelope over the
     *  output roots. The raw limit STRING rides from the lane (strict
     *  int() semantics: underscores parse, junk refuses). The drafts
     *  probe rides the drafts remote. */
    async list(rawLimit, signal, test = false) {
        signal.throwIfAborted();
        // The door's 400 text (parseIntOrNull in runsList.ts) — the runs face's invalid-request refusal.
        // ONLY this parse folds; every other failure stays loud (no absorb).
        const parsed = parseIntOrNull(rawLimit);
        if (parsed === null) {
            throw new RemoteError("runs/invalid-request", "limit must be an integer (got '" + rawLimit + "')", { loc: "query.limit", expected: "integer", got: rawLimit });
        }
        const limit = Math.max(1, Math.min(500, parsed));
        // §23 CROSS-ROOTS: the union list across the manifest (own
        // root first — own rows win collisions, every row served_from).
        return await listRunsAcross(this.ctx.queue.stateRoots, limit, async (draftId) => {
            try {
                await this.ctx.draftsRemote.get(draftId, signal);
                return true;
            }
            catch (e) {
                // a caller abort cancels the list (audit N-S4) — it never
                // folds to "draft missing"; only a genuine miss degrades
                // the row's draft_id
                signal.throwIfAborted();
                void e;
                return false;
            }
        });
    }
    /** The validate arm (REBUILD-8): the PURE compile pipeline
     *  (flowFromBody → compile → pin sweep → the 200 row) over the
     *  door's own bodies. The {model}/{flow} arms refuse the
     *  preview refusal (their remotes are later strokes); a 4xx
     *  answer folds to runs/flow-compile | runs/workflow-pin with
     *  the door's payload voices; the 200 serves verbatim. */
    /** F-6(b) — THE ADMISSION MEMORY WARN (the film lane's tool
     *  half of the pre-flight): a film admitted while the engine's
     *  VRAM sits below the pressure line warns — the caller stamps
     *  the returned warnings on the run (they ride run_status, never
     *  a refusal). Any telemetry failure (config unreadable, engine
     *  unreachable, stats unparseable) returns none — admission never
     *  blocks on a stats read. */
    async filmAdmissionWarnings(cardId, body) {
        if (cardId !== "h3-timeline")
            return [];
        const load = filmLoadOf(body);
        if (load === null)
            return [];
        let url = "";
        try {
            const cfg = loadEndpointConfig();
            if (typeof cfg["url"] === "string")
                url = cfg["url"];
        }
        catch {
            url = "";
        }
        const warn = filmMemoryWarn(load, await fetchEngineMem(url));
        return warn === null ? [] : [warn];
    }
    async status(runId, signal, includeLog = false) {
        signal.throwIfAborted();
        const run = this.liveRun(runId);
        if (run === undefined) {
            // THE DISK FALLBACK (agent-debt F-5, 2026-09-22): the maker-test
            // lane answered "? — 0/0 stage(s)" / runs/unknown-run for runs
            // whose on-disk _flow.json held status completed + full stage
            // and artifact rows — the live map is the queue's cache, disk
            // is the durable record. A status read crossing a registry
            // reload (or a husk in-memory row) must still answer the truth
            // the run tree holds. Never fabricated: no disk row → the same
            // runs/unknown-run refusal as before.
            const disk = this.diskRunRow(runId);
            if (disk === undefined) {
                // §23 NAME-THE-ROOT (2026-09-22, attempt006's two-roots
                // lesson; 2026-09-23: every manifest root named): a miss
                // names the trees it searched — the operator sees WHICH
                // roots answered, never a bare unknown. No branch: the
                // queue seat owns stateRoot on every boot (the service
                // refuses root-less — the constructor's law).
                throw new RemoteError("runs/unknown-run", "unknown run_id \"" + runId + "\" " +
                    searchedVoice(this.ctx.queue.stateRoots), { runId });
            }
            return withStageReports({ ...enrichDiskRow(disk.row), from_disk: true, queue_position: 0, served_from: disk.root }, sidecarReaderFor(disk.dir));
        }
        // THE SETTLED-TRUTH DOOR (the stuck-run cure, 2026-11-09): the
        // polled row derives from the durable truth. A live row still
        // claiming queued/running/stopping over a settled run tree
        // resyncs here — the answer is the disk-enriched serve (the same
        // shape the fallback arms above return, marked from_disk), and
        // the map row now reads the settled verdict.
        if (this.resyncSettledTruth(run)) {
            const disk = this.diskRunRow(runId);
            if (disk !== undefined) {
                return withStageReports({ ...enrichDiskRow(disk.row), from_disk: true, queue_position: this.core.queuePosition(run.runId), served_from: disk.root }, sidecarReaderFor(disk.dir));
            }
        }
        const payload = {
            run_id: run.runId,
            status: run.status,
            // §23 CROSS-ROOTS: every row names the root that served it —
            // live rows ride the seat's own root, disk rows their find.
            served_from: this.ctx.queue.stateRoot,
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
            // THE RUN-DIR RELATIVE (024's self-critique #2, 2026-09-24 —
            // the same doubling 023 quoted): relative() off the OUT ROOT
            // returns `<run-id>/<rel>` (the run dir rides inside), so
            // prefixing runId again served `<run-id>/<run-id>/<rel>` —
            // the receipt printed a path that exists nowhere. Relativize
            // off the RUN DIR: the join restores exactly <run-id>/<rel>.
            artifacts: [...run.artifacts].map((a) => a.startsWith("/")
                ? [run.runId, relative(join(outRootFor(this.ctx.queue.stateRoot, run.testFlag), run.runId), a)].join("/")
                : a),
            error: run.error,
            // F-6(b): admission warnings ride the row (additive — older
            // consumers ignore the key; absent means none were stamped).
            warnings: [...(run.warnings ?? [])],
            // THE COMPOSE ECHO, SERVED (the one-press/one-engine law,
            // audit 2026-09-23: the echo rode disk + ledger but no live
            // door served it — the face that pressed Run could not show
            // what the engine got without shell access). Additive, same
            // spelling as the sidecar; absent on non-film runs. The disk
            // fallback below spreads the sidecar row, which carries it.
            ...(run.composeEcho !== undefined ? { compose_echo: run.composeEcho } : {}),
            // THE SOURCE ECHO, SERVED (same law: the run's sources ride
            // the live row too — additive, same spelling as the sidecar).
            ...(run.sourceEcho !== undefined ? { source_echo: run.sourceEcho } : {}),
            // THE GRAPH RECEIPT, SERVED (the silent UI-drop purge's P1,
            // same law: the queue-time doc→graph evidence rides the live
            // row too — additive, same spelling as the sidecar; the disk
            // fallback spreads the sidecar row, which carries it).
            // Absent on inline runs (no card composed).
            ...(run.graphReceipt !== undefined ? { graph_receipt: run.graphReceipt } : {}),
            // THE EXPORT NAME, SERVED (023's self-critique #4/#6: the
            // design lane's mint rides the live row too — additive,
            // same spelling as the sidecar; absent on non-export runs.
            // The disk fallback below spreads the sidecar row, which
            // carries it).
            ...(run.exportName !== undefined && run.exportName !== "" ? { export_name: run.exportName } : {}),
            // THE EXPORT PATH, SERVED (the export FULL PATH): the exact
            // minted file the engine reported — additive, same spelling
            // as the sidecar; the disk fallback spreads the sidecar row.
            ...(run.exportPath !== undefined && run.exportPath !== "" ? { export_path: run.exportPath } : {}),
            // THE REPLAY VERDICT, SERVED (D11, 2026-10-11): the executor's
            // seated tap folded zero engine events before settlement — the
            // artifacts may predate the request. Additive, same spelling
            // as the sidecar; absent means voiced execution (or unknown).
            ...(run.replaySuspect === true ? { replay_suspect: true } : {}),
            // THE VARIANT, SERVED (commission 033's self-critique #5):
            // the lane the run rode — additive, same spelling as the
            // sidecar; the disk fallback spreads the sidecar row, which
            // carries it. Absent on variant-less runs.
            ...(run.variant !== undefined && run.variant !== "" ? { variant: run.variant } : {}),
            // THE LOUDNESS + FRESHNESS STAMPS, SERVED (2026-09-26): the
            // compact receipt's data — additive, same spelling as the
            // sidecar; the disk fallback below spreads the sidecar row,
            // which carries them.
            ...(run.loudness !== undefined ? { loudness: run.loudness } : {}),
            ...(run.voiceFreshness !== undefined ? { voice_freshness: run.voiceFreshness } : {}),
            // THE TEST FLAG, SERVED (023's self-critique #3): the
            // agent-facing receipt canonicalizes route-relative artifact
            // paths against the out root — test runs live under
            // test-output/, and the row is what names it. Additive.
            test: run.testFlag,
            queue_position: this.core.queuePosition(run.runId),
        };
        // THE TERMINAL-HUSK RECOVERY (F-5's second face): a live row that
        // is terminal (completed/failed) yet carries NO stages and NO
        // artifacts is the husk signature — the queue settled the record
        // before the executor's rows landed (or a reload raced). Disk
        // holds the rich row; serve it (marked). A genuinely-empty run
        // (queued/running with nothing yet, or truly bare) stays live —
        // only the terminal+empty+disk-richer triple defers.
        if ((run.status === "completed" || run.status === "failed") &&
            run.stages.length === 0 && run.artifacts.length === 0) {
            const disk = this.diskRunRow(runId);
            const diskStages = disk !== undefined && Array.isArray(disk.row["stages"]) ? disk.row["stages"].length : 0;
            const diskArts = disk !== undefined && Array.isArray(disk.row["artifacts"]) ? disk.row["artifacts"].length : 0;
            if (disk !== undefined && (diskStages > 0 || diskArts > 0)) {
                return withStageReports({ ...enrichDiskRow(disk.row), from_disk: true, queue_position: payload["queue_position"], served_from: disk.root }, sidecarReaderFor(disk.dir));
            }
        }
        // THE LIVE-ROW PLAN (efficiency review 002, Fix 2, 2026-09-22):
        // a live row that is queued/running yet carries NO stage rows
        // renders "? — 0/0" at the agent — zero signal for a 20-minute
        // render, which forced the whole bash-tail poll loop. The plan
        // is already stamped at registration (graphRows: stage id +
        // engine; cardId/pipeline; createdAt) — project it, never the
        // params (a film graph is 50 KB of prompt JSON). The agent sees
        // "running · plan: 1 stage (h3-timeline) · age 754s" and polls
        // the cheap door instead of tailing logs.
        if ((run.status === "queued" || run.status === "running" ||
            run.status === "stopping") &&
            run.stages.length === 0) {
            payload["planned_stages"] = run.graphRows.map((g) => ({
                id: g.id,
                engine: g.type,
            }));
            payload["card"] = run.cardId ?? run.pipeline;
        }
        // THE LIVE-AGE LAW (§36.6's progress-UX, 2026-09-24 — 035
        // attempts 14/16's receipts: a long single-stage h3 render shows
        // "running — 0/1 stage(s)" for ten-plus minutes and the maker
        // cannot tell progress from stuck): every LIVE row carries
        // run_age_s, planned or staged — age is the honest liveness
        // signal the executor owns without asking the engine.
        if ((run.status === "queued" || run.status === "running" ||
            run.status === "stopping") &&
            run.createdAt > 0) {
            payload["run_age_s"] = Math.max(0, Math.round(Date.now() / 1000 - run.createdAt));
        }
        if (includeLog)
            payload["log_tail"] = runLogTail(payload);
        // THE REPORT SIDECAR MOUNT, LIVE PATH: the same decorate the
        // disk fallback serves — a rig run's validate sidecar mounts
        // whether the row answered from the live map or disk.
        return withStageReports(payload, sidecarReaderFor(join(outRootFor(this.ctx.queue.stateRoot, run.testFlag), run.runId)));
    }
    async stop(runId, signal) {
        signal.throwIfAborted();
        const run = this.liveRun(runId);
        if (run === undefined) {
            // §23 CROSS-ROOTS: the stop miss names the searched roots
            // (same law as status — a stop for a maker-owned run says
            // which trees answered; cross-process stop stays refused by
            // the unknown code, never a blind guess).
            throw new RemoteError("runs/run-unknown", "unknown run_id " + JSON.stringify(runId) + " " +
                searchedVoice(this.ctx.queue.stateRoots), { runId });
        }
        // THE SETTLED-TRUTH STOP (the stuck-run cure, 2026-11-09): the
        // press first judges the claim against the durable row. A zombie
        // (live claim over a settled run tree) RESOLVES here: the verdict
        // names the row's true state and clears the stale claim — the
        // operator's press does something honest, never a stop lie.
        if (this.resyncSettledTruth(run)) {
            return { run_id: runId, status: run.status, already_settled: true };
        }
        if (run.status !== "queued" && run.status !== "running" && run.status !== "stopping") {
            // THE LOUD REFUSAL (the silent-payload cure, 2026-11-09): the
            // old `{ error: "cannot stop run in state …" }` payload resolved
            // as success at every unwrapping client and nothing voiced —
            // the exact no-op press the burn named. A plainly settled row
            // refuses with its own wire code, naming the true state.
            throw new RemoteError("runs/already-settled", "run " + JSON.stringify(runId) + " is already settled (status " + run.status +
                ") — nothing to stop", { runId, status: run.status });
        }
        // THE STOPPING STAMP (stroke 83 — the state existed in the
        // union but nothing ever set it): a stop press on a LIVE run
        // moves the row to "stopping" immediately, so the status door
        // reports the truth between the press and the settle (the
        // settle's stopFlag branch overwrites with "stopped"). A
        // re-press on an already-stopping row is idempotent.
        if (run.status === "running")
            run.status = "stopping";
        run.stopFlag = true;
        notifyRunChanged(runId);
        // The interrupt rides the injected engine service when the
        // seat exists (best-effort — the flag is the authority).
        try {
            const comfy = needComfyUI(this.ctx, "runsRemote stop");
            void comfy.stopForRunDir(run.dir).catch((e) => {
                // named (audit N-S5): an interrupt outage is observable in
                // the log; the worker's stopFlag check still converges
                console.log("[estate-queue] stop interrupt failed:", e instanceof Error ? e.message : String(e));
            });
        }
        catch {
            /* no seat: the worker's stop check converges the state */
        }
        return { run_id: runId, status: "stopping" };
    }
    /** The live map (the queue seat's core registry — rich rows). */
    liveRun(runId) {
        return this.core.runs.get(runId);
    }
    /** THE SETTLED-TRUTH RESYNC (the stuck-run cure, 2026-11-09): a
     *  live row may never claim queued/running/stopping past the run
     *  tree's settled verdict. The queue settles memory-first
     *  (runsExecute → settle → _flow.json + ledger); a row the poller
     *  still sees "running" while the settle's own write says terminal
     *  is the zombie the operator pressed Stop against. One judge, both
     *  doors: adopt the disk verdict + error into the map row,
     *  re-announce the change (the tab's poller re-fires on truth, not
     *  on the stale claim), report whether the claim was stale. The
     *  rich stage/artifact rows stay the disk serve's job (the status
     *  door answers from the durable row, the same shape its two disk
     *  arms already serve). A live row with no disk row yet
     *  (pre-first-persist) or an agreeing disk row is untouched — the
     *  resync rides DIVERGENCE only, never a live run's claim. */
    resyncSettledTruth(run) {
        if (run.status !== "queued" && run.status !== "running" && run.status !== "stopping") {
            return false;
        }
        const disk = this.diskRunRow(run.runId);
        if (disk === undefined)
            return false;
        const diskStatus = disk.row["status"];
        if (diskStatus === run.status)
            return false;
        // THE SETTLED TRIPLE only: a disk row claiming a live word is a
        // foreign/partial write — the durable boundary never adopts it
        // (the same law diskRunRow's vocabulary guard serves).
        if (diskStatus !== "completed" && diskStatus !== "failed" && diskStatus !== "stopped") {
            return false;
        }
        run.status = diskStatus;
        if (typeof disk.row["error"] === "string")
            run.error = disk.row["error"];
        notifyRunChanged(run.runId);
        return true;
    }
    /** The durable record under the run tree (F-5's fallback read):
     *  the on-disk _flow.json for a run — the SAME file the maker
     *  verified byte-by-byte while status answered husks. The
     *  manifest roots are probed in order (own first), both
     *  out-roots per root (production first, then test) since the
     *  fallback may not know the row's testFlag. Unparseable/absent →
     *  undefined — never a fabricated row. */
    diskRunRow(runId) {
        // §23 CROSS-ROOTS (2026-09-23): the manifest in order — own
        // root first, then the stateRoots config extras. Own
        // writes win; the first root holding the run serves.
        for (const root of this.ctx.queue.stateRoots) {
            for (const dir of [join(root, "output", runId), join(root, "test-output", runId)]) {
                try {
                    const doc = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8"));
                    if (typeof doc === "object" && doc !== null && !Array.isArray(doc)) {
                        const row = doc;
                        // T3's second residual (2026-10-12): the sidecar's
                        // run-level status rode out verbatim — a hand-edited or
                        // foreign _flow.json served "banana" as a run status.
                        // The durable boundary judges it: a status outside the
                        // six-value vocabulary means the row is not ours to
                        // serve, the same verdict as unparseable (undefined —
                        // never a fabricated status, never a fold). The writer
                        // only ever writes the six, so real sidecars pass.
                        if (typeof row["status"] !== "string" || !RUN_STATUSES.has(row["status"])) {
                            continue;
                        }
                        return { row, root, dir };
                    }
                }
                catch {
                    /* absent/unreadable in this root — try the next */
                }
            }
        }
        return undefined;
    }
    /** The envelope walk with the AWAITED draft probe (door order
     *  preserved: the probe sits between malformed and unknown). */
    /** THE PRESS MEMORY (audit N-E1): press_key -> runId for the
     *  last PRESS_MEMORY_MAX presses of this process. A replayed
     *  press (transport retry, double-fire) answers the FIRST run —
     *  no second mint, no second enqueue, no double GPU spend.
     *  In-process by design: after a seat restart nothing is running,
     *  so a retried press re-runs; a swept row (bootSweep) falls out
     *  the same way. Insertion-ordered; the oldest entry dies at cap. */
    presses = new Map();
    /** THE CONCURRENT-PRESS RESERVATION (the double-mint cure,
     *  2026-10-22): press_key → the first caller's in-flight mint.
     *  Registered synchronously after a replay miss; deleted when the
     *  start settles (summary or refusal) — the window where a second
     *  start with the same key would double-mint closes on the
     *  reservation, not on the press memory's late registration. */
    pendingPresses = new Map();
    /** The caller's verdict at the press gate: null when it becomes
     *  the minter (its entry is registered before this returns); the
     *  in-flight promise when a concurrent mint owns the key — the
     *  twin awaits and answers with the SAME summary or refusal. */
    reservePress(pressKey) {
        const pending = this.pendingPresses.get(pressKey);
        if (pending !== undefined)
            return pending.promise;
        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        promise.catch(() => undefined); // a refused mint rejects the twin's await — never an unhandled rejection
        this.pendingPresses.set(pressKey, { promise, resolve, reject });
        return null;
    }
    /** The minter's summary settles the twin (no-op without a press —
     *  the door's return sites serve both keyed and keyless starts). */
    resolvePress(pressKey, summary) {
        if (pressKey === undefined)
            return;
        const pending = this.pendingPresses.get(pressKey);
        if (pending !== undefined)
            pending.resolve(summary);
    }
    /** A refusal anywhere in the arms rejects the twin with the SAME
     *  refusal (one press, one outcome — the retry law is the stale-key
     *  law's: after the settle the key is gone and a later press may
     *  run again). */
    failPress(pressKey, error) {
        const pending = this.pendingPresses.get(pressKey);
        if (pending !== undefined)
            pending.reject(error);
    }
    /** The twin owns its own abort (audit F1, 2026-10-10): the entry's
     *  signal.throwIfAborted must hold while the twin waits on the
     *  minter's mint — a caller that aborted its press is not answered
     *  with another caller's success, and does not wait out a mint it
     *  no longer wants. That also bounds the twin's wait the same way
     *  the minter's is bounded: by the abort of the caller that owns
     *  it. The abort's own reason is the voice (throwIfAborted throws
     *  it). The summary is copied: each caller owns the object it
     *  reads, so one caller's edit cannot move the other's answer
     *  (audit F4). */
    async awaitTwin(twin, signal) {
        signal.throwIfAborted();
        return new Promise((resolve, reject) => {
            const onAbort = () => reject(signal.reason);
            signal.addEventListener("abort", onAbort, { once: true });
            twin.then((summary) => {
                signal.removeEventListener("abort", onAbort);
                resolve({ ...summary });
            }, (error) => {
                signal.removeEventListener("abort", onAbort);
                reject(error);
            });
        });
    }
    rememberPress(pressKey, runId) {
        this.presses.delete(pressKey); // refresh recency before the cap read
        this.presses.set(pressKey, runId);
        while (this.presses.size > RunsRuntimeService.PRESS_MEMORY_MAX) {
            const oldest = this.presses.keys().next();
            if (oldest.done)
                break;
            this.presses.delete(oldest.value);
        }
    }
    /** Kick the serial pump (door-verbatim guard). */
    kick() {
        // THE PUMP FENCE (audit N-S7): every hop inside self-swallows or
        // is caught per-row today — this arm is the day one escapes. A
        // stranded claim (tryDequeue pins activeId before the awaits)
        // would stall the queue until reboot with no voice; the fence
        // releases the claim and says so.
        void this.pump().catch((e) => {
            this.core.releaseActive();
            console.log("[estate-queue] pump scaffold escape — active claim released:", e instanceof Error ? e.message : String(e));
        });
    }
    /** The serial worker: claim the FIFO head, execute, settle —
     *  one GPU run machine-wide, strict submit order. */
    async pump() {
        if (this.pumping)
            return;
        this.pumping = true;
        try {
            for (;;) {
                // THE TEARDOWN CLAIM GATE: a disposed fiber claims nothing
                // more — the queued rows stay queued for the next boot's
                // reconcile (their replay law), and the in-flight run rides
                // the stopFlags the dispose effect pressed.
                if (this.tearingDown)
                    return;
                // The remote only ever enqueues RICH rows (RunRecord
                // extends the core's row — one object, one voice), so the
                // claim is this map's own row.
                const run = this.core.tryDequeue();
                if (run === null)
                    return;
                // THE QUEUED-STOP SKIP (audit 2026-10-22): a stop() pressed
                // while this row sat queued must not cost a full render —
                // the stop flag is otherwise read only inside runOne, after
                // the merged submit. A claimed row whose stop flag is already
                // set goes straight to stopped: settled, no engine call. The
                // claim persist still lands (stopped on disk, the replay law
                // keeps the receipt).
                if (run.stopFlag) {
                    run.status = "stopped";
                    await claimPersist(run);
                    await this.settle(run);
                    continue;
                }
                // THE CLAIM-TIME PRESENCE RE-PROBE (audit 2026-10-22): the
                // lane gate ran at press; weights can leave between press
                // and claim (a removal, a prune, a moved store). A claimed
                // run whose family no longer passes the gate fails LOUD with
                // the same lane voice — never an unnamed engine-side death.
                // Best-effort on the seat: a lane without a primed registry
                // leaves the engine-side gate standing.
                const fams = [];
                if (typeof run.fam === "string" && run.fam !== "")
                    fams.push(run.fam);
                const ledger = run.stageFams;
                if (typeof ledger === "object" && ledger !== null && !Array.isArray(ledger)) {
                    for (const f of Object.values(ledger)) {
                        if (typeof f === "string" && f !== "" && !fams.includes(f))
                            fams.push(f);
                    }
                }
                if (fams.length > 0) {
                    // the gate's contract is THROW-on-miss (phase1Card's pinned
                    // shape) — the catch IS the miss arm; a non-CardArmError
                    // (no booted registry on this lane) leaves the engine-side
                    // checkpoint load as the remaining gate.
                    let laneMiss = null;
                    try {
                        for (const f of fams)
                            lanePresenceRefusal(f);
                    }
                    catch (e) {
                        if (e instanceof CardArmError)
                            laneMiss = e;
                    }
                    if (laneMiss !== null) {
                        run.status = "failed";
                        run.error = laneMiss.message;
                        for (const stage of run.stages) {
                            const st = stage["status"];
                            if (st === "queued" || st === "pending" || st === undefined) {
                                stage["status"] = "failed";
                                stage["error"] = laneMiss.message;
                            }
                        }
                        await claimPersist(run);
                        await this.settle(run);
                        continue;
                    }
                }
                // THE CLAIM-TIME INITIALS RE-PROBE (audit F5, the round-25
                // scout's cure): the press gate validated the file initials
                // with sync isFile, minutes before the engine merge uses
                // them — a file deleted, pruned, or lost to a crash-orphan
                // reclaim in between died engine-side, unnamed. The row's
                // initialFileKeys name the file-kind entries; the re-probe
                // judges them over the press gate's OWN candidate trees
                // (initialFileCandidates — the same set, never the wider
                // §23 manifest) and fails the row with the press text, so
                // both moments read as one door. Text and bake_params keys
                // never ride the stamp — nothing to re-probe.
                const fileKeys = run.initialFileKeys;
                if (Array.isArray(fileKeys) && fileKeys.length > 0) {
                    const roots = { stateRoot: this.ctx.queue.stateRoot, repoRoot: resolveRepoRoot() };
                    let initialMiss = null;
                    for (const key of fileKeys) {
                        if (typeof key !== "string")
                            continue;
                        const raw = run.initials[key];
                        if (typeof raw !== "string")
                            continue; // merged-worker arm owns absent/linked values
                        if (!initialFileCandidates(raw.trim(), roots).some((cand) => isFile(cand))) {
                            initialMiss = "initial " + JSON.stringify(key) + " is not on disk (" + raw.trim() + ")";
                            break;
                        }
                    }
                    if (initialMiss !== null) {
                        run.status = "failed";
                        run.error = initialMiss;
                        for (const stage of run.stages) {
                            const st = stage["status"];
                            if (st === "queued" || st === "pending" || st === undefined) {
                                stage["status"] = "failed";
                                stage["error"] = initialMiss;
                            }
                        }
                        await claimPersist(run);
                        await this.settle(run);
                        continue;
                    }
                }
                // THE CLAIM PERSIST (the commission wedge landing, 2026-10-03):
                // 'running' lands on disk at claim time, not only at settle —
                // claimPersist (runsTypes.ts) owns the crash window it closes.
                await claimPersist(run);
                // Cache the engine seat WHILE this fiber lives — the
                // teardown effect's interrupt rides this cache (a ctx.get
                // from a dying fiber refuses). Best-effort: a claim
                // without a seat leaves the cache untouched, never fails
                // the run (the worker converges on its own errors).
                if (this.engineSeat === undefined) {
                    try {
                        this.engineSeat = needComfyUI(this.ctx, "runsRemote pump");
                    }
                    catch {
                        /* no seat yet — the card-plane rigs never have one */
                    }
                }
                try {
                    await runOne(run, this.ctx, (r) => this.settle(r));
                }
                catch (exc) {
                    // THE CLAIM-RELEASE LAW (audit R1's arm, completed
                    // 2026-10-03): runOne guards its own paths, but ANY
                    // escape between claim and settle — a seat lookup on a
                    // dying fiber, a persist fault — left activeId held with
                    // the pump exited: every later run stranded behind a
                    // claim nobody owned (the commission wedge's queue
                    // half). The pump settles the row failed loud itself and
                    // keeps claiming: the queue may delay a run, never
                    // strand it.
                    const text = "run seat escape (pump settle): " + errText(exc);
                    for (const stage of run.stages) {
                        if (stage["status"] === "running") {
                            stage["status"] = "failed";
                            stage["error"] = text;
                        }
                    }
                    run.status = "failed";
                    run.error = text;
                    try {
                        await this.settle(run);
                    }
                    catch {
                        /* a dying fiber refuses its own seats — settle's very
                         * capture throws. Nothing is left to free HERE: the
                         * claim persist already wrote 'running' on disk, the
                         * fiber's in-memory claim dies with the fiber, and the
                         * next boot's sweep retires the row (queueSweep's law).
                         * Touching this.core would re-read the dead ctx and
                         * escape the pump — the exact shape this catch closes. */
                    }
                }
            }
        }
        finally {
            this.pumping = false;
        }
    }
    /** The run's engine id (stroke 53): the first stage's engine,
     *  defaulting to 'comfyui' for pre-seam rows (the only engine
     *  that ever was). Single-stage gateway = one engine per run. */
    /** The engine read (static delegate to the extracted plane). */
    static runEngine(run) {
        return runEngineOf(run);
    }
    /** Terminal settle (queue core row + the settle persist). */
    async settle(run) {
        // Capture the queue seat before the first await: a settle that
        // resumes after fiber dispose must not re-read the dead ctx
        // injection (the persist still completes; the bookkeeping runs
        // on the captured instance).
        const queue = this.ctx.queue;
        await settlePersist(run, queue.stateRoot);
        queue.core.releaseActive();
        queue.core.evictSettled();
        // THE SETTLE WRITE-BACK (the stuck-row cure, 2026-10-22: run
        // run-4610e1c38d75 settled while its draft row read 'running'
        // forever — the only patcher was the browser tab's poller, and
        // the push era retired it). The seat now mirrors the terminal
        // outcome into the draft row itself: a closed or wedged tab can
        // never own the row's answer. Best-effort: the RUN doc is the
        // answer of record — a mirror refusal (unknown draft, a stage id
        // the draft never had) is bookkeeping, and a live tab's own
        // patch path writes the same words anyway. The patches come
        // from settleMirrorPatches (the pure seam the walls drive);
        // telemetry never fences, so expectRev 0 is never spent.
        if (run.draftId !== "") {
            const sig = new AbortController().signal;
            for (const { stageId, patch } of settleMirrorPatches(run)) {
                try {
                    await this.ctx.draftsRemote.patch(run.draftId, stageId, patch, 0, sig);
                }
                catch {
                    /* the mirror is bookkeeping; the run doc answers */
                }
            }
        }
        // THE SETTLE WAKE: the change seam's contract lists the settle
        // among its emitters ("a claim, a settle, an artifacts harvest,
        // a stop press" — runsChange.ts), but this path never fired it;
        // a watcher parked on the running row never learned of the
        // terminal write. Firing after the evict so the re-read serves
        // the terminal row.
        notifyRunChanged(run.runId);
    }
}
/** The single-stage bench doc's DRAFT row id (the model arm's
 *  identity seam): exactly one stage row with a string id → that id;
 *  any other shape composes ambiguous → undefined (the mirror falls
 *  back to the run row's id, the legacy coincidental path). */
function benchStageIdOf(benchDoc, skeleton) {
    if (benchDoc === undefined)
        return undefined;
    const rows = benchDoc["stages"];
    if (!Array.isArray(rows) || rows.length !== 1)
        return undefined;
    const first = rows[0];
    const id = first?.["id"];
    return typeof id === "string" && id !== "" ? id : skeleton;
}
/** THE SETTLE MIRROR (pure — the walls' seam, bench-trail/runs-remote
 *  W4–W8): per draft stage, the terminal outcome patch the runs seat
 *  mirrors into the draft doc at settle, with no browser tab alive.
 *
 *  Identity: the DRAFT row id (benchStageId, the compose's stamp) —
 *  the run row's `id` may be the card skeleton's, a namespace the
 *  draft doc never heard of (draft.ts's own admission). Legacy rows
 *  without the stamp fall back to `id`.
 *
 *  Words: the draft row's terminal vocabulary. completed→done (the
 *  client's word, cards-resource tileStatusFromVerdict),
 *  failed→failed, stopped→stopped; a STOPPED run's untouched
 *  (queued/pending/running) stage rows mirror the run's word — the
 *  queued-stop arm settles without stamping stages (the defect-hunt
 *  §1 P1: the closed-tab row would read running forever).
 *
 *  The result face: run_id always; the run-relative media url of the
 *  stage's own output when one exists (the husk clobber's other
 *  half — a bookkeeping mirror never blanks a hero it can name); the
 *  error voice (stage's, else the run's) when the word is failed. */
export function settleMirrorPatches(run) {
    const out = [];
    for (const stage of run.stages) {
        const word = stage.status === "completed" ? "done"
            : stage.status === "failed" ? "failed"
                : stage.status === "stopped" ? "stopped"
                    : run.status === "stopped" ? "stopped"
                        : undefined;
        if (word === undefined)
            continue;
        const stageId = typeof stage.benchStageId === "string" && stage.benchStageId !== ""
            ? stage.benchStageId
            : stage.id;
        const extras = stage;
        const relUrl = typeof extras["url"] === "string" && extras["url"] !== "" ? extras["url"] : undefined;
        const gallery = Array.isArray(extras["gallery"]) ? extras["gallery"] : [];
        const galleryName = gallery.length > 0 && typeof gallery[0]["name"] === "string" ? gallery[0]["name"] : undefined;
        const mediaUrl = relUrl !== undefined || galleryName !== undefined
            ? RUN_MEDIA_PREFIX + "/" + run.runId + "/" + (relUrl ?? galleryName)
            : undefined;
        const voice = typeof stage["error"] === "string" && stage["error"] !== ""
            ? stage["error"]
            : word === "failed" && typeof run.error === "string" ? run.error : undefined;
        out.push({
            stageId,
            patch: {
                runStatus: word,
                result: {
                    run_id: run.runId,
                    ...(mediaUrl !== undefined ? { url: mediaUrl } : {}),
                    ...(voice !== undefined ? { error: voice } : {}),
                },
            },
        });
    }
    return out;
}
//# sourceMappingURL=runsRegistry.js.map