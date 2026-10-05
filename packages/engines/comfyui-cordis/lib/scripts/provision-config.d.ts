export interface EndpointConfig {
    provision?: string;
    url?: string;
    port?: number;
    boot_cmd?: string;
    model_base_path?: string;
    model_download_path?: string;
    input_dir?: string;
    input_dir_container?: string;
    output_dir?: string;
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
export declare function enginePort(cfg: EndpointConfig): number;
