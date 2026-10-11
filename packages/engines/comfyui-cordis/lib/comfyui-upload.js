// comfyui-upload.ts — workflow finalization: splice + the submit-time upload walk (native 231-327).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).
import { LEGACY_RUN_MEDIA_PREFIX, RUN_MEDIA_PREFIX } from '@melite/contracts/benchStage';
import { contentTypeForArtifact } from '@melite/contracts/mediaKinds';
import { randomBytes } from "node:crypto";
import { readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { basename, dirname, join } from "node:path";
// The subpath (never the package index — the service's plain-ESM
// loader cannot link the index's extensionless sibling exports;
// rootsManifest.ts itself imports nothing).
import { rootsManifest, searchedVoice } from "@melite/contracts/rootsManifest";
import { ComfyError } from "./comfyui-types.js";
/** §23 CROSS-ROOTS TREES for the chained-input arms: the run trees
 *  a '<run>/<rel>' tail may resolve under — the own output root
 *  first (the caller's runsRoot — own writes win), then every
 *  manifest state root's `output/` in manifest order. The state
 *  root OF the runsRoot is its parent (runsRoot is
 *  <stateRoot>/output); the dedup keeps the first occurrence so
 *  a manifest naming the own state root adds nothing. The extras
 *  arrive from the caller's config (J12: the MELITE_STATE_ROOTS
 *  env seam retired). Pure. */
export function candidateTrees(runsRoot, stateRoots = []) {
    const trees = [runsRoot, ...rootsManifest(dirname(runsRoot), stateRoots).map((r) => join(r, "output"))];
    return [...new Set(trees)];
}
// ── workflow finalization (native 231-327) ──
/** The artifact-primitive upload table — image/video/audio/qvoice/mesh
 *  ride the submit-time walk; latent (.safetensors/.pt/.pth) NEVER
 *  uploads. */
export const UPLOAD_EXTS = [
    ".aac",
    ".aiff",
    ".avif",
    ".avi",
    ".bmp",
    ".fbx",
    ".flac",
    ".gltf",
    ".glb",
    ".gif",
    ".jpeg",
    ".jpg",
    ".m4a",
    ".mkv",
    ".mov",
    ".mp3",
    ".mp4",
    ".obj",
    ".ogg",
    ".png",
    // the voice bank's own container (the preview_voice lane's .qvoice
    // artifacts): this table's header claimed qvoice rode the walk and
    // the extension was missing, so a voice saved from a run was never
    // staged and the pack opened a path that was not on disk
    // (the TTS chain audit, 2026-10-15).
    ".qvoice",
    ".tiff",
    ".usd",
    ".usdz",
    ".wav",
    ".webm",
    ".webp",
];
/** The data-URL mime table (the DATA-URL ARM's allowlist — the
 * stageable mimes, each onto its UPLOAD_EXTS member; a mime outside
 * this table is not a stageable artifact. Audio mimes joined
 * 2026-09-21: the h3-timeline Music row stores its uploads as
 * data:audio/* URLs in the doc, and the clips-stitch walk stages
 * them exactly like the retired image conditioning maps — decode
 * verbatim to tmp, upload, rewrite the graph input to the staged
 * name). */
export const DATA_URL_IMAGE_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/avif": ".avif",
    "image/tiff": ".tiff",
    "model/gltf-binary": ".glb",
    "model/gltf+json": ".gltf",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/x-flac": ".flac",
    "audio/ogg": ".ogg",
    "audio/webm": ".webm",
    "audio/aiff": ".aiff",
    "audio/x-aiff": ".aiff",
};
/** params['workflow'] + params['inject'] -> the final graph.
 *  The refusal strings are the contract; a wall pins them
 *  verbatim (this function is the graph-splice SSOT). */
export function spliceWorkflow(nodeParams) {
    const wf = nodeParams["workflow"];
    if (typeof wf !== "object" || wf === null || Array.isArray(wf)) {
        throw new ComfyError("node carries no inline workflow — compose must emit the " +
            "graph (workflow_file retired 2026-09-07; no silent empty " +
            "render)");
    }
    const inject = nodeParams["inject"] ?? {};
    if (typeof inject !== "object" || inject === null || Array.isArray(inject)) {
        throw new ComfyError("inject must be an object");
    }
    const graph = wf;
    for (const [slot, value] of Object.entries(inject)) {
        const dot = slot.lastIndexOf(".");
        const nodeId = dot < 0 ? "" : slot.slice(0, dot);
        const key = dot < 0 ? "" : slot.slice(dot + 1);
        const target = dot < 0 ? undefined : graph[nodeId];
        const inputs = typeof target === "object" && target !== null && !Array.isArray(target)
            ? target["inputs"]
            : undefined;
        if (dot < 0 ||
            typeof target !== "object" ||
            target === null ||
            Array.isArray(target) ||
            typeof inputs !== "object" ||
            inputs === null ||
            Array.isArray(inputs) ||
            !Object.prototype.hasOwnProperty.call(inputs, key)) {
            throw new ComfyError("inject " +
                JSON.stringify(slot) +
                " targets nothing in the workflow " +
                "(node " +
                JSON.stringify(nodeId) +
                " has no input " +
                JSON.stringify(key) +
                ")");
        }
        inputs[key] = value;
    }
    return graph;
}
/** POST /upload/image multipart over the SDK client's fetchApi
 *  (the platform FormData owns the boundary — the hand-rolled
 *  multipart framing is deleted). */
export async function uploadFile(client, path) {
    const data = readFileSync(path);
    // the content-type answer is the LEAF's one spelling
    // (contentTypeForArtifact — the shared MIME table this package's
    // own data-URL map mirrors; the former endsWith chain answered
    // ogg/m4a/aac/bmp as octet-stream while the map beside it named
    // their real types). Unknown extensions stay octet-stream (the
    // table's documented law).
    const ctype = contentTypeForArtifact(path);
    // THE CONTENT-ADDRESS LAW (2026-09-22 — the stale-take bug): the
    // staged name carries a hash of the BYTES, not the bare basename.
    // ComfyUI's upload endpoint skips the write when the name already
    // exists and echoes the name back — so two different takes sharing
    // a basename (two runs' SaveAudio.0_tts_00001.flac) silently served
    // whichever bytes landed first, and every later graph spoke the
    // wrong take (measured: same size, same duration, different render,
    // waveform correlation +0.059). With the hash in the name, name
    // implies content: same bytes stage idempotently, a different take
    // gets its own file, and no re-run can ever hear a stale voice.
    const h = createHash("sha1").update(data).digest("hex").slice(0, 12);
    const base = basename(path);
    const dot = base.lastIndexOf(".");
    const staged = dot > 0 ? base.slice(0, dot) + "_" + h + base.slice(dot) : base + "_" + h;
    const fd = new FormData();
    fd.append("image", new Blob([new Uint8Array(data)], { type: ctype }), staged);
    const resp = await client.fetchApi("/upload/image", {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(180000),
    });
    const out = await resp.json();
    if (typeof out["name"] !== "string" || out["name"] === "") {
        throw new ComfyError("upload failed (" + path + "): " + JSON.stringify(out).slice(0, 200));
    }
    return { name: out["name"] };
}
// One accepted cross-tier twin (DRY sweep C5, 2026-10-18): the
// engine plane cannot import estate-queue's skillFs (tier direction
// engines <- estate holds; an engine package deps no harness row).
// Three bytes of truth, one direction: the estate's shared copy
// serves the estate; this one serves the engine's upload walk.
export function isFile(path) {
    try {
        return statSync(path).isFile();
    }
    catch {
        return false;
    }
}
/** The estate's asset-URL prefixes — the two surfaces that serve
 *  run artifacts. /melite-media/runs is the browser media route;
 *  /v1/assets/runs is the compose door's artifact currency (the
 *  dangling-ref gate accepts exactly these two forms). */
// BOTH PREFIXES ARE THE CONTRACT'S (benchStage.ts — with a trailing
// slash for these readers' slicing); the spelling itself lives in one
// place now.
export const MEDIA_ROUTE_PREFIX = RUN_MEDIA_PREFIX + "/";
export const ASSET_ROUTE_PREFIX = LEGACY_RUN_MEDIA_PREFIX + "/";
/** Walk the FINAL graph; stage every existing local-media path,
 *  with the VHS_LoadVideoPath/VHS_LoadVideo `video` exemption.
 *
 *  opts.runsRoot (the runs OUTPUT tree root — callers hold the run
 *  dir; its dirname is the root) arms the ESTATE-ASSET arm: URLs the
 *  estate's own surfaces serve (/melite-media/runs/<run>/<rel>,
 *  /v1/assets/runs/<run>/<rel>) and runs-relative <run>/<rel> names
 *  resolve ON DISK under the root and upload like local files. This
 *  is the chained-stage seam: a downstream card wired to an upstream
 *  run's output carries that URL in its params, and ComfyUI consumes
 *  only staged input-dir names. A prefixed URL that does not resolve
 *  under the root refuses LOUD (never a dangling URL in the graph);
 *  a runs-relative name that misses simply falls to the cwd arm. */
export async function uploadReferenced(client, wf, opts) {
    const seen = {};
    const stageOne = async (v) => {
        if (Array.isArray(v)) {
            const out = [];
            for (const x of v)
                out.push(await stageOne(x));
            return out;
        }
        // OBJECT DESCENT (2026-09-10 — the walk never descended): node
        // payloads nest under `inputs` ({image: <path>}), but objects
        // returned verbatim — NEITHER local files NOR linked URLs inside
        // inputs ever staged. Recurse (the VHS `video` exemption rides
        // the outer branch, which matches first and stays untouched).
        if (typeof v === "object" && v !== null) {
            const next = {};
            for (const [k, x] of Object.entries(v))
                next[k] = await stageOne(x);
            return next;
        }
        if (typeof v !== "string")
            return v;
        const p = v.trim();
        const lower = p.toLowerCase();
        // DATA-URL ARM (the run-record restoration): a retired
        // conditioning map arrives as a data: URL (image_b64 verbatim —
        // the old leaf wrote data URLs into the bag). Decode it EXACTLY
        // (no re-encode, no resize) to a tmp file and upload like a
        // local file. A non-image mime or an empty payload rides through
        // untouched — the engine refuses it loud downstream, never a
        // silent empty map.
        if (lower.startsWith("data:")) {
            // the parse is case-insensitive on the scheme/mime (the
            // payload stays verbatim — base64 is case-SENSITIVE).
            const m = /^data:([^;,]+);base64,(.*)$/is.exec(p);
            const ext = m !== null ? DATA_URL_IMAGE_EXT[m[1].toLowerCase()] : undefined;
            if (m !== null && ext !== undefined && m[2] !== "") {
                if (!(p in seen)) {
                    const tmp = join(tmpdir(), "melite-data-" + randomBytes(8).toString("hex") + ext);
                    writeFileSync(tmp, Buffer.from(m[2], "base64"));
                    try {
                        seen[p] = (await uploadFile(client, tmp)).name;
                    }
                    finally {
                        // the bytes rode the wire — the tmp file never lingers.
                        rmSync(tmp, { force: true });
                    }
                }
                return seen[p];
            }
            return v;
        }
        if (!UPLOAD_EXTS.some((e) => lower.endsWith(e)))
            return v;
        // LINKED-INPUT ARM (2026-09-10 — the chaining fix): a stage wired
        // to an upstream card's output arrives as that output's asset URL
        // (/v1/assets/runs/… — the editor injects it at compile). The old
        // walk only staged local files, so the URL rode into LoadImage
        // verbatim and the run died on the engine. Fetch it (the asset
        // door is open GET), stage to tmp under a stable name, and upload
        // exactly like a local file. A fetch/upload failure refuses LOUD
        // — never a dangling URL in the graph.
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            if (!(p in seen)) {
                // the ext gate above proved a table hit — the find reads
                // direct (the ?? '.bin' toll is an uncoverable arm, never a
                // runtime path; 2026-09-12).
                const ext = UPLOAD_EXTS.find((e) => lower.endsWith(e));
                let body;
                try {
                    const resp = await fetch(p, { signal: AbortSignal.timeout(120000) });
                    if (!resp.ok) {
                        throw new ComfyError("linked input fetch failed (" + p + " " + resp.status + ") — the upstream output is unreachable; re-run the producer card");
                    }
                    body = Buffer.from(await resp.arrayBuffer());
                }
                catch (e) {
                    if (e instanceof ComfyError)
                        throw e;
                    throw new ComfyError("linked input fetch failed (" + p + ") — the upstream output is unreachable; re-run the producer card");
                }
                const tmp = join(tmpdir(), "melite-link-" + randomBytes(8).toString("hex") + ext);
                // the sibling data-URL arm's finally law (audit M-E2): a
                // leaked tmp is unbounded /tmp growth, one per chained run
                try {
                    writeFileSync(tmp, body);
                    seen[p] = (await uploadFile(client, tmp)).name;
                }
                finally {
                    rmSync(tmp, { force: true });
                }
            }
            return seen[p];
        }
        // ESTATE-ASSET ARM (2026-09-12 — the chain's disk half): a
        // downstream stage wired to an upstream run's output arrives as
        // one of the estate's own URLs (the tab rewrites artifact names
        // onto the media route; the compose door speaks /v1/assets).
        // Resolved on disk under opts.runsRoot — no HTTP hop to self —
        // and uploaded exactly like a local file. Loud on dangling
        // (the http arm's law: re-run the producer card).
        // §23 CROSS-ROOTS (2026-09-23, the operator's law: "the agent
        // maker and the user share EVERYTHING"): the run the chained
        // input points at may live in ANOTHER state root — the maker
        // lane's runs resolve on the user's lane and back. The
        // candidates are the manifest's trees (own output root first —
        // own writes win, the same order every run door searches),
        // each state root's `output/` carrying the run tree. A miss
        // names EVERY searched tree (the NAME-THE-ROOT law) — a
        // two-roots box stays debuggable, never a bare unknown.
        const routePrefix = lower.startsWith(MEDIA_ROUTE_PREFIX) ? MEDIA_ROUTE_PREFIX :
            lower.startsWith(ASSET_ROUTE_PREFIX) ? ASSET_ROUTE_PREFIX : "";
        if (routePrefix !== "") {
            if (opts?.runsRoot === undefined) {
                throw new ComfyError("estate asset url without a runs root (" + p + ") — the caller passed no runsRoot; the chained input cannot stage");
            }
            const rel = p.slice(routePrefix.length);
            if (rel.includes("..")) {
                throw new ComfyError("estate asset url refuses traversal: " + p);
            }
            const trees = candidateTrees(opts.runsRoot, opts.stateRoots);
            let cand = null;
            for (const tree of trees) {
                const c = join(tree, rel);
                if (isFile(c)) {
                    cand = c;
                    break;
                }
            }
            if (cand === null) {
                throw new ComfyError("estate asset url not found (" + p + ") — the upstream output is unreachable; re-run the producer card " + searchedVoice(trees));
            }
            if (!(cand in seen))
                seen[cand] = (await uploadFile(client, cand)).name;
            return seen[cand];
        }
        // RUNS-RELATIVE ARM: '<run>/<rel>' (the estate's third accepted
        // artifact form) resolves under the root when the file exists;
        // a miss falls to the cwd arm below (estate-relative input paths
        // like data/input/x.png ride there — unchanged law). The same
        // cross-roots trees serve (the maker's '<run>/<rel>' chained
        // input stages from its own tree on the user's lane).
        if (opts?.runsRoot !== undefined && !p.startsWith("/") && p.includes("/") && !p.includes("..")) {
            let hit = null;
            for (const tree of candidateTrees(opts.runsRoot, opts.stateRoots)) {
                const c = join(tree, p);
                if (isFile(c)) {
                    hit = c;
                    break;
                }
            }
            if (hit !== null) {
                if (!(hit in seen))
                    seen[hit] = (await uploadFile(client, hit)).name;
                return seen[hit];
            }
        }
        const cand = p.startsWith("/") ? p : join(process.cwd(), p);
        if (!isFile(cand))
            return v;
        if (!(cand in seen))
            seen[cand] = (await uploadFile(client, cand)).name;
        return seen[cand];
    };
    const stageFilmClips = async (value) => {
        if (typeof value !== "string")
            return value;
        let parsed;
        try {
            parsed = JSON.parse(value);
        }
        catch {
            return value;
        }
        if (!Array.isArray(parsed))
            return value;
        const rows = [];
        for (const row of parsed) {
            if (typeof row !== "object" || row === null || Array.isArray(row)) {
                rows.push(row);
                continue;
            }
            const record = row;
            if (typeof record["src"] !== "string") {
                rows.push(row);
                continue;
            }
            rows.push({ ...record, src: await stageOne(record["src"]) });
        }
        return JSON.stringify(rows);
    };
    const out = {};
    for (const [nid, node] of Object.entries(wf)) {
        if (typeof node === "object" && node !== null && !Array.isArray(node)) {
            const rec = node;
            if ((rec["class_type"] === "VHS_LoadVideoPath" ||
                rec["class_type"] === "VHS_LoadVideo") &&
                typeof rec["inputs"] === "object" &&
                rec["inputs"] !== null &&
                !Array.isArray(rec["inputs"])) {
                const ins = rec["inputs"];
                const next = {};
                for (const [k, x] of Object.entries(ins)) {
                    next[k] = k === "video" ? x : await stageOne(x);
                }
                out[nid] = { ...rec, inputs: next };
                continue;
            }
            if (rec["class_type"] === "MeliteFilmAudioMix" &&
                typeof rec["inputs"] === "object" &&
                rec["inputs"] !== null &&
                !Array.isArray(rec["inputs"])) {
                const ins = rec["inputs"];
                const next = {};
                for (const [k, x] of Object.entries(ins)) {
                    next[k] = k === "clips_json" ? await stageFilmClips(x) : await stageOne(x);
                }
                // THE §23 STAMP (J12's Layer C arm): the film_mix node's
                // clip-source walk carries the estate's roots manifest as
                // call data — the same manifest this walk itself searches
                // (candidateTrees above), own root first. The engine's
                // validate_inputs iterates only a node's OWN declared keys,
                // so the extra key is inert on a pack that predates the
                // state_roots input and consumed by one that carries it.
                if (opts?.runsRoot !== undefined) {
                    next["state_roots"] = JSON.stringify(rootsManifest(dirname(opts.runsRoot), opts.stateRoots));
                }
                out[nid] = { ...rec, inputs: next };
                continue;
            }
            const next = {};
            for (const [k, x] of Object.entries(rec))
                next[k] = await stageOne(x);
            out[nid] = next;
            continue;
        }
        out[nid] = node;
    }
    return { graph: out, uploaded: seen };
}
//# sourceMappingURL=comfyui-upload.js.map