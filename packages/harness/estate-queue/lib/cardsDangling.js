// cardsDangling.ts — the artifact-ref sweep, the ONE home the
// compose gate rides through prepareCardParams (one resolver,
// one voice per refusal). Extracted from cardsRegistry: resolve
// run-artifact refs against the out roots and walk bodies for
// every ref location.
//
// THE CROSS-ROOTS LAW (§23, extended here 2026-09-24 — receipt
// transcript-034 step 18: the compose door refused a LIVE portrait
// ref because the sweep only knew the repo-anchored
// data/runs/output while the maker lane's runs mint under
// MELITE_STATE_ROOT/output; the maker paid a refusal + ~8 forensic
// calls to diagnose OUR two-roots lie): every run-resolving door
// searches the roots MANIFEST in order — own state root first,
// then the MELITE_STATE_ROOTS extras — the same walk the
// source-echo resolver (runsSourceEcho) and the run doors use.
// One law, one spelling: refs may carry EITHER estate prefix
// (/v1/assets/runs/ or /melite-media/runs/ — both are first-class
// run sources; the h3 card's own docs teach the assets spelling).
import { statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { rootsManifest, searchedVoice } from "./rootsManifest.js";
import { resolveStateRoot } from "./queueLock.js";
import { ASSET_RUNS_PREFIX, MEDIA_RUNS_PREFIX } from "./runsSourceEcho.js";
// ── artifact-ref sweep (find_dangling_refs
//    semantics — the validate-door mirror, same roots) ──────────
/** The one-prefix question: which estate route (if any) does this
 * string carry? Both spellings are the same trees (the media
 * route is the newer first-class face — runsSourceEcho's law). */
function artifactPrefixOf(raw) {
    if (raw.startsWith(ASSET_RUNS_PREFIX))
        return ASSET_RUNS_PREFIX;
    if (raw.startsWith(MEDIA_RUNS_PREFIX))
        return MEDIA_RUNS_PREFIX;
    return null;
}
/** THE SWEEP ROOTS (§23): every manifest root's output/ and
 * test-output/ trees, own state root first, deduped. A test:true
 * run may wire a test artifact — the test trees sweep too. */
export function sweepOutputRoots() {
    const roots = rootsManifest(resolveStateRoot(resolveRepoRoot()));
    const out = [];
    const seen = new Set();
    for (const root of roots) {
        for (const tree of [join(root, "output"), join(root, "test-output")]) {
            const abs = resolve(tree);
            if (!seen.has(abs)) {
                seen.add(abs);
                out.push(abs);
            }
        }
    }
    return out;
}
export function resolveArtifactFile(ref, outRoot) {
    // (refLocations yields non-empty strings only — ref is always a string here.)
    const raw = String(ref).trim();
    if (raw === "")
        throw new Error("empty artifact ref (nothing to resolve)");
    if (raw.includes(".."))
        throw new Error("artifact ref refuses traversal: " + JSON.stringify(raw));
    const prefix = artifactPrefixOf(raw);
    let cand;
    if (prefix !== null) {
        const rel = raw.slice(prefix.length);
        if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
            throw new Error("malformed artifact URL (want <prefix><run_id>/<file> with prefix " +
                ASSET_RUNS_PREFIX + " or " + MEDIA_RUNS_PREFIX + "): " + JSON.stringify(raw));
        }
        cand = join(outRoot, rel);
    }
    else if (raw.includes("/") && !raw.startsWith("/")) {
        cand = join(outRoot, raw);
    }
    else if (raw.startsWith("/")) {
        cand = raw;
    }
    else {
        throw new Error("artifact ref is a bare " +
            JSON.stringify(raw) +
            " — not an absolute path, an artifact URL (" +
            ASSET_RUNS_PREFIX + "<run>/<file> or " + MEDIA_RUNS_PREFIX +
            "<run>/<file>), or a runs-relative " +
            "<run>/<file> (a bare filename lives in the ComfyUI input " +
            "dir and is the caller's staging concern, never a disk lookup)");
    }
    const absCand = resolve(cand);
    const absRoot = resolve(outRoot);
    const relToRoot = relative(absRoot, absCand);
    if (relToRoot === ".." || relToRoot.startsWith(".." + sep)) {
        throw new Error("artifact ref escapes the output root: " + JSON.stringify(raw));
    }
    let isFile = false;
    try {
        isFile = statSync(absCand).isFile();
    }
    catch {
        isFile = false;
    }
    if (!isFile) {
        // The run id rides the ref's own first segment for every
        // prefix-URL and runs-relative shape; an absolute path carries
        // no run, so "?" names that absence.
        const run = prefix !== null || (raw.includes("/") && !raw.startsWith("/"))
            ? raw.slice(prefix !== null ? prefix.length : 0).split("/", 2)[0] // split yields >= 1
            : "?";
        throw new Error("artifact not found on disk: " + JSON.stringify(raw) + " (looked up " + absCand + ") — the " +
            "upstream run may have been pruned, or the ref was never an output of run " + run);
    }
    return absCand;
}
export function refLocations(body) {
    const out = [];
    const stack = [{ node: body, path: "$" }];
    while (stack.length > 0) {
        const top = stack.pop();
        const node = top.node;
        const path = top.path;
        if (typeof node === "object" && node !== null && !Array.isArray(node)) {
            for (const [key, value] of Object.entries(node)) {
                stack.push({ node: value, path: path + "." + key });
            }
        }
        else if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                stack.push({ node: node[i], path: path + "[" + i + "]" });
            }
        }
        else if (typeof node === "string" && artifactPrefixOf(node) !== null) {
            out.push({ location: path, ref: node });
        }
    }
    return out;
}
/** The shared sweep body: every dangling (location, ref, why) in refLocations' DFS order, each miss quoting the PRIMARY root lookup (resolveArtifactFile above) + every searched tree (the NAME-THE-ROOT law, §23). */
/** Receipt transcript-034 step 18: the old voice named ONE tree and read like a pruned run. */
function scanRefs(body) {
    const roots = sweepOutputRoots();
    const dangling = [];
    for (const { location, ref } of refLocations(body)) {
        let live = false;
        let primaryErr = null;
        for (const root of roots) {
            try {
                resolveArtifactFile(ref, root);
                live = true;
                break;
            }
            catch (e) {
                if (primaryErr === null)
                    primaryErr = e;
            }
        }
        if (!live) {
            dangling.push([location, ref, primaryErr.message + " " + searchedVoice(roots)]);
        }
    }
    return dangling;
}
/** The compose gate's first-hit question: the first dangling
 *  (location, ref, why), or null when every wired artifact URL is
 *  live under ANY swept tree (§23 — the manifest walk, own root
 *  first; a miss names every searched tree so a two-roots box
 *  stays debuggable). */
export function findCardDangling(body) {
    return scanRefs(body)[0] ?? null;
}
//# sourceMappingURL=cardsDangling.js.map
