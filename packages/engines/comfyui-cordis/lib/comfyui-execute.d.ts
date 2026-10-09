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
}
/** Submit one graph through the SDK (POST /prompt). The SDK owns
 *  the body shape and the refusal voice (its typed enqueue error);
 *  the server's prompt_id is the receipt. */
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
}
export declare function waitTerminal(client: Client, promptId: string, deadline: number, shouldStop: () => boolean, policy?: EngineLostPolicy): Promise<Record<string, EngineJson>>;
/** Fold the client's ws events into report() calls. Progress is
 *  additive: a refused/dropped socket logs nothing and simply
 *  yields no events — never a killed run. Returns the unhook. */
export declare function hookProgress(client: Client, promptId: string, report: ((updates: Record<string, EngineJson>) => void) | undefined): (() => void) | null;
/** The execute core (no resolution, no registry choice). */
export declare function executeSingleInner(runDir: string, nodeParams: Record<string, EngineJson>, nodeOutputs: Record<string, EngineJson>, opts: ExecuteOpts, server: string, active: Map<string, ActivePrompt>): Promise<ExecuteResult>;
/** The non-plugin execute face (walls/probes/unit — no Context).
 *  Plugin paths (doors) use ComfyUIHostService.executeSingle (same
 *  inner, fiber-owned prompts map + service-resolved server).
 *  Documented split, never two truths. */
export declare function executeSingle(runDir: string, nodeParams: Record<string, EngineJson>, nodeOutputs: Record<string, EngineJson>, opts?: ExecuteOpts, serverOverride?: string): Promise<ExecuteResult>;
//# sourceMappingURL=comfyui-execute.d.ts.map
