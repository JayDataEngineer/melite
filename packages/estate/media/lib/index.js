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
    const runId = parts[0] ?? "";
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
/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
