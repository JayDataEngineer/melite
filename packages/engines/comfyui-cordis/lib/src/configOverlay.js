// configOverlay.ts — the machine-local overlay laws, ONE home
// (plugin-law N2, 2026-10-20): joinBaseOnce + mergeOverlay were
// spelled three times (catalog.ts, estate/models/src/index.ts,
// scripts/provision-config.ts). Every copy now imports this module.
import { join } from "node:path";
/** Join a base subdirectory onto a models root ONCE: a root that
 *  already ends with the base stays unchanged (re-running a
 *  provision or re-reading an already-based store never stacks the
 *  segment twice).
 *  @param root the models root ("" and "." name the current dir)
 *  @param base the engines.comfyui.base subdirectory ("" = no base)
 *  @returns the joined store root, unchanged when it already ends
 *           with the base */
export function joinBaseOnce(root, base) {
    const b = base.trim();
    if (b === "")
        return root;
    if (root === "" || root === ".")
        return b;
    if (root === b || root.endsWith("/" + b) || root.endsWith("\\" + b))
        return root;
    return join(root, b);
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
export function mergeOverlay(tracked, overlay) {
    if (typeof tracked !== "object" || tracked === null || Array.isArray(tracked) ||
        typeof overlay !== "object" || overlay === null || Array.isArray(overlay)) {
        return overlay;
    }
    const out = { ...tracked };
    for (const [k, v] of Object.entries(overlay)) {
        out[k] = mergeOverlay(out[k], v);
    }
    return out;
}
//# sourceMappingURL=configOverlay.js.map
