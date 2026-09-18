// comfyui-types.ts — shared wire types + the module ACTIVE registry (the stop door's handle).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).


/** LOUD transport failure (never a silent fallback — native transport). */
export class ComfyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComfyError";
  }
}

/** Wire JSON — mirrors native.JsonValue. */
export type EngineJson =
  | string
  | number
  | boolean
  | null
  | EngineJson[]
  | { [key: string]: EngineJson };

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
export const ACTIVE: Map<string, ActivePrompt> = new Map();

/** Read-only view for doors (size probes in tests only). */
export function activeCount(): number {
  return ACTIVE.size;
}
