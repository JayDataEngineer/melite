import { Service } from "@deepseek-ai/cordis";
import type { Context, Plugin } from "@deepseek-ai/cordis";
/** THE ACQUIRE STALL BUDGET (ERRORS.md k2: "it gets stuck, then it's
 *  permanently stuck at whatever percent"): a direct fetch that lands
 *  no bytes for this long is STUCK — the stall watchdog aborts the
 *  stream and the operation settles FAILED with the stuck voice at
 *  the bytes it froze at (state 'verifying' at 39% must die, never
 *  ride forever). The budget bounds the FREEZE, never the download:
 *  any landed byte re-arms it, so a slow multi-GB fetch rides as long
 *  as it moves. The failed row keeps its truth (bytes + why) and the
 *  state machine re-admits the ref (failed → acquiring), so a retry
 *  is a fresh fetch, never a resurrect (weight-acquire-stuck.spec.ts
 *  ARM 5). 10_000ms is the WAN-honest bound (audit F7, 2026-10-20:
 *  at 1000ms the watchdog was one TCP hiccup deep — a single >1s
 *  jitter on a moving 100 MB/s fetch killed the stream, discarded
 *  the .part, and forced a zero-byte re-download; the budget bounds
 *  the FREEZE, so 10s of true silence still dies loud while real
 *  WAN jitter rides); the walls that judge the watchdog itself seat
 *  their own explicit budget (stalledConfig's 250ms), and the
 *  deployment face is ProvisioningConfig.acquireStallTimeoutMs. */
export declare const ACQUIRE_STALL_TIMEOUT_MS = 10000;
/** THE STALL AUTO-RECOVERY BUDGET (the "will never finish" burn,
 *  2026-11-05): a wedged wire re-opens at its kept part's offset this
 *  many times before the acquire settles failed — the deployment-varying
 *  face is ProvisioningConfig.acquireStallRetries. */
export declare const ACQUIRE_STALL_RETRIES = 6;
/** THE DURABLE CLAIM CADENCE (2026-10-21): how often a durable seat
 *  polls the shared op store for 'requested' rows. A deployment
 *  tunable — ProvisioningConfig.downloadClaimIntervalMs — because a
 *  busy lane and a quiet box want different latencies between an
 *  agent's request and the lane's claim. */
export declare const DOWNLOAD_CLAIM_INTERVAL_MS = 2000;
import { type ActivateOptions, type EnsureOptions, type ExternalProvisionRequest, type ProvisionOperation, type ProvisionPlan, type ProvisionResult, type ProvisionState, type ResourceRef, type ResourceStatus, type WeightAcquireProgress } from "./contracts.ts";
import type { ProvisioningConfig, ProvisioningServiceDefinition } from "./ports.ts";
/** THE BUSY REFUSAL (audit I-S4): startWeightAcquire throws this when
 *  the plane already runs its concurrency cap of fetches. The door
 *  maps it to a 429 with retry_after_ms — a busy plane is a wait, not
 *  a failure. */
export declare class AcquireBusyError extends Error {
    readonly retryAfterMs = 5000;
    constructor(message: string);
}
/** Arm the process seat with one live service.
 * @param service the mounting ProvisioningService.
 * @returns void. */
export declare function armProvisioningSeat(service: ProvisioningService): void;
/** Disarm the process seat — a no-op unless this service still holds it.
 * @param service the service whose dispose is running.
 * @returns void. */
export declare function disarmProvisioningSeat(service: ProvisioningService): void;
/** The live seat, undefined when no provisioning service is mounted in
 *  this process — a reader without a seat carries no in-flight truth
 *  and answers so, never a fabricated operation.
 * @returns the armed ProvisioningService or undefined.
 * */
export declare function provisioningSeat(): ProvisioningService | undefined;
export declare class ProvisioningService extends Service implements ProvisioningServiceDefinition {
    private readonly declaration;
    private readonly writer;
    private readonly writerRoot;
    private readonly fetcher;
    private readonly manager;
    private readonly inspector;
    private readonly lifecycle;
    private readonly operationStore;
    private readonly writeGuard;
    private readonly operationIdFactory;
    private readonly records;
    private readonly locks;
    /** THE F9 BYTE LEDGER (one map, two readers): operationId ->
     *  live bytes/total. The direct arm counts the fetcher stream as
     *  it lands (real bytes, never an animation); total is the DECL
     *  size_bytes sum. The manage door (acquire_weight) and any
     *  future caller poll progressOf — one ledger, never two. */
    private readonly weightProgress;
    /** Mints that passed the cap check but have not registered their
     *  lock yet (the plan resolve awaits in between) — the cap counts
     *  them with the locks, or concurrent starts all read the same
     *  pre-mint size and overbook the plane (audit verify-batch31
     *  D1). */
    private pendingAcquires;
    /** Mints between the synchronous reservation and the lock's
     *  registration, keyed by resource key. A same-key starter that
     *  arrives inside the window parks on the promise and joins the
     *  lock it registers — without this, both starters miss the
     *  registered-lock join and twin-mint one ref (verify R1). */
    private readonly pendingMints;
    private readonly weightProgressByRef;
    private readonly diskFree;
    /** THE STALL BUDGET'S VALIDATED FACE (the constructor's read of
     *  ProvisioningConfig.acquireStallTimeoutMs, defaulting to
     *  ACQUIRE_STALL_TIMEOUT_MS). */
    private readonly acquireStallTimeoutMs;
    /** THE STALL AUTO-RECOVERY BUDGET (the constructor's read of
     *  ProvisioningConfig.acquireStallRetries, defaulting to
     *  ACQUIRE_STALL_RETRIES). */
    private readonly acquireStallRetries;
    /** THE ATTEMPT-SCOPED ABORT SEAT (the recovery loop's other arm):
     *  the direct arm's CURRENT fetch attempt per operation. The
     *  watchdog aborts THIS controller on a stall — the wedged wire
     *  dies, the operation's lock lives to re-open at the kept offset.
     *  No seat (a verify stall, a non-direct arm) keeps the legacy
     *  teardown: the lock's own controller. Deleted on every attempt
     *  exit, never a leak. */
    private readonly stallAborters;
    /** THE DURABLE DOWNLOAD SEAT (2026-10-21): true = this seat
     *  claims 'requested' op rows on a cadence and owns every fetch's
     *  lifetime. The validated read of
     *  ProvisioningConfig.durableDownloads. */
    private readonly durableDownloadsSeat;
    /** THE CLAIM CADENCE: the validated read of
     *  ProvisioningConfig.downloadClaimIntervalMs. */
    private readonly downloadClaimIntervalMs;
    /** The per-boot identity a claim stamps into the row it wins —
     *  the re-read guard names the loser of a two-seat race. */
    private readonly seatId;
    /** THE STALL VOICE SEAT: the watchdog's refusal per operation,
     *  consumed once by the item loop — the abort the refusal rode
     *  would otherwise read as a cancellation at refusalFor, and a
     *  stalled fetch is a FAILURE, never an operator's cancel. */
    private readonly stallRefusals;
    /** THE VERIFY FLOW CLOCK (the 100%-then-FAILED burn, 2026-10-20):
     *  last epoch ms the writer's verify heartbeat fired per operation.
     *  Hashing a multi-GB part flows for tens of seconds with zero
     *  stream movement — the watchdog's clock rides THIS alongside the
     *  stream bytes, or it murders every complete download. Deleted on
     *  the watchdog's disarm (every exit path), never a leak. */
    private readonly verifyFlowAt;
    constructor(ctx: Context, config: ProvisioningConfig);
    /** THE REHYDRATE SEED (audit E3): one stored row joins the live
     *  ledger. A row still mid-flight belongs to a fetch that died
     *  with the old process — it rehydrates as failed with the
     *  restart named, never as a frozen acquiring bar. A stored
     *  TERMINAL row (finishedAt set) rejoins as-stored — its state,
     *  ref, and why survive (P5 F2: the verbs must survive the seat
     *  restarting) — with the byte counters zeroed: the frozen count
     *  died with the old process and the ledger never claims bytes
     *  it has not re-statted. The rejoined row is an ordinary
     *  terminal entry: retry reads its ref, discard evicts it, and
     *  evictSettledAcquires caps it oldest-first like any settled
     *  row. A row neither mid-flight nor finished stays out. */
    private rehydrateProgress;
    stateOf(ref: ResourceRef): ProvisionState;
    operationOf(ref: ResourceRef): ProvisionOperation | undefined;
    /** THE TRUST RE-VERIFY (audit I-S6, 2026-10-22): an external
     *  operation's persisted row is served by status reads, and the
     *  row used to trust its own landing — a file deleted after the
     *  fetch kept serving "active". This re-stats every recorded model
     *  path (existence only: the operator-confirmed semantic is that
     *  the bytes' SHA-256 is unverified) and demotes a missing path to
     *  absent, naming the operation and the gone path. Declared rows
     *  are not this method's subject — inspect() owns them. */
    verifyOperation(operation: ProvisionOperation): Promise<ProvisionOperation>;
    transitionsOf(ref: ResourceRef): readonly ProvisionState[];
    isLocked(ref: ResourceRef): boolean;
    /** THE STALL BUDGET'S READ FACE (P5 F1's wall seat): the validated
     *  budget the watchdog enforces — the composition's pass-through
     *  lands here, and the deployment wall reads it back. Never the
     *  constant: an operator-tuned window answers tuned. */
    stallBudgetMs(): number;
    /** THE STALL AUTO-RECOVERY BUDGET'S READ FACE (the recovery wall's
     *  seat): the validated retry count the direct arm re-opens with —
     *  the composition's pass-through lands here, and the wall reads it
     *  back. Never the constant: an operator-tuned budget answers
     *  tuned. */
    stallRetryBudget(): number;
    /** THE F9 PROGRESS READ (the tracker's poll): a copy of the live
     *  byte ledger for one operation id, null when unknown. Bytes are
     *  counted as the fetcher stream lands — real landed bytes, never
     *  an animation. */
    progressOf(operationId: string): WeightAcquireProgress | null;
    /** THE F9 REF READ (the tracker's poll by model): the live entry
     *  for one ref, null when no acquisition has started for it. */
    progressOfRef(ref: ResourceRef): WeightAcquireProgress | null;
    /** THE LIFECYCLE-GUARD CENSUS (MP-F3, round 19, 2026-10-10): the
     *  sync names of every fetch this seat currently holds — each
     *  lock-held fetch (every ensure/activate/acquireExternal fetch
     *  and every startWeightAcquire background fetch holds its lock
     *  for the whole landing) plus every pre-lock mint (the P-R1
     *  window: slot reserved, plan resolve still in flight, no lock
     *  yet). Lock-held fetches name their resource key and operation
     *  id (the tracker's poll key); pre-lock mints name their
     *  resource key with no id minted yet. Synchronous by law: the
     *  manage guard cannot await. */
    inflightAcquires(): readonly string[];
    /** THE F9 START (one door's background arm): starts the fetch for
     *  one ref WITHOUT awaiting the landing and returns its operation
     *  id at once — the tracker polls progressOf. A second start while
     *  the first is locked returns the FIRST id (one fetch, never two;
     *  runLocked's join law). The fetch itself rides executeEnsure
     *  (the existing fetcher — no second fetcher). */
    startWeightAcquire(ref: ResourceRef, options?: EnsureOptions): Promise<string>;
    /** THE FLIGHT LAUNCH (the mint tail, shared by the direct start
     *  and the durable claim): registers the lock synchronously under
     *  the GIVEN id and settles the ledger at the flight's end. The
     *  caller owns the slot reservation and the ledger seeding. */
    private launchWeightAcquire;
    /** THE DURABLE DOWNLOAD SEAT'S REQUEST ARM (2026-10-21): mints a
     *  'requested' op row for the ref WITHOUT opening a wire — the
     *  fetch belongs to the durable seat that claims it, so the
     *  download outlives this session. The ask is always the WHOLE
     *  plan (a subset ask is a durable-seat-only shape: the GUI's
     *  subset presses ride the durable seat directly). One want, one
     *  row: a requested or live row for the ref returns its id, and a
     *  settled op that already covers the ask returns the settled id
     *  (the no-re-mint law).
     *  @param ref the model ref the durable seat will fetch
     *  @returns the requested operation's id
     *  @throws when the seat has no operation store — a request row
     *  nobody can claim is a dead queue, never a silent no-op. */
    requestWeightAcquire(ref: ResourceRef): Promise<string>;
    /** THE CROSS-PROCESS POLL (2026-10-21): the SHARED STORE is the
     *  truth for a 'requested' row — the local seed goes stale the
     *  moment a durable seat claims it, and the poll must answer the
     *  claim, never the stale want. Every other memory entry is this
     *  process's OWN truth by construction (a live flight here, or a
     *  terminal state — immutable), and wins without a store read.
     *  @param operationId the operation the tracker polls
     *  @returns the row's face, null when no memory entry and no
     *  stored row answers the id. */
    readProgress(operationId: string): Promise<WeightAcquireProgress | null>;
    /** THE DURABILITY WORD: true when this seat claims requested rows
     *  and owns fetch lifetimes — the manage plane's start arm routes
     *  on it. */
    durableDownloads(): boolean;
    /** THE CLAIMER-LIVENESS WORD (2026-10-21): a FRESH heartbeat from
     *  ANOTHER seat on the shared store — the only condition under
     *  which a transient may queue a download. No store, no stamp, a
     *  stale stamp, this seat's own stamp, or an unreadable stamp all
     *  answer false: the caller takes the wire itself, and a
     *  deployment without a live durable seat never dead-queues.
     *  @returns true only when a foreign stamp sits inside the
     *  freshness window */
    durableClaimerLive(): Promise<boolean>;
    /** THE DURABLE CLAIM SWEEP: every 'requested' row in the shared
     *  store, claimed sequentially — a claim joins the plane's own
     *  locks and cap, so the sweep never overbooks the plane. */
    private claimRequestedRows;
    /** THE CLAIM (one row): a same-key lock here already owns the
     *  ref; the claim stamp wins by re-read (the two-seat race's
     *  loser yields); the flight launches under the row's OWN id —
     *  the requester's poll id is the fetch's id.
     *  @returns true when this seat claimed and launched the row. */
    private claimRequested;
    /** THE NO-RE-MINT COVERAGE (the mint door's judge): the id of the
     *  settled operation that already covers the ask for one resource
     *  key, undefined when nothing covers it. Coverage = the latest
     *  operation for the key is FINISHED with the store's own success
     *  vocabulary (outcome "active" or "restart_required" —
     *  aggregateOutcome's succeeded set) and every covered item wears a
     *  verified integrity word ("declared-sha256" or "size-checked").
     *  A whole-plan ask (wantedKeys undefined) demands the whole roster
     *  verified; a named ask demands exactly the requested keys. A
     *  failed/blocked settle, an unfinished row, or an unprovable ask
     *  (wantedKeys null) never covers. */
    private settledCoverageId;
    /** THE JOIN FILL (verify R3): the joiner tops the ledger up only
     *  where the live entry lacks. The row is re-read AFTER the plan
     *  resolve — a concurrent executeEnsure seed may have counted
     *  bytes in between, and a join never resets them. The items
     *  filter narrows the total with the joiner's own ask (the
     *  join law: the ledger total follows the fetch that runs). */
    private fillJoinProgress;
    /** The background-start run: a preset id (the caller returns it
     *  synchronously) with no caller signal — the operation owns its
     *  own controller alone. */
    private runWithId;
    plan(ref: ResourceRef): Promise<ProvisionPlan>;
    inspect(ref: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus>;
    ensure(ref: ResourceRef, options?: EnsureOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    activate(ref: ResourceRef, options?: ActivateOptions, signal?: AbortSignal): Promise<ProvisionResult>;
    acquireExternal(request: ExternalProvisionRequest, options?: {
        readonly operatorConfirmed: boolean;
        readonly force?: boolean;
    }, signal?: AbortSignal): Promise<ProvisionResult>;
    reconcile(ref?: ResourceRef, signal?: AbortSignal): Promise<ResourceStatus[]>;
    private executeEnsure;
    private acquirePlanItem;
    /** THE POST-INSTALL VERIFY (audit I-S6(c), 2026-10-23): the install
     *  ack is the Manager's claim, not the landing — the belt re-reads
     *  the Manager's own inspect before the plane serves
     *  restart_required, and an ack with no landed pack fails the item
     *  by name. No inspect seat = no belt (the ack stands, degraded —
     *  the same no-seat law the trust merge runs). */
    private verifyLanded;
    /** THE SNAPSHOT ARM (the lying-Download cure, 2026-11-10): a
     *  directory-shaped weight tree the DECL pins as repo+revision+allow
     *  patterns lands file-by-file through the SAME writer, fetcher,
     *  stall clock, and progress counter every direct model download
     *  rides. No symlink, no clone, no Manager catalog — a fresh
     *  Windows install fetches the same bytes. Resume is per-file: a
     *  landed sibling is kept (the revision pin is the integrity word;
     *  no per-file digest exists upstream).
     *  @param ref the resource the row belongs to
     *  @param item the snapshot plan item
     *  @param operationId the acquire operation's id
     *  @param signal the operation's abort signal
     *  @returns the item result (active once the anchor probe passes) */
    private acquireSnapshot;
    private acquireModel;
    private activateExtension;
    private inspectPlanItem;
    private begin;
    private complete;
    private failureResult;
    private blockedResult;
    private statusFromResult;
    private record;
    private move;
    /** THE F9 BYTE ADD (the tracker's numerator write): adds landed
     *  bytes to one operation's live count. No entry, no write. */
    private bumpProgress;
    /** THE DENOMINATOR SEED (raise-only): a listing-derived total
     *  lands when the mint's DECL-derived total is 0 (snapshot rows
     *  declare no size_bytes) — never shrinks a declared word, never
     *  invented (the sum of the listing's own sizes).
     *  @param operationId the acquire operation's id
     *  @param total the matched set's byte sum */
    private seedWeightTotal;
    /** THE PHASE VOICE (audit download-stack-audit-2026-10-20 F2):
     *  mirrors the live flow onto the ledger entry — the poll's only
     *  liveness window. Ledger-only by law: the record's state machine
     *  keeps its pinned shapes (the present path's history is
     *  acquiring→active, untouched), while the per-operation ledger
     *  voices the sub-phase the fetch is actually in (recheck before
     *  the store inspect answers, stream on the wire, queue in the
     *  manager drain, verify at the hash boundary). The optional state
     *  rides only where no record move may carry it; where a move
     *  exists the mirror carries the word and this carries the phase.
     *  The voice is FLIGHT-ONLY: complete() sheds the phase at the
     *  settle (the acceptance law — a settled row never keeps a live
     *  word), so only in-flight rows answer with one. */
    private voicePhase;
    /** THE FLIGHT DETAIL VOICE (audit download-stack-audit-2026-10-20
     *  F7): mirrors one mid-flight fact onto the ledger row's detail —
     *  the resume offset, or the ignored-range restart. No entry, no
     *  write; a terminal result's detail overwrites it in complete(). */
    private voiceDetail;
    /** THE RESTART REWIND (the ignored-range law's ledger face, the
     * recovery loop's second red, 2026-11-05): a host that answers 200
     * to a ranged ask restarts the flight from byte 0 — the in-place
     * ledger rewinds to the restarted truth, never keeps the dead
     * prefix's count (a fresh operation never carries one). */
    private rewindProgress;
    /** THE F9 ENTRY FILL (the tracker's denominator keep): creates the
     *  live entry when the blocking path is the first writer, and never
     *  shrinks a background start's plan total. */
    private ensureProgress;
    /** THE STALL WATCHDOG (ERRORS.md k2 — "it gets stuck, then it's
     *  permanently stuck"): watches one operation's landed bytes at
     *  ACQUIRE_STALL_TICK_MS cadence over the direct arm's whole window
     *  (the headers wait AND the byte stream — a fetch that never
     *  answers and a stream that freezes are the same stuck shape). No
     *  byte change across acquireStallTimeoutMs fires it: the watchdog
     *  aborts the operation's stream (tearing the wedged wire down) and
     *  seats the stuck refusal, whose voice the item loop consumes so
     *  the operation settles FAILED — at the frozen bytes, with the
     *  why — instead of riding 'verifying' forever. THE VERIFY OWNS
     *  THE CLOCK (the 100%-then-FAILED burn, 2026-10-20): the writer's
     *  verify heartbeat re-arms the same clock — a complete stream is
     *  never a stalled stream. A watchdog that never fires costs one
     *  interval per live fetch; every exit path disarms via the
     *  returned closure.
     *
     * @param operationId the operation whose ledger the watchdog reads.
     * @param ref the operation's resource key (its lock, for the abort).
     * @returns the disarm closure (idempotent). */
    private armStallWatch;
    /** THE STALL VOICE READ (consumed once): the watchdog's refusal for
     *  one operation, undefined when it never fired. Consumption clears
     *  the seat — a refusal names ONE failure, never a later one.
     *
     * @param operationId the failing operation.
     * @returns the stuck refusal, or undefined. */
    private takeStallRefusal;
    /** THE REGISTRY-GROWTH LAW (audit I-S4): terminal acquire rows are
     *  evicted oldest-first past MAX_SETTLED_ACQUIRES in BOTH maps —
     *  the ByRef pointer drops with its id, never dangles — and the
     *  stored operation is removed from the store so the dir stops
     *  growing (the runs plane's MAX_SETTLED_RUNS, mirrored). Live
     *  ("acquiring") rows are never candidates. */
    private evictSettledAcquires;
    /** THE RESCUE EVICT (acquire_discard — ERRORS.md k2's "no delete"):
     *  removes one SETTLED acquire row everywhere it lives — the ledger
     *  entry, every by-ref pointer, and the stored operation (tombstoned
     *  first, the same chain evictSettledAcquires rides, so a save still
     *  in flight cannot resurrect it) — so a wedged fetch's row is
     *  clearable and a later progressOf answers null (the manage door's
     *  poll then 404s). A still-locked id refuses loud: discarding a
     *  live fetch would orphan it and dangle its by-ref pointer.
     *
     * @param operationId the settled acquire row to remove.
     * @returns void.
     * @throws when the id still holds its fetch lock. */
    discardAcquire(operationId: string): void;
    /** THE STORE WRITE CHAIN (verify R5): the store writes are
     *  fire-and-forget, so an in-flight save could land after the
     *  same id's eviction remove and resurrect a settled row. Writes
     *  for one id chain on the previous write, and an evicted id is
     *  tombstoned — later saves for it are dropped. With no write in
     *  flight the perform() call keeps the caller's synchronous
     *  frame: a synchronous store throw still fails the operation
     *  loud (the tested contract), only an async rejection logs. */
    private readonly storeWrites;
    private readonly storeRemoved;
    private enqueueStoreWrite;
    private persist;
    private runLocked;
    private joinLocked;
    private cancelledJoinResult;
    private completeUnstarted;
}
export declare const name = "provisioning";
export declare function apply(ctx: Context, config: ProvisioningConfig): void;
export declare const provisioningProvider: Plugin;
export declare const provisioningContract: Plugin.Object<any>;
export declare const provisioningPlugin: Plugin.Object<any>;
declare module "@deepseek-ai/cordis" {
    interface Context {
        provisioning: ProvisioningService;
    }
}
export default provisioningProvider;
//# sourceMappingURL=service.d.ts.map