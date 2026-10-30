// comfyui-config.ts — the endpoint SSOT: the ONLY spelling of the
// endpoint resolution (split from comfyui.ts 2026-09-18).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ComfyError } from "./comfyui-types.js";
// before, so the source-file-relative repo-root hops are unchanged.
// ── config: the endpoint SSOT (this module is the single spelling) ──
/** No-endpoint refusal — the exact string the queue lane throws. */
export const NO_ENDPOINT_MESSAGE = "no ComfyUI endpoint: the endpoint config carries no 'url' " +
    "and COMFYUI_URL is unset (no defaults — QUEUE LANE LAW)";
/** Repo root: MELITE_REPO_ROOT override (the wall seam — default
 *  resolution is the source-file-relative root). Serves ESTATE-root
 *  reads (runtime trees, stores); package-owned data uses
 *  {@link packageRoot} — design/repo-root-anchor-2026-10-18.md. */
export function resolveRepoRoot() {
    const override = process.env["MELITE_REPO_ROOT"] ?? "";
    if (override !== "")
        return override;
    const here = dirname(fileURLToPath(import.meta.url));
    // src→comfyui→engines→packages→repo (4 hops).
    return resolve(here, "..", "..", "..", "..");
}
/** Walk up from {@link startDir} to the nearest ancestor whose
 *  package.json names THIS package — the pure core of the package
 *  anchor (test seats pass a shaped start dir; the live seat is
 *  packageRoot). A fixed hop count cannot serve both planes
 *  (src/ in the checkout sits one segment shallower than lib/src/
 *  in an install, since lib mirrors src), but the package root
 *  carries its package.json on every plane. */
export function packageRootFrom(startDir) {
    let dir = startDir;
    for (;;) {
        const marker = join(dir, "package.json");
        if (existsSync(marker)) {
            const read = readFileSync(marker, "utf8");
            const name = JSON.parse(read)["name"];
            if (name === "@melite/comfyui-cordis")
                return dir;
        }
        const parent = dirname(dir);
        if (parent === dir) {
            throw new Error("packageRoot: no ancestor carries @melite/comfyui-cordis's package.json — the package tree is malformed");
        }
        dir = parent;
    }
}
/** This package's root — the anchor for the data/ the published
 *  files set ships (`data/**`). No env pin needed: an install
 *  finds its own shipped data by construction. */
export function packageRoot() {
    return packageRootFrom(dirname(fileURLToPath(import.meta.url)));
}
/** The endpoint config dict — the single spelling of the law:
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the repo's untracked
 *  state home (overlay — wins over the seed), else the plugin's
 *  shipped data/comfyui_endpoint.json seed; INFERENCE_TEST_SANDBOX
 *  without the env path resolves to {} (the test-sandbox leak gate);
 *  a present-but-unparseable file raises LOUD (never silent {}). */
/** The endpoint config's WRITE target and overlay read head: the
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the repo's untracked
 *  state home `<repoRoot>/data/comfyui_endpoint.json` (F1, nativity
 *  audit 2026-11-05: the runtime endpoint statement is machine
 *  state — the repo-root `data/` tree is wholesale gitignored
 *  "never commit state", the same idiom as the data/inference.local
 *  overlay — so the endpoint_set manage door's write no longer
 *  dirties the tracked package tree). The tracked package seed
 *  (`packageRoot` data) is the shipped DEFAULT below this overlay:
 *  reads fall to it only when the state home is absent
 *  ({@link loadEndpointConfig}), and NO door writes it. The same
 *  resolution loadEndpointConfig reads first — one spelling for the
 *  write and the overlay read (the endpoint_set manage action
 *  rewrites only `url`). */
export function endpointConfigPath() {
    const envPath = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
    if (envPath !== "")
        return envPath;
    // Repo-root anchored (not packageRoot): the STATE home is the
    // checkout's own untracked data tree, not shipped package data.
    // resolveRepoRoot honors MELITE_REPO_ROOT (the wall fixture seam),
    // so a fixture root isolates the state home per test.
    return join(resolveRepoRoot(), "data", "comfyui_endpoint.json");
}
/** The shipped endpoint SEED — the package-tracked default the
 *  published files set carries (a fresh clone or install resolves
 *  its url from here). Read-only by law: the F1 cure moved every
 *  write to the state home above; this file never carries a live
 *  machine statement again. */
export function endpointSeedPath() {
    // Package-anchored (not resolveRepoRoot): the seed is data the
    // published package itself ships — an install with no
    // MELITE_REPO_ROOT must still find it (the consumer receipt wall
    // pins this).
    return join(packageRoot(), "data", "comfyui_endpoint.json");
}
export function loadEndpointConfig() {
    const envPath = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
    const sandbox = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
    if (sandbox !== "" && envPath === "")
        return {};
    const cands = envPath !== ""
        ? [envPath]
        : [
            // Overlay-first (F1, 2026-11-05): the untracked state home
            // shadows the seed — endpoint_set writes land here and
            // every reader (census, lora doors, live docs) keys off
            // the write, never the stale seed.
            endpointConfigPath(),
            // Package-anchored seed (deep-audit engine finding #1's
            // cure, 2026-09-10, re-anchored 2026-10-18): the PLUGIN's
            // own data dir is what the published files set ships, so
            // a fresh clone or install with no state home and no
            // MELITE_REPO_ROOT still reads its shipped default.
            endpointSeedPath(),
        ];
    for (const cand of cands) {
        if (!existsSync(cand))
            continue;
        try {
            const text = readFileSync(cand, "utf8");
            return JSON.parse(text);
        }
        catch (exc) {
            // readFileSync/JSON.parse throw Error by contract — the read
            // casts (the unknown halves are the type toll, never runtime
            // arms; 2026-09-12).
            const err = exc;
            throw new Error("endpoint config " +
                cand +
                " exists but will not parse (" +
                err.constructor.name +
                ": " +
                err.message +
                ") — fix the file; no silent fallback");
        }
    }
    return {};
}
/** The engine base URL — env seam for the hermetic walls (live env
 *  read, no caching; this function is the only spelling). */
export function resolveEngineBaseUrl() {
    const env = process.env["COMFYUI_URL"] ?? "";
    if (env !== "")
        return env.replace(/\/+$/, "");
    const cfg = loadEndpointConfig();
    const url = String(cfg["url"] ?? "").replace(/\/+$/, "");
    if (url === "")
        throw new ComfyError(NO_ENDPOINT_MESSAGE);
    return url;
}
//# sourceMappingURL=comfyui-config.js.map
