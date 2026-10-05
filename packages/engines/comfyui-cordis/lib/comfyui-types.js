// comfyui-types.ts — shared wire types + the module ACTIVE registry (the stop door's handle).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).
/** LOUD transport failure (never a silent fallback — native transport). */
export class ComfyError extends Error {
    constructor(message) {
        super(message);
        this.name = "ComfyError";
    }
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
export const ACTIVE = new Map();
/** Read-only view for doors (size probes in tests only). */
export function activeCount() {
    return ACTIVE.size;
}
//# sourceMappingURL=comfyui-types.js.map
