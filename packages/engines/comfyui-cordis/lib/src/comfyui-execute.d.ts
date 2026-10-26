import type { Client } from "@stable-canvas/comfyui-client";
import type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
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
/** The non-plugin execute face (walls/probes/unit — no Context).
 *  Plugin paths (doors) use ComfyUIHostService.executeSingle (same
 *  inner, fiber-owned prompts map + service-resolved server).
 *  Documented split, never two truths. */
export declare function executeSingle(runDir: string, nodeParams: Record<string, EngineJson>, nodeOutputs: Record<string, EngineJson>, opts?: ExecuteOpts, serverOverride?: string): Promise<ExecuteResult>;
