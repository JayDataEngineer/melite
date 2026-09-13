var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { mediaVocab } from "@melite/contracts/mediaKinds";
export const name = "estate-media";
/** NOTHING is injected: the estate bundle rides headless mounts too
 * (the queue/drafts seats are headless-safe; the web carrier is
 * not). The webServer seat is an OPTIONAL PROBE at apply time —
 * absent (a headless mount) the route simply does not mount, with a
 * log line saying so; the queue seat is an optional probe at the
 * USE site (the gallery's law): an absent queue in a web mount is a
 * LOUD 502 naming the fix — no fallback absorbs it. */
export const inject = [];
/** The route this plugin claims (one prefix, disjoint by law). */
export const MEDIA_PREFIX = "/melite-media/runs";
/** The run-dir basename grammar (run-<hex>-<hex>, the mint law). */
const RUN_ID = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;
/** One confined relative segment: [A-Za-z0-9._-]+, no dots-only. */
const SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._-]+$/;
/** The content-type map for the extensions the engines emit. */
const CONTENT_TYPES = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
    json: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
};
function contentTypeFor(name) {
    const dot = name.lastIndexOf(".");
    const ext = dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
    return CONTENT_TYPES[ext] ?? "application/octet-stream";
}
/** Parse /<runId>/<rel...> after the prefix; null when the shape or
 *  a segment violates the confinement grammar. */
function parseTarget(sub) {
    const parts = sub.split("/").filter((p) => p !== "");
    if (parts.length < 2)
        return null;
    const runId = parts[0];
    const relParts = parts.slice(1);
    if (!RUN_ID.test(runId))
        return null;
    for (const seg of relParts) {
        if (!SEGMENT.test(seg))
            return null;
    }
    return { runId, rel: relParts.join("/") };
}
const NOT_FOUND_BODY = '{"error":"media/not-found"}';
export function apply(ctx) {
    // THE MEDIA LIST REMOTE (2026-09-13): media/list rides the RPC
    // wire regardless of the web carrier — headless mounts keep the
    // door (tests, tools); only the byte route needs webServer.
    new MediaRemoteService(ctx);
    const webServer = ctx.get("webServer", false);
    if (webServer === undefined) {
        ctx.logger.info("estate-media: no webServer seat in this mount — the runs media route stays unmounted");
        return;
    }
    ctx.effect(() => webServer.register({
        kind: "prefix",
        path: MEDIA_PREFIX,
        handler: async (req, res) => {
            if (req.method !== "GET" && req.method !== "HEAD") {
                res.writeHead(405, { "content-type": "application/json", allow: "GET, HEAD", "cache-control": "no-store" });
                res.end('{"error":"media/method-not-allowed"}');
                return;
            }
            const url = new URL(req.url ?? "/", "http://melite-media.invalid");
            const target = parseTarget(url.pathname.slice(MEDIA_PREFIX.length));
            if (target === null) {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            const seat = ctx.get("queue", false);
            if (seat === undefined) {
                res.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
                res.end('{"error":"estate-media/no-queue-seat","message":"mount @melite-plugin/melite-estate (the queue seat owns the runs tree root)"}');
                return;
            }
            const stateRoot = seat.stateRoot;
            const runDir = `${stateRoot}/output/${target.runId}`;
            const file = `${runDir}/${target.rel}`;
            const fs = await import("node:fs/promises");
            const path = await import("node:path");
            // Realpath containment: the resolved file AND its run dir
            // must nest (the regex is the first lock; this is the second).
            let realFile;
            let realRunDir;
            try {
                realFile = await fs.realpath(file);
                realRunDir = await fs.realpath(runDir);
            }
            catch {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            const relFromRoot = path.relative(realRunDir, realFile);
            if (relFromRoot === "" || relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            const stat = await fs.stat(realFile);
            if (!stat.isFile()) {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            res.writeHead(200, {
                "content-type": contentTypeFor(target.rel),
                "content-length": String(stat.size),
                "cache-control": "no-store",
            });
            if (req.method === "HEAD") {
                res.end();
                return;
            }
            // Buffered with an explicit length (the gallery's own law:
            // a known length lets remote proxies buffer instead of
            // mishandling chunked framing on lossy links). Artifacts are
            // engine outputs — image/video files, not streams of unbounded
            // size; a read failure past the committed head destroys the
            // socket loudly.
            const bytes = await fs.readFile(realFile);
            res.end(bytes);
        },
    }), "estate-media: runs artifact route");
    ctx.logger.info("estate-media: serving %s/* from the runs output tree", MEDIA_PREFIX);
}
/** The client seam's one truth: build the same-origin media URL for
 *  one run-relative artifact name. A name that already rides a URL
 *  (http(s) or a rooted path) passes VERBATIM — the rewrite only
 *  claims bare run-relative names (the runs rows' post-kill shape). */
export function mediaUrl(runId, name) {
    if (name === "")
        return name;
    if (/^(https?:\/\/|\/)/.test(name))
        return name;
    return `${MEDIA_PREFIX}/${encodeURIComponent(runId)}/${name
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/")}`;
}
/** The kinds the list door names (mediaVocab's families + all). */
const LIST_KINDS = ["image", "audio", "video", "model", "all"];
/** The listed cap: a picker page, not an unbounded dump. */
const LIST_CAP = 300;
/** Classify one extension into the vocab's families ("" when the
 *  extension classifies nowhere — sidecars, prompts, workflows). */
function kindForExt(ext) {
    const v = mediaVocab();
    for (const kind of ["image", "audio", "video", "model"]) {
        if (v[kind].includes(ext))
            return kind;
    }
    return "";
}
/** THE LIST ARM — walk the runs output tree (run dirs by mtime,
 *  newest first), collect files of the asked kind, mint the route
 *  URL for each. Bounded: depth 3 (run/stage/file), cap LIST_CAP.
 *  Synchronous fs on purpose: the door answers one page; the tree
 *  is the queue's own bounded output, not an adversarial mount. */
/** Exported for the door pins (the draft's benchRow precedent): the
 *  list arm runs pure over a tree fixture. */
export async function listMedia(stateRoot, kind) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const wanted = kind === "all" ? "" : kind;
    const items = [];
    const outRoot = path.join(stateRoot, "output");
    let runIds = [];
    try {
        runIds = fs.readdirSync(outRoot).filter((id) => RUN_ID.test(id));
    }
    catch {
        return { count: 0, items: [] };
    }
    const runTimes = new Map();
    for (const id of runIds) {
        try {
            runTimes.set(id, fs.statSync(path.join(outRoot, id)).mtimeMs);
        }
        catch { /* raced */ }
    }
    runIds.sort((a, b) => (runTimes.get(b) ?? 0) - (runTimes.get(a) ?? 0));
    const walk = (runId, dir, rel, depth) => {
        if (items.length >= LIST_CAP || depth > 3)
            return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        const files = [];
        for (const e of entries) {
            if (e.isDirectory()) {
                walk(runId, path.join(dir, e.name), rel === "" ? e.name : `${rel}/${e.name}`, depth + 1);
                continue;
            }
            if (!e.isFile())
                continue;
            const dot = e.name.lastIndexOf(".");
            if (dot < 0)
                continue;
            const ext = e.name.slice(dot + 1).toLowerCase();
            const k = kindForExt(ext);
            if (k === "")
                continue;
            if (wanted !== "" && k !== wanted)
                continue;
            let t = 0;
            try {
                t = fs.statSync(path.join(dir, e.name)).mtimeMs;
            }
            catch { /* raced */ }
            files.push({ name: e.name, t });
        }
        files.sort((a, b) => b.t - a.t);
        for (const f of files) {
            if (items.length >= LIST_CAP)
                return;
            const name = rel === "" ? f.name : `${rel}/${f.name}`;
            items.push({
                url: `${MEDIA_PREFIX}/${runId}/${name}`,
                name,
                kind: kindForExt(f.name.slice(f.name.lastIndexOf(".") + 1).toLowerCase()),
                runId,
            });
        }
    };
    for (const id of runIds)
        walk(id, path.join(outRoot, id), "", 1);
    return { count: items.length, items };
}
/** The media remote: media/list over the queue seat's runs tree. */
let MediaRemoteService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _remoteExportList_decorators;
    return class MediaRemoteService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _remoteExportList_decorators = [Remote("list")];
            __esDecorate(this, null, _remoteExportList_decorators, { kind: "method", name: "remoteExportList", static: false, private: false, access: { has: obj => "remoteExportList" in obj, get: obj => obj.remoteExportList }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ["queue"];
        constructor(ctx) {
            super(ctx, "mediaRemote", { namespace: "media" });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** Endpoint `media/list` — the source row's From media arm. */
        async remoteExportList(kind, signal) {
            if (!LIST_KINDS.includes(kind)) {
                throw new RemoteError("media/kind", `media/list: unknown kind '\'${kind}\' (wanted one of ${LIST_KINDS.join(", ")})`, { kind });
            }
            const seat = this.ctx.get("queue", false);
            if (seat === undefined) {
                throw new RemoteError("media/no-seat", "media/list: the queue seat owns the runs tree root — mount @melite-plugin/melite-estate", {});
            }
            return await listMedia(seat.stateRoot, kind);
        }
    };
})();
export { MediaRemoteService };
/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
