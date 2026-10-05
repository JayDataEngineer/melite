// linked.ts — the linked-input spelling (2026-09-10).
//
// The editor injects an upstream card's output as its asset URL in
// TWO spellings: absolute (http://host/v1/assets/runs/…) and
// root-relative (/v1/assets/runs/…). A root-relative value can ONLY
// be a gateway asset URL (estate absolutes carry their mount
// prefix), so rewrite it to the runs-root mount path — same estate,
// no HTTP round-trip, and the compose-time existence check stays
// meaningful (a missing producer file refuses at compose, not deep
// in the engine). Absolute URLs ride verbatim — the submit-time
// uploader fetches and stages them.
import { join, sep } from "node:path";
import { LEGACY_RUN_MEDIA_PREFIX, RUN_MEDIA_PREFIX, runMediaPrefixOf } from "@melite/contracts/benchStage";
/** The asset-URL mount: the LIVE spelling, and the legacy one
 *  that every stored bench, archive and run row still carries (it
 *  died with the gateway app; the media route serves BOTH names
 *  forever — operator, 2026-10-10: "THERE IS NO FILTER, NO BREAKAGE
 *  FROM THIS. EVER."). A linked input may name either; both resolve
 *  to the same confined file under the runs root. */
export const ASSET_RUNS_PREFIX = LEGACY_RUN_MEDIA_PREFIX + "/";
export const MEDIA_RUNS_PREFIX = RUN_MEDIA_PREFIX + "/";
/** The run-media prefix a path names, or "" when it names none.
 *  The prefixes are the CONTRACT's (benchStage.ts) — the same two
 *  names the media route mounts and the bench heals, so a reader
 *  here cannot fall behind the writer there. */
export function runMediaPrefix(path) {
    const prefix = runMediaPrefixOf(path);
    return prefix === null ? "" : prefix + "/";
}
/** The runs output root (assets.ts defaultAssetRoots semantics:
 *  MELITE_STATE_ROOT first, else the estate's data tree). */
export function runsRoot() {
    const state = process.env["MELITE_STATE_ROOT"] ?? join(process.cwd(), "data", "runs");
    return join(state, "output");
}
/** Rewrite a root-relative asset URL to its estate mount path;
 *  every other spelling rides verbatim. A rewritten path that
 *  escapes the runs root refuses LOUD (never a smuggled read). */
export function resolveLinkedInput(ref) {
    const s = ref.trim();
    const prefix = runMediaPrefix(s);
    if (prefix === "")
        return s;
    const root = runsRoot();
    const abs = join(root, s.slice(prefix.length));
    if (abs !== root && !abs.startsWith(root + sep)) {
        throw new Error(`linked input '${s}' escapes the runs root — upstream outputs only, never hand-spelled paths`);
    }
    return abs;
}
//# sourceMappingURL=linked.js.map
