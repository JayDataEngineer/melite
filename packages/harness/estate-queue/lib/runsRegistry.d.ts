import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import type { RunId } from "./queueCore.js";
export { toRemoteError } from "./runsRefusalVoices.js";
import type { FlowsValidateAnswer } from "./runsValidate.js";
import type { RunRecord } from "./runsTypes.js";
/** THE START SUMMARY (the door's answer face): what start() and the
 *  concurrent-press reservation both answer with. `sweep_runs` rides
 *  ONLY a seed-sweep press (friction #9): every run id the one
 *  press minted, first seed first — absent on every single run. */
interface PressStartSummary {
    run_id: string;
    status: string;
    queue_position: number;
    readonly sweep_runs?: readonly string[];
}
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
/** The lane-miss row's structured payload (operator 2026-10-22,
 *  the missing-model popup): the wire code names the class, these
 *  fields name the artifact — the client's popup keys its download
 *  action on them, never on parsing the message prose. */
export interface LaneInputMissingDetails extends RunsRefusalDetails {
    readonly family: string;
    readonly slot: string;
    readonly missing: string;
    readonly folders: readonly string[];
    readonly fetch_url?: string;
    /** THE ONE-FACE LIST (the reveal cure, 2026-11-09): every missing
     *  declared weight the gate found, lead row = the slot/missing pair
     *  above. The popup's download list keys on these rows — one face
     *  per press. Absent on the runtime leg and the in-flight arm. */
    readonly missing_all?: ReadonlyArray<{
        readonly slot: string;
        readonly name: string;
        readonly folders: readonly string[];
        readonly size_bytes?: number;
        readonly fetch_url?: string;
    }>;
    /** "runtime" rides the tool-runtime leg (E2-2 Piece A) — the
     *  popup's runtime banner keys on the parsed prose, never on
     *  this row (there is no fetch_url for a provision command). */
    readonly kind: "model" | "extension" | "runtime";
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
        "runs/flow-compile": RunsRefusalDetails & {
            readonly errors?: unknown;
        };
        /** The comfyui workflow pin sweep refused (the validate
         *  door's workflow_pin payload). */
        "runs/workflow-pin": RunsRefusalDetails & {
            readonly errors?: unknown;
        };
        "runs/card-compose": RunsRefusalDetails;
        /** The compose refusal's incomplete-draft class (2026-10-18): a
         *  required lane word is UNSTATED — bench state under
         *  construction, never a run outcome. The message carries the
         *  door's voice verbatim; consumers heal the row instead of
         *  carrying a failure. */
        "runs/card-compose-incomplete": RunsRefusalDetails;
        /** The lane presence gate refused (2026-09-13): a family's
         * declared lane file is missing from every store folder — the
         * message names the file and the provision's fetch URL, the
         * details carry the structured artifact (LaneInputMissingDetails,
         * the client's download-popup payload, 2026-10-22). */
        "runs/lane-input-missing": LaneInputMissingDetails;
        /** The lifecycle latch refused (MP-R1, 2026-10-10): a
         * destructive door holds the latch — the press names the action
         * in flight and retries when it settles. */
        "runs/lifecycle-inflight": RunsRefusalDetails;
        /** Status on an id this process owns no row for. */
        "runs/unknown-run": {
            readonly runId: string;
        };
        /** Stop on an id this process owns no row for. */
        "runs/run-unknown": {
            readonly runId: string;
        };
        /** Stop on a plainly settled row (the stuck-run cure,
         *  2026-11-09): the loud refusal that replaced the silent
         *  `{error}` payload — the details name the run and its true
         *  state. Direct-throw family (the runs/unknown-run precedent):
         *  thrown at the door, never an {error} envelope row. */
        "runs/already-settled": {
            readonly runId: string;
            readonly status: string;
        };
    }
}
/** The refusal codes this remote serves, folded to the
 *  protocol's vocabulary — a literal table, no dynamic key. */
export declare function enrichDiskRow(row: Record<string, unknown>): Record<string, unknown>;
/** THE SIDECAR READER (2026-10-17): one run dir → a read(name)
 *  closure. Absent sidecars are the COMMON case (a run validates
 *  only when its lane asks) — every miss reads as null, never a
 *  throw, so the decorate stays about mounting, not survival.
 * @param dir the run's output dir (names resolve against it)
 * @returns a UTF-8 reader returning null for any unreadable name */
export declare function sidecarReaderFor(dir: string): (name: string) => string | null;
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
export declare function withStageReports(row: Record<string, unknown>, read: (name: string) => string | null): Record<string, unknown>;
export declare function benchWiring(benchDoc: Record<string, unknown>): {
    cross: string[];
    self: string[];
};
export declare class RunsRuntimeService extends Service {
    /** THE PRESS MEMORY's cap (audit N-E1): the last 64 presses of
     *  this process answer replays; older keys age out (a replay that
     *  old is a new press by any honest reading). */
    private static readonly PRESS_MEMORY_MAX;
    static inject: string[];
    /** The pump reentrancy guard (door-verbatim — a public field:
     *  cordis proxies services, and private #fields do not cross the
     *  proxy). */
    pumping: boolean;
    /** The boot-reconcile guard (once per boot; the constructor's
     *  fire-and-forget burns it — walls re-arm this PUBLIC field and
     *  await bootReconcile directly, the pumping-field precedent:
     *  private #fields do not cross cordis proxies). */
    reconciled: boolean;
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
    tearingDown: boolean;
    /** The cached engine seat for the teardown interrupt: a ctx.get
     *  from a DYING fiber refuses (the lookup that feeds the stop
     *  door works only while this fiber lives), so the pump caches
     *  the seat at claim time and the dispose effect rides the
     *  cache. Structural type — no engine import cycle. */
    engineSeat: {
        stopForRunDir: (dir: string) => Promise<void>;
    } | undefined;
    constructor(ctx: Context);
    /** Subscribe to run-row movement (the seat face runs/subscribe
     *  parks on); returns the unsubscribe. Delegates to the module
     *  seam — a listener's fault never breaks the write (the wrapper
     *  guards; the law lives at runsChange.ts onRunChange). */
    onRunChange(fn: (runId: string) => void): () => void;
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
    validate(doc: unknown, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** The model-validate arm (delegates to the extracted arm). */
    modelValidateArm(body: Record<string, unknown>): Promise<FlowsValidateAnswer>;
    bootReconcile(disposed?: () => boolean): Promise<string[]>;
    /** Settle a replay-refused resurrect id: rebuild the row's
     *  identity from its own sidecar (the stage faces ride verbatim)
     *  and persist failed through the canonical terminal writer. */
    private settleReplayRefusal;
    /** The queue seat's registry (the FIFO SSOT). */
    private get core();
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
    private composeCardStageRow;
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
    private composeRegistryFlowStages;
    private composeBenchStages;
    start(doc: unknown, signal: AbortSignal, 
    /** INTERNAL (stroke 83 boot resurrect): reuse a dead process's
     *  run id when replaying its _request.json — the remote surface
     *  never passes this (two-arg wire calls only). */
    reuse?: {
        runId: RunId;
    }): Promise<PressStartSummary>;
    /** THE SWEEP START (friction #9's fan-out): one press, N seeds —
     *  each seed its own run, all under one shared run-id prefix.
     *  Every per-run law rides startReserved unchanged (phase gates,
     *  spell gate, self-wire gate, the registration door); the press
     *  laws wrap the WHOLE family: one press_key answers the sweep
     *  (a replay re-mints NOTHING — the sweep mirror holds every id),
     *  the twin reservation settles once after the last run registers,
     *  and a refusal anywhere propagates with the runs already minted
     *  standing (registered runs never un-register — the registry's
     *  own law; the retry law is the stale-key law's).
     *  @param seeds the judged sweep (capped, integer, model-door).
     *  @param checked the envelope's ok face for the sweep press.
     *  @param signal the caller's abort. */
    private startSweep;
    /** The sweep's mint loop: N startReserved calls, one per seed —
     *  the seed stamped into its own body, the sweep's runId handed
     *  through the INTERNAL reuse seat (the deterministic-id seam, the
     *  same seat the boot-resurrect replay rides). The answer carries
     *  the first run's summary face plus sweep_runs (every id, seed
     *  order). @param pressKey undefined on the inner calls — the
     *  per-run press memory would clobber the family's one entry; this
     *  loop owns the memory after every run stands. */
    private mintSweep;
    /** THE SWEEP MIRROR (audit N-E1's sweep half): press_key -> every
     *  run id the sweep minted. A replay answers the family only while
     *  EVERY row still stands — one swept row is the stale-key law's
     *  (the whole sweep re-runs on retry, the same class as the single
     *  door). Capped beside the single mirror. */
    private readonly sweepPresses;
    private rememberSweepPress;
    /** The sweep replay: the family's answer while every row stands,
     *  null when the key is unknown or stale (the mirror entry dies
     *  with the verdict). */
    private sweepReplay;
    /** THE PRESS REPLAY (audit N-E1): a key this process already
     *  answered names a run that exists — return ITS summary, mint
     *  nothing, enqueue nothing. The row is gone (swept, or its seat
     *  restarted) → the key is stale, a retry may run again. Null when
     *  no live run answers the key. */
    private pressReplay;
    /** THE START ARMS under a settled replay/reservation verdict: the
     *  bench-composed arm and the flow_inline arm, behavior-verbatim
     *  from before the concurrent-press cure split them behind the
     *  shell (the split's only edits are the two summary settles). */
    private startReserved;
    /** The list arm (REBUILD-7): the restore-port envelope over the
     *  output roots. The raw limit STRING rides from the lane (strict
     *  int() semantics: underscores parse, junk refuses). The drafts
     *  probe rides the drafts remote. */
    list(rawLimit: string, signal: AbortSignal, test?: boolean): Promise<{
        count: number;
        runs: Record<string, unknown>[];
    }>;
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
    filmAdmissionWarnings(cardId: string, body: Record<string, unknown>): Promise<string[]>;
    status(runId: string, signal: AbortSignal, includeLog?: boolean): Promise<Record<string, unknown>>;
    stop(runId: string, signal: AbortSignal): Promise<Record<string, unknown>>;
    /** The live map (the queue seat's core registry — rich rows). */
    private liveRun;
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
    private resyncSettledTruth;
    /** The durable record under the run tree (F-5's fallback read):
     *  the on-disk _flow.json for a run — the SAME file the maker
     *  verified byte-by-byte while status answered husks. The
     *  manifest roots are probed in order (own first), both
     *  out-roots per root (production first, then test) since the
     *  fallback may not know the row's testFlag. Unparseable/absent →
     *  undefined — never a fabricated row. */
    private diskRunRow;
    /** The envelope walk with the AWAITED draft probe (door order
     *  preserved: the probe sits between malformed and unknown). */
    /** THE PRESS MEMORY (audit N-E1): press_key -> runId for the
     *  last PRESS_MEMORY_MAX presses of this process. A replayed
     *  press (transport retry, double-fire) answers the FIRST run —
     *  no second mint, no second enqueue, no double GPU spend.
     *  In-process by design: after a seat restart nothing is running,
     *  so a retried press re-runs; a swept row (bootSweep) falls out
     *  the same way. Insertion-ordered; the oldest entry dies at cap. */
    private readonly presses;
    /** THE CONCURRENT-PRESS RESERVATION (the double-mint cure,
     *  2026-10-22): press_key → the first caller's in-flight mint.
     *  Registered synchronously after a replay miss; deleted when the
     *  start settles (summary or refusal) — the window where a second
     *  start with the same key would double-mint closes on the
     *  reservation, not on the press memory's late registration. */
    private readonly pendingPresses;
    /** The caller's verdict at the press gate: null when it becomes
     *  the minter (its entry is registered before this returns); the
     *  in-flight promise when a concurrent mint owns the key — the
     *  twin awaits and answers with the SAME summary or refusal. */
    private reservePress;
    /** The minter's summary settles the twin (no-op without a press —
     *  the door's return sites serve both keyed and keyless starts). */
    private resolvePress;
    /** A refusal anywhere in the arms rejects the twin with the SAME
     *  refusal (one press, one outcome — the retry law is the stale-key
     *  law's: after the settle the key is gone and a later press may
     *  run again). */
    private failPress;
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
    private awaitTwin;
    private rememberPress;
    /** Kick the serial pump (door-verbatim guard). */
    private kick;
    /** The serial worker: claim the FIFO head, execute, settle —
     *  one GPU run machine-wide, strict submit order. */
    private pump;
    /** The run's engine id (stroke 53): the first stage's engine,
     *  defaulting to 'comfyui' for pre-seam rows (the only engine
     *  that ever was). Single-stage gateway = one engine per run. */
    /** The engine read (static delegate to the extracted plane). */
    static runEngine(run: RunRecord): string;
    /** Terminal settle (queue core row + the settle persist). */
    private settle;
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
export declare function settleMirrorPatches(run: RunRecord): Array<{
    stageId: string;
    patch: Record<string, unknown>;
}>;
//# sourceMappingURL=runsRegistry.d.ts.map