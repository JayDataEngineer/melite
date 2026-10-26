import type { ModelDecl } from "@melite/comfyui-card-kit/model-contract";
import { CardArmError } from "./cardsArmError.js";
/** lane_inputs keys that name FILES the stock loaders read, mapped
 * to their ComfyUI folder sets (text_encoders folds legacy clip;
 * unet folds diffusion_models; loras is the LoraLoaderModelOnly
 * root — a family's default-bag distill rides it). Keys absent here
 * are declaration-only — model_path/texture_vae ride pack-specific
 * loaders whose folders the estate cannot name without inventing a
 * mapping; those slots are judged through the DECL's own
 * `lane_homes` row (the declared-home loop below), which replaces
 * this map and the pack union for its slot. */
export declare const LANE_FOLDERS: Readonly<Record<string, readonly string[]>>;
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
export declare function lanePresenceRefusal(fam: string, body?: Record<string, unknown>, mid?: string): CardArmError | null;
/** THE WEIGHTS PROBE (roadmap §10's e2e gate, 2026-09-21): the same
 *  walk lanePresenceRefusal gates with, env-deferral stripped — the
 *  caller (the GPU receipt rows) decides what a miss means (a skip,
 *  never a cost signal). One loop, two seats, no divergence. */
type LaneCheck = (folder: string, name: string) => string | null;
export declare function laneFilesStatus(decl: Pick<ModelDecl, "lane_inputs" | "provisions" | "snapshot_provisions" | "lane_homes">, check?: LaneCheck): boolean | null;
/** A resolved fetch anchor for one lane miss: the URL the operator
 * can download the weight from, plus the declared size when the
 * channel states one. */
export interface LaneFetchAnchor {
    readonly url: string;
    readonly sizeBytes?: number;
}
/** THE ANCHOR-AT-THE-DOOR LAW (operator 2026-10-26, the kroma burn,
 * quoted verbatim in the variant-linkability wall and its receipt):
 * a single weight without a URL to download from means REDS in the
 * testing suite, always. A lane miss's fetch
 * anchor resolves from the RESOLVED CASCADE'S OWN CHANNELS — the
 * family's provisions rows first, then the STATED variant/cell
 * artifact rows (the cell artifact's source_url basename IS the
 * lane file's name — the krea-2/qwen convention), then the snapshot
 * trees (the repo link). Before this law the refusal read family
 * provisions ONLY: a weight whose URL lived on its cell's artifact
 * (krea-2 kroma-base's dtype-mapped bf16) refused with "no store
 * copy exists" and NO fetch anchor — the URL existed, the door never
 * said it. Hand-placed weights (no channel anywhere) stay the debt
 * band by the weight-offer-parity contract — their voice is the
 * hand-place sentence, never a bare miss.
 *
 * @param decl - the family DECL (provisions, snapshot rows, and
 * the variant tree for the family-wide artifact fallback).
 * @param seats - the resolved variant and cell rows (artifact
 * carriers), in precedence order.
 * @param name - the missing lane file's declared name.
 * @returns the anchor, or undefined when no channel names the file. */
/** The seat rows the anchor resolver reads: the stated variant row
 * (never carries an artifact) and the stated cell row (the artifact
 * carrier) — the same indexed shapes statedVariantRow/statedCellRow
 * return. */
export type LaneFetchSeat = ModelDecl["variants"][number] | ModelDecl["variants"][number]["cells"][number] | undefined;
export declare function laneFetchAnchor(decl: Pick<ModelDecl, "provisions" | "snapshot_provisions" | "variants">, seats: ReadonlyArray<LaneFetchSeat>, name: string): LaneFetchAnchor | undefined;
export declare function lanePresenceMiss(fam: string, body?: Record<string, unknown>, mid?: string): CardArmError | null;
export {};
//# sourceMappingURL=cardsLanes.d.ts.map
