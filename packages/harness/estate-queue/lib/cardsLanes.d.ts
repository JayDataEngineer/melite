import type { ModelDecl } from "@melite/comfyui-cordis";
import { CardArmError } from "./cardsArmError.ts";
/** The endpoint's pack categories (extra_model_folders keys) — the
 * custom-node weight homes (SEEDVR2, anny, …). A lane file may
 * legally live in a pack the stock map doesn't name (seedvr2's
 * unet/vae ride the SEEDVR2 pack), so every key's folder set unions
 * these. Same config findModelPresent's mount leg reads — one
 * truth, no second mapping. Unparseable/absent config = no packs
 * (the stock sets stand alone; the gate errs loud, never blocks on
 * a config read). */
export declare function lanePackFolders(): readonly string[];
/** THE GATE (pure over the registry + the store probes): null when
 * every declared lane file stands on disk; else the CardArmError a
 * card start refuses with.getModel's own unknown-family throw is
 * NOT swallowed here — phase-1's resolution gates own that voice
 * (this runs after prepareCardParams resolved the family).
 *
 * HERMETIC DEFERRAL (the same rule loadEndpointConfig serves, one
 * seam two consumers): a sandboxed test world with no explicit
 * endpoint fixture has no store to enforce against — the gate
 * stands down and ComfyUI's own validation (UI-surfaced since
 * 2026-09-13) remains the backstop. A fixture endpoint env always
 * re-arms the gate (the gate specs drive it that way). */
export declare function lanePresenceRefusal(fam: string): CardArmError | null;
/** THE WEIGHTS PROBE (roadmap §10's e2e gate, 2026-09-21): the same
 *  walk lanePresenceRefusal gates with, env-deferral stripped — the
 *  caller (the GPU receipt rows) decides what a miss means (a skip,
 *  never a cost signal). One loop, two seats, no divergence. */
type LaneCheck = (folder: string, name: string) => string | null;
export declare function laneFilesStatus(decl: Pick<ModelDecl, "lane_inputs">, check?: LaneCheck): boolean | null;
export declare function lanePresenceMiss(fam: string): CardArmError | null;
export {};
//# sourceMappingURL=cardsLanes.d.ts.map