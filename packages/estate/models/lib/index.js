// index.ts — the models provisions door: family DECL provision files
// served same-origin under the DSH origin, from OUR model packages +
// the weights mount. The `packages/models/*` families are PACKAGES
// we made: the door IMPORTS them (the booted DECL table — kimodo's
// row carries the skin's folder + sha256) and serves their OWNED
// bytes. The door serves only declared, verified bytes; it does not
// forward client traffic or download models.
//
// THE 502 THAT DIED HERE (2026-09-12): the motion studio's SOMA skin
// fetch (`/v1/models/kimodo/provisions/skin_standard.npz`) fell
// through to the tools' estate request, which 502'd "no remote
// serves" — the gateway lane fallback died 2026-09-10 and nothing
// DSH-native replaced it. This route is the replacement, the
// estate-media precedent verbatim: a named route on ctx.webServer
// ("another plugin registers every feature route"), reading the
// imported family DECLs and the weights mount DIRECTLY.
//
// ACQUISITION: the live door delegates missing or drifted DECL
// artifacts to the shared ProvisioningService. The service submits
// the complete row to ComfyUI-Manager's install_model queue, then
// verifies the declared path and SHA-256. This door never downloads
// model bytes itself.
// Grammar (the client seam's one truth):
//   GET /v1/models/<family>/provisions/<name>
// Placement (the provision service's declared row + boundModelFolders):
// <download_path>/<folder>/<name>, where
// download_path resolves endpoint model_download_path (when set)
// else endpoint model_base_path (when set) else
// <root models.download_root>/<engines.comfyui.base>. The DECL's
// place, never guessed. Present + sha-matching → served with
// immutable caching (sha-pinned bytes). GET/HEAD only; everything
// else is 405. Unknown families/provisions are LOUD 404s (never a
// fallback absorbing them).
//
// Erasable-syntax TS only: no enums, `import type` for types.
import { segmentConfined } from "@melite/contracts/mediaKinds";
import { bootModels } from "@melite/comfyui-cordis/models-service";
import { ProvisioningError, writeVerifiedArtifact, } from "@melite/estate-provisioning";
import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync, } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
export const name = "estate-models";
/** The route this plugin claims (one prefix, disjoint by law —
 *  nothing else serves /v1/models/* since the gateway died). */
export const MODELS_PREFIX = "/v1/models";
/** The store-root override (test seam + lane override). UNSET in
 *  prod — the endpoint + root configs are the SSOT (the provision
 *  law: storage is configured, never guessed). */
export const STORE_ROOT_ENV = "MELITE_MODELS_STORE_ROOT";
// ONE SEGMENT GRAMMAR (li-aq.3, the closure audit's RULE 10 find):
// this private charset was the media door's law re-spelled — the
// drift class segmentConfined exists to kill. The contracts' own
// grammar (space/unicode/parens legal, dots-only and NUL refused)
// is THE law; the regex is gone.
/** A mapped failure — status + code + message ride the response. */
export class ModelsDoorError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
/** Parse /<family>/provisions/<name> after the prefix; null when the
 *  shape or a segment violates the confinement grammar. */
export function parseTarget(sub) {
    const parts = sub.split("/").filter((p) => p !== "");
    if (parts.length !== 3)
        return null;
    const family = parts[0];
    const lite = parts[1];
    const name = parts[2];
    if (lite !== "provisions")
        return null;
    if (!segmentConfined(family) || !segmentConfined(name))
        return null;
    return { family, name };
}
/** Ascend from startDir to the checkout root (the dir carrying
 *  inference.config.json). Throws LOUD when the walk escapes
 *  without finding it — storage is configured, never guessed. */
export function findRepoRoot(startDir) {
    let dir = startDir;
    for (let i = 0; i < 16; i++) {
        if (existsSync(join(dir, "inference.config.json")))
            return dir;
        const parent = dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    throw new ModelsDoorError(502, "models/no-repo-root", "no inference.config.json above " +
        startDir +
        " — the models store root is configured from the project root (never guessed)");
}
function rootStr(v) {
    return String(v ?? "").trim();
}
/** Joins the engine base under a models root, never twice: overlays
 *  written under the old replacement semantics bake the base into
 *  read_root/download_root, and the merge law must not re-append it
 *  (mirrors provision-config.ts joinBase — the twin law).
 *  @param root the models root
 *  @param base the engines.comfyui.base subdirectory ("" = no base)
 *  @returns the joined store root, unchanged when it already ends
 *           with the base */
function joinBaseOnce(root, base) {
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
 *  shadows KEYS, never the whole file (mirrors provision-config.ts
 *  mergeOverlay — the twin law).
 *  @param tracked the parsed inference.config.json value
 *  @param overlay the parsed data/inference.local.json value
 *  @returns the merged configuration value */
function mergeRootOverlay(tracked, overlay) {
    if (typeof tracked !== "object" || tracked === null || Array.isArray(tracked) ||
        typeof overlay !== "object" || overlay === null || Array.isArray(overlay)) {
        return overlay;
    }
    const out = { ...tracked };
    for (const [k, v] of Object.entries(overlay)) {
        out[k] = mergeRootOverlay(out[k], v);
    }
    return out;
}
/** Resolve the weights store root from one checkout dir (the
 *  provision script's boundModelFolders law, verbatim): endpoint
 *  model_download_path (when set) else endpoint model_base_path
 *  (when set) else <root models.download_root>/<engines.comfyui.
 *  base>. The root config is the machine-local overlay
 *  (data/inference.local.json) when present, else the tracked
 *  inference.config.json — the SAME overlay law as provision-config
 *  loadRoot (machine-local absolutes live in the untracked overlay
 *  ONLY; the tracked tree ships portable repo-relative defaults, so
 *  a fresh clone never inherits another machine's /mnt). A relative
 *  store anchors to the repo dir (the CLI's anchorDir law). A
 *  present-but-empty endpoint key refuses LOUD (unset the key to
 *  inherit — never guessed); an unset read_root refuses LOUD (the
 *  provision law's own die). */
export function loadStoreRoot(repoDir) {
    const ep = JSON.parse(readFileSync(join(repoDir, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json"), "utf8"));
    for (const k of ["model_download_path", "model_base_path"]) {
        const raw = ep[k];
        if (raw !== undefined && raw !== null && String(raw).trim() === "")
            throw new ModelsDoorError(502, "models/empty-endpoint-key", `${k} is EMPTY in the endpoint config — unset the key to inherit the root config (inference.config.json), or name it explicitly (never guessed)`);
    }
    // overlay merged over the tracked defaults (untracked,
    // gitignored): the machine-local pin shadows KEYS, never the
    // whole file — mirrors provision-config.ts loadRoot exactly
    const overlayPath = join(repoDir, "data", "inference.local.json");
    const rootPath = join(repoDir, "inference.config.json");
    const overlay = existsSync(overlayPath)
        ? JSON.parse(readFileSync(overlayPath, "utf8"))
        : null;
    let root;
    if (overlay !== null && existsSync(rootPath)) {
        root = mergeRootOverlay(JSON.parse(readFileSync(rootPath, "utf8")), overlay);
    }
    else if (overlay !== null) {
        root = overlay;
    }
    else {
        root = JSON.parse(readFileSync(rootPath, "utf8"));
    }
    if (rootStr(root.models?.read_root) === "")
        throw new ModelsDoorError(502, "models/no-read-root", "models.read_root is unset in inference.config.json — model storage is configured from the project root (never guessed)");
    const epDl = rootStr(ep.model_download_path);
    const epBase = rootStr(ep.model_base_path);
    const rootDl = rootStr(root.models?.download_root);
    const rootBase = rootStr(root.engines?.comfyui?.base);
    // joinBase, never a bare join: overlays written under the old
    // replacement semantics bake the base into the root — the merge
    // law must not re-append it (mirrors provision-config joinBase)
    const store = epDl || epBase || (rootDl !== "" || rootBase !== "" ? joinBaseOnce(rootDl, rootBase) : "");
    if (store === "")
        throw new ModelsDoorError(502, "models/no-store-root", "no models store root resolves (endpoint model_download_path/model_base_path unset AND root models.download_root unset) — configure model storage (never guessed)");
    // a relative store anchors to the checkout (portable defaults)
    return isAbsolute(store) ? store : join(repoDir, store);
}
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
/** Resolve the weights store root: the env override wins (test seam
 *  + lane override); else the checkout configs (repoDir overridable
 *  for tests — prod always passes the repo root). */
export function resolveStoreRoot(repoDir) {
    const env = rootStr(process.env[STORE_ROOT_ENV]);
    if (env !== "")
        return env;
    return loadStoreRoot(repoDir ?? findRepoRoot(MODULE_DIR));
}
/** The DECL provisions for one family (the booted table — OUR
 *  packages, never a remote). Unknown family refuses LOUD. */
export async function provisionsForFamily(family) {
    const svc = await bootModels();
    let decl;
    try {
        decl = svc.getModel(family);
    }
    catch {
        throw new ModelsDoorError(404, "models/unknown-family", `unknown model family '${family}' (the booted table holds this lane's families)`);
    }
    // absent ≡ empty (the declaration law — readers ?? []; a family
    // that declares no provisions serves no provision files). The
    // UNION LAW (2026-10-12 model audit, fix 1) adds the variant-cell
    // artifacts: provisions and artifacts are parallel channels — the
    // manage plane lists both, deduped by url+folder (variants share
    // artifacts), basename with the C5 query/fragment strip.
    const rows = [...(decl.provisions ?? [])];
    const seen = new Set(rows.map((r) => r.url + "\u0000" + r.folder));
    /* variants is required on ModelDecl and validateDecl refuses a
     * non-array at registration — the ?? fallback was provably dead
     * and deleted (audit 2026-10-13). */
    for (const variant of decl.variants) {
        for (const cell of variant.cells) {
            const artifact = cell.artifact;
            if (artifact === undefined || artifact === null)
                continue;
            const key = artifact.source_url + "\u0000" + artifact.dest_sub;
            if (seen.has(key))
                continue;
            seen.add(key);
            let name = artifact.source_url.slice(artifact.source_url.lastIndexOf("/") + 1);
            const cut = Math.max(name.indexOf("?"), name.indexOf("#"));
            if (cut >= 0)
                name = name.slice(0, cut);
            rows.push({
                name,
                url: artifact.source_url,
                folder: artifact.dest_sub,
                sha256: artifact.sha256,
                size_bytes: artifact.size_bytes,
            });
        }
    }
    return rows;
}
/** sha256 hex of one file (the DECL sha gates every serve).
 *  CHUNKED, never whole-file: a single Buffer refuses >2GiB files
 *  (Node's fs cap — the 2.81GB int8 VAE hit it 2026-09-20 and
 *  killed the provision run mid-verify); the digest is identical,
 *  the memory is bounded at 8MB whatever the artifact. */
export function sha256OfFile(path) {
    const h = createHash("sha256");
    const fd = openSync(path, "r");
    try {
        const chunk = Buffer.alloc(8 * 1024 * 1024);
        for (;;) {
            const n = readSync(fd, chunk, 0, chunk.length, null);
            if (n === 0)
                break;
            h.update(chunk.subarray(0, n));
        }
    }
    finally {
        closeSync(fd);
    }
    return h.digest("hex");
}
/** Resolve the DECL place: <store>/<folder>/<name>. A folder
 *  segment violating the confinement grammar is a corrupt tree —
 *  refuse LOUD, never escape the mount. */
export function resolveDest(store, folder, name) {
    const segs = folder.split("/").filter((p) => p !== "");
    for (const seg of segs) {
        if (!segmentConfined(seg))
            throw new ModelsDoorError(502, "models/bad-provision-folder", `family provision folder '${folder}' escapes the confinement grammar — a corrupt DECL (fix the family package, never the door)`);
    }
    return join(store, ...segs, name);
}
/** Verified-file cache: dest → stat identity. A hit skips the
 *  re-hash (multi-GB provisions hash once per mtime, not per
 *  request); any stat drift re-verifies. Successes stay cached. */
const verified = new Map();
function statIdentity(stat) {
    return `${String(stat.dev)}:${String(stat.ino)}:${String(stat.size)}:${String(stat.mtimeMs)}`;
}
/** True when dest exists, is a file, and matches the verified
 *  identity — else false (and the stale cache row drops). */
export function isVerified(dest) {
    const hit = verified.get(dest);
    if (hit === undefined)
        return false;
    let stat;
    try {
        stat = statSync(dest);
    }
    catch {
        verified.delete(dest);
        return false;
    }
    if (!stat.isFile() || statIdentity(stat) !== hit) {
        verified.delete(dest);
        return false;
    }
    return true;
}
/** Test seam: drop the verified cache (fresh process per wall —
 *  belt-and-braces for in-process reuse). */
export function resetVerifiedForTests() {
    verified.clear();
}
function markVerified(dest) {
    verified.set(dest, statIdentity(statSync(dest)));
}
/** Plain TS streaming fetch (the provision script's law — no
 *  external binaries, no MCP), narrowed to the door's FetchFn face.
 *  The default seam for liveAcquire (specs inject fakes). */
export function liveFetchDirect(url) {
    return fetch(url).then((r) => ({ status: r.status, body: r.body }));
}
/** In-flight materializations by dest (the stampede map —
 *  concurrent requests for one missing file share ONE download,
 *  like the client seam's GET dedup). Entries drop on settle,
 *  success AND failure (a failed flight stays retryable, never
 *  latched). */
const inflight = new Map();
/** Test seam: drop the stampede map (fresh process per wall). */
export function resetInflightForTests() {
    inflight.clear();
}
export async function acquireRow(row, dest, fetchFn) {
    const flying = inflight.get(dest);
    if (flying !== undefined)
        return flying;
    const sha = row.sha256;
    if (sha === undefined)
        throw new ModelsDoorError(502, "models/unpinned-provision", `provision '${row.name}' carries no DECL sha256 (an unpinned row never materializes) — pin the sha in the family package`);
    const flight = downloadRow(row, sha, dest, fetchFn);
    inflight.set(dest, flight);
    flight.then(() => {
        inflight.delete(dest);
    }, () => {
        inflight.delete(dest);
    });
    return flight;
}
async function downloadRow(row, sha, dest, fetchFn) {
    let res;
    try {
        res = await fetchFn(row.url);
    }
    catch {
        throw new ModelsDoorError(502, "models/acquire-refused", `the DECL distribution for provision '${row.name}' is unreachable (${row.url}) — re-run \`provision models\``);
    }
    if (res.status !== 200 || res.body === null) {
        throw new ModelsDoorError(502, "models/acquire-refused", `the DECL distribution for provision '${row.name}' refused (HTTP ${String(res.status)}) — re-run \`provision models\``);
    }
    try {
        await writeVerifiedArtifact({
            root: dirname(dest),
            relativePath: basename(dest),
            expectedSha256: sha,
            operationId: `model-${String(process.pid)}`,
            source: res.body,
        });
    }
    catch (error) {
        if (error instanceof ProvisioningError && error.code === "hash-mismatch") {
            throw new ModelsDoorError(502, "models/sha-mismatch", `provision '${row.name}' misses the DECL sha (the DECL pins ${sha}) — the temp bytes were deleted, re-run \`provision models\``);
        }
        throw new ModelsDoorError(502, "models/acquire-refused", `the DECL distribution for provision '${row.name}' could not be landed safely (${error instanceof Error ? error.message : String(error)})`);
    }
}
function sendError(res, status, code, message) {
    res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
    });
    res.end(JSON.stringify({ error: code, message }));
}
/** Check dest against the pinned DECL sha (match marks the
 *  verified cache and answers true; anything else answers false —
 *  the caller decides heal vs refusal, this never throws). */
function checkSha(sha, dest) {
    if (isVerified(dest))
        return true;
    // Unverified (first touch this process, or stat drift): hash it.
    if (sha256OfFile(dest).toLowerCase() === sha.toLowerCase()) {
        markVerified(dest);
        return true;
    }
    return false;
}
/** Serve one parsed target. The mount first; a miss materializes
 *  the DECL row from its own pinned distribution (direct fetch →
 *  temp → sha gate → rename — never a forward, never a fallback),
 *  then the DECL sha gates the serve either way. Mapped failures
 *  throw ModelsDoorError (status rides); anything else propagates
 *  to the last-ditch 500 (never a hung socket). */
export async function serveTarget(target, res, deps, isHead) {
    const rows = await deps.provisions(target.family);
    const row = rows.find((r) => r.name === target.name);
    if (row === undefined)
        throw new ModelsDoorError(404, "models/unknown-provision", `family '${target.family}' declares no provision '${target.name}' (the DECL is the whole catalog)`);
    const dest = resolveDest(deps.storeRoot(), row.folder, row.name);
    // An unpinned row refuses before the mount AND the wire (nothing
    // unverifiable ever lands, never serves).
    const sha = row.sha256;
    if (sha === undefined)
        throw new ModelsDoorError(502, "models/unpinned-provision", `provision '${row.name}' carries no DECL sha256 (an unpinned row never materializes) — pin the sha in the family package`);
    let present = false;
    try {
        present = statSync(dest).isFile();
    }
    catch {
        present = false;
    }
    if (!present || !checkSha(sha, dest)) {
        if (deps.provisioning === undefined) {
            throw new ModelsDoorError(503, "models/provisioning-unavailable", "declared model acquisition requires the shared provisioning service");
        }
        const result = await deps.provisioning.ensure({ kind: "model", owner: "family", id: target.family }, { items: [row.name] });
        if (result.state !== "active") {
            throw new ModelsDoorError(502, `models/provision-${result.state}`, result.detail ?? `provision '${row.name}' did not become active`);
        }
        if (!checkSha(sha, dest)) {
            throw new ModelsDoorError(502, "models/sha-mismatch", `provision '${row.name}' did not produce the declared bytes`);
        }
    }
    const bytes = readFileSync(dest);
    res.writeHead(200, {
        // sha-pinned immutable bytes (the DECL sha addresses the
        // content — a changed file is a different sha, never a stale
        // cache hit).
        "content-type": "application/octet-stream",
        "content-length": String(bytes.length),
        "cache-control": "public, max-age=31536000, immutable",
    });
    if (!isHead)
        res.end(bytes);
    else
        res.end();
}
/** Build the webServer handler from explicit seams (specs inject
 *  fakes; apply wires the live plane). */
export function createHandler(deps) {
    return async (req, res) => {
        try {
            if (req.method !== "GET" && req.method !== "HEAD") {
                res.writeHead(405, {
                    "content-type": "application/json",
                    allow: "GET, HEAD",
                    "cache-control": "no-store",
                });
                res.end('{"error":"models/method-not-allowed"}');
                return;
            }
            const url = new URL(req.url ?? "/", "http://estate-models.invalid");
            const target = parseTarget(url.pathname.slice(MODELS_PREFIX.length));
            if (target === null) {
                res.writeHead(404, {
                    "content-type": "application/json",
                    "cache-control": "no-store",
                });
                res.end('{"error":"models/not-found"}');
                return;
            }
            try {
                await serveTarget(target, res, deps, req.method === "HEAD");
            }
            catch (err) {
                if (err instanceof ModelsDoorError) {
                    sendError(res, err.status, err.code, err.message);
                    return;
                }
                throw err;
            }
        }
        catch {
            // THE LAST DITCH: truly unexpected (disk race past the
            // committed head, a seam throwing foreign) — LOUD 500, never
            // a hung socket. Headers already sent means the head
            // committed — destroy instead of writing past it.
            if (res.headersSent) {
                res.destroy();
                return;
            }
            res.writeHead(500, {
                "content-type": "application/json",
                "cache-control": "no-store",
            });
            res.end('{"error":"models/internal"}');
        }
    };
}
/** The live store root (the checkout configs — the env override
 *  rides inside resolveStoreRoot). A named seam so the specs pin
 *  the apply wiring without touching the mount. */
export function liveStoreRoot() {
    return resolveStoreRoot();
}
/** The queue seat's read face is NOT needed here — the models
 *  plane boots itself (bootModels' singleton, the same boot the
 *  card registry rides). The webServer seat is an OPTIONAL PROBE
 *  at apply time (the media door's law): absent (a headless mount)
 *  the route simply does not mount, with a log line saying so. */
export function apply(ctx) {
    const webServer = ctx.get("webServer", false);
    if (webServer === undefined) {
        ctx.logger.info("estate-models: no webServer seat in this mount — the provisions route stays unmounted");
        return;
    }
    const provisioning = ctx.get("provisioning", false);
    if (provisioning === undefined) {
        ctx.logger.warn("estate-models: no provisioning service in this mount — declared model bytes cannot be acquired");
        return;
    }
    ctx.effect(() => webServer.register({
        kind: "prefix",
        path: MODELS_PREFIX,
        handler: createHandler({
            storeRoot: liveStoreRoot,
            provisions: provisionsForFamily,
            provisioning,
        }),
    }, "estate-models: family provision files route"));
    ctx.logger.info("estate-models: serving %s/*/provisions/* from the family DECLs + the weights mount", MODELS_PREFIX);
}
/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
//# sourceMappingURL=index.js.map
