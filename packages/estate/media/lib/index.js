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
import { contentTypeForArtifact, isEstateSidecarName, mediaVocab, segmentConfined, servableLeaf } from "@melite/contracts/mediaKinds";
import { parseRangeHeader } from "@melite/contracts/mediaRange";
import { LEGACY_RUN_MEDIA_PREFIX, RUN_MEDIA_PREFIX, runMediaPrefixOf, canonicalRunMediaUrl, RUN_ID_RE, } from "@melite/contracts/benchStage";
/** The roots a media answer searches: the seat's manifest when it
 *  carries one, else the single own root (§23 — own root always
 *  leads; a run-id collision resolves first-root-wins). */
// THE ROOT ORDER IS THE CONTRACT'S (see crossRootOrder): a run id
// present in two trees must answer the same bytes whichever reader
// asks, so both read ONE order.
const seatRoots = (seat) => seat.stateRoots !== undefined && seat.stateRoots.length > 0
    ? [...seat.stateRoots]
    : [seat.stateRoot];
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
/** THE CONTRACT'S TWO NAMES (benchStage.ts) — the estate owns no
 *  copy: the media route mounts both, the readers accept both, and
 *  the bench heals stored paths to the live one. */
export const MEDIA_PREFIX = RUN_MEDIA_PREFIX;
/** THE LEGACY SPELLING, STILL SERVED (operator, 2026-10-10: "THERE
 *  IS NO FILTER, NO BREAKAGE FROM THIS. EVER."). `/v1/assets/runs/`
 *  died with the gateway app — but the benches, the archived
 *  snapshots and the run rows that were written before it died still
 *  carry it, and a reloaded historical flow pointed every image and
 *  audio input at a route that answered nothing: "it doesn't
 *  preserve the paths for the inputs and image inputs, everything
 *  breaks on reloading a historical flow". The paths WERE preserved;
 *  they addressed a dead door. So the route ACCEPTS both spellings —
 *  one route, two names, identical confinement and identical
 *  loud 404 — and the writers below emit the live one. A stored path
 *  never breaks, and no new path is written dead.
 */
export const LEGACY_MEDIA_PREFIX = LEGACY_RUN_MEDIA_PREFIX;
// the estate CALLS the contract's matcher, and re-exports it under
// this module's own historical names (so every existing importer
// keeps its import address)
const mediaPrefixOf = runMediaPrefixOf;
const canonicalMediaUrl = canonicalRunMediaUrl;
export { mediaPrefixOf, canonicalMediaUrl };
/** The run-dir basename grammar (run-<hex>-<hex>, the mint law). */
const RUN_ID = RUN_ID_RE;
/** One confined relative segment AFTER percent-decoding: THE
 * CONTRACT'S GRAMMAR (segmentConfined — the audit's ×3): the engines
 * mint raw names (`out 1.png`, unicode, parens) and mediaUrl
 * percent-encodes them — the grammar must accept what both halves
 * produce (the mint→serve round-trip law, stroke 82). One predicate
 * shared with the queue's source-echo and the gallery's artifact
 * route; realpath containment below re-checks the read. */
/** The servable-media law: run STATE lives beside the artifacts
 *  (_flow.json, _request.json carry drafts and graphs — the run's
 *  private record, never gallery bytes). `_poster.jpg` is the ONE
 *  underscore exception (the runThumbnail mint law). */
// THE PREDICATE IS THE CONTRACT'S (servableRunRelative — the audit's
// H5): this module used to refuse every underscore leaf but
// `_poster.jpg` while the gallery's artifact route served any
// run-relative name, so a private record was refused here and served
// there. One rule, two doors.
function relServable(relParts) {
    return servableLeaf(relParts[relParts.length - 1] ?? "");
}
/** The content-type for one served artifact: the LEAF's one
 *  spelling (contentTypeForArtifact — the vocab leaf's MIME table,
 *  shared with the gallery artifact route; the route owns no map of
 *  its own to drift). */
function contentTypeFor(name) {
    return contentTypeForArtifact(name);
}
/** Parse /<runId>/<rel...> after the prefix; null when the shape or
 *  a segment violates the confinement grammar. Each rel segment is
 *  percent-DECODED first (malformed escapes refuse; %2e%2e decodes
 *  to `..` and refuses) — the grammar holds on the decoded name. */
function parseTarget(sub) {
    const parts = sub.split("/").filter((p) => p !== "");
    if (parts.length < 2)
        return null;
    const runId = parts[0];
    if (!RUN_ID.test(runId))
        return null;
    const relParts = [];
    for (const seg of parts.slice(1)) {
        let decoded;
        try {
            decoded = decodeURIComponent(seg);
        }
        catch {
            return null;
        }
        if (!segmentConfined(decoded))
            return null;
        relParts.push(decoded);
    }
    if (!relServable(relParts))
        return null;
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
    // THE ALIAS MOUNTS TOO (the legacy law): the SAME handler under
    // BOTH names — a prefix route takes one path string, so the alias
    // is a second registration of one function, never a second
    // implementation. Every stored bench, archive and run row keeps
    // working, and nothing new is written dead.
    const runMediaHandler = async (req, res) => {
        {
            if (req.method !== "GET" && req.method !== "HEAD") {
                res.writeHead(405, { "content-type": "application/json", allow: "GET, HEAD", "cache-control": "no-store" });
                res.end('{"error":"media/method-not-allowed"}');
                return;
            }
            const url = new URL(req.url ?? "/", "http://melite-media.invalid");
            // BOTH SPELLINGS, ONE HANDLER (the alias law above)
            const prefix = mediaPrefixOf(url.pathname);
            if (prefix === null) {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            const target = parseTarget(url.pathname.slice(prefix.length));
            if (target === null) {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            const seat = ctx.get("queue", false);
            if (seat === undefined) {
                res.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
                res.end('{"error":"estate-media/no-queue-seat","message":"mount @melite-plugin/dsh-estate (the queue seat owns the runs tree root)"}');
                return;
            }
            // §23 CROSS-ROOTS: the first manifest root holding the run
            // serves the bytes (own root leads — first-root-wins). THE
            // TEST-TREE ARM (2026-10-24, the preview-404 cure): test
            // runs (test:true starts) land in test-output/, not output/
            // — a hunt that never looked there 404'd every test run's
            // preview while the GLB sat on disk (the live anny bake on
            // the lane). runsRegistry's row hunt already walks both
            // trees; the serve arm now matches it.
            const fs = await import("node:fs/promises");
            const path = await import("node:path");
            const roots = seatRoots(seat);
            let runDir = "";
            for (const root of roots) {
                for (const leaf of ["output", "test-output"]) {
                    const candidate = `${root}/${leaf}/${target.runId}`;
                    try {
                        const st = await fs.stat(candidate);
                        if (st.isDirectory()) {
                            runDir = candidate;
                            break;
                        }
                    }
                    catch { /* not in this root/leaf */ }
                }
                if (runDir !== "")
                    break;
            }
            if (runDir === "") {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            const file = `${runDir}/${target.rel}`;
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
            // Byte-truth reads (stat + the asked window) sit inside the
            // refusal scope and BEFORE the committed head: a file
            // deleted, locked, or unreadable between realpath and read
            // answers 404 — NEVER a rejected promise that leaves the
            // socket hung, and never a 200 head with no body (audit
            // finding, stroke 82; artifacts are buffered engine outputs —
            // the known-length law holds, the failure window moved ahead
            // of the commitment).
            // THE RANGE LAW (the audio-seek stroke, 2026-10-08 — the
            // operator's catch: "I can't even click and drag to change
            // position in the audio clip"): native media elements seek
            // by asking `Range: bytes=…`; answering whole-file 200s on
            // every GET left the playhead stuck at the buffer edge.
            // Satisfiable single ranges answer 206 with exactly the
            // asked slice; a start past EOF answers the loud 416;
            // everything else (no header, HEAD, malformed, multi-range)
            // serves the full 200. `accept-ranges: bytes` rides every
            // byte answer so the element knows seeking is live.
            let stat;
            // bytes is Buffer by the 200 arm below (the 206 arm returns
            // early; the type rides the assignment, never an assertion)
            let bytes = Buffer.alloc(0);
            let slice;
            try {
                stat = await fs.stat(realFile);
                if (!stat.isFile()) {
                    res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                    res.end(NOT_FOUND_BODY);
                    return;
                }
                const range = req.method === "HEAD" ? null : parseRangeHeader(req.headers.range, stat.size);
                if (range === "unsatisfiable") {
                    res.writeHead(416, {
                        "content-type": "application/json",
                        "content-range": `bytes */${String(stat.size)}`,
                        "accept-ranges": "bytes",
                        "cache-control": "no-store",
                    });
                    res.end('{"error":"media/range-not-satisfiable"}');
                    return;
                }
                if (range !== null) {
                    const length = range.end - range.start + 1;
                    const fh = await fs.open(realFile, "r");
                    try {
                        const buf = Buffer.alloc(length);
                        // a raced truncation answers the bytes that remain —
                        // the length head rides the READ's truth, never the
                        // stat's (a zero-padded tail would be a silent lie)
                        const { bytesRead } = await fh.read(buf, 0, length, range.start);
                        // a raced truncation to NOTHING is the deleted-file law
                        // (the refusal scope owns it: 404, never a 206 with an
                        // inverted window); a partial read serves what remains.
                        /* v8 ignore next -- defense-in-depth raced-truncation
                         * fence, unreachable deterministically through the HTTP
                         * handler (the window between this handler's own stat
                         * and read is not interposable without mocks — the
                         * spec's no-mocks law); the subarray line beside it is
                         * line-covered only (every 206 wall executes it with
                         * bytesRead === length), never behaviorally walled. */
                        if (bytesRead === 0)
                            throw new Error("media/read-empty");
                        slice = { buf: buf.subarray(0, bytesRead), start: range.start, end: range.start + bytesRead - 1 };
                    }
                    finally {
                        await fh.close();
                    }
                }
                else {
                    bytes = req.method === "HEAD"
                        ? Buffer.alloc(0)
                        : await fs.readFile(realFile);
                }
            }
            catch {
                res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
                res.end(NOT_FOUND_BODY);
                return;
            }
            if (slice !== undefined) {
                res.writeHead(206, {
                    "content-type": contentTypeFor(target.rel),
                    "content-length": String(slice.buf.length),
                    "content-range": `bytes ${String(slice.start)}-${String(slice.end)}/${String(stat.size)}`,
                    "accept-ranges": "bytes",
                    "cache-control": "no-store",
                });
                res.end(slice.buf);
                return;
            }
            res.writeHead(200, {
                "content-type": contentTypeFor(target.rel),
                // THE LENGTH'S TRUTH (the truncation race): the body below
                // comes from the LATER read, not the stat — a file grown
                // between the two would otherwise declare short and the
                // client would truncate; a shrunk one throws at the read
                // and lands 404 in the refusal scope. HEAD carries no body
                // by definition, so it advertises the stat's size.
                "content-length": String(req.method === "HEAD" ? stat.size : bytes.length),
                "accept-ranges": "bytes",
                "cache-control": "no-store",
            });
            res.end(bytes);
        }
    };
    // ONE HANDLER, BOTH NAMES (the alias law). The registration is
    // the only difference: a prefix route takes one path string, so the
    // legacy spelling is a second mount of the SAME function — the
    // confinement, the range arm, the loud 404 and the bytes are one
    // implementation by construction, never two that can drift.
    ctx.effect(() => webServer.register({ kind: "prefix", path: MEDIA_PREFIX, handler: runMediaHandler }, "estate-media: runs artifact route"));
    ctx.effect(() => webServer.register({ kind: "prefix", path: LEGACY_MEDIA_PREFIX, handler: runMediaHandler }, "estate-media: runs artifact route (legacy /v1/assets spelling — served forever)"));
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
const LIST_KINDS = ["image", "audio", "video", "model", "text", "all"];
/** The listed cap: a picker page, not an unbounded dump. */
const LIST_CAP = 300;
/** Classify one extension into the vocab's families ("" when the
 *  extension classifies nowhere — sidecars, prompts, workflows). */
function kindForExt(ext) {
    const v = mediaVocab();
    for (const kind of ["image", "audio", "video", "model", "text"]) {
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
 *  list arm runs pure over a tree fixture. Single-root shape (the
 *  legacy law rides verbatim — listMediaAcross with one root). */
export async function listMedia(stateRoot, kind) {
    return await listMediaAcross([stateRoot], kind);
}
/** §23 CROSS-ROOTS list arm: every manifest root's runs tree, one
 *  merged answer. Run-ids union across roots (newest run mtime
 *  first; a collision resolves FIRST-ROOT-WINS — own writes win);
 *  every row names the root that served it. Cap stays LIST_CAP on
 *  the merged answer. */
export async function listMediaAcross(roots, kind) {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const wanted = kind === "all" ? "" : kind;
    const items = [];
    // runId -> { root, dir, t }: the union scan. Insertion walks roots
    // in manifest order, so a seen id keeps its FIRST root (own wins).
    // THE TEST-TREE ARM (2026-10-24): each root contributes BOTH run
    // trees — output/ (real runs) and test-output/ (test:true runs);
    // a walk over output/ alone hid every test run from the list.
    const runs = new Map();
    for (const root of roots) {
        for (const leaf of ["output", "test-output"]) {
            const outRoot = path.join(root, leaf);
            let runIds = [];
            try {
                runIds = fs.readdirSync(outRoot).filter((id) => RUN_ID.test(id));
            }
            catch {
                continue; // a missing/unreadable tree reads empty, never poisons
            }
            for (const id of runIds) {
                if (runs.has(id))
                    continue;
                const dir = path.join(outRoot, id);
                let t = 0;
                try {
                    t = fs.statSync(dir).mtimeMs;
                }
                catch { /* raced */ }
                runs.set(id, { root, dir, t });
            }
        }
    }
    const ordered = [...runs.entries()].sort((a, b) => b[1].t - a[1].t);
    const walk = (root, runId, dir, rel, depth) => {
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
                walk(root, runId, path.join(dir, e.name), rel === "" ? e.name : `${rel}/${e.name}`, depth + 1);
                continue;
            }
            if (!e.isFile())
                continue;
            // THE SIDECAR LAW (the text-kind stroke, 2026-10-24): the
            // harness's own bookkeeping (_request.json, _flow.json) is
            // underscore-prefixed by convention and NEVER media — the walk
            // skips by NAME, not extension, so the real .json artifacts a
            // run harvested (SaveText rows, result json) keep listing
            // while the bookkeeping stays invisible.
            if (isEstateSidecarName(e.name))
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
                // THE SAME ENCODING AS mediaUrl (the boundary audit's C2):
                // the list minted a RAW path while every other producer
                // percent-encoded per segment — so an artifact with a space,
                // a parenthesis or a non-ASCII name listed as a URL the
                // browser cannot fetch, and dedupe/compare against a
                // mediaUrl-built twin failed. One encoder, one shape.
                url: mediaUrl(runId, name),
                name,
                kind: kindForExt(f.name.slice(f.name.lastIndexOf(".") + 1).toLowerCase()),
                runId,
                served_from: root,
            });
        }
    };
    for (const [id, r] of ordered)
        walk(r.root, id, r.dir, "", 1);
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
                throw new RemoteError("media/no-seat", "media/list: the queue seat owns the runs tree root — mount @melite-plugin/dsh-estate", {});
            }
            // §23 CROSS-ROOTS: the seat's manifest (own root first) — the
            // Infer Media bar sees every lane's runs on one box.
            return await listMediaAcross(seatRoots(seat), kind);
        }
    };
})();
export { MediaRemoteService };
/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
