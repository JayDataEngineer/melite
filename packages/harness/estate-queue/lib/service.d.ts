import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import { QueueCore } from "./queue.js";
import type { LedgerTailAnswer } from "./ledgerTail.js";
/** Provider config: where the estate's run state lives. */
export interface QueueConfig {
    /** Repo root for the default `data/runs` state root. */
    repoRoot?: string;
    /** The runs state root, named absolute (J12, 2026-10-19: the
     *  retired MELITE_STATE_ROOT env seam's config twin — wins over
     *  repoRoot when both are set). */
    stateRoot?: string;
    /** §23 cross-roots manifest extras, in search order after the
     *  own root (the retired MELITE_STATE_ROOTS env seam's config
     *  twin). */
    stateRoots?: string[];
    /** THE EXECUTE CEILING: the max wall time for ONE run's engine
     *  execution (executeFlow/executeStages) before the worker fails
     *  the run `runs/execute-hung` instead of stranding the serial
     *  queue behind a never-settling engine call (the claim-release
     *  law covers throws, not hangs). `<= 0` disables the fuse.
     *  Default 30 minutes; a real render over the ceiling needs the
     *  config raised, never the fuse removed. */
    executeCeilMs?: number;
}
declare module "@deepseek-ai/cordis" {
    interface Context {
        queue: QueueService;
    }
}
/** The serial-GPU queue seat: `ctx.queue`. */
export declare class QueueService extends Service {
    #private;
    static inject: string[];
    /** The run-state root this fiber owns (lock + ledger + outdirs). */
    readonly stateRoot: string;
    /** §23 CROSS-ROOTS manifest (own root first, then the
     *  config's stateRoots extras, in order): the run-resolving
     *  doors walk it, and the seat carries it so consumers (the
     *  media door) read one law instead of re-deriving their own. */
    readonly stateRoots: string[];
    /** The boot gate's verdict trail (acquired | stolen-from-dead). */
    readonly lockNote: string;
    /** The execute ceiling in ms (the hung-run fuse; runsExecute's
     *  raceExecuteFuse reads this). `<= 0` disables. */
    readonly executeCeilMs: number;
    /** The in-memory serial registry (runs + FIFO order + active). */
    readonly core: QueueCore;
    constructor(ctx: Context, config?: QueueConfig);
    /** The journal path under this service's root (readers + the
     *  runs remote's list arm). */
    get ledgerPath(): string;
    /** The journal tail (REBUILD-19; the dead GET /v1/ledger arm —
     *  the doors/assets.ts _h_ledger law rides verbatim): limit
     *  default 50 / clamp 1..500 / garbage -> 50, event prefix on
     *  the raw line, oldest -> newest within the tail. §23
     *  CROSS-ROOTS: every manifest root's journal merges into one
     *  timeline and the answer names the searched roots. */
    ledger(rawLimit: string, rawEvent: string): LedgerTailAnswer;
    /** Whether dispose already released our lock (test probe). */
    get released(): boolean;
}
//# sourceMappingURL=service.d.ts.map