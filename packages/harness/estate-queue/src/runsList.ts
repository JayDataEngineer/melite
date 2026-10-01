import { servableLeaf } from "@melite/contracts/mediaKinds"
// runsList.ts — the runs LIST surface (REBUILD-7, gateway kill):
// the dead runs door's list arm (GET /v1/flows/runs, the
// editor_runs.py restore port) re-homed verbatim into the queue
// package as the registry's `list` business arm. The sidecar
// byte-surgery helpers are the door's own bodies, second move
// unchanged (their line cites ride along — traceability).
//
// TWO re-homes ride this stroke (ledgered):
//  - mediaVocab: the media-kinds.json DATA file died with the media
//    client (5cbb5bcc); the vocabulary re-homes as TYPED DATA in
//    ./mediaKinds.ts (same sets, lowered; the $comment laws moved
//    into that file) — no repo-anchored file reads, no cache.
//  - ASSET_URL_PREFIX ("/v1/assets/runs") died with the app: url +
//    thumbnail carry run-RELATIVE names ("run-x/img.png"), the same
//    divergence-by-order law as the live payload (REBUILD-6). The
//    row SCHEMA is byte-pinned by the wall; the web callers migrate
//    on their stroke.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mediaVocab } from "./mediaKinds.ts";
import { engineFilmName } from "./filmLead.ts";

/** Leading-int read (sidecar tails): optional space, optional
 *  sign, then digits; 0 when no digits lead. */
export function parseLeadingInt(s: string): number {
  // (group 1 always participates on match — the undefined fence is dead.)
  const m: RegExpMatchArray | null = /^[\s]*([+-]?\d+)/.exec(s);
  if (m === null) return 0;
  return Number(m[1] as string);
}

/** sidecar_num (editor_runs.297-303): first `"key":`, strtol the
 *  tail, default when the key is absent. */
export function sidecarNum(text: string, key: string, dflt: number): number {
  const needle: string = '"' + key + '":';
  const i: number = text.indexOf(needle);
  if (i < 0) return dflt;
  return parseLeadingInt(text.slice(i + needle.length));
}

/** sidecar_str (editor_runs.271-295): BYTE-wise exact — first
 *  `"key":`, skip spaces/tabs, expect `"`, decode \\n \\r \\t \"
 *  \\ (any other escape lands literally — \u stays "u"), stop at
 *  cap-1 BYTES. Operates on the UTF-8 bytes (D5). */
export function sidecarStr(raw: Uint8Array, key: string, cap: number): string {
  const pat: Uint8Array = Buffer.from('"' + key + '":', "utf8");
  let at: number = -1;
  outer: for (let i = 0; i + pat.length <= raw.length; i++) {
    for (let j = 0; j < pat.length; j++) {
      if (raw[i + j] !== pat[j]) continue outer;
    }
    at = i;
    break;
  }
  if (at < 0) return "";
  let p: number = at + pat.length;
  while (p < raw.length && (raw[p] === 0x20 || raw[p] === 0x09)) p++;
  if (p >= raw.length || raw[p] !== 0x22) return "";
  p++;
  const out: number[] = [];
  while (p < raw.length && raw[p] !== 0x22 && out.length + 1 < cap) {
    if (raw[p] === 0x5c && p + 1 < raw.length) {
      p++;
      const e: number = raw[p] as number;
      out.push(e === 0x6e ? 0x0a : e === 0x72 ? 0x0d : e === 0x74 ? 0x09 : e);
      p++;
    } else {
      out.push(raw[p] as number);
      p++;
    }
  }
  return Buffer.from(out).toString("utf8");
}

/** _sidecar_str_impl found-ness (editor_runs.271-295 core): only
 *  the runs-list status site reads it (editor_runs.py) — a
 *  present-but-empty "status" serves "" (the gate then skips the
 *  row), while an absent/non-string key serves "unknown". */
export function sidecarStrFound(
  raw: Uint8Array,
  key: string,
  cap: number,
): [boolean, string] {
  const pat: Uint8Array = Buffer.from('"' + key + '":', "utf8");
  let at: number = -1;
  outer: for (let i = 0; i + pat.length <= raw.length; i++) {
    for (let j = 0; j < pat.length; j++) {
      if (raw[i + j] !== pat[j]) continue outer;
    }
    at = i;
    break;
  }
  if (at < 0) return [false, ""];
  let p: number = at + pat.length;
  while (p < raw.length && (raw[p] === 0x20 || raw[p] === 0x09)) p++;
  if (p >= raw.length || raw[p] !== 0x22) return [false, ""];
  p++;
  const out: number[] = [];
  while (p < raw.length && raw[p] !== 0x22 && out.length + 1 < cap) {
    if (raw[p] === 0x5c && p + 1 < raw.length) {
      p++;
      const e: number = raw[p] as number;
      out.push(e === 0x6e ? 0x0a : e === 0x72 ? 0x0d : e === 0x74 ? 0x09 : e);
      p++;
    } else {
      out.push(raw[p] as number);
      p++;
    }
  }
  return [true, Buffer.from(out).toString("utf8")];
}

export function artifactType(name: string): string {
  const kinds = mediaVocab();
  const dot: number = name.lastIndexOf(".");
  const ext: string =
    dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (kinds.image.includes(ext)) return "image";
  if (kinds.audio.includes(ext)) return "audio";
  if (kinds.video.includes(ext)) return "video";
  if (kinds.model.includes(ext)) return "model";
  if (ext === "json") return "spec";
  if (ext === "txt" || ext === "md" || ext === "yaml") return "text";
  return "file";
}

/** Byte-wise name order (editor_runs sorts on the surrogateescape
 *  bytes — for valid UTF-8, Buffer.compare on the re-encoded name
 *  is the same bytes; D5). */
function byteLess(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
}

interface MediaCand {
  readonly rel: string;
  readonly full: string;
}

/** _media_candidates (editor_runs.373-402): top-level files
 *  (non-underscore) then ONE level down (underscore + deeper dirs
 *  skipped), each tier byte-sorted. */
export function mediaCandidates(runDir: string): MediaCand[] {
  const cands: MediaCand[] = [];
  let names: string[];
  try {
    names = readdirSync(runDir);
  } catch {
    return [];
  }
  names.sort(byteLess);
  const subs: string[] = [];
  for (const name of names) {
    if (!servableLeaf(name)) continue; // the estate's own servable law (the poster IS servable)
    const full: string = join(runDir, name);
    if (isDir(full)) subs.push(name);
    else cands.push({ rel: name, full });
  }
  subs.sort(byteLess);
  for (const sub of subs) {
    let inner: string[];
    try {
      inner = readdirSync(join(runDir, sub));
    } catch {
      continue;
    }
    inner.sort(byteLess);
    for (const name of inner) {
      if (!servableLeaf(name)) continue; // the estate's own servable law (the poster IS servable)
      const full: string = join(runDir, sub, name);
      if (isDir(full)) continue;
      cands.push({ rel: sub + "/" + name, full });
    }
  }
  return cands;
}

/** run_artifacts (editor_runs.404-430): image/video/audio/model
 *  rows (image capped at _MAX_IMGS — counted but unlisted past it),
 *  everything else skipped; the {truncated,listed,total} marker when
 *  entries went unlisted. path keeps the "./output/<run>/" literal. */
export function runArtifacts(
  runDir: string,
  outDirLiteral: string,
): Record<string, unknown>[] {
  const kinds = mediaVocab();
  const maxImgs: number = kinds.maxListedImages;
  const runBase: string = (() => {
    const stripped: string = outDirLiteral.replace(/\/+$/, "");
    const slash: number = stripped.lastIndexOf("/");
    return slash >= 0 ? stripped.slice(slash + 1) : stripped;
  })();
  const arts: Record<string, unknown>[] = [];
  let mediaTotal = 0;
  let listed = 0;
  let imgs = 0;
  for (const cand of mediaCandidates(runDir)) {
    // A dead candidate (dangling symlink, vanished file — partial
    // cleanup, pruned output) drops from the LIST, never the ROW:
    // one unreadable artifact must not erase a finished run from
    // the restore port (the -1 → artifactRowOk row-refusal path,
    // audit finding, stroke 82 — the bytes gate now holds on what
    // is actually listed).
    const size: number = fileSize(cand.full);
    if (size < 0) continue;
    const base: string = cand.rel.includes("/")
      ? (cand.rel.slice(cand.rel.lastIndexOf("/") + 1) as string)
      : cand.rel;
    const t: string = artifactType(base);
    if (t === "image") {
      mediaTotal++;
      imgs++;
      if (imgs > maxImgs) continue;
    } else if (t === "video" || t === "audio" || t === "model") {
      mediaTotal++;
    } else {
      continue;
    }
    listed++;
    arts.push({
      name: base,
      path: outDirLiteral + "/" + cand.rel,
      bytes: size,
      url: runBase + "/" + cand.rel,
      type: t,
      size,
    });
  }
  if (mediaTotal > listed) {
    arts.push({ truncated: true, listed, total: mediaTotal });
  }
  const marker = arts.find((art): boolean => art['truncated'] === true)
  const named = arts.filter((art): boolean => art !== marker)
  const film = engineFilmName(named.map((art) => art['name'] as string))
  const ordered = film === null
    ? named
    : [named.find((art) => art['name'] === film)!, ...named.filter((art) => art['name'] !== film)]
  return marker === undefined ? ordered : [...ordered, marker]
}

/** _run_thumbnail (editor_runs.433-444): cached poster wins, else
 *  the first image candidate (same one-level rule, so nested-only
 *  runs still get a poster). */
export function runThumbnail(runDir: string, runId: string): string {
  try {
    statSync(join(runDir, "_poster.jpg"));
    return runId + "/_poster.jpg";
  } catch {
    /* no poster — fall through to first image */
  }
  for (const cand of mediaCandidates(runDir)) {
    const base: string = cand.rel.includes("/")
      ? (cand.rel.slice(cand.rel.lastIndexOf("/") + 1) as string)
      : cand.rel;
    if (artifactType(base) === "image") {
      return runId + "/" + cand.rel;
    }
  }
  return "";
}

/** _run_dir_has_media (editor_runs.307-333): the media-FIRST
 *  sort key — top-level names, then one level down. NOTE the
 *  absences: NO `_` skip (a lone `_poster.jpg` counts), NO inner
 *  isdir check (a nested DIR named x.mp4 counts) — probed live,
 *  mirrored exactly. Gallery sets only (svg/bmp classify but do
 *  not list — the media-kinds.json contract). */
export function runDirHasMedia(runDir: string): boolean {
  const kinds = mediaVocab();
  const has = (name: string): boolean => {
    const dot: number = name.lastIndexOf(".");
    const ext: string =
      dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
    return (
      kinds.galleryVideo.includes(ext) ||
      kinds.galleryImage.includes(ext) ||
      kinds.galleryAudio.includes(ext) ||
      kinds.galleryModel.includes(ext)
    );
  };
  let names: string[];
  try {
    names = readdirSync(runDir);
  } catch {
    return false;
  }
  for (const name of names) {
    if (has(name)) return true;
  }
  for (const name of names) {
    const sub: string = join(runDir, name);
    try {
      if (!isDir(sub)) continue;
      for (const inner of readdirSync(sub)) {
        if (has(inner)) return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

// ── the run_wire.py gate (RunRow 83-96 / RunsEnvelope 99-104) ─────
// A refused reconstruction is SKIPPED (RESILIENCE LAW) but stays in
// count (the C contract). Extra keys forbid; statuses outside the
// closed vocab (incl. "queued") refuse.
//
// DIVERGENCE (ledgered): run_wire.py's ArtifactRow admits
// image/video/audio only — the image-era vocab. The estate's own
// emitter half (runArtifacts, editor_runs.py, same file)
// counts "model" rows as listable media, mediaKinds.ts carries the
// galleryModel set, and the img-to-mesh lane is the first producer
// of model-only runs. Keeping the image-era refusal would drop
// every completed model run from the restore port (runs/list) —
// and with it runs/list adoption (fetchLatestRunForDraft) — so the
// row gate admits "model" alongside the triple.

const RUN_ID_RE: RegExp = /^run-[A-Za-z0-9_.@-]+$/;
// NOT runsTypes.ts's exported RUN_STATUSES: this set mirrors
// run_wire.py's list-side vocabulary (adds success/unknown, drops
// queued/stopping — the C-contract fold runsRegistry owns).
const RUN_STATUS: ReadonlySet<string> = new Set([
  "running",
  "completed",
  "failed",
  "stopped",
  "success",
  "unknown",
]);
const ARTIFACT_TYPE: ReadonlySet<string> = new Set([
  "image",
  "video",
  "audio",
  "model",
]);

function isIntGe0(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && (v as number) >= 0;
}

function artifactRowOk(a: unknown): boolean {
  if (typeof a !== "object" || a === null || Array.isArray(a)) return false;
  const o = a as Record<string, unknown>;
  const keys: string[] = Object.keys(o);
  const isTrunc: boolean = "truncated" in o;
  if (isTrunc) {
    if (keys.length !== 3) return false;
    return (
      o["truncated"] === true && isIntGe0(o["listed"]) && isIntGe0(o["total"])
    );
  }
  if (keys.length !== 6) return false;
  return (
    typeof o["name"] === "string" &&
    (o["name"] as string).length >= 1 &&
    typeof o["path"] === "string" &&
    isIntGe0(o["bytes"]) &&
    typeof o["url"] === "string" &&
    typeof o["type"] === "string" &&
    ARTIFACT_TYPE.has(o["type"] as string) &&
    isIntGe0(o["size"])
  );
}

/** The RunRow gate — the row dict, or null when run_wire would
 *  refuse it (the caller logs LOUD and skips). Key order is the
 *  RunRow field order. */
export function runRowOrNull(
  row: {
    run_id: string;
    name: string;
    flow: string;
    status: string;
    created_at: number;
    prompt: string;
    seed: number;
    thumbnail: string;
    artifacts: Record<string, unknown>[];
    params: Record<string, unknown>;
    draft_id: string;
    /** THE EXPORT NAME (023's self-critique #4/#6): optional —
     *  older sidecars predate it, and only export lanes stamp it. */
    export_name?: string;
    /** THE EXPORT PATH (the export FULL PATH): optional — the
     *  engine-reported minted .qvoice absolute path; older sidecars
     *  predate it, load lanes stamp nothing. */
    export_path?: string;
  },
): Record<string, unknown> | null {
  if (!RUN_ID_RE.test(row.run_id)) return null;
  if (!RUN_STATUS.has(row.status)) return null;
  if (!isIntGe0(row.created_at)) return null;
  if (typeof row.seed !== "number" || !Number.isInteger(row.seed)) return null;
  for (const a of row.artifacts) {
    if (!artifactRowOk(a)) return null;
  }
  return {
    run_id: row.run_id,
    name: row.name,
    flow: row.flow,
    status: row.status,
    created_at: row.created_at,
    prompt: row.prompt,
    seed: row.seed,
    thumbnail: row.thumbnail,
    artifacts: row.artifacts,
    params: row.params,
    draft_id: row.draft_id,
    ...(typeof row.export_name === "string" && row.export_name !== "" ? { export_name: row.export_name } : {}),
    ...(typeof row.export_path === "string" && row.export_path !== "" ? { export_path: row.export_path } : {}),
  };
}

/** Strict int parse: surrounding whitespace stripped, one optional
 *  sign, ASCII digits with single internal underscores ("1_0" ->
 *  10). null = not an int (the 400 arm). */
export function parseIntOrNull(s: string): number | null {
  const m: RegExpMatchArray | null =
    /^([+-]?)([0-9]+(?:_[0-9]+)*)$/.exec(s.trim());
  // (both groups always participate on match — the fences are dead.)
  if (m === null) return null;
  return Number((m[1] as string) + (m[2] as string).replace(/_/g, ""));
}

/** parse_qs (drops blank values): first non-blank
 *  value wins; the shared ctx parseQuery keeps blanks, so the
 *  filter lives here (parse_qs default). */
export function firstQuery(
  qs: Record<string, string[]>,
  name: string,
  dflt: string,
): string {
  const vals: string[] | undefined = qs[name];
  if (vals === undefined) return dflt;
  for (const v of vals) {
    if (v !== "") return v;
  }
  return dflt;
}
// ── the list arm (the registry's business face) ────────────────────

interface RunsEnt {
  readonly dir: string;
  readonly created: number;
  readonly media: boolean;
  /** §23 CROSS-ROOTS: the state root that held this dir (the
   *  manifest entry, not the out-root — the row names it). */
  readonly root: string;
}

/** The single-root scan (the file-era walk, intact): PROD output
 *  root only (test runs never listed — kept 1:1). */
function scanRunsRoot(stateRoot: string): RunsEnt[] {
  // The PROD output root only (the door's list scanned
  // roots.runsRoot; test runs never listed — kept 1:1).
  const outputRoot: string = join(stateRoot, "output");
  let names: string[];
  try {
    names = readdirSync(outputRoot);
  } catch {
    names = [];
  }
  const ents: RunsEnt[] = [];
  for (const name of names) {
    if (ents.length >= 8192) break; // the C's 8192 collected cap
    if (!name.startsWith("run-")) continue;
    const runDir: string = join(outputRoot, name);
    let created = 0;
    let buf = "";
    try {
      buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
    } catch {
      buf = "";
    }
    if (buf) {
      // created_at (sidecar) first, "created" (C fossil) fallback.
      created = sidecarNum(buf, "created", 0);
      const at: number = buf.indexOf('"created_at":');
      if (at >= 0) created = parseLeadingInt(buf.slice(at + 13));
    }
    ents.push({
      dir: name,
      created,
      media: runDirHasMedia(runDir),
      root: stateRoot,
    });
  }
  return ents;
}

/** The per-run card build (the file-era row law, intact): sidecar
 *  byte-scan → zombie override → user-surface skip → orphan-draft
 *  clearing → runRowOrNull. Null = skipped (never stored, never
 *  served — the count still counts the dir). The drafts probe is
 *  ASYNC (the drafts remote's birth-certificate face — the legacy
 *  drafts/<id>.json stat died with the drafts-door migration;
 *  orphans lose their draft link, never the row). */
async function buildRunCard(
  outputRoot: string,
  ent: RunsEnt,
  hasDraft: (draftId: string) => Promise<boolean>,
): Promise<Record<string, unknown> | null> {
  const runDir: string = join(outputRoot, ent.dir);
  let buf: string | null = null;
  // NO sidecar (ENOENT) is the file-era completed-run law: it reads
  // the "success" default, pinned by runs-list.spec. A sidecar that
  // EXISTS but cannot be read (torn read, permissions) is different —
  // unknown, never success (strictness fix 7, 2026-10-01).
  let torn = false;
  try {
    buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
  } catch (e) {
    buf = null;
    torn = !(typeof e === "object" && e !== null && (e as NodeJS.ErrnoException).code === "ENOENT");
  }
  let status = torn ? "unknown" : "success";
  let pipeline = "";
  let prompt = "";
  let draft = "";
  let exported = "";
  let exportedPath = "";
  let seed = -1;
  let created: number = ent.created;
  const rawBytes: Uint8Array =
    buf === null ? Buffer.alloc(0) : Buffer.from(buf, "utf8");
  if (buf !== null) {
    // found-ness matters (editor_runs.py): absent key ->
    // "unknown" (served); present-but-empty -> "" (gate-skipped).
    const [foundStatus, rawStatus]: [boolean, string] = sidecarStrFound(
      rawBytes,
      "status",
      16,
    );
    if (foundStatus) {
      status = rawStatus === "error" ? "failed" : rawStatus;
      // read-time zombie override (sweep=False: report only, D1).
      if (status === "running") status = "failed";
    } else {
      status = "unknown";
    }
    pipeline = sidecarStr(rawBytes, "pipeline", 64);
    prompt = sidecarStr(rawBytes, "prompt", 2048);
    draft = sidecarStr(rawBytes, "draft_id", 96);
    // THE EXPORT NAME, LISTED (023's self-critique #4/#6): the
    // design lane's mint rides the list row too — additive, same
    // spelling as the sidecar; absent on non-export runs.
    exported = sidecarStr(rawBytes, "export_name", 128);
    // THE EXPORT PATH, LISTED (the export FULL PATH): the engine's
    // minted .qvoice absolute path rides the list row — the voices
    // root is long, so the slice budget doubles the name's.
    exportedPath = sidecarStr(rawBytes, "export_path", 256);
    seed = sidecarNum(buf, "seed", -1);
    const at: number = buf.indexOf('"created_at":');
    if (at >= 0) created = parseLeadingInt(buf.slice(at + 13));
  }
  if (pipeline.startsWith("_")) return null; // user-surface law
  if (draft && !(await hasDraft(draft))) {
    draft = "";
  }
  const literal: string = "./output/" + ent.dir;
  const row = runRowOrNull({
    run_id: ent.dir,
    name: pipeline,
    flow: pipeline,
    status,
    created_at: created,
    prompt,
    seed,
    thumbnail: runThumbnail(runDir, ent.dir),
    artifacts: runArtifacts(runDir, literal),
    params: { seed },
    draft_id: draft,
    ...(exported !== "" ? { export_name: exported } : {}),
    ...(exportedPath !== "" ? { export_path: exportedPath } : {}),
  });
  return row; // null = RESILIENCE LAW loud skip
}

/** The runs-list envelope (editor_runs.runs 483-653, the restore
 *  port): the output-root scan, media-first + newest sort, the
 *  limit parse (raw STRING — the lane/remote pass the raw
 *  text; underscores parse, non-ints refuse), refused cards
 *  SKIPPED but counted. url/thumbnail are run-RELATIVE (the
 *  /v1/assets prefix died with the app — the header's law). */
export async function listRuns(
  stateRoot: string,
  limit: number,
  hasDraft: (draftId: string) => Promise<boolean>,
): Promise<{ count: number; runs: Record<string, unknown>[] }> {
  return listRunsAcross([stateRoot], limit, hasDraft);
}

/** §23 CROSS-ROOTS (2026-09-23): the union list across the
 *  manifest — every root scanned, one media-first + newest sort,
 *  the limit sliced off the merged order, the scan total counted
 *  (refused cards SKIPPED but counted, per root). Every served row
 *  names its root (served_from); same-run-id collisions serve the
 *  FIRST manifest root's row (own writes win — the sort is stable,
 *  own root scanned first). */
export async function listRunsAcross(
  roots: string[],
  limit: number,
  hasDraft: (draftId: string) => Promise<boolean>,
): Promise<{ count: number; runs: Record<string, unknown>[] }> {
  const ents: RunsEnt[] = [];
  for (const root of roots) ents.push(...scanRunsRoot(root));
  const count: number = ents.length;
  ents.sort((a: RunsEnt, b: RunsEnt): number => {
    const am: number = a.media ? 0 : 1;
    const bm: number = b.media ? 0 : 1;
    if (am !== bm) return am - bm;
    return b.created - a.created; // newest-first; stable
  });
  const sliced: RunsEnt[] = ents.slice(0, limit);
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const ent of sliced) {
    if (seen.has(ent.dir)) continue; // first manifest root wins
    seen.add(ent.dir);
    const row = await buildRunCard(join(ent.root, "output"), ent, hasDraft);
    if (row === null) continue; // RESILIENCE LAW: loud skip
    rows.push({ ...row, served_from: ent.root });
  }
  return { count, runs: rows };
}
