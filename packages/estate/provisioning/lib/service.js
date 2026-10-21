import { Service } from "@deepseek-ai/cordis";
import { stat, statfs } from "node:fs/promises";
import { ProvisioningError, VerifiedArtifactWriter, newOperationId, } from "./artifact-writer.js";
import { ManagerProviderError } from "./manager-provider.js";
import { providerOk, unknownProviderRefusal } from "./contracts.js";
/** The part-reaper cadence: a stale part (the writer's own
 *  mtime bound, PART_STALE_MS) waits at most this long past
 *  service start for its sweep. */
const PART_REAP_INTERVAL_MS = 60 * 60 * 1000;
/** THE PLANE CEILING (audit I-S4): the models-provision plane mirrors
 *  the runs plane's bounds — at most MAX_CONCURRENT_ACQUIRES live
 *  fetch locks, and terminal acquire rows evicted oldest-first past
 *  MAX_SETTLED_ACQUIRES (the same 500 as MAX_SETTLED_RUNS, so the two
 *  planes read as one law). */
const MAX_CONCURRENT_ACQUIRES = 2;
const MAX_SETTLED_ACQUIRES = 500;
/** THE DISK ADMISSION RESERVE: a plan is admitted only when the store
 *  root keeps this much free AFTER the plan's declared bytes land. */
const DISK_FLOOR_BYTES = 1024 * 1024 * 1024;
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
export const ACQUIRE_STALL_TIMEOUT_MS = 10_000;
/** The stall watchdog's check cadence: a stall is detected within one
 *  tick past the budget (the part-reaper's periodic-sweep pattern,
 *  scaled from PART_REAP_INTERVAL_MS to the budget's size). */
const ACQUIRE_STALL_TICK_MS = 100;
import { resourceKey, sameResourceRef, } from "./contracts.js";
class ItemRefusal extends Error {
    outcome;
    code;
    constructor(outcome, code, message) {
        super(message);
        this.name = "ItemRefusal";
        this.outcome = outcome;
        this.code = code;
    }
}
const TRANSITIONS = {
    // THE CENSUS HONESTY LAW (the anima burn, 2026-10-20): every
    // settled state may be re-marked 'unknown' — a cut re-scan of a
    // previously-active resource must seat the unknown row, never
    // throw on a missing edge and never keep the stale verdict.
    unknown: ["absent", "acquiring", "installed", "restart_required", "active", "failed", "blocked"],
    absent: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked", "unknown"],
    acquiring: ["verifying", "installed", "restart_required", "active", "failed", "blocked", "absent", "unknown"],
    verifying: ["installed", "restart_required", "active", "failed", "blocked", "acquiring", "absent", "unknown"],
    installed: ["acquiring", "verifying", "active", "restart_required", "failed", "blocked", "absent", "unknown"],
    restart_required: ["acquiring", "verifying", "active", "failed", "blocked", "absent", "unknown"],
    active: ["acquiring", "verifying", "absent", "restart_required", "failed", "blocked", "unknown"],
    failed: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "blocked", "absent", "unknown"],
    blocked: ["acquiring", "verifying", "installed", "restart_required", "active", "failed", "absent", "unknown"],
};
function copyRef(ref) {
    if (ref.kind === "extension")
        return { kind: "extension", id: ref.id };
    return {
        kind: "model",
        owner: ref.owner,
        id: ref.id,
        ...(ref.variant === undefined ? {} : { variant: ref.variant }),
        ...(ref.quant === undefined ? {} : { quant: ref.quant }),
    };
}
/** THE BOOT-SEED RECENCY (P5 F2): the by-ref pointer answers the
 *  latest stored row for a ref — best-effort by the row's own
 *  clock (finishedAt, else startedAt); an unstamped row sorts
 *  before any stamped one. */
function recencyOf(operation) {
    if (operation.finishedAt !== undefined)
        return operation.finishedAt;
    if (operation.startedAt !== undefined)
        return operation.startedAt;
    return 0;
}
function copyItem(item) {
    return {
        key: item.key,
        kind: item.kind,
        state: item.state,
        ...(item.path === undefined ? {} : { path: item.path }),
        ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
        ...(item.integrity === undefined ? {} : { integrity: item.integrity }),
        ...(item.errorCode === undefined ? {} : { errorCode: item.errorCode }),
        ...(item.detail === undefined ? {} : { detail: item.detail }),
    };
}
function copyResultItem(item) {
    return {
        ...copyItem(item),
        outcome: item.outcome,
    };
}
/** THE BUSY REFUSAL (audit I-S4): startWeightAcquire throws this when
 *  the plane already runs its concurrency cap of fetches. The door
 *  maps it to a 429 with retry_after_ms — a busy plane is a wait, not
 *  a failure. */
export class AcquireBusyError extends Error {
    retryAfterMs = ACQUIRE_BUSY_RETRY_MS;
    constructor(message) {
        super(message);
        this.name = "AcquireBusyError";
    }
}
const ACQUIRE_BUSY_RETRY_MS = 5_000;
/** THE DISK SEAM'S DEFAULT (audit I-S4): the OS's own free-bytes read
 *  for the store root. The config seam exists for tests; production
 *  wiring rides this. */
async function statFsFree(path) {
    const stats = await statfs(path);
    return stats.bavail * stats.bsize;
}
/** THE RE-VERIFY'S PROBE (audit I-S6): existence of a recorded
 *  absolute path — a plain stat on a path THIS service recorded, so
 *  the writer's confinement probe does not apply. Any stat error
 *  reads as absent (the row must not serve present on a probe
 *  failure). */
async function fileExists(path) {
    try {
        return (await stat(path)).isFile();
    }
    catch {
        return false;
    }
}
function copyOperation(operation) {
    return {
        operationId: operation.operationId,
        ref: copyRef(operation.ref),
        state: operation.state,
        items: operation.items.map(copyItem),
        ...(operation.outcome === undefined ? {} : { outcome: operation.outcome }),
        startedAt: operation.startedAt,
        ...(operation.finishedAt === undefined ? {} : { finishedAt: operation.finishedAt }),
        ...(operation.detail === undefined ? {} : { detail: operation.detail }),
    };
}
function copyPlanItem(item) {
    if (item.kind === "model") {
        return {
            kind: "model",
            key: item.key,
            owner: item.owner,
            id: item.id,
            name: item.name,
            folder: item.folder,
            url: item.url,
            ...(item.sha256 === undefined ? {} : { sha256: item.sha256 }),
            ...(item.sizeBytes === undefined ? {} : { sizeBytes: item.sizeBytes }),
            required: item.required,
            provider: item.provider,
            ...(item.variant === undefined ? {} : { variant: item.variant }),
            ...(item.quant === undefined ? {} : { quant: item.quant }),
        };
    }
    return {
        kind: "extension",
        key: item.key,
        id: item.id,
        url: item.url,
        required: item.required,
        provider: item.provider,
        ...(item.ref === undefined ? {} : { ref: item.ref }),
        ...(item.version === undefined ? {} : { version: item.version }),
        ...(item.registry === undefined ? {} : { registry: item.registry }),
        ...(item.requirements === undefined ? {} : { requirements: [...item.requirements] }),
        ...(item.nodeTypes === undefined ? {} : { nodeTypes: [...item.nodeTypes] }),
    };
}
function copyPlan(plan, ref) {
    if (plan === undefined || plan === null || !Array.isArray(plan.items)) {
        throw new Error("declaration port returned an invalid provision plan");
    }
    if (!sameResourceRef(plan.ref, ref)) {
        throw new Error("declaration port returned a plan for a different resource");
    }
    for (const item of plan.items) {
        if (item.kind !== "model" && item.kind !== "extension") {
            throw new Error("declaration port returned an invalid plan item kind");
        }
        if (item.key.trim() === "" || item.provider.trim() === "" || typeof item.required !== "boolean") {
            throw new Error("declaration port returned an incomplete plan item");
        }
        if (item.kind === "model") {
            if (item.name.trim() === "" || item.folder.trim() === "" && item.folder !== "") {
                throw new Error("declaration port returned an invalid model destination");
            }
            if (item.url.trim() === "") {
                throw new Error("declaration port returned an invalid model source");
            }
            if (item.sha256 !== undefined && !/^[0-9a-f]{64}$/i.test(item.sha256)) {
                throw new ItemRefusal("blocked", "artifact/invalid-digest", "declaration port returned a malformed model digest");
            }
            if (item.sizeBytes !== undefined && (!Number.isSafeInteger(item.sizeBytes) || item.sizeBytes < 0)) {
                throw new Error("declaration port returned an invalid model size");
            }
        }
        else if (item.url !== undefined && item.url.trim() === "") {
            throw new Error("declaration port returned an invalid extension source");
        }
        else if (item.url === undefined && (item.registry ?? "").trim() === "" && item.provider !== "local") {
            throw new Error("declaration port returned an extension without a source");
        }
    }
    return {
        ref: copyRef(plan.ref),
        items: plan.items.map(copyPlanItem),
    };
}
function isAbortError(error, signal) {
    return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}
function errorText(error) {
    return error instanceof Error ? error.message : String(error);
}
function refusalFor(error, signal) {
    if (isAbortError(error, signal)) {
        return new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled");
    }
    if (error instanceof ItemRefusal)
        return error;
    if (error instanceof ManagerProviderError) {
        return new ItemRefusal("blocked", `manager/${error.code}`, error.message);
    }
    if (error instanceof ProvisioningError) {
        if (error.code === "invalid-digest" || error.code === "invalid-path") {
            return new ItemRefusal("blocked", error.code, error.message);
        }
        if (error.code === "size-mismatch") {
            return new ItemRefusal("failed", "artifact/size-mismatch", error.message);
        }
        return new ItemRefusal("failed", error.code, error.message);
    }
    return new ItemRefusal("failed", "provisioning/failed", errorText(error));
}
function aggregateState(items) {
    if (items.length === 0)
        return "absent";
    if (items.some((item) => item.state === "blocked"))
        return "blocked";
    if (items.some((item) => item.state === "failed"))
        return "failed";
    // THE CENSUS HONESTY LAW (the anima burn): an unchecked item must
    // lift the whole row to 'unknown' — a row that reads 'active'
    // over an unchecked item invents a health verdict from silence.
    if (items.some((item) => item.state === "unknown"))
        return "unknown";
    if (items.every((item) => item.state === "active"))
        return "active";
    if (items.every((item) => item.state === "restart_required"))
        return "restart_required";
    if (items.some((item) => item.state === "restart_required")) {
        return "installed";
    }
    if (items.some((item) => item.state === "active"))
        return "active";
    return "absent";
}
function aggregateOutcome(items) {
    if (items.some((item) => item.outcome === "cancelled"))
        return "cancelled";
    const failed = items.filter((item) => item.outcome === "failed" || item.outcome === "blocked");
    const succeeded = items.filter((item) => item.outcome === "active" || item.outcome === "restart_required");
    if (failed.length === 0) {
        const allActive = items.every((item) => item.outcome === "active");
        return allActive ? "active" : "restart_required";
    }
    if (succeeded.length === 0) {
        return items.every((item) => item.outcome === "blocked") ? "blocked" : "failed";
    }
    return "partial";
}
function makeResult(ref, operationId, outcome, operationState, items, detail) {
    return {
        operationId,
        ref: copyRef(ref),
        state: outcome,
        outcome,
        operationState,
        items: items.map(copyResultItem),
        restartRequired: outcome === "restart_required" || items.some((item) => item.state === "restart_required"),
        ...(detail === undefined ? {} : { detail }),
    };
}
function relativeArtifactPath(folder, filename) {
    if (filename.trim() === "" || filename.includes("/") || filename.includes("\\") || filename === "." || filename === "..") {
        throw new ItemRefusal("blocked", "artifact/invalid-filename", "model filename must be one path segment");
    }
    if (folder.startsWith("/") || folder.includes("\\") || folder.split("/").some((part) => part === "..")) {
        throw new ItemRefusal("blocked", "artifact/invalid-folder", "model folder must stay under the artifact root");
    }
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    return cleanFolder === "" ? filename : `${cleanFolder}/${filename}`;
}
function itemFailure(item, refusal) {
    return {
        key: item.key,
        kind: item.kind,
        // THE CENSUS HONESTY LAW (the anima burn, 2026-10-20): a
        // cancelled check is the scan's own artifact, never a health
        // verdict — it must wear 'unknown', never 'failed' (the item
        // loop in inspect() lands here BEFORE the reconcile catch, so
        // this seat is the one the burn's red actually rode). The
        // cancelled voice names the scan's budget, same as the loop-top
        // seed — one cause, one spelling.
        state: refusal.outcome === "blocked" ? "blocked" : refusal.outcome === "cancelled" ? "unknown" : "failed",
        outcome: refusal.outcome,
        errorCode: refusal.code,
        detail: refusal.outcome === "cancelled"
            ? "scan incomplete — the check was cut off before it could judge this item"
            : refusal.message,
    };
}
function itemResult(item, state, outcome, values = {}) {
    return {
        key: item.key,
        kind: item.kind,
        state,
        outcome,
        ...values,
    };
}
/** THE F9 TOTAL (the tracker's denominator): the DECL size_bytes
 *  sum across a plan's model rows — 0 when no row declares one.
 *  Real declared bytes, never a guess. */
function planTotal(plan) {
    let total = 0;
    for (const item of plan.items) {
        if (item.kind === "model" && typeof item.sizeBytes === "number")
            total += item.sizeBytes;
    }
    return total;
}
/** The items filter's single spelling (audit of the 34.8GB tracker
 * total, 2026-10-10): every byte-accounting face — the acquire
 * mint's ledger total, the join fill, and executeEnsure's own
 * fetch plan — narrows through the SAME keying the provisioner
 * filters rows by (kind model → name, else id). A narrowed total
 * anywhere else is a second spelling and will drift. */
function narrowPlan(plan, items) {
    if (items === undefined)
        return plan;
    const requested = new Set(items);
    return { ...plan, items: plan.items.filter((item) => requested.has(item.kind === "model" ? item.name : item.id)) };
}
/** THE F9 COUNTED SOURCE (the tracker's numerator): wraps the
 *  fetcher's byte stream and counts every landed chunk — the bytes
 *  the tracker polls are the bytes the writer received. */
function countedSource(source, onBytes) {
    async function* generate() {
        if (source instanceof ReadableStream) {
            const reader = source.getReader();
            try {
                for (;;) {
                    const next = await reader.read();
                    if (next.done)
                        break;
                    if (next.value !== undefined) {
                        onBytes(next.value.byteLength);
                        yield next.value;
                    }
                }
            }
            finally {
                reader.releaseLock();
            }
            return;
        }
        const maybeAsync = source;
        if (typeof maybeAsync[Symbol.asyncIterator] === "function") {
            for await (const chunk of maybeAsync) {
                onBytes(chunk.byteLength);
                yield chunk;
            }
            return;
        }
        for (const chunk of source) {
            onBytes(chunk.byteLength);
            yield chunk;
        }
    }
    return generate();
}
// ── THE PROCESS SEAT (the models seat's namespace pattern —
// comfyui-cordis models/service.ts armModelsSeat/disarmModelsSeat):
// the estate mounts ONE provisioning service per process; in-process
// readers that cannot reach the cordis context (the run gate's
// lane-presence miss in estate-queue cardsLanes) read the armed
// seat's operation ledger directly. The constructor arms, the dispose
// disarms — only the arming holder succeeds, so a stale disposer
// never unseats a newer arm.
let liveSeat;
/** Arm the process seat with one live service.
 * @param service the mounting ProvisioningService.
 * @returns void. */
export function armProvisioningSeat(service) {
    liveSeat = service;
}
/** Disarm the process seat — a no-op unless this service still holds it.
 * @param service the service whose dispose is running.
 * @returns void. */
export function disarmProvisioningSeat(service) {
    if (liveSeat === service)
        liveSeat = undefined;
}
/** The live seat, undefined when no provisioning service is mounted in
 *  this process — a reader without a seat carries no in-flight truth
 *  and answers so, never a fabricated operation.
 * @returns the armed ProvisioningService or undefined.
 * */
export function provisioningSeat() {
    return liveSeat;
}
export class ProvisioningService extends Service {
    declaration;
    writer;
    writerRoot;
    fetcher;
    manager;
    inspector;
    lifecycle;
    operationStore;
    writeGuard;
    operationIdFactory;
    records = new Map();
    locks = new Map();
    /** THE F9 BYTE LEDGER (one map, two readers): operationId ->
     *  live bytes/total. The direct arm counts the fetcher stream as
     *  it lands (real bytes, never an animation); total is the DECL
     *  size_bytes sum. The manage door (acquire_weight) and any
     *  future caller poll progressOf — one ledger, never two. */
    weightProgress = new Map();
    /** Mints that passed the cap check but have not registered their
     *  lock yet (the plan resolve awaits in between) — the cap counts
     *  them with the locks, or concurrent starts all read the same
     *  pre-mint size and overbook the plane (audit verify-batch31
     *  D1). */
    pendingAcquires = 0;
    /** Mints between the synchronous reservation and the lock's
     *  registration, keyed by resource key. A same-key starter that
     *  arrives inside the window parks on the promise and joins the
     *  lock it registers — without this, both starters miss the
     *  registered-lock join and twin-mint one ref (verify R1). */
    pendingMints = new Map();
    weightProgressByRef = new Map();
    diskFree;
    /** THE STALL BUDGET'S VALIDATED FACE (the constructor's read of
     *  ProvisioningConfig.acquireStallTimeoutMs, defaulting to
     *  ACQUIRE_STALL_TIMEOUT_MS). */
    acquireStallTimeoutMs;
    /** THE STALL VOICE SEAT: the watchdog's refusal per operation,
     *  consumed once by the item loop — the abort the refusal rode
     *  would otherwise read as a cancellation at refusalFor, and a
     *  stalled fetch is a FAILURE, never an operator's cancel. */
    stallRefusals = new Map();
    /** THE VERIFY FLOW CLOCK (the 100%-then-FAILED burn, 2026-10-20):
     *  last epoch ms the writer's verify heartbeat fired per operation.
     *  Hashing a multi-GB part flows for tens of seconds with zero
     *  stream movement — the watchdog's clock rides THIS alongside the
     *  stream bytes, or it murders every complete download. Deleted on
     *  the watchdog's disarm (every exit path), never a leak. */
    verifyFlowAt = new Map();
    constructor(ctx, config) {
        super(ctx, "provisioning");
        if (config === undefined || config.declaration === undefined) {
            throw new Error("provisioning requires a DeclarationPort");
        }
        this.declaration = config.declaration;
        this.writer = config.artifactWriter ?? (config.storeRoot === undefined ? undefined : new VerifiedArtifactWriter(config.storeRoot));
        this.writerRoot = config.storeRoot ?? config.artifactWriter?.root ?? "";
        this.fetcher = config.fetcher;
        this.manager = config.manager;
        this.inspector = config.inspector;
        this.lifecycle = config.lifecycle;
        this.operationStore = config.operationStore;
        this.diskFree = config.diskFree ?? statFsFree;
        this.writeGuard = config.writeGuard ?? (() => true);
        this.operationIdFactory = config.operationIdFactory ?? newOperationId;
        // THE STALL BUDGET'S CONFIG FACE (validated, never silently
        // defaulted — the manager-client's positiveInteger law): a
        // misconfigured budget fails loud at construction.
        const stallMs = config.acquireStallTimeoutMs ?? ACQUIRE_STALL_TIMEOUT_MS;
        if (!Number.isInteger(stallMs) || stallMs <= 0) {
            throw new Error("acquireStallTimeoutMs must be a positive integer (milliseconds)");
        }
        this.acquireStallTimeoutMs = stallMs;
        armProvisioningSeat(this);
        this.ctx.effect(() => async () => {
            disarmProvisioningSeat(this);
            const operations = [...this.locks.values()];
            for (const operation of operations)
                operation.controller.abort();
            await Promise.allSettled(operations.map((operation) => operation.promise));
        }, "provisioning.lifecycle");
        // THE PART REAPER (audit K-4, 2026-10-22): a crash mid-download
        // orphans the writer's .part sidecar past every catch — the
        // boot sweep and the periodic sweep unlink the stale ones. A
        // failed sweep never takes the seat down; the next tick retries.
        if (this.writer instanceof VerifiedArtifactWriter) {
            const writer = this.writer;
            this.ctx.effect(() => {
                const sweep = () => {
                    void writer.reapStaleParts().catch(() => undefined);
                };
                sweep();
                const ticker = setInterval(sweep, PART_REAP_INTERVAL_MS);
                return () => {
                    clearInterval(ticker);
                };
            }, "provisioning.part-reaper");
        }
        // THE PROGRESS REHYDRATE (audit E3, 2026-10-22): the weight
        // ledger is in-memory, so a restart orphaned every in-flight
        // acquire — the tracker polled null while the store still held
        // the row. Stores that can enumerate seed the ledger at boot.
        const store = this.operationStore;
        if (store?.list !== undefined) {
            this.ctx.effect(() => {
                void store.list().then((operations) => {
                    // POINTER RECENCY, SCOPED TO THE BOOT SEED (P5 F2): two
                    // stored rows can share one ref (acquire, then retry, then
                    // restart) — the by-ref pointer must answer the LATEST row,
                    // not whichever the store lists last. Oldest seeds first so
                    // the latest wins the pointer; live starts after boot
                    // overwrite it through the normal path. Best-effort by
                    // (finishedAt ?? startedAt); an unstamped row seeds first.
                    const seed = [...operations].sort((a, b) => recencyOf(a) - recencyOf(b));
                    for (const operation of seed)
                        this.rehydrateProgress(operation);
                }).catch((error) => {
                    // a poisoned row or an unreadable store degrades to an
                    // empty ledger, named in the log — the boot never blocks
                    this.ctx.logger.error(error instanceof Error ? error : new Error(String(error)));
                });
                return () => undefined;
            }, "provisioning.progress-rehydrate");
        }
    }
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
    rehydrateProgress(operation) {
        if (this.weightProgress.has(operation.operationId))
            return;
        // a dead pre-restart row never touches a ref whose operation is
        // LIVE in this process — the pointer and the row belong to the
        // live fetch, not the remnant (verify R4)
        const live = this.locks.get(resourceKey(operation.ref));
        if (live !== undefined && live.id !== operation.operationId)
            return;
        const inFlight = operation.finishedAt === undefined &&
            (operation.state === "acquiring" || operation.state === "verifying");
        if (!inFlight) {
            if (operation.finishedAt === undefined)
                return;
            // THE NO-RE-MINT MEMORY REJOINS (the restart's dedupe seat): a
            // settled stored row becomes the record's settled operation
            // again, so a post-restart accept dedupes onto ITS id (the boot
            // seed walks oldest-first — the newest row for the ref wins,
            // the same recency law the ledger pointer rides).
            this.record(operation.ref).operation = copyOperation(operation);
            this.weightProgress.set(operation.operationId, {
                operationId: operation.operationId,
                ref: copyRef(operation.ref),
                state: operation.state,
                bytes: 0,
                total: 0,
                detail: operation.detail,
            });
            this.weightProgressByRef.set(resourceKey(operation.ref), operation.operationId);
            return;
        }
        const detail = operation.detail === undefined
            ? "the seat restarted before this fetch landed — start it again"
            : `${operation.detail} — the seat restarted before the fetch landed`;
        this.weightProgress.set(operation.operationId, {
            operationId: operation.operationId,
            ref: copyRef(operation.ref),
            state: "failed",
            bytes: 0,
            total: 0,
            detail,
        });
        this.weightProgressByRef.set(resourceKey(operation.ref), operation.operationId);
    }
    stateOf(ref) {
        return this.record(ref).state;
    }
    operationOf(ref) {
        const operation = this.record(ref).operation;
        return operation === undefined ? undefined : copyOperation(operation);
    }
    /** THE TRUST RE-VERIFY (audit I-S6, 2026-10-22): an external
     *  operation's persisted row is served by status reads, and the
     *  row used to trust its own landing — a file deleted after the
     *  fetch kept serving "active". This re-stats every recorded model
     *  path (existence only: the operator-confirmed semantic is that
     *  the bytes' SHA-256 is unverified) and demotes a missing path to
     *  absent, naming the operation and the gone path. Declared rows
     *  are not this method's subject — inspect() owns them. */
    async verifyOperation(operation) {
        const items = [];
        let missing = false;
        for (const item of operation.items) {
            if (item.kind !== "model" || item.path === undefined || item.state !== "active" || await fileExists(item.path)) {
                items.push(item);
                continue;
            }
            missing = true;
            items.push({
                ...item,
                state: "absent",
                detail: "the recorded path is gone (" + item.path + ") — operation " +
                    operation.operationId + " landed bytes that no longer exist; run the download again",
            });
        }
        if (!missing)
            return operation;
        return { ...operation, state: "absent", items };
    }
    transitionsOf(ref) {
        return [...this.record(ref).history];
    }
    isLocked(ref) {
        return this.locks.has(resourceKey(ref));
    }
    /** THE STALL BUDGET'S READ FACE (P5 F1's wall seat): the validated
     *  budget the watchdog enforces — the composition's pass-through
     *  lands here, and the deployment wall reads it back. Never the
     *  constant: an operator-tuned window answers tuned. */
    stallBudgetMs() {
        return this.acquireStallTimeoutMs;
    }
    /** THE F9 PROGRESS READ (the tracker's poll): a copy of the live
     *  byte ledger for one operation id, null when unknown. Bytes are
     *  counted as the fetcher stream lands — real landed bytes, never
     *  an animation. */
    progressOf(operationId) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined)
            return null;
        return { ...entry, ref: copyRef(entry.ref) };
    }
    /** THE F9 REF READ (the tracker's poll by model): the live entry
     *  for one ref, null when no acquisition has started for it. */
    progressOfRef(ref) {
        const id = this.weightProgressByRef.get(resourceKey(ref));
        if (id === undefined)
            return null;
        return this.progressOf(id);
    }
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
    inflightAcquires() {
        const names = [];
        const seen = new Set();
        for (const [key, lock] of this.locks) {
            seen.add(key);
            names.push(key + " (operation " + lock.id + ")");
        }
        for (const key of this.pendingMints.keys()) {
            if (seen.has(key))
                continue;
            names.push(key + " (minting)");
        }
        return names;
    }
    /** THE F9 START (one door's background arm): starts the fetch for
     *  one ref WITHOUT awaiting the landing and returns its operation
     *  id at once — the tracker polls progressOf. A second start while
     *  the first is locked returns the FIRST id (one fetch, never two;
     *  runLocked's join law). The fetch itself rides executeEnsure
     *  (the existing fetcher — no second fetcher). */
    async startWeightAcquire(ref, options = {}) {
        const key = resourceKey(ref);
        const locked = this.locks.get(key);
        if (locked !== undefined) {
            await this.fillJoinProgress(locked.id, ref, options?.items);
            return locked.id;
        }
        // THE PRE-LOCK WINDOW (verify R1): the join above cannot see a
        // mint whose plan resolve is still in flight — its lock only
        // registers after the await. A same-key starter parks on the
        // mint's promise and joins the lock it registers; two
        // concurrent same-key starts mint exactly one fetch.
        const inflight = this.pendingMints.get(key);
        if (inflight !== undefined) {
            const mintedId = await inflight;
            const joined = this.locks.get(key);
            if (joined !== undefined && joined.id === mintedId) {
                await this.fillJoinProgress(mintedId, ref, options?.items);
                return mintedId;
            }
            // the minted operation settled terminal and released before
            // this joiner woke — fall through and mint fresh
        }
        // THE CONCURRENCY CAP (audit I-S4): the same-key join and the
        // pre-lock park above are never a second slot; a NEW ref past
        // the cap refuses busy. The blocking doors do not refuse —
        // their callers await the fetch inside their own deadline-
        // bounded request and join locks per-ref; the cap guards the
        // unawaited minter, where N callers would otherwise mint N
        // background fetches.
        if (this.locks.size + this.pendingAcquires >= MAX_CONCURRENT_ACQUIRES) {
            throw new AcquireBusyError(`the estate already runs ${String(this.locks.size + this.pendingAcquires)} weight acquisitions (cap ${String(MAX_CONCURRENT_ACQUIRES)}) — poll the live operation or wait for one to settle`);
        }
        // the slot is reserved SYNCHRONOUSLY, before the plan resolve's
        // await — concurrent starts must each see the prior reservation,
        // or N simultaneous starts all read the same pre-mint lock size
        // and overbook the plane (verify-batch31 D1). On the mint the
        // registered lock owns the slot; any refusal inside the mint
        // releases it in the finally.
        this.pendingAcquires += 1;
        let settleMint;
        let refuseMint;
        const mint = new Promise((resolve, reject) => {
            settleMint = resolve;
            refuseMint = reject;
        });
        this.pendingMints.set(key, mint);
        let id = "";
        try {
            let total = 0;
            // THE NO-RE-MINT COVERAGE ASK: undefined = the whole plan is the
            // ask (every settled item must be verified); an array = the
            // named subset's plan keys; null = the plan would not resolve,
            // so no coverage can be proven and the dedupe skips.
            let wantedKeys = options?.items === undefined ? undefined : null;
            try {
                const plan = await this.plan(ref);
                const narrowed = narrowPlan(plan, options?.items);
                total = planTotal(narrowed);
                wantedKeys = narrowed.items.map((item) => item.key);
            }
            catch {
                total = 0;
            }
            // THE NO-RE-MINT LAW (the popup loop's third duplicate, burn
            // 2026-11-09/10 — ops cd085c9b, 9dfe1a72, f634607f minted for
            // ONE sha-verified VAE): an accept against a weight an
            // already-settled op covers returns the EXISTING operation id.
            // A settled FAILED op never covers (the retry law, ARM 5);
            // a discarded or evicted row covers nothing (the delete exit).
            const settledId = this.settledCoverageId(key, wantedKeys);
            if (settledId !== undefined) {
                // parked same-key joiners must wake: the mint answers the
                // settled id, the joiner's lock check finds none, and its own
                // mint path converges on this same dedupe
                settleMint(settledId);
                return settledId;
            }
            id = this.operationIdFactory();
            this.weightProgress.set(id, {
                operationId: id,
                ref: copyRef(ref),
                state: "acquiring",
                bytes: 0,
                total,
                // every flight opens checking the store — the re-check voice
                // is seeded before the fetch arms take over with their own
                phase: "recheck",
            });
            this.weightProgressByRef.set(key, id);
            void this.runWithId(ref, id, async (operationId, operationSignal) => await this.executeEnsure(ref, options, operationId, operationSignal)).then((result) => {
                this.stallRefusals.delete(id);
                const current = this.weightProgress.get(id);
                if (current !== undefined) {
                    const landed = current.total > 0 &&
                        (result.state === "active" || result.state === "restart_required")
                        ? current.total
                        : current.bytes;
                    this.weightProgress.set(id, {
                        ...current,
                        state: result.operationState,
                        bytes: landed,
                        ...(result.detail === undefined ? {} : { detail: result.detail }),
                    });
                }
                this.evictSettledAcquires();
            }).catch((error) => {
                this.stallRefusals.delete(id);
                const current = this.weightProgress.get(id);
                if (current !== undefined) {
                    this.weightProgress.set(id, {
                        ...current,
                        state: "failed",
                        detail: error instanceof Error ? error.message : String(error),
                    });
                }
                this.evictSettledAcquires();
            });
            // the lock is registered (synchronous, inside runWithId) —
            // parked same-key joiners may now join it
            settleMint(id);
        }
        catch (error) {
            // a refused mint answers its parked joiners with the same
            // refusal — no joiner is left stranded on a dead promise
            refuseMint(error);
            throw error;
        }
        finally {
            // the reservation releases in every exit: by the time the lock
            // is registered (synchronous, inside runWithId) it owns the
            // slot and counts in locks.size; a refused mint owns nothing
            this.pendingAcquires -= 1;
            if (this.pendingMints.get(key) === mint)
                this.pendingMints.delete(key);
        }
        return id;
    }
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
    settledCoverageId(key, wantedKeys) {
        if (wantedKeys === null)
            return undefined;
        const operation = this.records.get(key)?.operation;
        if (operation === undefined || operation.finishedAt === undefined)
            return undefined;
        if (operation.outcome !== "active" && operation.outcome !== "restart_required")
            return undefined;
        const verified = (item) => (item.state === "active" || item.state === "restart_required") &&
            (item.integrity === "declared-sha256" || item.integrity === "size-checked");
        if (wantedKeys === undefined) {
            if (!operation.items.every(verified))
                return undefined;
        }
        else {
            if (wantedKeys.length === 0)
                return undefined;
            const byKey = new Map(operation.items.map((item) => [item.key, item]));
            for (const want of wantedKeys) {
                const item = byKey.get(want);
                if (item === undefined || !verified(item))
                    return undefined;
            }
        }
        return operation.operationId;
    }
    /** THE JOIN FILL (verify R3): the joiner tops the ledger up only
     *  where the live entry lacks. The row is re-read AFTER the plan
     *  resolve — a concurrent executeEnsure seed may have counted
     *  bytes in between, and a join never resets them. The items
     *  filter narrows the total with the joiner's own ask (the
     *  join law: the ledger total follows the fetch that runs). */
    async fillJoinProgress(operationId, ref, items) {
        let total = 0;
        try {
            const plan = await this.plan(ref);
            total = planTotal(narrowPlan(plan, items));
        }
        catch {
            total = 0;
        }
        const current = this.weightProgress.get(operationId);
        if (current !== undefined) {
            if (current.total === 0 && total > 0) {
                this.weightProgress.set(operationId, { ...current, total });
            }
            return;
        }
        this.weightProgress.set(operationId, {
            operationId,
            ref: copyRef(ref),
            state: "acquiring",
            bytes: 0,
            total,
            // the join rides the same opening voice as a fresh mint
            phase: "recheck",
        });
        this.weightProgressByRef.set(resourceKey(ref), operationId);
    }
    /** The background-start run: a preset id (the caller returns it
     *  synchronously) with no caller signal — the operation owns its
     *  own controller alone. */
    async runWithId(ref, presetId, body, key = resourceKey(ref)) {
        const existing = this.locks.get(key);
        if (existing !== undefined)
            return await this.joinLocked(ref, existing);
        const controller = new AbortController();
        const operationSignal = controller.signal;
        let promise;
        promise = Promise.resolve()
            .then(() => body(presetId, operationSignal))
            .catch((error) => this.completeUnstarted(ref, presetId, error, operationSignal))
            .finally(() => {
            this.locks.delete(key);
        });
        this.locks.set(key, { id: presetId, controller, promise });
        return await promise;
    }
    async plan(ref) {
        return copyPlan(await this.declaration.resolve(ref), ref);
    }
    async inspect(ref, signal) {
        const key = resourceKey(ref);
        const locked = this.locks.get(key);
        if (locked !== undefined) {
            // THE LIVE-ROW DOOR (audit download-stack-audit-2026-10-20 F10,
            // last remainder): a LOCKED row resolves to the LIVE ledger
            // snapshot — state/bytes/total/phase/operation_id — WITHOUT
            // awaiting the flight's settle. The old path joined the lock
            // (joinLocked below): the scan blocked on a multi-GB download,
            // the status budget ate the row, and the sidebar froze every
            // mid-flight family at its last settled state. The live row's
            // additive fields are the face's progress line; a settled row
            // never carries them (the additive-fields law).
            const progress = this.progressOfRef(ref);
            if (progress !== null && progress.operationId === locked.id) {
                return {
                    ref: copyRef(ref),
                    state: progress.state,
                    operationId: progress.operationId,
                    bytes: progress.bytes,
                    total: progress.total,
                    ...(progress.phase === undefined ? {} : { phase: progress.phase }),
                    ...(progress.detail === undefined ? {} : { detail: progress.detail }),
                    items: [],
                };
            }
            // THE PRE-SEED WINDOW: the lock is held but the ledger has no
            // row yet (the plan is still resolving) — an honest arming row
            // names the operation and invents no numbers. Never a hang,
            // never a join, never invented bytes.
            return {
                ref: copyRef(ref),
                state: "acquiring",
                operationId: locked.id,
                items: [],
            };
        }
        let plan;
        try {
            plan = await this.plan(ref);
        }
        catch (error) {
            const refusal = refusalFor(error, signal);
            // THE CENSUS HONESTY LAW AT THE PLAN DOOR (audit
            // infra-census V1, 2026-10-20): a cancelled plan resolution
            // is the scan's own artifact, never a health verdict — the
            // row wore 'failed' with items [] over ZERO checked bytes
            // and the census_partial mark never fired. The plan door
            // rides the same law as the item door: cancelled → 'unknown'
            // with the scan's budget voice; the plan never resolved, so
            // there is no item roster to seat.
            const state = refusal.outcome === "blocked"
                ? "blocked"
                : refusal.outcome === "cancelled" ? "unknown" : "failed";
            this.move(ref, undefined, state);
            return {
                ref: copyRef(ref),
                state,
                items: [],
                detail: refusal.outcome === "cancelled"
                    ? "scan incomplete — this resource's plan was cut off before any item was checked"
                    : refusal.message,
            };
        }
        const items = [];
        for (const item of plan.items) {
            if (isAbortError(undefined, signal)) {
                // THE CENSUS HONESTY LAW, ITEM LEVEL (audit
                // infra-resources-census-honesty F1, 2026-10-20: the abort
                // law stopped at the REF boundary — this break truncated the
                // row's item list and aggregateState invented a verdict over
                // unchecked bytes: a 2-item family read 'active' with items
                // 2→1, a post-plan cut read 'absent' with zero items, and
                // no 'unknown' anywhere meant census_partial never fired).
                // The ref-level law mirrored one level down: every item the
                // scan did not check rides an 'unknown' item row — the
                // roster stays item-complete, the aggregate lifts the row to
                // 'unknown' (unless a checked item already failed — that
                // verdict is real and stands, the partial mark rides the
                // item), and no verdict is invented from silence.
                items.push(itemResult(item, "unknown", "cancelled", {
                    detail: "scan incomplete — this item was not checked before the status budget closed",
                }));
                continue;
            }
            try {
                items.push(await this.inspectPlanItem(item, signal));
            }
            catch (error) {
                const refusal = refusalFor(error, signal);
                items.push(itemFailure(item, refusal));
            }
        }
        const state = aggregateState(items.map((item) => ({ ...item, outcome: stateOutcome(item.state) })));
        this.move(ref, undefined, state);
        const operationId = this.record(ref).operation?.operationId;
        return {
            ref: copyRef(ref),
            state,
            ...(operationId === undefined ? {} : { operationId }),
            // THE CENSUS HONESTY LAW (the anima burn): an unknown row
            // names its own cause at the row level — the scan's budget,
            // never a health verdict.
            ...(state === "unknown" ? { detail: "scan incomplete — the check was cut off before it could judge this resource" } : {}),
            items: items.map(copyItem),
        };
    }
    async ensure(ref, options = {}, signal) {
        return await this.runLocked(ref, signal, async (operationId, operationSignal) => await this.executeEnsure(ref, options, operationId, operationSignal));
    }
    async activate(ref, options = {}, signal) {
        return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
            this.begin(ref, operationId);
            let plan;
            try {
                plan = await this.plan(ref);
            }
            catch (error) {
                return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
            }
            if (plan.items.length === 0) {
                return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), operationSignal));
            }
            if (ref.kind === "model") {
                const inspected = [];
                for (const item of plan.items) {
                    try {
                        inspected.push(await this.inspectPlanItem(item, operationSignal));
                    }
                    catch (error) {
                        const refusal = refusalFor(error, operationSignal);
                        inspected.push(itemFailure(item, refusal));
                    }
                }
                const result = makeResult(ref, operationId, aggregateOutcome(inspected), aggregateState(inspected), inspected);
                return this.complete(ref, operationId, result);
            }
            if (this.manager === undefined) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
            }
            const inspection = this.manager.inspect === undefined
                ? undefined
                : await this.manager.inspect(ref.id, operationSignal).catch((error) => {
                    throw new ItemRefusal("failed", "manager/inspect-failed", errorText(error));
                });
            if (inspection !== undefined && inspection.installed) {
                this.move(ref, operationId, "installed");
                const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
                return this.complete(ref, operationId, activated);
            }
            const ensured = await this.executeEnsure(ref, {}, operationId, operationSignal, true);
            if (ensured.state !== "restart_required" && ensured.state !== "active")
                return ensured;
            const activated = await this.activateExtension(ref, plan, operationId, operationSignal, options);
            return this.complete(ref, operationId, activated);
        });
    }
    async acquireExternal(request, options = { operatorConfirmed: false }, signal) {
        // THE EXTERNAL IDENTITY LAW (verify R2): one record per URL. The
        // old generic shared ref locked per-URL but keyed the record,
        // ledger row, and ByRef pointer by the SHARED id — two
        // concurrent external URLs flapped one record's state. The id
        // carries the url, so lock, record, and pointer all name the
        // same per-URL identity.
        const externalId = "external:" + request.url;
        const ref = request.kind === "model"
            ? { kind: "model", owner: "card", id: externalId }
            : { kind: "extension", id: externalId };
        return await this.runLocked(ref, signal, async (operationId, operationSignal) => {
            this.begin(ref, operationId);
            if (!this.writeGuard()) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
            }
            if (options.operatorConfirmed !== true) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "external/not-confirmed", "external acquisition requires operator confirmation"));
            }
            // THE EXTERNAL LEDGER SEED (audit F4, the F10 seats slice): the
            // external seats' flights were invisible to the poll — no
            // weightProgress row existed, so the queue voice below wrote to
            // nothing and the tracker had no window on the flight at all.
            // One row per external flight, the same seed the blocking path
            // uses; the drain's own hook re-voices it per queue poll.
            if (!this.weightProgress.has(operationId)) {
                this.weightProgress.set(operationId, {
                    operationId,
                    ref: copyRef(ref),
                    state: "acquiring",
                    bytes: 0,
                    total: request.kind === "model" ? request.sizeBytes ?? 0 : 0,
                    // the external seat's first live flow is the Manager queue
                    phase: "queue",
                });
                this.weightProgressByRef.set(resourceKey(ref), operationId);
            }
            if (request.kind === "model") {
                if (this.writer?.inspect === undefined) {
                    return this.complete(ref, operationId, this.blockedResult(ref, operationId, "artifact/inspect-unavailable", "external model acquisition requires the configured model store inspector"));
                }
                if (this.manager?.installModel === undefined) {
                    return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/model-unavailable", "external model acquisition requires ComfyUI-Manager model installation"));
                }
                try {
                    const filename = request.filename ?? "download.bin";
                    // THE DEFAULT-FOLDER LAW (audit T-S5, 2026-10-22): an
                    // omitted (or empty) relativePath means "checkpoints" —
                    // the manage door's own default. "" meant store-root to
                    // the verifier below but the Manager's own save-path map
                    // sends "" to "default" — bytes landed one directory over
                    // from where inspect probed.
                    const folder = request.relativePath === undefined || request.relativePath === "" ? "checkpoints" : request.relativePath;
                    const relativePath = relativeArtifactPath(folder, filename);
                    const parts = relativePath.split("/");
                    const landedName = parts[parts.length - 1];
                    const landedFolder = parts.slice(0, -1).join("/");
                    // THE DRAIN VOICE (audit F4): the external seat drains the
                    // same Manager queue — the same acquiring/queue voice as
                    // the declared arm, re-voiced once per queue status poll
                    // through the hook below (the seed above opens the word;
                    // nothing clobbers it mid-drain except the drain itself).
                    this.move(ref, operationId, "acquiring");
                    this.voicePhase(operationId, "queue");
                    const installed = await this.manager.installModel({
                        id: relativePath,
                        name: landedName,
                        savePath: landedFolder,
                        url: request.url,
                        filename: landedName,
                        // T-E2: same law as the declared arm — the declared size
                        // scales the manager queue's drain budget.
                        ...(request.sizeBytes === undefined ? {} : { sizeBytes: request.sizeBytes }),
                        // THE DRAIN HEARTBEAT (audit F4, the external seat): each
                        // queue poll re-voices the ledger's queue phase, so the
                        // download_model flight moves on the poll exactly like a
                        // declared one.
                        onQueueStatus: () => { this.voicePhase(operationId, "queue"); },
                    }, operationSignal);
                    if (!installed.installed) {
                        throw new ItemRefusal("failed", "manager/model-install-failed", installed.detail ?? "ComfyUI-Manager did not install the model");
                    }
                    this.voicePhase(operationId, "recheck", "verifying");
                    const landed = await this.writer.inspect({
                        root: this.writerRoot,
                        relativePath,
                        ...(request.sha256 === undefined ? {} : { expectedSha256: request.sha256 }),
                    }, operationSignal);
                    if (!landed.present) {
                        throw new ItemRefusal("failed", landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch", landed.sha256 === undefined
                            ? "ComfyUI-Manager queue completed but the requested model path is absent"
                            : "ComfyUI-Manager landed bytes that do not match the requested SHA-256");
                    }
                    if (request.sizeBytes !== undefined && landed.sizeBytes !== request.sizeBytes) {
                        throw new ItemRefusal("failed", "artifact/size-mismatch", `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(request.sizeBytes)}`);
                    }
                    this.move(ref, operationId, "installed");
                    const result = itemResult({ kind: "model", key: operationId, owner: "card", id: "external-model", name: relativePath, folder: "", url: request.url, sha256: request.sha256, required: true, provider: "external" }, "active", "active", {
                        path: landed.path,
                        sha256: landed.sha256,
                        integrity: request.sha256 === undefined ? "operator-unverified" : "declared-sha256",
                    });
                    return this.complete(ref, operationId, makeResult(ref, operationId, "active", "active", [result]));
                }
                catch (error) {
                    return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
                }
            }
            if (this.manager === undefined) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "manager/unavailable", "no ManagerPort is configured"));
            }
            try {
                // THE DRAIN VOICE (audit F4, the external extension seat):
                // the same live ledger row + queue heartbeat as every other
                // Manager-side arm — the install_extension_url flight moves
                // on the poll instead of sitting silent for its whole drain.
                this.voicePhase(operationId, "queue");
                const result = await this.manager.install({
                    id: ref.id,
                    url: request.url,
                    ...(request.ref === undefined ? {} : { ref: request.ref }),
                    onQueueStatus: () => { this.voicePhase(operationId, "queue"); },
                }, operationSignal);
                if (!result.installed)
                    throw new ItemRefusal("failed", "manager/install-failed", result.detail ?? "manager did not install the extension");
                const landed = await this.verifyLanded(ref.id, operationSignal);
                this.move(ref, operationId, landed === "active" ? "active" : "installed");
                const item = itemResult({ kind: "extension", key: operationId, id: ref.id, url: request.url, required: true, provider: "external" }, landed, landed === "active" ? "active" : "restart_required", result.detail === undefined ? {} : { detail: result.detail });
                return this.complete(ref, operationId, makeResult(ref, operationId, landed, landed === "active" ? "active" : "restart_required", [item]));
            }
            catch (error) {
                return this.complete(ref, operationId, this.failureResult(ref, operationId, error, operationSignal));
            }
        });
    }
    async reconcile(ref, signal) {
        if (ref !== undefined)
            return [await this.inspect(ref, signal)];
        if (this.declaration.list === undefined)
            return [];
        const refs = await this.declaration.list();
        const statuses = [];
        for (const item of refs) {
            if (isAbortError(undefined, signal)) {
                // THE CENSUS HONESTY LAW (the anima burn, 2026-10-20: the
                // sidebar read "Declared resources 1/1 failed — model
                // family/anima" while every anima file sat byte-exact on
                // disk): an aborted census NEVER truncates and NEVER fails —
                // every ref it did not inspect rides an 'unknown' row (the
                // scan's own artifact), so the roster stays row-complete,
                // the consumer can mark the census partial, and no health
                // verdict is invented from a timeout.
                statuses.push({
                    ref: copyRef(item),
                    state: "unknown",
                    items: [],
                    detail: "scan incomplete — this resource was not checked before the status budget closed",
                });
                continue;
            }
            try {
                statuses.push(await this.inspect(item, signal));
            }
            catch (error) {
                const refusal = refusalFor(error, signal);
                if (refusal.outcome === "cancelled") {
                    // a mid-abort inspect throw is the SAME artifact: unknown,
                    // never 'failed' (the burn's exact shape — a cancelled
                    // check wearing the failed token)
                    statuses.push({
                        ref: copyRef(item),
                        state: "unknown",
                        items: [],
                        detail: "scan incomplete — the check was cut off before it could judge this resource",
                    });
                    continue;
                }
                statuses.push({
                    ref: copyRef(item),
                    state: refusal.outcome === "blocked" ? "blocked" : "failed",
                    items: [],
                    detail: refusal.message,
                });
            }
        }
        return statuses;
    }
    async executeEnsure(ref, options, operationId, signal, alreadyBegun = false) {
        if (!alreadyBegun)
            this.begin(ref, operationId);
        if (!this.writeGuard()) {
            return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/byo", "this endpoint is read-only for estate provisioning"));
        }
        let plan;
        try {
            plan = await this.plan(ref);
        }
        catch (error) {
            return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
        }
        if (options.items !== undefined) {
            plan = narrowPlan(plan, options.items);
            if (plan.items.length === 0) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/item-not-found", "requested provision item is not declared"));
            }
        }
        if (plan.items.length === 0) {
            return this.complete(ref, operationId, this.failureResult(ref, operationId, new Error("resource has no provision plan items"), signal));
        }
        // THE DISK ADMISSION GATE (audit I-S4): the plan's declared bytes
        // are checked against the store root's free space BEFORE any
        // fetch, so a too-big plan refuses up front with the honest
        // need/have voice instead of failing mid-stream per item. A plan
        // without declared sizes or a seatless root skips the gate (the
        // writer's own landed checks still hold).
        const totalBytes = planTotal(plan);
        if (totalBytes > 0 && this.writerRoot !== "") {
            // a probe failure is no answer, never a refusal: the gate skips
            // and the writer's own landed checks still hold
            let freeBytes;
            try {
                freeBytes = await this.diskFree(this.writerRoot);
            }
            catch {
                freeBytes = undefined;
            }
            if (freeBytes !== undefined && freeBytes - totalBytes < DISK_FLOOR_BYTES) {
                return this.complete(ref, operationId, this.blockedResult(ref, operationId, "provisioning/insufficient-disk", `the plan needs ${String(totalBytes)} bytes but the store root has ${String(freeBytes)} available (reserving ${String(DISK_FLOOR_BYTES)}) — free space or narrow the request`));
            }
        }
        // THE F9 LEDGER SEED (the tracker's denominator): the blocking
        // ensure path never passes through startWeightAcquire, so the
        // entry must exist here too — total is the DECL sum, bytes 0.
        // A background start already seeded it; that entry wins.
        if (!this.weightProgress.has(operationId)) {
            this.weightProgress.set(operationId, {
                operationId,
                ref: copyRef(ref),
                state: "acquiring",
                bytes: 0,
                total: planTotal(plan),
                // the blocking path opens on the same re-check voice
                phase: "recheck",
            });
            this.weightProgressByRef.set(resourceKey(ref), operationId);
        }
        const items = [];
        let cancelled = false;
        // THE STALL VOICE (the watchdog's word): set when this operation's
        // item failure IS the stall — carried onto the result so both the
        // ledger row and the settle faces name the freeze, never a bare
        // "cancelled".
        let stallVoice;
        for (const item of plan.items) {
            if (signal.aborted) {
                cancelled = true;
                items.push(itemFailure(item, new ItemRefusal("cancelled", "provisioning/cancelled", "operation cancelled")));
                continue;
            }
            try {
                this.move(ref, operationId, item.kind === "model" ? "acquiring" : "acquiring");
                items.push(await this.acquirePlanItem(ref, item, operationId, signal));
            }
            catch (error) {
                // the stall refusal wins over refusalFor: the watchdog aborts
                // the stream it fails, and that abort must not re-read the
                // failure as the operator's cancel
                const stall = this.takeStallRefusal(operationId);
                const refusal = stall ?? refusalFor(error, signal);
                if (stall !== undefined)
                    stallVoice = stall.message;
                if (stall === undefined && refusal.outcome === "cancelled")
                    cancelled = true;
                items.push(itemFailure(item, refusal));
            }
        }
        let outcome = aggregateOutcome(items);
        if (stallVoice !== undefined) {
            // the watchdog's abort is the stall's own teardown, not an
            // operator's cancel — the aggregate (failed) stands
        }
        else if (cancelled || signal.aborted) {
            outcome = "cancelled";
        }
        const operationState = outcome === "cancelled" ? "failed" : aggregateState(items);
        let result = makeResult(ref, operationId, outcome, operationState, items);
        if (stallVoice !== undefined)
            result = { ...result, detail: stallVoice };
        if (options.activate === true || options.activateIfIdle === true) {
            if (ref.kind === "extension" && (outcome === "active" || outcome === "restart_required")) {
                result = await this.activateExtension(ref, plan, operationId, signal, {
                    ...(options.force === undefined ? {} : { force: options.force }),
                    ifIdle: options.activateIfIdle === true,
                });
            }
        }
        return this.complete(ref, operationId, result);
    }
    async acquirePlanItem(ref, item, operationId, signal) {
        if (item.kind === "model")
            return await this.acquireModel(ref, item, operationId, signal);
        // THE PROVIDER ARM (the contract's vocabulary): `local` verifies
        // in place. A token with no arm is REFUSED BY NAME — it used to
        // fall through to the Manager, so a "git" item on a lane with no
        // Manager refused "manager/unavailable" while a git provider sat
        // right there (the audit's C4).
        if (!providerOk(item.provider)) {
            throw new ItemRefusal("blocked", "extension/unknown-provider", unknownProviderRefusal(item.provider));
        }
        if (item.provider === "local") {
            if (this.inspector === undefined) {
                throw new ItemRefusal("blocked", "extension/inspect-unavailable", "local extension requires an engine inspector");
            }
            const inspection = await this.inspector.inspect(ref, signal);
            if (!inspection.active) {
                throw new ItemRefusal("blocked", "extension/not-active", inspection.detail ?? "local extension is not active on the engine");
            }
            return itemResult(item, "active", "active", inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        if (this.manager === undefined) {
            throw new ItemRefusal("blocked", "manager/unavailable", "no ManagerPort is configured");
        }
        const request = {
            id: item.id,
            url: item.url,
            ...(item.ref === undefined ? {} : { ref: item.ref }),
            ...(item.version === undefined ? {} : { version: item.version }),
            ...(item.registry === undefined ? {} : { registry: item.registry }),
            ...(item.requirements === undefined ? {} : { requirements: item.requirements }),
            ...(item.nodeTypes === undefined ? {} : { nodeTypes: item.nodeTypes }),
            // THE DRAIN HEARTBEAT (audit F4, the extension arm): the
            // declared extension drain re-voices the seeded ledger row's
            // queue phase once per status poll — the flight moves on the
            // poll instead of sitting on its opening stamp for the drain.
            onQueueStatus: () => { this.voicePhase(operationId, "queue"); },
        };
        if (this.manager.canInstall !== undefined) {
            const canInstall = await this.manager.canInstall(request, signal);
            if (!canInstall)
                throw new ItemRefusal("blocked", "manager/pin-mismatch", "manager cannot honor the declared extension pin");
        }
        const installed = await this.manager.install(request, signal);
        if (!installed.installed) {
            throw new ItemRefusal("failed", "manager/install-failed", installed.detail ?? "manager did not install the extension");
        }
        const landed = await this.verifyLanded(item.id, signal);
        this.move(ref, operationId, landed === "active" ? "active" : "installed");
        return itemResult(item, landed, landed === "active" ? "active" : "restart_required", installed.detail === undefined ? {} : { detail: installed.detail });
    }
    /** THE POST-INSTALL VERIFY (audit I-S6(c), 2026-10-23): the install
     *  ack is the Manager's claim, not the landing — the belt re-reads
     *  the Manager's own inspect before the plane serves
     *  restart_required, and an ack with no landed pack fails the item
     *  by name. No inspect seat = no belt (the ack stands, degraded —
     *  the same no-seat law the trust merge runs). */
    async verifyLanded(id, signal) {
        if (this.manager?.inspect === undefined)
            return "restart_required";
        const inspection = await this.manager.inspect(id, signal);
        if (inspection.active)
            return "active";
        if (inspection.installed)
            return "restart_required";
        throw new ItemRefusal("failed", "manager/install-not-landed", "the Manager acked the install but the pack is not present on inspect");
    }
    async acquireModel(ref, item, operationId, signal) {
        if (item.sha256 === undefined || item.sha256.trim() === "") {
            throw new ItemRefusal("blocked", "artifact/invalid-digest", "model acquisition requires a declared SHA-256 digest");
        }
        if (this.writer === undefined || this.writer.inspect === undefined) {
            throw new ItemRefusal("blocked", "artifact/inspect-unavailable", "model acquisition requires the configured model store inspector");
        }
        // THE PROVIDER ARM FOR MODELS (the contract's vocabulary): the
        // declaration stamps every model row with its intended source,
        // and this arm honours the token — a "direct" row used to be
        // silently countermanded to ComfyUI-Manager, which resolved the
        // row through its own catalog URL and refused anything the
        // catalog did not know. A token with no model arm is REFUSED BY
        // NAME (the extension arm's law), never routed to a default.
        if (!providerOk(item.provider)) {
            throw new ItemRefusal("blocked", "model/unknown-provider", unknownProviderRefusal(item.provider));
        }
        if (item.provider === "git" || item.provider === "external") {
            throw new ItemRefusal("blocked", "model/provider-without-arm", `the model plan arm does not implement provider "${item.provider}" — git clones are an extension arm, external acquisition rides the operator-confirmed door`);
        }
        const relativePath = relativeArtifactPath(item.folder, item.name);
        // THE RE-CHECK VOICE (audit F6a): the store inspect IS a live
        // phase — a present multi-GB file re-hashes under this await,
        // and a phaseless 0/total poll reads as dead. The voice rides
        // the ledger only (the record's present-path history stays
        // acquiring→active); the count still lands only when the inspect
        // confirms the bytes below.
        this.voicePhase(operationId, "recheck", "verifying");
        const existing = await this.writer.inspect({
            root: this.writerRoot,
            relativePath,
            expectedSha256: item.sha256,
        }, signal);
        if (existing.present) {
            if (item.sizeBytes !== undefined && existing.sizeBytes !== item.sizeBytes) {
                throw new ItemRefusal("failed", "artifact/size-mismatch", `the declared model has size ${String(existing.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`);
            }
            // THE F9 ALREADY-LANDED BYTES (real, not animation): a present
            // file contributes its declared size to the live count at once.
            if (item.sizeBytes !== undefined)
                this.bumpProgress(operationId, item.sizeBytes);
            return itemResult(item, "active", "active", {
                ...(existing.path === undefined ? {} : { path: existing.path }),
                ...(existing.sha256 === undefined ? {} : { sha256: existing.sha256 }),
                integrity: "declared-sha256",
            });
        }
        if (item.provider === "local") {
            throw new ItemRefusal("blocked", "model/not-present", `local model ${item.name} is not present at ${relativePath} with the declared digest — the local arm verifies, it never installs`);
        }
        if (item.provider === "direct") {
            if (this.fetcher === undefined) {
                throw new ItemRefusal("blocked", "artifact/fetch-unavailable", "direct model acquisition requires a configured artifact fetcher");
            }
            // THE HONEST PHASE WORD (audit download-stack-audit-2026-10-20
            // F5): 'acquiring' while the byte stream lands — the whole
            // 100MB/s download must not read as hash. The verify boundary
            // (the writer's first onVerifyBytes heartbeat) moves the row to
            // 'verifying', so the poll's state word names the phase the
            // operation is actually in (the popup's only liveness window).
            this.move(ref, operationId, "acquiring");
            // the stream takes over from the opening re-check — the bytes
            // landing now are wire bytes, and the ledger says so
            this.voicePhase(operationId, "stream");
            // THE STALL WATCHDOG'S WINDOW (ERRORS.md k2): arms over the
            // whole direct fetch — the headers wait and the counted byte
            // stream — and disarms on every exit, so a fetch that freezes
            // settles FAILED inside the stall budget instead of holding the
            // plane (and the operator's popup) forever.
            const stopStallWatch = this.armStallWatch(operationId, ref);
            try {
                // THE RANGE RESUME MEASURE (audit download-stack-audit-2026-10-20
                // F7): the previous attempt's kept part, sized BEFORE the fetch —
                // a kept part turns into `Range: bytes=N-` and, on a 206, an
                // append at N instead of a from-byte-0 re-download of the whole
                // weight. No kept part asks for nothing.
                const adoptable = this.writer?.adoptablePart === undefined
                    ? null
                    : await this.writer.adoptablePart({ root: this.writerRoot, relativePath, sizeBytes: item.sizeBytes });
                const resumeFrom = adoptable?.sizeBytes ?? 0;
                const response = await this.fetcher(item.url, signal, resumeFrom > 0 ? { rangeFrom: resumeFrom } : undefined);
                if ((response.status !== 200 && response.status !== 206) || response.body === null) {
                    throw new ItemRefusal("failed", "artifact/fetch-refused", `direct fetch of ${item.url} answered status ${String(response.status)}${response.body === null ? " with no body" : ""}`);
                }
                // THE RESUMED FLIGHT (F7): a 206 to a ranged ask appends at the
                // adopted offset; a 200 to the same ask means the host ignored
                // the range — the restart from zero is said out loud, never
                // silent while the operator's bar falls back.
                const resumed = resumeFrom > 0 && response.status === 206;
                // THE F9 COUNTED WRITE (the tracker's numerator): the ledger
                // entry must exist before the first chunk lands (a background
                // start seeded it with the plan total; a blocking ensure
                // seeded it in executeEnsure — this keeps whichever total is
                // already there and only fills a missing one).
                this.ensureProgress(operationId, ref, item.sizeBytes ?? 0);
                if (resumed) {
                    // THE SEEDED LEDGER (never a 0% lie): the adopted prefix
                    // counts before the first wire byte lands, so the poll
                    // resumes at N/M instead of restarting at 0%.
                    this.bumpProgress(operationId, resumeFrom);
                    this.voiceDetail(operationId, "resuming at " + String(resumeFrom) + " of " +
                        String(item.sizeBytes ?? response.totalBytes ?? 0) + " bytes");
                }
                else if (resumeFrom > 0) {
                    this.voiceDetail(operationId, "the host ignored the range request — downloading from byte 0");
                }
                const landed = await this.writer.write({
                    root: this.writerRoot,
                    relativePath,
                    expectedSha256: item.sha256,
                    operationId,
                    source: countedSource(response.body, (count) => this.bumpProgress(operationId, count)),
                    sizeBytes: item.sizeBytes,
                    // the writer re-runs the adoption scan under this arm's lock
                    // and appends from the part it actually adopts
                    ...(resumed ? { resumeFrom } : {}),
                    // the verify heartbeat: hash chunks + phase boundaries poke
                    // the watchdog's clock (the field above) — a slow multi-GB
                    // verify reads as flow, never as a frozen stream — and the
                    // FIRST heartbeat carries the verify boundary to the
                    // ledger's state word (acquiring → verifying: the honest
                    // phase law, audit F5)
                    onVerifyBytes: () => {
                        this.verifyFlowAt.set(operationId, Date.now());
                        // the FIRST heartbeat carries the verify boundary to the
                        // state machine (acquiring → verifying, mirrored into the
                        // ledger by move()) — later heartbeats only re-arm the
                        // clock
                        const entry = this.weightProgress.get(operationId);
                        if (entry !== undefined && entry.state === "acquiring") {
                            this.move(ref, operationId, "verifying");
                        }
                        // every heartbeat carries the phase to the ledger — the
                        // bytes sit frozen at the total through a multi-GB hash,
                        // and the phase is the only movement on the poll
                        this.voicePhase(operationId, "verify");
                    },
                }, signal);
                this.move(ref, operationId, "installed");
                return itemResult(item, "active", "active", {
                    path: landed.path,
                    sha256: landed.sha256,
                    integrity: "declared-sha256",
                });
            }
            catch (error) {
                if (error instanceof ProvisioningError) {
                    throw new ItemRefusal("failed", "artifact/" + error.code, error.message);
                }
                throw error;
            }
            finally {
                stopStallWatch();
            }
        }
        if (this.manager?.installModel === undefined) {
            throw new ItemRefusal("blocked", "manager/model-unavailable", "model acquisition requires ComfyUI-Manager model installation");
        }
        // THE DRAIN VOICE (audit F4): the queue drain IS acquisition —
        // the Manager owns its own queue bytes, so no stream byte lands
        // on the ledger for minutes while gigabytes move. The ledger
        // voices the drain as acquiring/queue (never hash); each queue
        // poll re-voices it through the hook below.
        this.move(ref, operationId, "acquiring");
        this.voicePhase(operationId, "queue");
        const installed = await this.manager.installModel({
            id: item.key,
            name: item.name,
            savePath: item.folder,
            url: item.url,
            filename: item.name,
            // T-E2 (2026-10-22): the declared size rides so the manager
            // queue's drain budget scales for multi-GB artifacts (the
            // provider's modelQueueTimeoutMs arm was armed but never fed).
            ...(item.sizeBytes === undefined ? {} : { sizeBytes: item.sizeBytes }),
            onQueueStatus: () => { this.voicePhase(operationId, "queue"); },
        }, signal);
        if (!installed.installed) {
            throw new ItemRefusal("failed", "manager/model-install-failed", installed.detail ?? "ComfyUI-Manager did not install the model");
        }
        // the post-install inspect re-reads the landed bytes — a second
        // re-check under the same ledger-only voice as the opening one
        // (the record's history keeps its shape; the poll voices the hash)
        this.voicePhase(operationId, "recheck", "verifying");
        const landed = await this.writer.inspect({
            root: this.writerRoot,
            relativePath,
            expectedSha256: item.sha256,
        }, signal);
        if (!landed.present) {
            const code = landed.sha256 === undefined ? "manager/model-not-landed" : "artifact/hash-mismatch";
            throw new ItemRefusal("failed", code, landed.sha256 === undefined
                ? "ComfyUI-Manager queue completed but the declared model path is absent"
                : "ComfyUI-Manager landed bytes that do not match the declared SHA-256");
        }
        if (item.sizeBytes !== undefined && landed.sizeBytes !== item.sizeBytes) {
            throw new ItemRefusal("failed", "artifact/size-mismatch", `ComfyUI-Manager landed a model with size ${String(landed.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`);
        }
        // THE F9 MANAGER BYTES (real landed total, no mid-flight count):
        // the Manager owns its own queue bytes, so the ledger jumps from
        // the pre-install count to the declared size only on success.
        if (item.sizeBytes !== undefined)
            this.bumpProgress(operationId, item.sizeBytes);
        this.move(ref, operationId, "installed");
        return itemResult(item, "active", "active", {
            path: landed.path,
            sha256: landed.sha256,
            integrity: "declared-sha256",
        });
    }
    async activateExtension(ref, plan, operationId, signal, options) {
        if (this.lifecycle === undefined || this.inspector === undefined) {
            return this.blockedResult(ref, operationId, "activation/unavailable", "activation requires LifecyclePort and InspectorPort");
        }
        try {
            const activeRuns = await this.lifecycle.activeRuns(signal);
            if (activeRuns.length > 0 && options.force !== true) {
                return this.blockedResult(ref, operationId, "activation/active-run", `activation refused while ${String(activeRuns.length)} run(s) are active`);
            }
            await this.lifecycle.restart(signal);
            await this.lifecycle.waitUntilReady(signal);
            const inspection = await this.inspector.inspect(ref, signal);
            const expected = plan.items.flatMap((item) => item.kind === "extension" ? item.nodeTypes ?? [] : []);
            const observed = new Set(inspection.nodeTypes ?? []);
            if (!inspection.active || expected.some((node) => !observed.has(node))) {
                return this.failureResult(ref, operationId, new ItemRefusal("failed", "activation/not-visible", inspection.detail ?? "declared extension node types are not visible"), signal);
            }
            const items = plan.items.map((item) => item.kind === "extension"
                ? itemResult(item, "active", "active", inspection.detail === undefined ? {} : { detail: inspection.detail })
                : itemResult(item, "installed", "active"));
            return makeResult(ref, operationId, "active", "active", items);
        }
        catch (error) {
            return this.failureResult(ref, operationId, error, signal);
        }
    }
    async inspectPlanItem(item, signal) {
        if (item.kind === "model") {
            if (item.sha256 === undefined || item.sha256.trim() === "") {
                return itemResult(item, "blocked", "blocked", { errorCode: "artifact/invalid-digest" });
            }
            if (this.writer?.inspect === undefined) {
                if (this.inspector === undefined)
                    return itemResult(item, "unknown", "blocked", { errorCode: "artifact/inspect-unavailable" });
                const inspection = await this.inspector.inspect(itemOwnerRef(item), signal);
                return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
            }
            const inspection = await this.writer.inspect({
                root: this.writerRoot,
                relativePath: relativeArtifactPath(item.folder, item.name),
                expectedSha256: item.sha256,
                // THE CHEAP-FIRST ASK (audit download-stack-audit-2026-10-20
                // F10 addendum A): the DECL's own declared size rides the
                // request — a matching file is judged by stat (verifiedBy
                // 'size', no hash) and the scan's per-press cost drops from
                // one full sha256 per file to one stat per file.
                ...(item.sizeBytes === undefined ? {} : { expectedSizeBytes: item.sizeBytes }),
            }, signal);
            if (!inspection.present)
                return itemResult(item, "absent", "blocked", inspection.path === undefined ? {} : { path: inspection.path, sha256: inspection.sha256 });
            if (item.sizeBytes !== undefined && inspection.sizeBytes !== item.sizeBytes) {
                return itemResult(item, "failed", "failed", {
                    errorCode: "artifact/size-mismatch",
                    detail: `the declared model has size ${String(inspection.sizeBytes ?? "unknown")}, expected ${String(item.sizeBytes)}`,
                });
            }
            return itemResult(item, "active", "active", {
                ...(inspection.path === undefined ? {} : { path: inspection.path }),
                ...(inspection.sha256 === undefined ? {} : { sha256: inspection.sha256 }),
                // THE SIZE-CHECKED WORD: the cheap verdict names its own
                // integrity — the row carries no sha256 it never computed
                // (a full-hash answer keeps 'declared-sha256').
                integrity: inspection.verifiedBy === "size" ? "size-checked" : "declared-sha256",
            });
        }
        if (item.provider === "local") {
            if (this.inspector === undefined)
                return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
            const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
            return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        if (this.manager?.inspect !== undefined) {
            const inspection = await this.manager.inspect(item.id, signal);
            const state = inspection.active ? "active" : inspection.installed ? "restart_required" : "absent";
            const outcome = inspection.active ? "active" : inspection.installed ? "restart_required" : "blocked";
            return itemResult(item, state, outcome, inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        if (this.inspector !== undefined) {
            const inspection = await this.inspector.inspect({ kind: "extension", id: item.id }, signal);
            return itemResult(item, inspection.active ? "active" : "absent", inspection.active ? "active" : "blocked", inspection.detail === undefined ? {} : { detail: inspection.detail });
        }
        return itemResult(item, "unknown", "blocked", { errorCode: "extension/inspect-unavailable" });
    }
    begin(ref, operationId) {
        const record = this.record(ref);
        record.operation = {
            operationId,
            ref: copyRef(ref),
            state: "unknown",
            items: [],
            startedAt: Date.now(),
        };
        this.move(ref, operationId, "acquiring");
    }
    complete(ref, operationId, result) {
        const record = this.record(ref);
        const operation = record.operation;
        if (operation !== undefined && operation.operationId === operationId) {
            record.operation = {
                ...operation,
                state: result.operationState,
                items: result.items.map(copyItem),
                outcome: result.state,
                finishedAt: Date.now(),
                ...(result.detail === undefined ? {} : { detail: result.detail }),
            };
        }
        this.move(ref, operationId, result.operationState, result.items);
        // THE F9 DETAIL MIRROR (the stall's voice): a result that carries
        // a why (failureResult, blockedResult, the stall's stuck voice)
        // mirrors it onto the live ledger row, so the tracker's poll and
        // the settle face read the same truth.
        if (result.detail !== undefined) {
            const entry = this.weightProgress.get(operationId);
            if (entry !== undefined && entry.detail !== result.detail) {
                this.weightProgress.set(operationId, { ...entry, detail: result.detail });
            }
        }
        // THE SETTLED ROW SHEDS THE FLIGHT WORD (the acceptance law, the
        // moss popup burn 2026-11-09/10): the ledger's phase is the LIVE
        // liveness word — a settled row that kept it minted
        // "(active:recheck)" at the acquire door and every phase-reading
        // face waited for a recheck transition that never comes. The
        // phase belongs to the flight, not the landing: the settle drops
        // it, so the poll voices the ready word (state alone).
        const settled = this.weightProgress.get(operationId);
        if (settled !== undefined && settled.phase !== undefined) {
            const row = {
                operationId: settled.operationId,
                ref: settled.ref,
                state: settled.state,
                bytes: settled.bytes,
                total: settled.total,
                ...(settled.detail === undefined ? {} : { detail: settled.detail }),
            };
            this.weightProgress.set(operationId, row);
        }
        this.persist(record);
        this.evictSettledAcquires();
        return result;
    }
    failureResult(ref, operationId, error, signal) {
        const refusal = refusalFor(error, signal);
        const outcome = refusal.outcome === "cancelled" ? "cancelled" : refusal.outcome;
        const item = {
            key: resourceKey(ref),
            kind: ref.kind,
            state: outcome === "blocked" ? "blocked" : "failed",
            outcome,
            errorCode: refusal.code,
            detail: refusal.message,
        };
        return makeResult(ref, operationId, outcome, outcome === "blocked" ? "blocked" : "failed", [item], refusal.message);
    }
    blockedResult(ref, operationId, code, message) {
        const item = {
            key: resourceKey(ref),
            kind: ref.kind,
            state: "blocked",
            outcome: "blocked",
            errorCode: code,
            detail: message,
        };
        return makeResult(ref, operationId, "blocked", "blocked", [item], message);
    }
    statusFromResult(result) {
        return {
            ref: copyRef(result.ref),
            state: result.operationState,
            operationId: result.operationId,
            items: result.items.map(copyItem),
            ...(result.detail === undefined ? {} : { detail: result.detail }),
        };
    }
    record(ref) {
        const key = resourceKey(ref);
        const existing = this.records.get(key);
        if (existing !== undefined)
            return existing;
        const record = { state: "unknown", history: ["unknown"] };
        this.records.set(key, record);
        return record;
    }
    move(ref, operationId, next, items) {
        const record = this.record(ref);
        const previous = record.state;
        if (previous !== next && !TRANSITIONS[previous].includes(next)) {
            throw new Error(`invalid provisioning transition ${previous} -> ${next}`);
        }
        if (previous === next && operationId === undefined)
            return;
        record.state = next;
        if (previous !== next)
            record.history.push(next);
        if (operationId !== undefined && record.operation?.operationId === operationId) {
            record.operation = {
                ...record.operation,
                state: next,
                items: items === undefined ? record.operation.items : items.map(copyItem),
            };
        }
        // THE F9 STATE MIRROR (the tracker's face): the progress entry
        // follows the record — acquiring while the stream lands, then
        // the terminal operationState. The poll reads state + bytes.
        if (operationId !== undefined) {
            const entry = this.weightProgress.get(operationId);
            if (entry !== undefined && entry.state !== next) {
                this.weightProgress.set(operationId, { ...entry, state: next });
            }
        }
        if (previous !== next) {
            this.persist(record);
        }
    }
    /** THE F9 BYTE ADD (the tracker's numerator write): adds landed
     *  bytes to one operation's live count. No entry, no write. */
    bumpProgress(operationId, count) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined || count <= 0)
            return;
        this.weightProgress.set(operationId, { ...entry, bytes: entry.bytes + count });
    }
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
    voicePhase(operationId, phase, state) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined)
            return;
        this.weightProgress.set(operationId, {
            ...entry,
            ...(state === undefined || entry.state === state ? {} : { state }),
            phase,
        });
    }
    /** THE FLIGHT DETAIL VOICE (audit download-stack-audit-2026-10-20
     *  F7): mirrors one mid-flight fact onto the ledger row's detail —
     *  the resume offset, or the ignored-range restart. No entry, no
     *  write; a terminal result's detail overwrites it in complete(). */
    voiceDetail(operationId, detail) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined || entry.detail === detail)
            return;
        this.weightProgress.set(operationId, { ...entry, detail });
    }
    /** THE F9 ENTRY FILL (the tracker's denominator keep): creates the
     *  live entry when the blocking path is the first writer, and never
     *  shrinks a background start's plan total. */
    ensureProgress(operationId, ref, total) {
        const entry = this.weightProgress.get(operationId);
        if (entry === undefined) {
            this.weightProgress.set(operationId, {
                operationId,
                ref: copyRef(ref),
                state: "acquiring",
                bytes: 0,
                total,
                // the F9 keep fills the same opening voice
                phase: "recheck",
            });
            this.weightProgressByRef.set(resourceKey(ref), operationId);
        }
        else if (entry.total === 0 && total > 0) {
            this.weightProgress.set(operationId, { ...entry, total });
        }
    }
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
    armStallWatch(operationId, ref) {
        const key = resourceKey(ref);
        let lastBytes = -1;
        let changedAt = Date.now();
        let fired = false;
        const timer = setInterval(() => {
            if (fired)
                return;
            // a teardown already under way (the dispose abort) is not a
            // stall — the cancellation voice owns that operation
            if (this.locks.get(key)?.controller.signal.aborted === true)
                return;
            const entry = this.weightProgress.get(operationId);
            const bytes = entry?.bytes ?? 0;
            if (bytes !== lastBytes) {
                lastBytes = bytes;
                changedAt = Date.now();
                return;
            }
            // the writer's heartbeat moved after the last stream byte —
            // the stream is complete (or an item's hash is running) and
            // the verify is flowing. Re-arm on the verify's own flow.
            const verifyAt = this.verifyFlowAt.get(operationId) ?? 0;
            if (verifyAt > changedAt) {
                changedAt = verifyAt;
                return;
            }
            if (Date.now() - changedAt < this.acquireStallTimeoutMs)
                return;
            fired = true;
            clearInterval(timer);
            // THE STALLED PHASE NAMES ITSELF: a watchdog that never saw
            // verify flow names the stream; one that saw the verify move
            // after the last stream byte (or a stream already at its total)
            // names the verify — the hung-disk shape. The stream it already
            // landed is evidence, never the suspect: bytes-alone failure
            // faces ended here.
            const total = entry?.total ?? 0;
            const verifyActive = verifyAt > 0 || (total > 0 && bytes >= total);
            this.stallRefusals.set(operationId, verifyActive
                ? new ItemRefusal("failed", "artifact/verify-stalled", `the verify stalled: the stream landed ${String(bytes)}${total > 0 ? " of " + String(total) : ""} bytes but no verify flow for ${String(this.acquireStallTimeoutMs)}ms — the hash or land step stopped moving, retry the acquire`)
                : new ItemRefusal("failed", "artifact/stalled", "the fetch stalled: no bytes landed in " + String(this.acquireStallTimeoutMs) +
                    "ms (stuck at " + String(bytes) + (total > 0 ? " of " + String(total) : "") + " bytes) — retry the acquire" +
                    // THE KEPT BYTES ARE THE VOICE (F7): the stalled flight's
                    // part survives the abort, so the retry resumes at the
                    // frozen offset instead of re-downloading from byte 0
                    (total > 0 ? "; the landed part is kept and the retry resumes at " + String(bytes) + " of " + String(total) : "")));
            this.locks.get(key)?.controller.abort();
        }, ACQUIRE_STALL_TICK_MS);
        return () => {
            fired = true;
            clearInterval(timer);
            this.verifyFlowAt.delete(operationId);
        };
    }
    /** THE STALL VOICE READ (consumed once): the watchdog's refusal for
     *  one operation, undefined when it never fired. Consumption clears
     *  the seat — a refusal names ONE failure, never a later one.
     *
     * @param operationId the failing operation.
     * @returns the stuck refusal, or undefined. */
    takeStallRefusal(operationId) {
        const refusal = this.stallRefusals.get(operationId);
        if (refusal !== undefined)
            this.stallRefusals.delete(operationId);
        return refusal;
    }
    /** THE REGISTRY-GROWTH LAW (audit I-S4): terminal acquire rows are
     *  evicted oldest-first past MAX_SETTLED_ACQUIRES in BOTH maps —
     *  the ByRef pointer drops with its id, never dangles — and the
     *  stored operation is removed from the store so the dir stops
     *  growing (the runs plane's MAX_SETTLED_RUNS, mirrored). Live
     *  ("acquiring") rows are never candidates. */
    evictSettledAcquires() {
        // a live fetch is ANY lock-held id, whatever its ledger state —
        // the direct arm reads "verifying" mid-flight and an extension
        // arm reads "installed" before its restart bookkeeping ends
        // (verify-batch31 D2: a state filter alone evicted live rows)
        const live = new Set([...this.locks.values()].map((lock) => lock.id));
        const terminal = [...this.weightProgress.values()].filter((entry) => entry.state !== "acquiring" && !live.has(entry.operationId));
        let excess = terminal.length - MAX_SETTLED_ACQUIRES;
        for (const entry of terminal) {
            if (excess <= 0)
                break;
            this.weightProgress.delete(entry.operationId);
            for (const [refKey, id] of this.weightProgressByRef) {
                if (id === entry.operationId)
                    this.weightProgressByRef.delete(refKey);
            }
            // THE NO-RE-MINT MEMORY EVICTS WITH THE ROW: an evicted id is
            // forgotten everywhere the plane keeps it, so the mint door
            // never dedupes an accept onto an id the ledger no longer holds.
            for (const record of this.records.values()) {
                if (record.operation?.operationId === entry.operationId)
                    record.operation = undefined;
            }
            const store = this.operationStore;
            if (store?.remove !== undefined) {
                // the tombstone lands BEFORE the remove so a same-id save
                // still inside the chain is dropped, never resurrected
                this.storeRemoved.add(entry.operationId);
                this.enqueueStoreWrite(entry.operationId, () => store.remove(entry.operationId), (failure) => {
                    this.ctx.logger.error(new Error(`acquire eviction failed to remove stored operation ${entry.operationId}: ${failure.message}`, { cause: failure }));
                });
            }
            excess -= 1;
        }
    }
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
    discardAcquire(operationId) {
        if ([...this.locks.values()].some((lock) => lock.id === operationId)) {
            throw new Error("acquire " + operationId + " is still in flight — poll it or wait for it to settle before discarding");
        }
        // THE NO-RE-MINT MEMORY CLEARS WITH THE ROW (the delete exit): a
        // discarded settled op covers nothing — the record's settled
        // pointer must not keep deduping accepts onto a removed id. The
        // clear runs even when the ledger entry is already gone (evicted),
        // so a discard always ends the row's coverage.
        for (const record of this.records.values()) {
            if (record.operation?.operationId === operationId)
                record.operation = undefined;
        }
        if (!this.weightProgress.has(operationId))
            return;
        this.weightProgress.delete(operationId);
        for (const [refKey, id] of this.weightProgressByRef) {
            if (id === operationId)
                this.weightProgressByRef.delete(refKey);
        }
        const store = this.operationStore;
        if (store?.remove !== undefined) {
            this.storeRemoved.add(operationId);
            this.enqueueStoreWrite(operationId, () => store.remove(operationId), (failure) => {
                this.ctx.logger.error(new Error(`acquire discard failed to remove stored operation ${operationId}: ${failure.message}`, { cause: failure }));
            });
        }
    }
    /** THE STORE WRITE CHAIN (verify R5): the store writes are
     *  fire-and-forget, so an in-flight save could land after the
     *  same id's eviction remove and resurrect a settled row. Writes
     *  for one id chain on the previous write, and an evicted id is
     *  tombstoned — later saves for it are dropped. With no write in
     *  flight the perform() call keeps the caller's synchronous
     *  frame: a synchronous store throw still fails the operation
     *  loud (the tested contract), only an async rejection logs. */
    storeWrites = new Map();
    storeRemoved = new Set();
    enqueueStoreWrite(operationId, perform, onFailed) {
        const prior = this.storeWrites.get(operationId);
        const call = prior === undefined || prior.done ? perform() : prior.promise.then(perform);
        const next = call.catch(onFailed);
        const entry = { promise: next, done: false };
        this.storeWrites.set(operationId, entry);
        void next.then(() => {
            entry.done = true;
            if (this.storeWrites.get(operationId) !== entry)
                return;
            this.storeWrites.delete(operationId);
            // the tombstone only guards writes still in flight for this
            // id — with the chain idle it retires (ids never reuse)
            this.storeRemoved.delete(operationId);
        });
    }
    persist(record) {
        if (this.operationStore === undefined || record.operation === undefined)
            return;
        const operation = copyOperation(record.operation);
        const store = this.operationStore;
        this.enqueueStoreWrite(operation.operationId, () => this.storeRemoved.has(operation.operationId) ? Promise.resolve() : store.save(operation), (failure) => {
            // the in-memory state advances past a failed save — the log
            // row must name the operation and its state so the store's
            // divergence is findable (audit E3)
            this.ctx.logger.error(new Error(`persist failed for ${operation.operationId} (${operation.state}): ${failure.message}`, { cause: failure }));
        });
    }
    async runLocked(ref, signal, body, key = resourceKey(ref)) {
        const existing = this.locks.get(key);
        if (existing !== undefined)
            return await this.joinLocked(ref, existing, signal);
        const id = this.operationIdFactory();
        const controller = new AbortController();
        const operationSignal = signal === undefined
            ? controller.signal
            : AbortSignal.any([controller.signal, signal]);
        if (signal?.aborted === true)
            controller.abort(signal.reason);
        let promise;
        promise = Promise.resolve()
            .then(() => body(id, operationSignal))
            .catch((error) => this.completeUnstarted(ref, id, error, operationSignal))
            .finally(() => {
            this.locks.delete(key);
        });
        this.locks.set(key, { id, controller, promise });
        return await promise;
    }
    async joinLocked(ref, operation, signal) {
        if (signal === undefined)
            return await operation.promise;
        if (signal.aborted)
            return this.cancelledJoinResult(ref, operation.id);
        return await new Promise((resolvePromise, rejectPromise) => {
            let settled = false;
            const finish = (fn) => {
                if (settled)
                    return;
                settled = true;
                signal.removeEventListener("abort", onAbort);
                fn();
            };
            const onAbort = () => finish(() => resolvePromise(this.cancelledJoinResult(ref, operation.id)));
            signal.addEventListener("abort", onAbort, { once: true });
            void operation.promise.then((value) => finish(() => resolvePromise(value)), (error) => finish(() => rejectPromise(error)));
        });
    }
    cancelledJoinResult(ref, operationId) {
        return makeResult(ref, operationId, "cancelled", "failed", [], "operation cancelled while waiting for a shared operation");
    }
    completeUnstarted(ref, operationId, error, signal) {
        this.begin(ref, operationId);
        return this.complete(ref, operationId, this.failureResult(ref, operationId, error, signal));
    }
}
function stateOutcome(state) {
    if (state === "active")
        return "active";
    if (state === "restart_required")
        return "restart_required";
    if (state === "blocked")
        return "blocked";
    return "failed";
}
function itemOwnerRef(item) {
    return {
        kind: "model",
        owner: item.owner,
        id: item.id,
        ...(item.variant === undefined ? {} : { variant: item.variant }),
        ...(item.quant === undefined ? {} : { quant: item.quant }),
    };
}
export const name = "provisioning";
export function apply(ctx, config) {
    new ProvisioningService(ctx, config);
}
export const provisioningProvider = {
    name,
    apply,
};
export const provisioningContract = provisioningProvider;
export const provisioningPlugin = provisioningProvider;
export default provisioningProvider;
//# sourceMappingURL=service.js.map
