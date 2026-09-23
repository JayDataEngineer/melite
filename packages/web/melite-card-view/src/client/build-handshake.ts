/**
 * build-handshake.ts — THE STALE-TAB FACE (2026-09-23, the root rot
 * the operator paid for: "there is rot at the root that you always
 * choose to ignore").
 *
 * THE ROT (proven live): the dsh module loader serves all client
 * plugins under ONE URL keyed by the plugin LIST under a
 * year-immutable cache. Rebuilt card bundles ride the SAME URL — a
 * browser that ever cached it never sees another build. Fixes landed
 * on disk, walls went green, and the operator's tab ran the museum:
 * every "silently dropped" edit and every "the fix didn't work"
 * night rode this seam, undetectable from either side.
 *
 * THE FACE: this tab's bundle bakes a content stamp at build time
 * (the global `__MELITE_BUILD_STAMP__`, set by the tsdown stamp
 * plugin; the literal here mirrors @melite/contracts/buildStamp —
 * the client must not import node:crypto). The lane serves current
 * disk stamps at /melite-media/card-build (no-store). A mismatch —
 * or an absent baked stamp while the lane serves one — renders the
 * banner: the tab names its build, the lane names its own, and the
 * reload instruction is one line. NEVER silent; never a false alarm
 * (an unreachable route or an absent own-entry renders nothing).
 */

/** The global the build's stamp line sets (mirrors contracts). */
const BUILD_STAMP_GLOBAL = "__MELITE_BUILD_STAMP__";

/** The handshake route (mirrors the media plugin's prefix). */
const CARD_BUILD_ROUTE = "/melite-media/card-build";

/** This tab's own package id as the route names it. */
const OWN_PACKAGE = "melite-card-view";

/** The verdict the comparison yields. */
export type BuildVerdict =
  | { kind: "fresh" }
  | { kind: "stale"; baked: string; served: string }
  | { kind: "unknown" };

/** The pure comparator: baked stamp vs the lane's disk stamps.
 *
 *  - baked absent (an unstamped build, pre-handshake) → unknown —
 *    never a false alarm while the fleet rolls over.
 *  - served row absent for this package (route moved, package
 *    renamed) → unknown, not stale.
 *  - equal stamps → fresh; different → STALE (the banner's cause).
 */
export function buildVerdict(baked: string | undefined, served: Record<string, string>): BuildVerdict {
  if (baked === undefined) return { kind: "unknown" };
  const current = served[OWN_PACKAGE];
  if (current === undefined) return { kind: "unknown" };
  return current === baked ? { kind: "fresh" } : { kind: "stale", baked, served: current };
}

/** This tab's baked stamp (undefined until the stamped build lands). */
export function bakedStamp(): string | undefined {
  const g = globalThis as Record<string, unknown>;
  const v = g[BUILD_STAMP_GLOBAL];
  return typeof v === "string" && v !== "" ? v : undefined;
}

/** Probe the lane once: fetch the served stamps and compare.
 *  Any failure resolves "unknown" — the handshake never invents a
 *  stale verdict out of a network hiccup. */
export async function probeBuild(): Promise<BuildVerdict> {
  const baked = bakedStamp();
  try {
    const res = await fetch(CARD_BUILD_ROUTE, { cache: "no-store" });
    if (!res.ok) return { kind: "unknown" };
    const body = await res.json() as { stamps?: Record<string, string> };
    return buildVerdict(baked, body.stamps ?? {});
  } catch {
    return { kind: "unknown" };
  }
}
