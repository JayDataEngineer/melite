import { servableLeaf } from "@melite/contracts/mediaKinds"
import { ARCHIVED_DIR_NAME } from "@melite/contracts/mediaKinds"
import { draftIdOf, type DraftId } from "@melite/contracts/benchStage"
// runsList.ts — the runs LIST surface (REBUILD-7, gateway kill):
// the retired runs door's list arm (GET /v1/flows/runs, the restore port) re-homed verbatim into the queue package as the registry's `list` business arm.
// The sidecar byte-surgery helpers are the door's own bodies, second move unchanged (the section notes below name the reader each helper implements).
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
import { mediaKindOf, mediaVocab } from "./mediaKinds.ts";
import { engineFilmName } from "./filmLead.ts";

/** Leading-int read (sidecar tails): optional space, optional
 *  sign, then digits; 0 when no digits lead. */
export function parseLeadingInt(s: string): number {
  // (group 1 always participates on match — the undefined fence is dead.)
  const m: RegExpMatchArray | null = /^[\s]*([+-]?\d+)/.exec(s);
  if (m === null) return 0;
  return Number(m[1] as string);
}

/** sidecar_num: first `"key":`, strtol the tail, default when the key is absent. */
export function sidecarNum(text: string, key: string, dflt: number): number {
  const needle: string = '"' + key + '":';
  const i: number = text.indexOf(needle);
  if (i < 0) return dflt;
  return parseLeadingInt(text.slice(i + needle.length));
}

/** sidecar_bool: first `"key":`, skip spaces/tabs, expect the
 *  `true`/`false` literal — default when the key is absent or
 *  non-boolean (never guessed; a torn write reads the default). */
export function sidecarBool(text: string, key: string, dflt: boolean): boolean {
  const needle: string = '"' + key + '":';
  const i: number = text.indexOf(needle);
  if (i < 0) return dflt;
  const tail: string = text.slice(i + needle.length).replace(/^[ \t]+/, "");
  if (tail.startsWith("true")) return true;
  if (tail.startsWith("false")) return false;
  return dflt;
}

/** sidecar_str: BYTE-wise exact — first `"key":`, skip spaces/tabs, expect `"`, decode \\n \\r \\t \" \\ (any other escape lands literally — \u stays "u"), stop at cap-1 BYTES. Operates on the UTF-8 bytes (D5). */
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

/** _sidecar_str_impl found-ness: only the runs-list status site reads it — a present-but-empty "status" serves "" (the gate then skips the row), while an absent/non-string key serves "unknown". */
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
  // ONE CLASSIFIER (the text-kind stroke, 2026-10-24): this private
  // ext table (json→spec, txt/md/yaml→text) pre-dated the vocab's
  // text kind and minted types the list loop then DROPPED — a
  // tagger's tags.txt never listed. The contract's mediaKindOf is
  // the one answer now; a non-media name answers "file" and the
  // callers' own gates keep deciding what lists.
  const k = mediaKindOf(name);
  return k ?? "file";
}

/** Byte-wise name order (the sort runs on the surrogateescape bytes — for valid UTF-8, Buffer.compare on the re-encoded name is the same bytes; D5). */
function byteLess(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  // a missing or unreadable path is not a directory — false is the probe's whole answer
  } catch {
    return false;
  }
}

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  // an unstatable file has no knowable size — -1 is the sentinel the artifact pusher drops the row on
  } catch {
    return -1;
  }
}

interface MediaCand {
  readonly rel: string;
  readonly full: string;
}

/** _media_candidates: top-level files (non-underscore) then ONE level down (underscore + deeper dirs skipped), each tier byte-sorted. */
export function mediaCandidates(runDir: string): MediaCand[] {
  const cands: MediaCand[] = [];
  let names: string[];
  try {
    names = readdirSync(runDir);
  // an unlistable run dir (vanished or unreadable) yields no media candidates — the empty list is the answer
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
    // a subdir unreadable at readdir time contributes no candidates — skipping it keeps the walk over the remaining subs
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

/** run_artifacts: image/video/audio/model rows (image capped at _MAX_IMGS — counted but unlisted past it), everything else skipped; the {truncated,listed,total} marker when entries went unlisted. */
/** path keeps the "./output/<run>/" literal. */
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
    } else if (t === "video" || t === "audio" || t === "model" || t === "text") {
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

/** _archived_artifacts (the mass-archive law, operator ruling
 *  2026-11-14, item (a)): the tucked-away face — files resting under
 *  `<run>/_archived/`, served as a SEPARATE array (the live `arts`
 *  grammar is untouched: artifactRowOk still demands exactly its six
 *  keys, so archived rows ride no 7-key exception). Same row shape
 *  (name/path/bytes/url/type/size), same type law, same two-tier
 *  depth as the live walk (top files + one subdir level — the tuck
 *  preserves the relative tail, so deeper nestings do not occur);
 *  NO image cap (tucked rows flood no grid — the panel hides them
 *  unless the operator toggles them visible, and the tuck is an
 *  operator gesture, never an engine frame-dump). Absent dir reads
 *  as the empty face, never a throw. */
export function runArchivedArtifacts(
  runDir: string,
  outDirLiteral: string,
): Record<string, unknown>[] {
  const runBase: string = (() => {
    const stripped: string = outDirLiteral.replace(/\/+$/, "");
    const slash: number = stripped.lastIndexOf("/");
    return slash >= 0 ? stripped.slice(slash + 1) : stripped;
  })();
  const out: Record<string, unknown>[] = [];
  const push = (rel: string, full: string): void => {
    const base: string = rel.includes("/")
      ? (rel.slice(rel.lastIndexOf("/") + 1) as string)
      : rel;
    const t: string = artifactType(base);
    if (t !== "image" && t !== "video" && t !== "audio" && t !== "model" && t !== "text") return;
    const size: number = fileSize(full);
    if (size < 0) return;
    out.push({
      name: base,
      path: outDirLiteral + "/" + ARCHIVED_DIR_NAME + "/" + rel,
      bytes: size,
      url: runBase + "/" + ARCHIVED_DIR_NAME + "/" + rel,
      type: t,
      size,
    });
  };
  let tops: string[];
  try {
    tops = readdirSync(join(runDir, ARCHIVED_DIR_NAME));
  // an absent _archived dir is the pinned empty face — the empty list is the answer, never a throw
  } catch {
    return [];
  }
  tops.sort(byteLess);
  const subs: string[] = [];
  for (const name of tops) {
    if (!servableLeaf(name)) continue;
    const full: string = join(runDir, ARCHIVED_DIR_NAME, name);
    if (isDir(full)) subs.push(name);
    else push(name, full);
  }
  subs.sort(byteLess);
  for (const sub of subs) {
    let inner: string[];
    try {
      inner = readdirSync(join(runDir, ARCHIVED_DIR_NAME, sub));
    // an archived subdir unreadable at readdir time contributes no rows — skipping it keeps the tuck walk over the rest
    } catch {
      continue;
    }
    inner.sort(byteLess);
    for (const name of inner) {
      if (!servableLeaf(name)) continue;
      const full: string = join(runDir, ARCHIVED_DIR_NAME, sub, name);
      if (isDir(full)) continue;
      push(sub + "/" + name, full);
    }
  }
  return out;
}

/** _run_thumbnail: cached poster wins; else — THE WITNESS LAW (F32 cure,
 *  2026-11-13) — the run's VIDEO leads, then the first still.
 *
 *  Why the order flipped: a reshoot run writes WITNESS stills beside its
 *  film (`SaveImage.0_reshoot_warp_*` — the raw warp plate the guide
 *  pins, magenta disocclusions and all, plus `SaveImage.1_reshoot_orbit_*`),
 *  and the old first-image rule painted the tile with a witness (the
 *  operator's 8.8 % magenta preview) while the film itself measured
 *  0.00 %. The artifact names carry their save node's class, so the class
 *  is the role: a video-carrying run's face is its video (the film-named
 *  one first — the in-graph assembly's product, `engineFilmName` — then
 *  the first video candidate); a still is the face only where no video
 *  exists, which is every image-only run's case, unchanged. */
export function runThumbnail(runDir: string, runId: string): string {
  try {
    statSync(join(runDir, "_poster.jpg"));
    return runId + "/_poster.jpg";
  } catch {
    /* no poster — fall through to the deliverable law */
  }
  const cands = mediaCandidates(runDir);
  const baseOf = (rel: string): string => (rel.includes("/")
    ? (rel.slice(rel.lastIndexOf("/") + 1) as string)
    : rel);
  for (const cand of cands) {
    const base: string = baseOf(cand.rel);
    if (artifactType(base) === "video" && engineFilmName([base]) !== null) {
      return runId + "/" + cand.rel;
    }
  }
  for (const cand of cands) {
    const base: string = baseOf(cand.rel);
    if (artifactType(base) === "video") {
      return runId + "/" + cand.rel;
    }
  }
  for (const cand of cands) {
    const base: string = baseOf(cand.rel);
    if (artifactType(base) === "image") {
      return runId + "/" + cand.rel;
    }
  }
  return "";
}

/** _run_dir_has_media: the media-FIRST sort key — top-level names, then one level down. */
/** NOTE the absences: NO `_` skip (a lone `_poster.jpg` counts), NO inner isdir check (a nested DIR named x.mp4 counts) — probed live, mirrored exactly. */
/** Gallery sets only (svg/bmp classify but do not list — the media-kinds.json contract). */
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
      kinds.galleryModel.includes(ext) ||
      kinds.galleryText.includes(ext)
    );
  };
  let names: string[];
  try {
    names = readdirSync(runDir);
  // an unlistable run dir cannot be scanned for media — false is the answer, the same verdict an empty dir earns
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
    // a subdir that vanishes or refuses the readdir after passing its isDir probe holds no checkable media — skipping it answers false for that branch
    } catch {
      continue;
    }
  }
  return false;
}

// ── the run-row gate (runRowOrNull below owns the row law) ─────
// A refused reconstruction is SKIPPED (RESILIENCE LAW) but stays in count (the C contract).
// Extra keys forbid; statuses outside the closed vocab (incl. "queued") refuse.
//
// DIVERGENCE (ledgered): the original ArtifactRow admitted image/video/audio only — the image-era vocab.
// The estate's own emitter half (runArtifacts in this file) counts "model" rows as listable media, mediaKinds.ts carries the galleryModel set, and the img-to-mesh lane is the first producer of model-only runs.
// Keeping the image-era refusal would drop every completed model run from the restore port (runs/list) — and with it runs/list adoption (fetchLatestRunForDraft) — so the row gate admits "model" alongside the triple.

const RUN_ID_RE: RegExp = /^run-[A-Za-z0-9_.@-]+$/;
// NOT runsTypes.ts's exported RUN_STATUSES: this set is the list-side
// vocabulary (adds success/unknown, drops stopping — the C-contract fold
// runsRegistry owns). W-12 (2026-11-05) adds queued: a non-terminal
// sidecar word serves VERBATIM on the row (the read never folds queued
// into a terminal word, and refusing the row would vanish a queued run
// from the very face that must show it — the burn's neighbor defect).
const RUN_STATUS: ReadonlySet<string> = new Set([
  "queued",
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
  "text",
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

/** The RunRow gate — the row dict, or null when the gate refuses it (the caller logs LOUD and skips). */
/** Key order is the RunRow field order. */
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
    /** THE STAGE-ID DIGEST (commission 015, §6 finding 6): the ids
     *  of the stages the run composed. Optional — older sidecars
     *  predate the digest, and such runs cannot name their stages. */
    stage_ids?: string[];
    /** THE EXPORT NAME (023's self-critique #4/#6): optional —
     *  older sidecars predate it, and only export lanes stamp it. */
    export_name?: string;
    /** THE EXPORT PATH (the export FULL PATH): optional — the
     *  engine-reported minted .qvoice absolute path; older sidecars
     *  predate it, load lanes stamp nothing. */
    export_path?: string;
    /** THE BENCH INCARNATION (W-3 / F3-11, 2026-11-05): the draft
     *  doc's `epoch` at press, read from the identity prefix — the
     *  bench read's join requires equality alongside draft_id, so a
     *  post-clear read binds only post-clear runs. Optional —
     *  pre-cure sidecars predate the key and stamp nothing. */
    bench_epoch?: string;
    /** THE CAPPED FACE (previews 2b, 2026-11-12): the artifact list's
     *  trailing marker lifted onto the row — the panel's capped
     *  counter reads THIS, so a partial listing never reads as
     *  complete. Optional — full listings stamp nothing. */
    truncated?: { listed: number; total: number };
    /** THE ARCHIVED FACE (mass-archive law, operator ruling
     *  2026-11-14, item (a)): the tucked-away rows ride ALONGSIDE
     *  the live list — the live grammar untouched. Optional —
     *  runs with nothing archived stamp nothing. */
    archived?: Record<string, unknown>[];
    /** THE TEST STAMP (visible-bench law, operator ruling
     *  2026-11-14, item (b)): the seat the run rode —
     *  test-output/ rows stamp true. The live face stamps the
     *  same key (runsRegistry's TEST FLAG), so both faces agree.
     *  Optional — pre-cure sidecars predate the key and read as
     *  production. */
    test?: boolean;
  },
): Record<string, unknown> | null {
  if (!RUN_ID_RE.test(row.run_id)) return null;
  if (!RUN_STATUS.has(row.status)) return null;
  if (!isIntGe0(row.created_at)) return null;
  if (typeof row.seed !== "number" || !Number.isInteger(row.seed)) return null;
  for (const a of row.artifacts) {
    if (!artifactRowOk(a)) return null;
  }
  for (const a of row.archived ?? []) {
    if (!artifactRowOk(a)) return null;
  }
  // a half-shaped truncation verdict refuses the row whole (the
  // gate's own law: never serve a shape it cannot vouch for)
  if (row.truncated !== undefined
    && !(isIntGe0(row.truncated.listed) && isIntGe0(row.truncated.total))) return null;
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
    ...(row.stage_ids !== undefined && row.stage_ids.length > 0 ? { stage_ids: [...row.stage_ids] } : {}),
    // THE BENCH INCARNATION rides beside the digest it joins with
    // (W-3 / F3-11); absent stamps stay absent.
    ...(typeof row.bench_epoch === "string" && row.bench_epoch !== "" ? { bench_epoch: row.bench_epoch } : {}),
    ...(typeof row.export_name === "string" && row.export_name !== "" ? { export_name: row.export_name } : {}),
    ...(typeof row.export_path === "string" && row.export_path !== "" ? { export_path: row.export_path } : {}),
    ...(row.truncated !== undefined && isIntGe0(row.truncated.listed) && isIntGe0(row.truncated.total)
      ? { truncated: { listed: row.truncated.listed, total: row.truncated.total } }
      : {}),
    ...(row.archived !== undefined && row.archived.length > 0 ? { archived: row.archived } : {}),
    // the TEST STAMP rides ALWAYS (the live face's law — a missing
    // key would read as "unstamped", never as production).
    test: row.test === true,
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

/** THE RUNS-PER-DRAFT DOOR's filter (the stale-two-run chat audit's
 *  cure 3, 2026-11-15): the archive query for "all takes of this
 *  draft". Both keys OPTIONAL — an absent key filters nothing. A
 *  FILTER on the existing list, never a second roster: the same
 *  scan, sort, and row law; only the served rows are narrowed. */
export interface RunsListFilter {
  /** Exact match against the SERVED row's `draft_id` — the row's
   *  own claim is the truth (the orphan overlay's cleared link
   *  matches nothing, per applyDraftOverlay's law). */
  draftId?: string;
  /** Membership in the row's `stage_ids` digest — the CSV sidecar
   *  seat spells the bench address FIRST (queueSidecar.ts stage_ids:
   *  bench_stage_id before the skeleton id), so a bench stage's
   *  takes are the rows that name it. */
  benchStageId?: string;
}

/** The filter's row law: every STATED key must hold on the served
 *  row (AND, never OR). Absent filter serves every row. */
function runsFilterServes(
  row: Record<string, unknown>,
  filter: RunsListFilter,
): boolean {
  if (filter.draftId !== undefined && row["draft_id"] !== filter.draftId) return false;
  if (filter.benchStageId !== undefined) {
    const ids: unknown = row["stage_ids"];
    // THE NARROW IS THE GUARD (2026-11-05, the anti-sniff wall):
    // Array.isArray narrows unknown to any[] — the membership test
    // needs no cast, and a cast here would mint a new as-unknown
    // site the census refuses.
    if (!Array.isArray(ids) || !ids.includes(filter.benchStageId)) return false;
  }
  return true;
}

interface RunsEnt {
  readonly dir: string;
  readonly created: number;
  readonly media: boolean;
  /** §23 CROSS-ROOTS: the state root that held this dir (the
   *  manifest entry, not the out-root — the row names it). */
  readonly root: string;
  /** THE VISIBLE-BENCH SEAT (operator ruling 2026-11-14, item
   *  (b)): the out-leaf that held this dir — "output" or
   *  "test-output". The row's `test` stamp names the seat; the
   *  `path` literal is rooted at it. */
  readonly seat: string;
}

/** THE VISIBLE-BENCH SCAN (operator ruling 2026-11-14, item
 *  (b)): BOTH out seats per state root — production output/ first,
 *  then test-output/ (test:true runs). Scratch is a STORAGE concern
 *  (outRootFor still routes there), never a VISIBILITY concern: a
 *  run lands a visible row on the shared feed, stamped `test`, and
 *  the item-(a) verbs make that row undoable (archive/delete). A
 *  same run id in both seats serves production (first seat wins —
 *  the mint never forks an id, so the check is defense). */
/** (D6, operator 2026-11-06: "flow restore via media tab history
 *  extremely slow") the per-open walk read EVERY run's sidecar and
 *  probed EVERY run dir for media — O(runs × (file read + readdir +
 *  per-file stat)) on every panel open, thousands of synchronous
 *  syscalls with a real history. THE SCAN CACHE: each run dir's
 *  facts (created + media) cached against the dir's own mtimeMs —
 *  a run writing artifacts bumps its dir mtime and rescans that one
 *  dir on the next open; nothing else re-reads. Never stale past
 *  the filesystem's own truth, never a TTL lie. */
interface ScanEnt {
  dirMtime: number;
  flowMtime: number;
  created: number;
  media: boolean;
}
const scanCache = new Map<string, ScanEnt>();

function mtimeMsOf(path: string): number {
  try {
    return statSync(path).mtimeMs;
  // a vanished path has no mtime — -1 is the sentinel scanRunEnt reads as a gone run
  } catch {
    return -1;
  }
}

function scanRunEnt(runDir: string): ScanEnt | undefined {
  // TWO KEYS, one convergence law: the DIR mtime bumps when a file
  // lands at the top level, but a run that writes its artifacts one
  // level down never bumps it. The SIDECAR mtime closes that hole —
  // the registry rewrites _flow.json on every status transition, so
  // the final write (completed) lands AFTER the last artifact
  // wherever it went, and any sidecar rewrite re-opens the dir for
  // one fresh scan. Warm cost per run: two stats, zero reads.
  const dirMtime = mtimeMsOf(runDir);
  const flowMtime = mtimeMsOf(join(runDir, "_flow.json"));
  if (dirMtime < 0 && flowMtime < 0) return undefined;
  const hit = scanCache.get(runDir);
  if (hit !== undefined && hit.dirMtime === dirMtime && hit.flowMtime === flowMtime) return hit;
  let created = 0;
  let buf = "";
  try {
    buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
  // a run with no readable _flow.json sidecar has no recorded created time — the empty buffer keeps the scan entry alive at created 0
  } catch {
    buf = "";
  }
  if (buf) {
    // created_at (sidecar) first, "created" (C fossil) fallback.
    created = sidecarNum(buf, "created", 0);
    const at: number = buf.indexOf('"created_at":');
    if (at >= 0) created = parseLeadingInt(buf.slice(at + 13));
  }
  const ent: ScanEnt = { dirMtime, flowMtime, created, media: runDirHasMedia(runDir) };
  scanCache.set(runDir, ent);
  return ent;
}

function scanRunsRoot(stateRoot: string): RunsEnt[] {
  // BOTH out seats (the visible-bench law): production first, then
  // test — a same-id collision serves production.
  const ents: RunsEnt[] = [];
  const seen = new Set<string>();
  for (const seat of ["output", "test-output"]) {
    const seatRoot: string = join(stateRoot, seat);
    let names: string[];
    try {
      names = readdirSync(seatRoot);
    // a state root without this out seat (output/ or test-output/ never created) holds no runs — skipping the seat is the answer
    } catch {
      continue;
    }
    for (const name of names) {
      if (ents.length >= 8192) break; // the C's 8192 collected cap
      if (!name.startsWith("run-")) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      const ent = scanRunEnt(join(seatRoot, name));
      if (ent === undefined) continue;
      ents.push({
        dir: name,
        created: ent.created,
        media: ent.media,
        root: stateRoot,
        seat,
      });
    }
  }
  return ents;
}

/** The per-run card build (the file-era row law, intact): sidecar
 *  byte-scan → verbatim status carry (W-12, 2026-11-05: the read-time
 *  zombie override is dead — a non-terminal sidecar word serves
 *  queued/running until the settle rewrites the sidecar; zombies are
 *  the boot sweep's, never a disk-only guess) → user-surface skip →
 *  orphan-draft clearing → runRowOrNull. Null = skipped (never
 *  stored, never served — the count still counts the dir). The drafts
 *  probe is ASYNC (the drafts remote's birth-certificate face — the
 *  legacy drafts/<id>.json stat died with the drafts-door migration;
 *  orphans lose their draft link, never the row). */
// (D6, second half) the ROW build was the other per-open cost:
// every listed row re-read its sidecar, re-walked its artifacts
// (readdir + per-file stat), and re-probed its poster — 500 of each
// on every panel open. The row is DISK TRUTH under the same dual
// mtime key as the scan cache (the convergence law is identical:
// the final sidecar rewrite lands after the last artifact), so the
// built row caches against it. The hasDraft overlay stays FRESH —
// it probes registry state, not disk, and never rides a key.
interface RowEnt {
  dirMtime: number;
  flowMtime: number;
  /** never null: a refused row returns BEFORE the cache write —
   *  refusals are re-judged fresh every pass by design. */
  row: Record<string, unknown>;
}
const rowCache = new Map<string, RowEnt>();

async function buildRunCard(
  outputRoot: string,
  ent: RunsEnt,
  hasDraft: (draftId: DraftId) => Promise<boolean>,
): Promise<Record<string, unknown> | null> {
  const runDir: string = join(outputRoot, ent.dir);
  const dirMtime = mtimeMsOf(runDir);
  const flowMtime = mtimeMsOf(join(runDir, "_flow.json"));
  const cached = rowCache.get(runDir);
  if (cached !== undefined && cached.dirMtime === dirMtime && cached.flowMtime === flowMtime) {
    return applyDraftOverlay(cached.row, hasDraft);
  }
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
  let stageIdsRaw = "";
  // THE BENCH INCARNATION (W-3 / F3-11): "" = the sidecar named no
  // epoch (pre-cure run) — the row key stays absent, never guessed.
  let benchEpoch = "";
  let exported = "";
  let exportedPath = "";
  let seed = -1;
  // THE TEST FLAG, READ (visible-bench law): the row's own
  // sidecar names the seat it rode — the writer persists `test`
  // (queueSidecar's IDENTITY KEYS); absent reads production for
  // pre-cure trees, and NO sidecar (ENOENT) is production, same
  // as the completed-run default above.
  let testFlag = false;
  let created: number = ent.created;
  const rawBytes: Uint8Array =
    buf === null ? Buffer.alloc(0) : Buffer.from(buf, "utf8");
  if (buf !== null) {
    // found-ness matters: absent key -> "unknown" (served); present-but-empty -> "" (gate-skipped).
    const [foundStatus, rawStatus]: [boolean, string] = sidecarStrFound(
      rawBytes,
      "status",
      16,
    );
    if (foundStatus) {
      // THE VERBATIM READ (W-12, 2026-11-05): a non-terminal sidecar
      // word (queued/running) carries VERBATIM until the settle
      // rewrites the sidecar — the read never stamps a terminal word
      // on a non-terminal run. The burn: a queue-window read served
      // "failed" (the old disk-only zombie override) while run_status
      // said "completed" — the artifact was real. Zombies are the
      // boot sweep's (queueSweep.bootSweep), not a read-time guess.
      // "error" stays the one lawful normalization (terminal word).
      status = rawStatus === "error" ? "failed" : rawStatus;
    } else {
      status = "unknown";
    }
    pipeline = sidecarStr(rawBytes, "pipeline", 64);
    prompt = sidecarStr(rawBytes, "prompt", 2048);
    draft = sidecarStr(rawBytes, "draft_id", 96);
    // THE STAGE-ID DIGEST, LISTED: CSV on disk, array on the row —
    // absent on pre-digest sidecars (the export_name precedent:
    // optional key, never guessed).
    stageIdsRaw = sidecarStr(rawBytes, "stage_ids", 512);
    // THE BENCH INCARNATION, LISTED (W-3 / F3-11, 2026-11-05): the
    // draft doc's `epoch` at press rides the identity prefix — the
    // bench read's join requires equality alongside draft_id, so a
    // post-clear read binds only post-clear runs. Additive optional
    // key (the export_path law): absent on pre-cure sidecars, never
    // guessed.
    const [foundEpoch, rawEpoch]: [boolean, string] = sidecarStrFound(
      rawBytes,
      "bench_epoch",
      96,
    );
    benchEpoch = foundEpoch ? rawEpoch : "";
    // THE EXPORT NAME, LISTED (023's self-critique #4/#6): the
    // design lane's mint rides the list row too — additive, same
    // spelling as the sidecar; absent on non-export runs.
    exported = sidecarStr(rawBytes, "export_name", 128);
    // THE EXPORT PATH, LISTED (the export FULL PATH): the engine's
    // minted .qvoice absolute path rides the list row — the voices
    // root is long, so the slice budget doubles the name's.
    exportedPath = sidecarStr(rawBytes, "export_path", 256);
    seed = sidecarNum(buf, "seed", -1);
    testFlag = sidecarBool(buf, "test", false);
    const at: number = buf.indexOf('"created_at":');
    if (at >= 0) created = parseLeadingInt(buf.slice(at + 13));
  }
  if (pipeline.startsWith("_")) return null; // user-surface law
  const literal: string = "./" + ent.seat + "/" + ent.dir;
  const arts: Record<string, unknown>[] = runArtifacts(runDir, literal);
  // THE CAPPED FACE (previews 2b, 2026-11-12): the truncation marker
  // rides the artifact list's tail, but the panel's capped counter
  // reads the run row's `truncated` FIELD — stamp it beside the list
  // so a 3-of-6 listing never reads as complete (the grid says a
  // product is missing).
  const truncMarker = arts.find((a): boolean => a["truncated"] === true);
  // THE ARCHIVED FACE (mass-archive law): the tuck's rows ride the
  // row beside the live list — the live walk never sees them (the
  // `_archived/` dir fails the servable law at the top level), so
  // this second sweep is the only reader that opens that dir.
  const archivedArts: Record<string, unknown>[] = runArchivedArtifacts(runDir, literal);
  const built: Record<string, unknown> | null = runRowOrNull({
    run_id: ent.dir,
    name: pipeline,
    flow: pipeline,
    status,
    created_at: created,
    prompt,
    seed,
    thumbnail: runThumbnail(runDir, ent.dir),
    artifacts: arts,
    ...(truncMarker !== undefined
      ? { truncated: { listed: truncMarker["listed"] as number, total: truncMarker["total"] as number } }
      : {}),
    ...(archivedArts.length > 0 ? { archived: archivedArts } : {}),
    params: { seed },
    draft_id: draft,
    ...(stageIdsRaw !== "" ? { stage_ids: stageIdsRaw.split(",") } : {}),
    // THE BENCH INCARNATION, LISTED (W-3 / F3-11): beside the digest
    // it stamps — the bench read's join half. Absent stamps stay
    // absent (the export_name law).
    ...(benchEpoch !== "" ? { bench_epoch: benchEpoch } : {}),
    ...(exported !== "" ? { export_name: exported } : {}),
    ...(exportedPath !== "" ? { export_path: exportedPath } : {}),
    test: testFlag,
  });
  if (built === null) return null; // user-surface / RESILIENCE LAW loud skip — never cached
  // TORN reads are transient (permissions, torn mid-write): caching
  // one would freeze "unknown" while the mtimes hold. Clean reads
  // (and absent sidecars — their APPEARANCE moves the flow key)
  // cache.
  if (!torn) rowCache.set(runDir, { dirMtime, flowMtime, row: built });
  return applyDraftOverlay(built, hasDraft);
}

/** THE MUTATION NOTICE (the gallery-rename staleness cure,
 *  2026-10-28): rowCache keys a built row on the RUN DIR mtime +
 *  the sidecar mtime — but a gallery rename/delete inside a SUBDIR
 *  (every real artifact lives one level down: openjutsu/,
 *  h3-film/, generate/) bumps the SUBDIR's mtime, never the run
 *  dir's, and no sidecar rewrites — so the cached row keeps the
 *  pre-mutation artifact names and the gallery keeps listing the
 *  old name after a 200 rename (the operator's "rename fails":
 *  door renamed, feed lied). The mutating doors call this with the
 *  mutated FILE's full path after a successful mutation; the next
 *  list rebuilds that one row. Matched on the RUN-ID SEGMENT found
 *  inside the path (`run-<id>`), not on a computed dir: the caller
 *  must not guess which tree won — the basename (`run-<id>`) is
 *  the identity across roots. The scan cache (the media sort bit)
 *  rides along: a delete-to-empty must flip it too.
 * @param mutatedPath - any path inside the run (the file, its dir —
 *  the run-id segment is what matters).
 */
export function noteRunTreeChanged(mutatedPath: string): void {
  const seg = mutatedPath.split(/[/\\]+/).find((s) => RUN_ID_RE.test(s));
  if (seg === undefined) return;
  for (const key of [...rowCache.keys()]) {
    if (key.replace(/[/\\]+$/, "").split(/[/\\]/).pop() === seg) rowCache.delete(key);
  }
  for (const key of [...scanCache.keys()]) {
    if (key.replace(/[/\\]+$/, "").split(/[/\\]/).pop() === seg) scanCache.delete(key);
  }
}

/** The FRESH overlay on a served row: the draft probe is registry
 *  state, never disk truth — it re-runs on every serve, mutating a
 *  CLONE so the cache never learns the probe's answer. */
async function applyDraftOverlay(
  row: Record<string, unknown>,
  hasDraft: (draftId: DraftId) => Promise<boolean>,
): Promise<Record<string, unknown>> {
  const served: Record<string, unknown> = structuredClone(row);
  const draft = served["draft_id"];
  if (typeof draft === "string" && draft !== "" && !(await hasDraft(draftIdOf(draft)))) {
    served["draft_id"] = "";
  }
  return served;
}

/** The runs-list envelope (the restore port): the BOTH-SEATS scan per root (visible-bench law), media-first + newest sort, the limit sliced off the merged order, the limit parsed (raw STRING — the lane/remote pass the raw text; underscores parse, non-ints refuse), refused cards SKIPPED but counted. */
/** url/thumbnail are run-RELATIVE (the /v1/assets prefix died with the app — the header's law). */
export async function listRuns(
  stateRoot: string,
  limit: number,
  hasDraft: (draftId: DraftId) => Promise<boolean>,
  filter?: RunsListFilter,
): Promise<{ count: number; runs: Record<string, unknown>[] }> {
  return listRunsAcross([stateRoot], limit, hasDraft, filter);
}

/** §23 CROSS-ROOTS (2026-09-23): the union list across the
 *  manifest — every root scanned (BOTH out seats per root since
 *  the visible-bench flip), one media-first + newest sort,
 *  the limit sliced off the merged order, the scan total counted
 *  (refused cards SKIPPED but counted, per root). Every served row
 *  names its root (served_from) and its seat (`test`, `path`);
 *  same-run-id collisions serve the FIRST manifest root's row
 *  (own writes win — the sort is stable, own root scanned first).
 *  The optional runs-per-draft filter (RunsListFilter — the
 *  stale-two-run audit's cure 3) narrows the SERVED rows only:
 *  count stays the scan total, and the limit slices the FILTERED
 *  order, never the scan's. */
export async function listRunsAcross(
  roots: string[],
  limit: number,
  hasDraft: (draftId: DraftId) => Promise<boolean>,
  filter?: RunsListFilter,
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
  // THE RUNS-PER-DRAFT DOOR (the stale-two-run chat audit's cure 3,
  // 2026-11-15): a stated filter walks the WHOLE sorted scan (the
  // first-root-wins dedup intact) and slices AFTER the filter — the
  // window is the draft's own tail, never the global limit's (a
  // draft's older takes survive a foreign newer run). Absent filter:
  // the restore port's path unchanged — sliced before build.
  const filtered: boolean =
    filter !== undefined && (filter.draftId !== undefined || filter.benchStageId !== undefined);
  const scanned: RunsEnt[] = filtered ? ents : ents.slice(0, limit);
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  for (const ent of scanned) {
    if (seen.has(ent.dir)) continue; // first manifest root wins
    seen.add(ent.dir);
    const row = await buildRunCard(join(ent.root, ent.seat), ent, hasDraft);
    if (row === null) continue; // RESILIENCE LAW: loud skip
    if (filtered && !runsFilterServes(row, filter as RunsListFilter)) continue;
    rows.push({ ...row, served_from: ent.root });
  }
  return { count, runs: filtered ? rows.slice(0, limit) : rows };
}
