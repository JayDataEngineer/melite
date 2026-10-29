import type { Client } from "@stable-canvas/comfyui-client";
import type { ActivePrompt, EngineJson } from "./comfyui-types.js";
export interface ExecuteOpts {
    /** Seconds; the estate's own budget (default 2400). */
    readonly timeoutS?: number;
    /** Polled every tick — a true verdict interrupts the prompt. */
    readonly shouldStop?: () => boolean;
    /** Progress fold — the client's ws events folded here (progress
     *  + activity). Absent = no socket opened (the wire stays quiet). */
    readonly report?: (updates: Record<string, EngineJson>) => void;
    /** §23 cross-roots manifest extras (J12: config-named by the
     *  caller — the queue seat — never the retired env seam): the
     *  trees a chained-input estate URL may resolve under beyond
     *  the run's own output root. */
    readonly stateRoots?: readonly string[];
}
export interface ExecuteResult {
    readonly outputs: Record<string, EngineJson>;
    readonly artifacts: string[];
    readonly promptId: string;
    /** THE REPLAY VERDICT (D11): true when the seated tap folded zero
     *  engine events before settlement — the engine served memo'd
     *  outputs without executing. Optional so older producers stay
     *  assignable: absent means unknown, never clean. */
    readonly replaySuspect?: boolean;
}
export declare function submitPrompt(client: Client, graph: Record<string, EngineJson>): Promise<{
    promptId: string;
    clientId: string;
}>;
/** Test seam for the engine-loss arm (production always omits it —
 *  the constants above are the measured tuning, not guesses). */
export interface EngineLostPolicy {
    readonly streak?: number;
    readonly minMs?: number;
    readonly backoffCapMs?: number;
    /** Test seam for the per-iteration queue/history read bound
     *  (production rides RAW_READ_BOUND_MS). */
    readonly readBoundMs?: number;
    /** Test seam for the close arm's re-read budget (production rides
     *  SALVAGE_ATTEMPTS). */
    readonly salvageAttempts?: number;
    /** Test seam for the salvage re-read sleep (production rides
     *  SALVAGE_RETRY_SLEEP_MS). */
    readonly salvageRetrySleepMs?: number;
    /** Test seam for the F8 health gate's liveness bound (production
     *  rides HEALTH_BOUND_MS). */
    readonly healthBoundMs?: number;
}
export declare function waitTerminal(client: Client, promptId: string, deadline: number, shouldStop: () => boolean, policy?: EngineLostPolicy): Promise<Record<string, EngineJson>>;
/** The tap's handle: the unhook itself (callable, the finally's
 *  `unhook?.()` keeps working) plus its two readings — whether the
 *  socket seated (tapAlive) and how many engine events folded
 *  (tapEvents). The replay law reads both: a seated tap that folded
 *  NOTHING while the run completed means the engine served memo'd
 *  outputs without executing (D11, 2026-10-11: byte-identical h3
 *  graphs return in ~0.01s with the previous film and no ws events
 *  — the tile's frozen "merged submit" and the user's "my inputs
 *  disappeared" are one mechanism). */
export interface ProgressTap {
    (): void;
    tapAlive(): boolean;
    tapEvents(): number;
}
/** Fold the client's ws events into report() calls. Progress is
 *  additive: a refused/dropped socket warns (the lane log, never
 *  silent) and simply yields no events — never a killed run.
 *  Returns the tap handle (the unhook + its liveness readings). */
export declare function hookProgress(client: Client, promptId: string, report: ((updates: Record<string, EngineJson>) => void) | undefined): ProgressTap | null;
/** The execute core (no resolution, no registry choice). */
export declare function executeSingleInner(runDir: string, nodeParams: Record<string, EngineJson>, nodeOutputs: Record<string, EngineJson>, opts: ExecuteOpts, server: string, active: Map<string, ActivePrompt>): Promise<ExecuteResult>;
/** The handoff row's payload (the pack's _write_next_scene_handoff /
 * ui contract — subset the driver reads; unknown extras ride along). */
export interface H3RequeueRow {
    readonly run_name: string;
    readonly handoff_id: string;
    readonly scene: number;
    readonly end_clip: number;
    readonly [key: string]: EngineJson;
}
/** The owed-scene row of a terminal history entry, or null when the
 * entry is chain-complete (or not a chain prompt at all). */
export declare function h3RequeueRowOf(entry: Record<string, EngineJson>): H3RequeueRow | null;
/** Whether the entry is a chain's FINAL prompt (the pack emits
 * `h3_chain_top_level_complete` only when the last scene lands). */
export declare function h3ChainCompleteOf(entry: Record<string, EngineJson>): boolean;
/** Patch the stored graph's LoopStart to the owed scene: start_clip
 * is the scene the handoff names, scene_range the range it carries
 * (absent view fields leave the stored input untouched). Returns a
 * FRESH graph object — the staged original is never mutated (each
 * re-submission derives from it again). */
export declare function patchChainLoopStart(graph: Record<string, EngineJson>, view: Record<string, EngineJson>): Record<string, EngineJson>;
/** The driver loop — see executeSingleInner's call site. Each scene:
 * claim (exactly-once; a 409 means another coordinator holds the
 * chain — refuse loud, never spin), patch, transition queued,
 * submit, wait, transition consumed, report the scene row. The
 * deadline re-arms per scene (the budget is per engine prompt); a
 * stop between scenes releases the handoff and refuses loud (the
 * checkpoints survive; the owed-scene resume is the handoff's own).
 * The submit/wait seams exist for the driver's own wall (the
 * choreography is the contract; the transports are injectable —
 * defaults ride the real prompt door). */
export declare function driveH3ChainRequeue(client: Client, firstEntry: Record<string, EngineJson>, graph: Record<string, EngineJson>, ride: {
    report?: (updates: Record<string, EngineJson>) => void;
    shouldStop?: () => boolean;
    deadline: () => number;
    activeKey: string;
    active: Map<string, ActivePrompt>;
    retap: (promptId: string) => void;
    submit?: (graph: Record<string, EngineJson>) => Promise<{
        promptId: string;
    }>;
    wait?: (promptId: string, deadline: number) => Promise<Record<string, EngineJson>>;
}): Promise<Record<string, EngineJson>>;
/** The non-plugin execute face (walls/probes/unit — no Context).
 *  Plugin paths (doors) use ComfyUIHostService.executeSingle (same
 *  inner, fiber-owned prompts map + service-resolved server).
 *  Documented split, never two truths. */
export declare function executeSingle(runDir: string, nodeParams: Record<string, EngineJson>, nodeOutputs: Record<string, EngineJson>, opts?: ExecuteOpts, serverOverride?: string): Promise<ExecuteResult>;
/** One checkpoint row from the pack's listing (subset the derive
 * reads; unknown extras ride along; `inactive_reason` is absent for
 * active takes). */
export interface H3CheckpointRow {
    readonly scene: number;
    readonly [key: string]: EngineJson;
}
/** The first scene a resume press owes, or null when nothing is
 * saved: one past the highest CONTIGUOUS active scene counted from
 * scene 1. An inactive take is not resumable through (the resume
 * gate would refuse it) — the chain re-renders from that scene. */
export declare function nextOwedH3Scene(rows: readonly H3CheckpointRow[]): number | null;
/** Patch the stored graph's LoopEnd into requeue mode: a crashed
 * recursive run resumes as a top-level requeue chain (each remaining
 * scene is its own prompt; recursive expansion dies past clip 2).
 * Fresh graph object, loud refusal when no LoopEnd rides the graph. */
export declare function patchChainLoopEndRequeue(graph: Record<string, EngineJson>): Record<string, EngineJson>;
/** Resume a crashed chain from its own checkpoints, headlessly: the
 * stored graph is patched to the first owed scene in requeue mode,
 * submitted once, and the requeue driver completes the chain. The
 * seams mirror the driver's (fetchListing/submit/wait injectable for
 * the wall; defaults ride the real routes). */
export declare function resumeH3ChainFromCheckpoints(client: Client, graph: Record<string, EngineJson>, opts: {
    runName: string;
    deadline: () => number;
    report?: (updates: Record<string, EngineJson>) => void;
    shouldStop?: () => boolean;
    retap?: (promptId: string) => void;
    submit?: (graph: Record<string, EngineJson>) => Promise<{
        promptId: string;
    }>;
    wait?: (promptId: string, deadline: number) => Promise<Record<string, EngineJson>>;
    fetchListing?: (runName: string) => Promise<H3CheckpointRow[]>;
}): Promise<Record<string, EngineJson>>;
//# sourceMappingURL=comfyui-execute.d.ts.map
