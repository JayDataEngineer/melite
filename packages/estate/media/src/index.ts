// index.ts — the runs media route: run artifacts served same-origin
// under the DSH origin, from the estate's own runs tree.
//
// THE GATEWAY KILL, closed (2026-09-10): the gateway app once served
// /v1/assets/runs/<run>/<file> — an HTTP face that died with the app,
// and with it every image in the web surfaces (the run rows now carry
// run-RELATIVE names only). This route is the DSH-native replacement:
// a named route on ctx.webServer (web-server.md's own law — "another
// plugin registers every feature route"), reading the runs output
// tree DIRECTLY (the same tree the queue seat owns; the state root
// comes from the seat, never a hardcoded path).
//
// Grammar (the client seam's one truth):
//   GET /melite-media/runs/<runId>/<rel>
// where runId is the run-dir basename grammar and rel is a confined
// relative name (no "..", no leading "/", no empty segments). The
// resolved file must stay INSIDE the run dir — realpath containment,
// not regex trust. GET/HEAD only; everything else is 405. A miss is
// a LOUD 404 (never a fallback absorbing it).
//
// Erasable-syntax TS only in the ROUTE arm: no enums, `import type`
// for types. The REMOTE arm (2026-09-13, the source-row stroke)
// carries @Remote decorators — non-erasable — which is why this
// package BUILDS (tsc, the drafts recipe); the route stays plain.
import type { Context } from "@deepseek-ai/cordis";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { mediaVocab } from "@melite/contracts/mediaKinds";
// Type-only: pulls the webServer service declaration onto Context.
import type {} from "@deepseek-ai/dsh-host-webserver";

/** The queue seat's read face, STRUCTURAL (the gallery's optional-
 *  dependency law): the seat's stateRoot is the runs tree root. The
 *  full service typing belongs to @melite/estate-queue, whose
 *  source-run main (src/index.ts) is not a compiled boundary — a
 *  structural face here keeps this package buildable without
 *  walking that tree. The inject row below still gates mounting on
 *  the real seat. */
interface QueueSeat {
  readonly stateRoot: string;
}

export const name = "estate-media";

/** NOTHING is injected: the estate bundle rides headless mounts too
 * (the queue/drafts seats are headless-safe; the web carrier is
 * not). The webServer seat is an OPTIONAL PROBE at apply time —
 * absent (a headless mount) the route simply does not mount, with a
 * log line saying so; the queue seat is an optional probe at the
 * USE site (the gallery's law): an absent queue in a web mount is a
 * LOUD 502 naming the fix — no fallback absorbs it. */
export const inject = [] as const;

/** The route this plugin claims (one prefix, disjoint by law). */
export const MEDIA_PREFIX = "/melite-media/runs";

/** The run-dir basename grammar (run-<hex>-<hex>, the mint law). */
const RUN_ID = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;

/** One confined relative segment AFTER percent-decoding: the engines
 *  mint raw names (`out 1.png`, unicode, parens) and mediaUrl
 *  percent-encodes them — the grammar must accept what both halves
 *  produce (the mint→serve round-trip law, stroke 82). The lock is:
 *  not empty, not `.`/`..` (traversal), no NUL; every other byte is
 *  a legal filename the realpath containment below re-checks. */
function segmentOk(decoded: string): boolean {
  /* v8 ignore next -- defense-in-depth dot/empty fence, unreachable
   * via the HTTP handler by construction (2026-09-16): "" never
   * arrives (parseTarget filters empties before decode — only ""
   * decodes to ""); "." / ".." never arrive (WHATWG URL
   * dot-normalizes every single/double-dot spelling — literal,
   * %2e/%2E, .%2e, %2e., %2e%2e in any case — to a short path
   * before the segment loop runs; probed: all such forms refuse via
   * the parts.length<2 arm, never here — see the single/double-dot
   * walls). The fence stays for non-URL callers; the NUL arm below
   * carries the behavioral wall. */
  if (decoded === "" || decoded === "." || decoded === "..") return false;
  if (decoded.includes("\0")) return false;
  return true;
}

/** The servable-media law: run STATE lives beside the artifacts
 *  (_flow.json, _request.json carry drafts and graphs — the run's
 *  private record, never gallery bytes). `_poster.jpg` is the ONE
 *  underscore exception (the runThumbnail mint law). */
const UNDERSCORE_SERVABLE: ReadonlySet<string> = new Set(["_poster.jpg"]);

function relServable(relParts: readonly string[]): boolean {
  const base = relParts[relParts.length - 1] as string;
  if (!base.startsWith("_")) return true;
  return UNDERSCORE_SERVABLE.has(base);
}

/** The content-type map for the extensions the engines emit. */
const CONTENT_TYPES: Readonly<Record<string, string>> = {
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

function contentTypeFor(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Parse /<runId>/<rel...> after the prefix; null when the shape or
 *  a segment violates the confinement grammar. Each rel segment is
 *  percent-DECODED first (malformed escapes refuse; %2e%2e decodes
 *  to `..` and refuses) — the grammar holds on the decoded name. */
function parseTarget(sub: string): { runId: string; rel: string } | null {
  const parts = sub.split("/").filter((p) => p !== "");
  if (parts.length < 2) return null;
  const runId = parts[0] as string;
  if (!RUN_ID.test(runId)) return null;
  const relParts: string[] = [];
  for (const seg of parts.slice(1)) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      return null;
    }
    if (!segmentOk(decoded)) return null;
    relParts.push(decoded);
  }
  if (!relServable(relParts)) return null;
  return { runId, rel: relParts.join("/") };
}

const NOT_FOUND_BODY = '{"error":"media/not-found"}';

export function apply(ctx: Context): void {
  // THE MEDIA LIST REMOTE (2026-09-13): media/list rides the RPC
  // wire regardless of the web carrier — headless mounts keep the
  // door (tests, tools); only the byte route needs webServer.
  new MediaRemoteService(ctx);
  const webServer = ctx.get("webServer", false) as
    | {
        register(
          row: {
            kind: "prefix";
            path: string;
            handler: (
              req: import("node:http").IncomingMessage,
              res: import("node:http").ServerResponse,
            ) => Promise<void> | void;
          },
          route?: string,
        ): () => void;
      }
    | undefined;
  if (webServer === undefined) {
    ctx.logger.info("estate-media: no webServer seat in this mount — the runs media route stays unmounted");
    return;
  }
  ctx.effect(() =>
    webServer.register({
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
        const seat = ctx.get("queue", false) as QueueSeat | undefined;
        if (seat === undefined) {
          res.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
          res.end('{"error":"estate-media/no-queue-seat","message":"mount @melite-plugin/melite-estate (the queue seat owns the runs tree root)"}');
          return;
        }
        const stateRoot: string = seat.stateRoot;
        const runDir = `${stateRoot}/output/${target.runId}`;
        const file = `${runDir}/${target.rel}`;
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        // Realpath containment: the resolved file AND its run dir
        // must nest (the regex is the first lock; this is the second).
        let realFile: string;
        let realRunDir: string;
        try {
          realFile = await fs.realpath(file);
          realRunDir = await fs.realpath(runDir);
        } catch {
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
        // Byte-truth reads (stat + readFile) sit inside the refusal
        // scope and BEFORE the committed head: a file deleted,
        // locked, or unreadable between realpath and read answers
        // 404 — NEVER a rejected promise that leaves the socket
        // hung, and never a 200 head with no body (audit finding,
        // stroke 82; artifacts are buffered engine outputs — the
        // known-length law holds, the failure window moved ahead of
        // the commitment).
        let stat: import("node:fs").Stats;
        let bytes: Buffer;
        try {
          stat = await fs.stat(realFile);
          if (!stat.isFile()) {
            res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
            res.end(NOT_FOUND_BODY);
            return;
          }
          bytes = req.method === "HEAD"
            ? Buffer.alloc(0)
            : await fs.readFile(realFile);
        } catch {
          res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
          res.end(NOT_FOUND_BODY);
          return;
        }
        res.writeHead(200, {
          "content-type": contentTypeFor(target.rel),
          "content-length": String(stat.size),
          "cache-control": "no-store",
        });
        res.end(bytes);
      },
    }),
    "estate-media: runs artifact route",
  );

  ctx.logger.info("estate-media: serving %s/* from the runs output tree", MEDIA_PREFIX);
}

/** The client seam's one truth: build the same-origin media URL for
 *  one run-relative artifact name. A name that already rides a URL
 *  (http(s) or a rooted path) passes VERBATIM — the rewrite only
 *  claims bare run-relative names (the runs rows' post-kill shape). */
export function mediaUrl(runId: string, name: string): string {
  if (name === "") return name;
  if (/^(https?:\/\/|\/)/.test(name)) return name;
  return `${MEDIA_PREFIX}/${encodeURIComponent(runId)}/${name
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/")}`;
}

// MediaListRow lives in ./types.ts (the typert generator's law:
// remote boundary types export from a public non-root type subpath).
export type { MediaListRow } from "./types.js";
import type { MediaListRow } from "./types.js";

/** The kinds the list door names (mediaVocab's families + all). */
const LIST_KINDS = ["image", "audio", "video", "model", "all"] as const;

/** The listed cap: a picker page, not an unbounded dump. */
const LIST_CAP = 300;

/** Classify one extension into the vocab's families ("" when the
 *  extension classifies nowhere — sidecars, prompts, workflows). */
function kindForExt(ext: string): string {
  const v = mediaVocab();
  for (const kind of ["image", "audio", "video", "model"] as const) {
    if ((v[kind] as readonly string[]).includes(ext)) return kind;
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
export async function listMedia(stateRoot: string, kind: string): Promise<{ count: number; items: MediaListRow[] }> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const wanted = kind === "all" ? "" : kind;
  const items: MediaListRow[] = [];
  const outRoot = path.join(stateRoot, "output");
  let runIds: string[] = [];
  try {
    runIds = fs.readdirSync(outRoot).filter((id) => RUN_ID.test(id));
  } catch {
    return { count: 0, items: [] };
  }
  const runTimes = new Map<string, number>();
  for (const id of runIds) {
    try { runTimes.set(id, fs.statSync(path.join(outRoot, id)).mtimeMs); } catch { /* raced */ }
  }
  runIds.sort((a, b) => (runTimes.get(b) ?? 0) - (runTimes.get(a) ?? 0));
  const walk = (runId: string, dir: string, rel: string, depth: number): void => {
    if (items.length >= LIST_CAP || depth > 3) return;
    let entries: import("node:fs").Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const files: Array<{ name: string; t: number }> = [];
    for (const e of entries) {
      if (e.isDirectory()) { walk(runId, path.join(dir, e.name), rel === "" ? e.name : `${rel}/${e.name}`, depth + 1); continue; }
      if (!e.isFile()) continue;
      const dot = e.name.lastIndexOf(".");
      if (dot < 0) continue;
      const ext = e.name.slice(dot + 1).toLowerCase();
      const k = kindForExt(ext);
      if (k === "") continue;
      if (wanted !== "" && k !== wanted) continue;
      let t = 0;
      try { t = fs.statSync(path.join(dir, e.name)).mtimeMs; } catch { /* raced */ }
      files.push({ name: e.name, t });
    }
    files.sort((a, b) => b.t - a.t);
    for (const f of files) {
      if (items.length >= LIST_CAP) return;
      const name = rel === "" ? f.name : `${rel}/${f.name}`;
      items.push({
        url: `${MEDIA_PREFIX}/${runId}/${name}`,
        name,
        kind: kindForExt(f.name.slice(f.name.lastIndexOf(".") + 1).toLowerCase()),
        runId,
      });
    }
  };
  for (const id of runIds) walk(id, path.join(outRoot, id), "", 1);
  return { count: items.length, items };
}

declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** The kind is not one of the vocab families (+all). */
    "media/kind": { readonly kind: string };
    /** The queue seat (the runs tree root owner) is not mounted. */
    "media/no-seat": Record<string, never>;
  }
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    mediaRemote: MediaRemoteService;
  }
}

/** The media remote: media/list over the queue seat's runs tree. */
export class MediaRemoteService extends TypertRemoteService {
  static inject = ["queue"];

  constructor(ctx: Context) {
    super(ctx, "mediaRemote", { namespace: "media" });
  }

  /** Endpoint `media/list` — the source row's From media arm. */
  @Remote("list")
  async remoteExportList(
    kind: string,
    signal: AbortSignal,
  ): Promise<{ count: number; items: MediaListRow[] }> {
    if (!(LIST_KINDS as readonly string[]).includes(kind)) {
      throw new RemoteError("media/kind", `media/list: unknown kind '\'${kind}\' (wanted one of ${LIST_KINDS.join(", ")})`, { kind });
    }
    const seat = this.ctx.get("queue", false) as QueueSeat | undefined;
    if (seat === undefined) {
      throw new RemoteError("media/no-seat", "media/list: the queue seat owns the runs tree root — mount @melite-plugin/melite-estate", {});
    }
    return await listMedia(seat.stateRoot, kind);
  }
}

/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
