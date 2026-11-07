/** LOUD transport failure (never a silent fallback — native transport). */
export declare class ComfyError extends Error {
    /** The refusal's class: "deadline" marks a fuse-bound read that
     *  the engine never answered (the doors answer it 504, never as
     *  an empty document). */
    readonly code?: "deadline";
    constructor(message: string, code?: "deadline");
}
/** Wire JSON. */
export type EngineJson = string | number | boolean | null | EngineJson[] | {
    [key: string]: EngineJson;
};
/** One queued prompt's live record — mirrors _ACTIVE rows. */
export interface ActivePrompt {
    readonly promptId: string;
    readonly clientId: string;
    readonly server: string;
}
/** run_dir -> live prompt (the stop door's handle).
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context): the
 *  module executeSingle/executeFlow register here, module
 *  stopForRunDir reads here. Plugin paths (doors) register/read
 *  through ComfyUIHostService.prompts (fiber-owned, below) — never
 *  this handle. The two registries are coherent per calling
 *  convention (plugin→service, standalone→module); never mix them
 *  within one call chain (documented split, the ModelsService
 *  precedent — the seam is the service, never the import). */
export declare const ACTIVE: Map<string, ActivePrompt>;
/** Read-only view for doors (size probes in tests only). */
export declare function activeCount(): number;
//# sourceMappingURL=comfyui-types.d.ts.map