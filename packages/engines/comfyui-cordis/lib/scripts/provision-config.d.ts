export interface EndpointConfig {
    provision?: string;
    url?: string;
    port?: number;
    boot_cmd?: string;
    /** The LIVE engine's tree root, when the estate runs the two-tree
     *  shape (a service-owned ComfyUI at a path outside the repo's
     *  data/runtime — Manager's git-url door installs THERE, while
     *  provision verifies against data/runtime). Machine-local: named
     *  by the overlay (data/inference.local.json
     *  engines.comfyui.live_root), never by the tracked files. */
    live_root?: string;
    model_base_path?: string;
    model_download_path?: string;
    input_dir?: string;
    input_dir_container?: string;
    output_dir?: string;
    /** Pack-declared mount categories beyond the stock folders:
     *  category → store subdirectory (identity when the store already
     *  names the category). LOAD-BEARING ALIASES stay (wiring re-audit
     *  F6, 2026-10-13): `model_patches: controlnet` is intended, never
     *  drift — the z-image lane wires ModelPatchLoader (whose
     *  `name` shares ControlNetLoader's list through this mount), and
     *  packages/models/z-image/mods/controlnet.ts documents the lane.
     *  ComfyUI registers both folder names and unions their file
     *  lists through a set, so the alias double-lists nothing. */
    extra_model_folders?: Record<string, string>;
    [k: string]: unknown;
}
export interface RootConfig {
    models?: {
        read_root?: string;
        download_root?: string;
    };
    engines?: {
        comfyui?: Record<string, unknown>;
    };
}
/** Merges the machine-local overlay OVER the tracked root config:
 *  object branches merge, scalars and arrays replace. The overlay
 *  shadows KEYS, never the whole file — a fresh machine pinning one
 *  port or one absolute keeps every tracked default (the
 *  fresh-clone probe's pass-4 receipt: a minimal overlay erased
 *  models.read_root and sync refused, blaming the tracked file that
 *  still carried it).
 *  @param tracked the parsed inference.config.json value
 *  @param overlay the parsed data/inference.local.json value
 *  @returns the merged configuration value */
export declare function mergeOverlay(tracked: unknown, overlay: unknown): unknown;
export declare function loadRoot(): RootConfig;
export declare function loadConfig(path: string): EndpointConfig;
export declare function rootStr(v: unknown): string;
/** The merged root (tracked inference.config.json + machine
 *  overlay) is the authority for an engine field; the tracked
 *  endpoint file's value is the fallback when the root names
 *  none. Override-order flipped 2026-10-04: the tracked
 *  comfyui_endpoint.json ships url 127.0.0.1:8188, so override-
 *  first made every fresh clone talk to whatever runs at 8188 —
 *  on the developer estate, the LIVE engine (its Manager answered
 *  every git-url install with an empty-body 400 "Already exists");
 *  on a stranger's machine, nothing. The machine overlay's pin is
 *  the truth (the merge law, batch 33).
 *  @param root the merged root config.
 *  @param key the engines.comfyui field name.
 *  @param fallback the tracked endpoint file's value for the key.
 *  @returns the effective field value; "" when both name none. */
export declare function engineField(root: RootConfig, key: string, fallback: unknown): string;
export declare const FIXED_FOLDERS: readonly string[];
export interface BoundLayout {
    base_path: string;
    download_path: string;
    folders: Record<string, string>;
}
/**
 * Anchors a configured directory: absolute values pass through,
 * relative values resolve against the repository root. Lets the
 * tracked inference.config.json ship portable ("data/models") while
 * machine-local overlays (data/inference.local.json) pin absolute
 * roots on developer estates.
 */
export declare function anchorDir(value: string): string;
/** Joins the engine base under a models root, never twice: overlays
 *  written under the old replacement semantics bake the base into
 *  read_root/download_root (an absolute already pointing INSIDE the
 *  engine dir), and the merge law must not re-append it. The base
 *  names a subdirectory, never a repeatable suffix.
 *  @param root the models root (already anchored)
 *  @param base the engines.comfyui.base subdirectory ("" = no base)
 *  @returns the joined store root, unchanged when it already ends
 *           with the base */
export declare function joinBase(root: string, base: string): string;
export declare function boundModelFolders(cfg: EndpointConfig): BoundLayout;
export declare function engineUrl(cfg: EndpointConfig): string;
/** The live engine's tree root when the overlay names one ("" when
 *  the estate runs the single-tree shape — every box but the
 *  developer estate). The install loop verifies every row against
 *  this tree TOO: Manager's door installs into the tree its engine
 *  runs from, not into the repo's data/runtime.
 *  @param cfg the tracked endpoint config (fallback value holder).
 *  @returns the absolute live tree root, or "" when none declared. */
export declare function engineLiveRoot(cfg: EndpointConfig): string;
export declare function enginePort(cfg: EndpointConfig): number;
