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
import Schema from "@deepseek-ai/schemastery";
import { bootModels } from "@melite/comfyui-cordis/models-service";
import { joinBaseOnce, mergeOverlay } from "@melite/comfyui-cordis";
import { ProvisioningError, writeVerifiedArtifact, } from "@melite/estate-provisioning";
import { createHash } from "node:crypto";
import { closeSync, constants, existsSync, openSync, readFileSync, readSync, statSync, } from "node:fs";
import { open as openHandle } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
export const name = "estate-models";
/** The route this plugin claims (one prefix, disjoint by law —
 *  nothing else serves /v1/models/* since the gateway died). */
export const MODELS_PREFIX = "/v1/models";
/** The store-root override (test seam + lane override). UNSET in
 *  prod — the endpoint + root configs are the SSOT (the provision
 *  law: storage is configured, never guessed). */
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
/** Resolve the weights store DOWNLOAD root from one checkout dir.
 *  This is the provision law's DOWNLOAD arm — ONE value of the
 *  three boundModelFolders derives — never the whole law:
 *  endpoint model_download_path (when set) else endpoint
 *  model_base_path (when set) else <root
 *  models.download_root>/<engines.comfyui.base>. The READ arm
 *  (models.read_root-derived base_path) and the 22-entry folder
 *  remap map are NOT derived here: this door serves provision
 *  DESTINATIONS (where downloads land), and read_root only moves
 *  the engine's read tree — on a read_root != download_root
 *  machine this door and the provisioner's read arm disagree BY
 *  DESIGN. Anchoring also differs by role: boundModelFolders
 *  anchors each arm against the REPO constant before joining;
 *  this door anchors the RESULT against its repoDir parameter
 *  (tests pass other checkouts; production passes the repo root).
 *  The root config is the machine-local overlay
 *  (data/inference.local.json) when present, else the tracked
 *  inference.config.json — the SAME overlay law as provision-config
 *  loadRoot (machine-local absolutes live in the untracked overlay
 *  ONLY; the tracked tree ships portable repo-relative defaults,
 *  so a fresh clone never inherits another machine's /mnt). A
 *  relative store anchors to the repo dir (the CLI's anchorDir
 *  law). A present-but-empty endpoint key refuses LOUD (unset the
 *  key to inherit — never guessed); an unset read_root refuses
 *  LOUD (the provision law's own die). */
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
        root = mergeOverlay(JSON.parse(readFileSync(rootPath, "utf8")), overlay);
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
            rows.push({
                name: artifactBasename(artifact.source_url),
                url: artifact.source_url,
                folder: artifact.dest_sub,
                sha256: artifact.sha256,
                size_bytes: artifact.size_bytes,
            });
        }
    }
    return rows;
}
/** Derive a provision row's name from its artifact url — the
 *  basename with the FIRST query/fragment marker cut (audit U-E6:
 *  cutting at Math.max(indexOf("?"), indexOf("#")) kept "?query"
 *  inside the name when both markers rode one url — a phantom row
 *  whose derived name never matched the bytes). */
export function artifactBasename(url) {
    let name = url.slice(url.lastIndexOf("/") + 1);
    const q = name.indexOf("?");
    const h = name.indexOf("#");
    const cut = q < 0 ? h : h < 0 ? q : Math.min(q, h);
    if (cut >= 0)
        name = name.slice(0, cut);
    return name;
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
    // THE NAME IS A SEGMENT TOO (audit U-E5): the folder was confined
    // while the name rode unchecked — a DECL name of "..", ".", "" or
    // a path walked straight out of the mount.
    if (name === "" || name === "." || name === ".." ||
        name.includes("/") || name.includes("\\") || name.includes("\u0000"))
        throw new ModelsDoorError(502, "models/bad-provision-name", `family provision name '${name}' escapes the confinement grammar — a corrupt DECL (fix the family package, never the door)`);
    return join(store, ...segs, name);
}
function statIdentity(stat) {
    return `${String(stat.dev)}:${String(stat.ino)}:${String(stat.size)}:${String(stat.mtimeMs)}`;
}
/** Create a {@link VerifyCache} (one per mount or test wall). */
export function createVerifyCache() {
    const verified = new Map();
    const inflight = new Map();
    return {
        isVerified(dest, sha, identity) {
            const hit = verified.get(dest);
            if (hit === undefined)
                return false;
            if (hit.sha !== sha.toLowerCase())
                return false;
            let own;
            if (identity !== undefined) {
                own = identity;
            }
            else {
                let stat;
                try {
                    stat = statSync(dest);
                }
                catch {
                    // the name vanished (ENOENT) or refuses stat — either way
                    // the mark is stale; the open path re-derives the truth
                    verified.delete(dest);
                    return false;
                }
                if (!stat.isFile()) {
                    verified.delete(dest);
                    return false;
                }
                own = statIdentity(stat);
            }
            if (own !== hit.identity) {
                verified.delete(dest);
                return false;
            }
            return true;
        },
        markVerified(dest, sha, identity) {
            verified.set(dest, {
                sha: sha.toLowerCase(),
                identity: identity ?? statIdentity(statSync(dest)),
            });
        },
        async acquireRow(row, dest, fetchFn) {
            const flying = inflight.get(`${dest}\u0000${row.sha256}`);
            if (flying !== undefined)
                return flying;
            const sha = row.sha256;
            if (sha === undefined)
                throw new ModelsDoorError(502, "models/unpinned-provision", `provision '${row.name}' carries no DECL sha256 (an unpinned row never materializes) — pin the sha in the family package`);
            const flight = downloadRow(row, sha, dest, fetchFn);
            // dest+sha keys the flight (audit U-E7): two rows resolving to
            // one dest with different shas are two fetches, never one
            // shared flight that lands the other row's bytes.
            inflight.set(`${dest}\u0000${sha}`, flight);
            flight.then(() => {
                inflight.delete(dest);
            }, () => {
                inflight.delete(dest);
            });
            return flight;
        },
        clear() {
            verified.clear();
            inflight.clear();
        },
    };
}
/** Plain TS streaming fetch (the provision script's law — no
 *  external binaries, no MCP), narrowed to the door's FetchFn face.
 *  THE HONEST SEAT (audit U-S, round 13): production heals ride the
 *  shared provisioning service (apply wires NO fetchFn) — this face
 *  exists for the walls' provisioner fakes and local provision
 *  scripting, never as a serve-time forward. */
export function liveFetchDirect(url) {
    return fetch(url).then((r) => ({ status: r.status, body: r.body }));
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
function sendError(res, status, code, message, headers = {}) {
    res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
        ...headers,
    });
    res.end(JSON.stringify({ error: code, message }));
}
/** Open dest and verify it against the pinned DECL sha — THE
 *  SINGLE-OPEN LAW (audits U-E2/U-E3/U-E4): one fd, opened
 *  O_NOFOLLOW (a symlink at dest refuses — the door serves files
 *  the DECL pinned, never a link someone placed), fstat'd for its
 *  own identity, hashed by CHUNKED async reads of THE OPEN FD, and
 *  HANDED BACK still open — the serve streams from the same fd, so
 *  the bytes on the wire are the bytes the hash judged (a rename
 *  over the name after the open cannot swap them). The caller owns
 *  the fd and closes it. Throws models/not-landed when dest is
 *  absent and models/sha-mismatch when the bytes disagree. */
async function openVerified(sha, dest, cache) {
    let file;
    try {
        file = await openHandle(dest, constants.O_RDONLY | constants.O_NOFOLLOW);
    }
    catch (err) {
        const code = err.code;
        if (code === "ENOENT")
            throw new ModelsDoorError(502, "models/not-landed", `provision bytes are absent at ${dest}`);
        if (code === "ELOOP")
            throw new ModelsDoorError(502, "models/symlink-refused", `provision path ${dest} is a symlink — the door serves files the DECL pinned, never a link (remove the link and re-provision)`);
        throw err;
    }
    const stat = await file.stat();
    if (!stat.isFile()) {
        await file.close();
        throw new ModelsDoorError(502, "models/not-landed", `provision path ${dest} is not a regular file`);
    }
    const identity = statIdentity(stat);
    if (cache.isVerified(dest, sha, identity))
        return { file, size: stat.size };
    const h = createHash("sha256");
    const chunk = Buffer.alloc(1024 * 1024);
    let pos = 0;
    for (;;) {
        const { bytesRead } = await file.read(chunk, 0, chunk.length, pos);
        if (bytesRead === 0)
            break;
        h.update(chunk.subarray(0, bytesRead));
        pos += bytesRead;
    }
    if (h.digest("hex") !== sha.toLowerCase()) {
        await file.close();
        throw new ModelsDoorError(502, "models/sha-mismatch", `bytes at ${dest} do not match the declared sha256`);
    }
    cache.markVerified(dest, sha, identity);
    return { file, size: stat.size };
}
/** Stream `size` bytes off the open handle to the response in
 *  chunks — never a whole-file Buffer (audit U-E3: a 13.5GB row
 *  must not OOM the door or block the loop on one sync read). */
async function streamFd(file, size, res) {
    const chunk = Buffer.alloc(1024 * 1024);
    let pos = 0;
    while (pos < size) {
        const { bytesRead } = await file.read(chunk, 0, Math.min(chunk.length, size - pos), pos);
        if (bytesRead === 0)
            break;
        if (!res.write(chunk.subarray(0, bytesRead)))
            await res.drain();
        pos += bytesRead;
    }
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
    let opened;
    try {
        opened = await openVerified(sha, dest, deps.cache);
    }
    catch (err) {
        if (!(err instanceof ModelsDoorError) ||
            (err.code !== "models/not-landed" && err.code !== "models/sha-mismatch")) {
            throw err;
        }
        // absent or wrong bytes: the mount heals through the shared
        // provisioner, then the SAME open-verify gate runs again — a
        // fetch that lands anything but the declared bytes refuses.
        if (deps.provisioning === undefined) {
            throw new ModelsDoorError(503, "models/provisioning-unavailable", "declared model acquisition requires the shared provisioning service");
        }
        let result;
        try {
            result = await deps.provisioning.ensure({ kind: "model", owner: "family", id: target.family }, { items: [row.name] });
        }
        catch (fault) {
            // audit U-E8: a thrown ensure is the provisioner's voice, not
            // an opaque 500 — map it at the door's boundary. The door's
            // OWN errors (acquire-refused, sha-mismatch from the shared
            // writer) ride as spoken, never re-wrapped.
            if (fault instanceof ModelsDoorError)
                throw fault;
            throw new ModelsDoorError(503, "models/provision-fault", `the provisioning service refused provision '${row.name}': ${fault instanceof Error ? fault.message : String(fault)}`);
        }
        if (result.state !== "active") {
            throw new ModelsDoorError(502, `models/provision-${result.state}`, result.detail ?? `provision '${row.name}' did not become active`);
        }
        opened = await openVerified(sha, dest, deps.cache);
    }
    try {
        res.writeHead(200, {
            // sha-pinned immutable bytes (the DECL sha addresses the
            // content — a changed file is a different sha, never a stale
            // cache hit). content-length is the verified fstat size — the
            // stream below writes exactly that many bytes off the open fd.
            "content-type": "application/octet-stream",
            "content-length": String(opened.size),
            "cache-control": "public, max-age=31536000, immutable",
        });
        if (isHead) {
            res.end();
            return;
        }
        await streamFd(opened.file, opened.size, res);
        res.end();
    }
    finally {
        await opened.file.close();
    }
}
/** Build the webServer handler from explicit seams (specs inject
 *  fakes; apply wires the live plane). */
export function createHandler(deps) {
    return async (req, res) => {
        try {
            if (req.method !== "GET" && req.method !== "HEAD") {
                // one refusal shape (audit U-S): every refusal rides
                // sendError's {error,message} body, never ad-hoc JSON —
                // the 405's allow header rides the mapped call
                sendError(res, 405, "models/method-not-allowed", "the provisions route answers GET and HEAD only", { allow: "GET, HEAD" });
                return;
            }
            const url = new URL(req.url ?? "/", "http://estate-models.invalid");
            const target = parseTarget(url.pathname.slice(MODELS_PREFIX.length));
            if (target === null) {
                sendError(res, 404, "models/not-found", "the route is /v1/models/<family>/provisions/<name>");
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
        catch (err) {
            // THE LAST DITCH (the error named for the sweep): truly
            // unexpected (disk race past the committed head, a seam
            // throwing foreign) — LOUD 500 carrying the fault's own
            // message, never a hung socket. Headers already sent means
            // the head committed — destroy instead of writing past it.
            if (res.headersSent) {
                res.destroy();
                return;
            }
            sendError(res, 500, "models/internal", err instanceof Error ? err.message : String(err));
        }
    };
}
/** The validator twin of {@link Config}. */
export const Config = Schema.object({
    storeRoot: Schema.string(),
    repoRoot: Schema.string(),
});
/** The queue seat's read face is NOT needed here — the models
 *  plane boots itself (bootModels' singleton, the same boot the
 *  card registry rides). The webServer seat is an OPTIONAL PROBE
 *  at apply time (the media door's law): absent (a headless mount)
 *  the route simply does not mount, with a log line saying so. */
export function apply(ctx, config = {}) {
    const webServer = ctx.get("webServer", false);
    if (webServer === undefined) {
        ctx.logger.info("estate-models: no webServer seat in this mount — the provisions route stays unmounted");
        return;
    }
    // THE USE-SITE PROBE (2026-10-24 cure, the media door's law): the
    // provisioning service is NOT decided here. Fibers start in
    // arbitrary order — provisioningComposition's fiber may not have
    // run when THIS apply probes, and the old apply-time bail
    // unregistered the whole route on a race (the live lane's motion
    // studio then died 502 "no seat serves /v1/models/…" while the
    // bytes sat verified in the store). The serve path never needs
    // provisioning; only acquisition does, and the acquire seam
    // already refuses named (503 models/provisioning-unavailable)
    // when the probe misses at the request.
    const provisioningAtUse = () => ctx.get("provisioning", false) ??
        undefined;
    // V8: the store root resolves ONCE at apply — config field first,
    // else the checkout configs (validated file reads, loud on refuse)
    const storeRoot = config.storeRoot ?? loadStoreRoot(config.repoRoot ?? findRepoRoot(MODULE_DIR));
    const cache = createVerifyCache();
    ctx.effect(() => {
        const deps = {
            cache,
            storeRoot: () => storeRoot,
            provisions: provisionsForFamily,
        };
        // provisioning reads through a getter so every request probes
        // the LIVE registry — a service that starts later is found; a
        // lane without one keeps serving verified bytes and refuses
        // acquisition loudly at the use site.
        Object.defineProperty(deps, "provisioning", {
            get: provisioningAtUse,
            enumerable: true,
            configurable: true,
        });
        const handler = createHandler(deps);
        const dispose = webServer.register({
            kind: "prefix",
            path: MODELS_PREFIX,
            // The live adapter: ServerResponse carries write()/the drain
            // event natively — this is the one place the narrowed
            // DoorResponse face meets the real socket.
            handler: (req, res) => handler(req, {
                headersSent: res.headersSent,
                writeHead: (status, headers) => { res.writeHead(status, headers); },
                write: (chunk) => res.write(chunk),
                drain: () => new Promise((resolve) => {
                    res.once("drain", () => resolve());
                }),
                end: (body) => { res.end(body); },
                destroy: () => { res.destroy(); },
            }),
        }, "estate-models: family provision files route");
        return () => {
            dispose();
            cache.clear();
        };
    });
    ctx.logger.info("estate-models: serving %s/*/provisions/* from the family DECLs + the weights mount", MODELS_PREFIX);
}
/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
//# sourceMappingURL=index.js.map
