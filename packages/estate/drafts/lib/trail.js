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
/** Two url lists, same set (order-blind — the archive's identity
 *  comparison; remote.ts's sameUrlSet moved here with the applier
 *  so the two writers share the one spelling). */
function sameUrlSet(a, b) {
    if (a.length !== b.length)
        return false;
    const canonA = a.map(canonicalOutputUrl).sort();
    const canonB = b.map(canonicalOutputUrl).sort();
    return canonA.every((u, i) => u === canonB[i]);
}
/** THE OUTCOME APPLY (moved verbatim from remote.ts's patchBody
 *  writeTelemetry closure, 2026-10-26 carry-batch: the restore's
 *  batched carry lands through bench/add-stages — a second writer
 *  the trail laws must judge identically, and a forked copy is how
 *  the archive drifts. ONE implementation, two doors: drafts/patch
 *  (the live observer's door, with its R6 live-row re-resolution at
 *  the call) and addStagesBench's per-row outcome arm (fresh rows
 *  in hand — no re-resolution needed). @param stage the LIVE row to
 *  mutate in place @param patch the outcome body ({result?,
 *  runStatus?, health?} — telemetry only, never author keys). */
export function applyOutcomePatch(stage, patch) {
    if ("result" in patch) {
        // THE OUTPUT HISTORY (stroke 40 — the operator's QOL law: the
        // preview's mini row is a CARD OUTPUT HISTORY): a stage's
        // result is the CURRENT run's face, and every poll state
        // overwrites it — the live patch ({run_id, progress}) would
        // destroy the previous run's outputs. Before any result
        // overwrite, a result CARRYING outputs is archived onto the
        // stage's history, newest first, capped (12), deduped by its
        // url set: only UNIQUE outputs ride (the operator's word — a
        // re-run landing the same urls never double-lists). The
        // history is DERIVED here, never patched in — the estate owns
        // the trail; the client reads it.
        //
        // THE PARAMS SNAPSHOT (the output-component stroke — "old
        // generations that had different parameters"): the params that
        // MADE a result are captured at ITS LANDING (a parallel
        // server-derived key), never at overwrite time — params
        // edited between runs must not retroactively re-label the old
        // generation. The archive entry carries the snapshot; the
        // client diffs it against the live params for the chip.
        // THE TERMINAL-HOLDS LAW (bench-trail W3, judged PRE-write): a
        // settled run's row never un-settles — a stale poll/tail pass
        // re-stamping a non-terminal word for the SAME run_id writes
        // NOTHING (result included; the tile's stuck face). A
        // different run_id is a fresh press and runs.
        const settledRunId = typeof stage["result"] === "object" && stage["result"] !== null && !Array.isArray(stage["result"])
            ? stage["result"]["run_id"]
            : undefined;
        const patchRunId = typeof patch["result"] === "object" && patch["result"] !== null && !Array.isArray(patch["result"])
            ? patch["result"]["run_id"]
            : undefined;
        if (isTerminalTrailWord(stage["runStatus"]) && !isTerminalTrailWord(patch["runStatus"])
            && typeof patchRunId === "string" && sameTrailRunIdentity(settledRunId, patchRunId))
            return;
        // THE HUSK-DOWNGRADE REFUSAL (trail-defect-hunt §2): a
        // terminal, url-less result for a run whose settled face
        // carries urls is bookkeeping (the seat's own mirror husk
        // racing the client's rich patch) — the hero slot never
        // downgrades. A DIFFERENT run_id is a fresh press and runs.
        if (isTerminalTrailWord(patch["runStatus"]) && sameTrailRunIdentity(settledRunId, patchRunId)
            && resultOutputUrls(stage["result"]).length > 0
            && resultOutputUrls(patch["result"]).length === 0)
            return;
        const prev = stage["result"];
        const next = patch["result"];
        // THE TRAIL IS ONE LIST, HEAD = CURRENT (operator 2026-09-21,
        // the lost-gen disease: "when I make a new gen it doesn't
        // appear in history — clicking a history item overwrites the
        // preview with no way to recover the most recent gen"). Two
        // archives ride the SAME write, oldest-first so the order in
        // the list is append-stable:
        //   1. SUPERSEDE — a cleared/overwritten result that carried
        //      outputs is archived (the stroke-40 law, unchanged: a
        //      face that would LOSE urls never drops them).
        //   2. LANDING — the incoming result itself, when it CARRIES
        //      outputs AND the write is not a LIVE face (the
        //      settled-landing law, bench-trail W1: the current run's
        //      urls never enter history before the card finishes; a
        //      mid-run face archives nothing). A result-only patch (no
        //      runStatus arm) is a pick/manual spell, not a run face —
        //      it lands unless the row reads a live word (the landing
        //      gate below).
        //      History[0] is ALWAYS the newest SETTLED gen. Live
        //      mid-run patches ({run_id, progress} — no urls) archive
        //      nothing either way, and the dedup makes re-landings
        //      idempotent.
        const archiveInto = (urls, entry) => {
            const hist = Array.isArray(stage["history"]) ? [...stage["history"]] : [];
            // THE ONE-ROW-PER-RUN LAW (bench-trail W2): a run is one
            // history entry — the media route and the gallery proxy
            // spell the same file differently, so identity is the
            // run_id, with the canonical-url set as the no-id fallback
            const entryRunId = typeof entry["run_id"] === "string" ? entry["run_id"] : undefined;
            if (entryRunId !== undefined) {
                const already = hist.some((e) => sameTrailRunIdentity(e["run_id"], entryRunId));
                if (already)
                    return;
            }
            const canon = urls.map(canonicalOutputUrl);
            const already = hist.some((e) => sameUrlSet(resultOutputUrls(e), canon));
            if (!already) {
                hist.unshift(entry);
                stage["history"] = hist.slice(0, 12);
            }
        };
        // the landing gate (bench-trail W1 vs the pinned pick-spell
        // contract, remote.spec "empty {} snapshot"): a write that
        // DECLARES a live run face (a non-terminal runStatus arm)
        // never lands; a terminal arm lands; and a patch with NO
        // runStatus arm at all is not a run face — it lands unless the
        // row is mid-run (a live word), which is the stuck-row wound's
        // re-add shape.
        const LIVE_TRAIL_WORDS = new Set(["running", "queued", "pending", "stopping"]);
        const landingTerminal = isTerminalTrailWord(patch["runStatus"]) ||
            (!("runStatus" in patch) && !LIVE_TRAIL_WORDS.has(String(stage["runStatus"])));
        // the params arm rides only when the snapshot NAMES something —
        // an undefined or empty {} snapshot carries no key (the chip
        // diffs against live params; an empty diff is no chip at all)
        const paramsArm = (snapshot) => snapshot !== undefined && typeof snapshot === "object" && !Array.isArray(snapshot)
            && Object.keys(snapshot).length > 0
            ? { params: snapshot }
            : {};
        if (resultOutputUrls(prev).length > 0 && !sameUrlSet(resultOutputUrls(prev), resultOutputUrls(next))) {
            archiveInto(resultOutputUrls(prev), {
                ...prev,
                ...paramsArm(stage["resultParams"]),
            });
        }
        stage["result"] = patch["result"];
        stage["resultParams"] = stage["params"];
        const landingUrls = resultOutputUrls(next);
        if (landingUrls.length > 0 && landingTerminal) {
            archiveInto(landingUrls, {
                ...next,
                ...paramsArm(stage["resultParams"]),
            });
        }
    }
    if ("runStatus" in patch)
        stage["runStatus"] = patch["runStatus"];
    // THE HEALTH ARM (LOW-23): the transport word's own channel — a
    // null value DELETES the field (the recovery clear; a stage that
    // never escalated never carries it), the merge-patch semantics
    // the params arm already owns.
    if ("health" in patch) {
        if (patch["health"] === null)
            delete stage["health"];
        else
            stage["health"] = patch["health"];
    }
}
//# sourceMappingURL=trail.js.map