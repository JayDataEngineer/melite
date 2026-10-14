/** Join a base subdirectory onto a models root ONCE: a root that
 *  already ends with the base stays unchanged (re-running a
 *  provision or re-reading an already-based store never stacks the
 *  segment twice).
 *  @param root the models root ("" and "." name the current dir)
 *  @param base the engines.comfyui.base subdirectory ("" = no base)
 *  @returns the joined store root, unchanged when it already ends
 *           with the base */
export declare function joinBaseOnce(root: string, base: string): string;
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
//# sourceMappingURL=configOverlay.d.ts.map
