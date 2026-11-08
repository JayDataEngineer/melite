// service.ts — the serial run queue as a HOST Cordis service
// (REBUILD-5, gateway kill 2026-09-10).
//
// The queue survives the gateway kill as the estate's own service:
// the lock-first single-writer law (acquire BEFORE any boot side
// effect; a second writer exits here, LOUD, having touched nothing)
// rides the fiber lifecycle — `ctx.effect` releases only OUR pid's
// lock on dispose (the watcher-storm lesson: a blind unlink steals
// + boot-sweeps LIVE runs). The door mounts are DEAD: this service
// mounts nothing, registers no routes, owns no port. The runs
// remote (a later stroke) exposes the unary lanes over this seat.
//
// The service is thin on purpose: it owns the ROOT, the LOCK, and
// the QueueCore registry; the FIFO's worker/pump wiring lands with
// the runs remote (LAW 2 — one stroke, one wall).
import { Service } from "@deepseek-ai/cordis";
import { QueueCore, bootGate, ledgerPathFor, releaseLock, resolveStateRoot, } from "./queue.js";
import { tailLedgerAcross } from "./ledgerTail.js";
import { rootsManifest } from "./rootsManifest.js";
/** The serial-GPU queue seat: `ctx.queue`. */
export class QueueService extends Service {
    static inject = ["timer"];
    /** The run-state root this fiber owns (lock + ledger + outdirs). */
    stateRoot;
    /** §23 CROSS-ROOTS manifest (own root first, then the
     *  config's stateRoots extras, in order): the run-resolving
     *  doors walk it, and the seat carries it so consumers (the
     *  media door) read one law instead of re-deriving their own. */
    stateRoots;
    /** The boot gate's verdict trail (acquired | stolen-from-dead). */
    lockNote;
    /** The execute ceiling in ms (the hung-run fuse; runsExecute's
     *  raceExecuteFuse reads this). `<= 0` disables. */
    executeCeilMs;
    /** The in-memory serial registry (runs + FIFO order + active). */
    core = new QueueCore();
    #released = false;
    constructor(ctx, config = {}) {
        super(ctx, "queue");
        if (config.executeCeilMs !== undefined &&
            !Number.isFinite(config.executeCeilMs)) {
            throw new Error("[queue] executeCeilMs must be a finite number of milliseconds (<= 0 disables the hung-run fuse)");
        }
        this.executeCeilMs = config.executeCeilMs ?? 30 * 60_000;
        // THE ROOT PIN (stroke 45c, the operator's catch): the cwd
        // fallback was the-gateway's accidental law — a lane booted
        // from any other directory silently birthed an EMPTY runs tree
        // (200-empty listings, no error: the exact silent drop this
        // estate refuses). The root must be NAMED — config.stateRoot or
        // config.repoRoot; anything else refuses at boot, loud.
        if ((config.stateRoot ?? "") === "" && (config.repoRoot ?? "") === "") {
            throw new Error("[queue] the runs state root is unpinned — set the queue config's stateRoot (an absolute tree) or repoRoot (the profile's plugin config); refusing to guess from the process cwd (a wrong cwd silently serves an empty runs tree)");
        }
        this.stateRoot = resolveStateRoot(config);
        this.stateRoots = rootsManifest(this.stateRoot, config.stateRoots ?? []);
        // Pre-boot gate (main 4474-4480 heritage): BEFORE any boot side
        // effect. A held-by-live-pid lock refuses HERE — the throw is
        // the loud exit, not a fallback.
        const gate = bootGate(this.stateRoot);
        if (!gate.ok) {
            throw new Error("estate-queue: " + gate.note + " (state root " + this.stateRoot + ")");
        }
        this.lockNote = gate.note;
        // PID-checked release on fiber dispose — only our own lock.
        this.ctx.effect(() => () => {
            this.#released = true;
            releaseLock(this.stateRoot);
        }, "estate-queue.lock");
    }
    /** The journal path under this service's root (readers + the
     *  runs remote's list arm). */
    get ledgerPath() {
        return ledgerPathFor(this.stateRoot);
    }
    /** The journal tail (REBUILD-19; the dead GET /v1/ledger arm —
     *  the doors/assets.ts _h_ledger law rides verbatim): limit
     *  default 50 / clamp 1..500 / garbage -> 50, event prefix on
     *  the raw line, oldest -> newest within the tail. §23
     *  CROSS-ROOTS: every manifest root's journal merges into one
     *  timeline and the answer names the searched roots. */
    ledger(rawLimit, rawEvent) {
        return tailLedgerAcross(this.stateRoots, rawLimit, rawEvent);
    }
    /** Whether dispose already released our lock (test probe). */
    get released() {
        return this.#released;
    }
}
//# sourceMappingURL=service.js.map
