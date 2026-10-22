// trail.ts — THE TRAIL LAWS' SHARED SEAM (2026-10-22): the output
// trail's dedup/canonical laws live here so EVERY carrier obeys them
// — the patch door's archive (remote.ts), the load/undo memory carry
// (bench.ts), and any future writer. remote.ts imports bench.ts, so
// bench-facing carriers can never import remote.ts back; this module
// is the cycle-free home both sides share.
import { RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage";
/** One url, canonical: the run-relative path. The media route and
 *  the gallery proxy spell the SAME file two ways
 *  (/melite-media/runs/<rest>, /infer-gallery/artifact?path=<enc>) —
 *  every dedup compares canonical forms, never wire spellings. The
 *  run-media prefix rides the contract's constant — the closure
 *  gate's no-second-copy law. */
const MEDIA_RUNS = RUN_MEDIA_PREFIX + "/";
export function canonicalOutputUrl(url) {
    if (url.startsWith(MEDIA_RUNS))
        return url.slice(MEDIA_RUNS.length);
    if (url.startsWith("/infer-gallery/artifact?path=")) {
        try {
            return decodeURIComponent(url.slice("/infer-gallery/artifact?path=".length));
        }
        catch {
            // a malformed escape is not a spelling of another file — keep it
            return url;
        }
    }
    return url;
}
/** A result's OUTPUT urls, one spelling: the artifacts name→url map
 *  first, the flat assetUrls list second, the lone url third (the
 *  same harvest order the client's preview reads). */
export function resultOutputUrls(result) {
    if (typeof result !== "object" || result === null || Array.isArray(result))
        return [];
    const row = result;
    const urls = [];
    if (row["artifacts"] !== null && typeof row["artifacts"] === "object" && !Array.isArray(row["artifacts"])) {
        for (const v of Object.values(row["artifacts"])) {
            if (typeof v === "string" && v !== "")
                urls.push(v);
        }
    }
    if (urls.length === 0 && Array.isArray(row["assetUrls"])) {
        for (const v of row["assetUrls"]) {
            if (typeof v === "string" && v !== "")
                urls.push(v);
        }
    }
    if (urls.length === 0 && typeof row["url"] === "string" && row["url"] !== "")
        urls.push(row["url"]);
    return urls;
}
const TRAIL_TERMINAL = new Set(["done", "completed", "failed", "stopped"]);
/** The draft row's terminal words (see remote.ts's trail laws). */
export function isTerminalTrailWord(v) {
    return typeof v === "string" && TRAIL_TERMINAL.has(v);
}
/** Same run identity: two non-empty equal run_id strings. */
export function sameTrailRunIdentity(a, b) {
    return typeof a === "string" && a !== "" && a === b;
}
/** THE ONE-ROW-PER-RUN TRAIL (bench-trail W2's law, applied to any
 *  carried history): identity is the run_id first — the media route
 *  and the gallery proxy spell the same file differently — with the
 *  canonical-url set as the no-id fallback. Order preserved, newest
 *  first in, newest first out. */
export function trailDedupe(history) {
    const out = [];
    const runIds = new Set();
    const sets = [];
    for (const entry of history) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
            out.push(entry);
            continue;
        }
        const row = entry;
        const rid = row["run_id"];
        if (typeof rid === "string" && rid !== "") {
            if (runIds.has(rid))
                continue;
            runIds.add(rid);
        }
        const canon = new Set(resultOutputUrls(row).map(canonicalOutputUrl));
        if (sets.some((s) => s.size === canon.size && [...s].every((u) => canon.has(u))))
            continue;
        sets.push(canon);
        out.push(entry);
    }
    return out;
}
//# sourceMappingURL=trail.js.map
