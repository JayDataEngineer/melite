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
 *  resolution is the source-file-relative root). */
export function resolveRepoRoot() {
    const override = process.env["MELITE_REPO_ROOT"] ?? "";
    if (override !== "")
        return override;
    const here = dirname(fileURLToPath(import.meta.url));
    // src→comfyui→engines→packages→repo (4 hops).
    return resolve(here, "..", "..", "..", "..");
}
/** The endpoint config dict — the single spelling of the law:
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the plugin's
 *  data/comfyui_endpoint.json; INFERENCE_TEST_SANDBOX without the
 *  env path resolves to {} (the test-sandbox leak gate); a
 *  present-but-unparseable file raises LOUD (never silent {}). */
/** The endpoint config's write target: the first EXISTING candidate,
 *  else the plugin's own data path (a fresh write). The same
 *  resolution loadEndpointConfig reads — one spelling for read and
 *  write (the endpoint_set manage action rewrites only `url`). */
export function endpointConfigPath() {
    const envPath = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
    if (envPath !== "")
        return envPath;
    return join(resolveRepoRoot(), "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
}
export function loadEndpointConfig() {
    const envPath = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
    const sandbox = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
    if (sandbox !== "" && envPath === "")
        return {};
    const cands = envPath !== ""
        ? [envPath]
        : [
            join(resolveRepoRoot(), "packages", "engines", 
            // The PLUGIN's own data dir (deep-audit engine finding
            // #1, fixed 2026-09-10): the stale `comfyui` segment
            // pointed at a tree with no data/ — the shipped
            // estate-truth file was silently skipped
            // (`if (!existsSync(cand)) continue` → {}).
            "comfyui-cordis", "data", "comfyui_endpoint.json"),
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
