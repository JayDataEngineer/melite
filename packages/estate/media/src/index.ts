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
import { contentTypeForArtifact, mediaVocab } from "@melite/contracts/mediaKinds";
import { parseRangeHeader } from "@melite/contracts/mediaRange";
import { stampOf } from "@melite/contracts/buildStamp";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname as dirnamePath, join as joinPath } from "node:path";
import { fileURLToPath } from "node:url";
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
  /** §23 CROSS-ROOTS manifest (own root first). Optional: seats
   *  predating the manifest (or test doubles) fall back to the
   *  single own root — the byte-identical legacy walk. */
  readonly stateRoots?: readonly string[];
}

/** The roots a media answer searches: the seat's manifest when it
 *  carries one, else the single own root (§23 — own root always
 *  leads; a run-id collision resolves first-root-wins). */
const seatRoots = (seat: QueueSeat): string[] =>
  seat.stateRoots !== undefined && seat.stateRoots.length > 0
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
export const inject = [] as const;

/** The route this plugin claims (one prefix, disjoint by law). */
export const MEDIA_PREFIX = "/melite-media/runs";

/** THE DEPLOY HANDSHAKE ROUTE (2026-09-23, the stale-tab root rot):
 * the loader's /plugins URL is immutable-cached on the plugin LIST,
 * not the bytes — rebuilt card bundles never reach a browser that
 * cached the URL. This route serves the CURRENT sha1 of every card
 * package's lib/client.js (stamp line stripped — the same law the
 * build bakes), no-store, so the cards tab can compare its baked
 * stamp against disk truth and face a stale tab. */
export const CARD_BUILD_PREFIX = "/melite-media/card-build";

/** The stamps the route serves: package dir name → sha1 of its
 *  lib/client.js. Card packages nest by genre (web/, video/, …),
 *  so the walk covers both depths and keys by the LEAF name (the
 *  package id the client names as its own). */
export function cardBuildStamps(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const dirs: Array<{ name: string; path: string }> = [];
  try {
    for (const entry of readdirSync(joinPath(root, "packages"), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = joinPath(root, "packages", entry.name);
      dirs.push({ name: entry.name, path });
      for (const nested of readdirSync(path, { withFileTypes: true })) {
        if (nested.isDirectory()) dirs.push({ name: nested.name, path: joinPath(path, nested.name) });
      }
    }
  } catch {
    return out;
  }
  for (const dir of dirs) {
    try {
      const code = readFileSync(joinPath(dir.path, "lib", "client.js"), "utf8");
      out[dir.name] = stampOf(code);
    } catch {
      /* no client bundle in this package — not a handshake member */
    }
  }
  return out;
}

/** The repo root this plugin serves from (walks up from its own file
 * to the directory that owns packages/ + the workspace manifest). */
export function repoRootOf(start: string): string | null {
  let dir = dirnamePath(start);
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(joinPath(dir, "pnpm-workspace.yaml"))) return dir;
    const next = dirnamePath(dir);
    if (next === dir) return null;
    dir = next;
  }
  return null;
}


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

/** The content-type for one served artifact: the LEAF's one
 *  spelling (contentTypeForArtifact — the vocab leaf's MIME table,
 *  shared with the gallery artifact route; the route owns no map of
 *  its own to drift). */
function contentTypeFor(name: string): string {
  return contentTypeForArtifact(name);
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
        // §23 CROSS-ROOTS: the first manifest root holding the run
        // serves the bytes (own root leads — first-root-wins).
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const roots = seatRoots(seat);
        let runDir = "";
        for (const root of roots) {
          const candidate = `${root}/output/${target.runId}`;
          try {
            const st = await fs.stat(candidate);
            if (st.isDirectory()) { runDir = candidate; break; }
          } catch { /* not in this root */ }
        }
        if (runDir === "") {
          res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
          res.end(NOT_FOUND_BODY);
          return;
        }
        const file = `${runDir}/${target.rel}`;
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
        let stat: import("node:fs").Stats;
        // bytes is Buffer by the 200 arm below (the 206 arm returns
        // early; the type rides the assignment, never an assertion)
        let bytes = Buffer.alloc(0);
        let slice: { buf: Buffer; start: number; end: number } | undefined;
        try {
          stat = await fs.stat(realFile);
          if (!stat.isFile()) {
            res.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
            res.end(NOT_FOUND_BODY);
            return;
          }
          const range =
            req.method === "HEAD" ? null : parseRangeHeader(req.headers.range, stat.size);
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
              if (bytesRead === 0) throw new Error("media/read-empty");
              slice = { buf: buf.subarray(0, bytesRead), start: range.start, end: range.start + bytesRead - 1 };
            } finally {
              await fh.close();
            }
          } else {
            bytes = req.method === "HEAD"
              ? Buffer.alloc(0)
              : await fs.readFile(realFile);
          }
        } catch {
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
      },
    }),
    "estate-media: runs artifact route",
  );

  // THE DEPLOY HANDSHAKE ROUTE: current disk stamps, no-store. The
  // repo root resolves from THIS file at boot (src or lib depth
  // agnostic — the walker finds the workspace manifest); a miss
  // serves {} (the client treats an absent own-entry as no verdict,
  // never a false alarm).
  ctx.effect(() =>
    webServer.register({
      kind: "prefix",
      path: CARD_BUILD_PREFIX,
      handler: (req, res) => {
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.writeHead(405, { "content-type": "application/json", allow: "GET, HEAD", "cache-control": "no-store" });
          res.end('{"error":"media/method-not-allowed"}');
          return;
        }
        const root = repoRootOf(fileURLToPath(import.meta.url));
        const stamps = root === null ? {} : cardBuildStamps(root);
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        res.end(JSON.stringify({ stamps }));
      },
    }),
    "estate-media: card build stamp route",
  );

  ctx.logger.info("estate-media: serving %s/* from the runs output tree", MEDIA_PREFIX);
  ctx.logger.info("estate-media: serving %s (the deploy handshake)", CARD_BUILD_PREFIX);
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
 *  list arm runs pure over a tree fixture. Single-root shape (the
 *  legacy law rides verbatim — listMediaAcross with one root). */
export async function listMedia(stateRoot: string, kind: string): Promise<{ count: number; items: MediaListRow[] }> {
  return await listMediaAcross([stateRoot], kind);
}

/** §23 CROSS-ROOTS list arm: every manifest root's runs tree, one
 *  merged answer. Run-ids union across roots (newest run mtime
 *  first; a collision resolves FIRST-ROOT-WINS — own writes win);
 *  every row names the root that served it. Cap stays LIST_CAP on
 *  the merged answer. */
export async function listMediaAcross(roots: readonly string[], kind: string): Promise<{ count: number; items: MediaListRow[] }> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const wanted = kind === "all" ? "" : kind;
  const items: MediaListRow[] = [];
  // runId -> { root, t }: the union scan. Insertion walks roots in
  // manifest order, so a seen id keeps its FIRST root (own wins).
  const runs = new Map<string, { root: string; t: number }>();
  for (const root of roots) {
    const outRoot = path.join(root, "output");
    let runIds: string[] = [];
    try {
      runIds = fs.readdirSync(outRoot).filter((id) => RUN_ID.test(id));
    } catch {
      continue; // a missing/unreadable root reads empty, never poisons
    }
    for (const id of runIds) {
      if (runs.has(id)) continue;
      let t = 0;
      try { t = fs.statSync(path.join(outRoot, id)).mtimeMs; } catch { /* raced */ }
      runs.set(id, { root, t });
    }
  }
  const ordered = [...runs.entries()].sort((a, b) => b[1].t - a[1].t);
  const walk = (root: string, runId: string, dir: string, rel: string, depth: number): void => {
    if (items.length >= LIST_CAP || depth > 3) return;
    let entries: import("node:fs").Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    const files: Array<{ name: string; t: number }> = [];
    for (const e of entries) {
      if (e.isDirectory()) { walk(root, runId, path.join(dir, e.name), rel === "" ? e.name : `${rel}/${e.name}`, depth + 1); continue; }
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
        served_from: root,
      });
    }
  };
  for (const [id, r] of ordered) walk(r.root, id, path.join(r.root, "output", id), "", 1);
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
    // §23 CROSS-ROOTS: the seat's manifest (own root first) — the
    // Infer Media bar sees every lane's runs on one box.
    return await listMediaAcross(seatRoots(seat), kind);
  }
}

/** The cordis row shape: a plugin object (name + apply). */
export default { name, apply };
