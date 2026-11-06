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
export function joinBaseOnce(root: string, base: string): string {
  const b = base.trim();
  if (b === "") return root;
  if (root === "" || root === ".") return b;
  // WIN32-PORTABILITY (2026-11-06, the windows catalog-null class):
  // the tracked base rides posix seps ("image-gen/comfyui" — checked
  // into git, identical on every os) while a machine's read_root
  // rides native seps ("...\\image-gen\\comfyui" on Windows). The
  // raw endsWith never matched across the seam, so a base-inclusive
  // root double-appended and the model resolved nowhere (null).
  // Compare separator-blind: one spelling of the tail, never two.
  const tail: string = "/" + b.replace(/\\/g, "/");
  const owned: string = root.replace(/\\/g, "/");
  if (owned === b.replace(/\\/g, "/") || owned.endsWith(tail)) return root;
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
export function mergeOverlay(tracked: unknown, overlay: unknown): unknown {
  if (typeof tracked !== "object" || tracked === null || Array.isArray(tracked) ||
      typeof overlay !== "object" || overlay === null || Array.isArray(overlay)) {
    return overlay;
  }
  const out: Record<string, unknown> = { ...(tracked as Record<string, unknown>) };
  for (const [k, v] of Object.entries(overlay as Record<string, unknown>)) {
    out[k] = mergeOverlay(out[k], v);
  }
  return out;
}
