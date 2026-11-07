import type { ActivePrompt } from "./comfyui-types.ts";
export declare function interrupt(server: string, promptId: string): Promise<void>;
/** The stop door's engine handle.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-stop door) read through
 *  ComfyUIHostService.stopForRunDir (the fiber-owned prompts map).
 *  Documented split, never two truths (shared inner below). */
export declare function stopForRunDir(runDir: string): Promise<void>;
/** Shared stop core (no resolution, no registry choice): delete
 *  from queue + interrupt, best-effort. */
export declare function stopForRunDirInner(runDir: string, active: Map<string, ActivePrompt>): Promise<void>;
/** ENGINE TRANSITION: drop every cached model + the execution
 *  cache from VRAM. Raises ComfyError on a non-2xx so the caller
 *  can DOCUMENT a failed unload (RESILIENCE LAW) and continue —
 *  never silently resident.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths use ComfyUIHostService.unloadModels (same inner). */
export declare function unloadModels(serverOverride?: string): Promise<void>;
export declare function unloadModelsInner(server: string): Promise<void>;
