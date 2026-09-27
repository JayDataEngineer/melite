// mediaKinds.ts — the estate media-kind vocabulary as TYPED DATA.
// Homes, in order: the media plugin's media-kinds.json (SSOT for
// python/editor_runs.py + MediaPanel; died with the media client,
// 5cbb5bcc) → @melite/estate-queue's mediaKinds.ts (REBUILD-7) →
// HERE, the zero-dep contracts leaf (2026-09-13, the source-row
// stroke): the media LIST remote joins runs-list as a consumer,
// and a built package (@melite/estate-media) may not import the
// queue's source-run graph — the vocab moves to the leaf both
// build graphs share. ONE definition, no copies, no file reads.
//
// THE LAWS THE DATA CARRIES (from the file's $comment, preserved):
//  - gallery = exts that LIST in the sidebar; exts = the full
//    classifier. Gallery extras (svg/bmp/mkv/m4a/aac) classify but
//    do NOT list — deliberate, documented here, not scattered.
//  - maxListedImages = 3: the door-tier cap (_MAX_IMGS) — image
//    rows past it are counted but unlisted, flagged by the run
//    row's truncated marker {listed, total}. The client display
//    guard is a fallback, never the truncation law.
export interface MediaVocab {
  readonly image: readonly string[];
  readonly audio: readonly string[];
  readonly video: readonly string[];
  readonly model: readonly string[];
  readonly galleryImage: readonly string[];
  readonly galleryAudio: readonly string[];
  readonly galleryVideo: readonly string[];
  readonly galleryModel: readonly string[];
  readonly maxListedImages: number;
}

/** The estate media-kind vocabulary (typed DATA — see header). */
export function mediaVocab(): MediaVocab {
  return {
    image: ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"],
    audio: ["wav", "flac", "mp3", "ogg", "m4a", "aac"],
    video: ["mp4", "webm", "mkv", "mov"],
    model: ["glb", "gltf"],
    galleryImage: ["png", "jpg", "jpeg", "webp", "gif"],
    galleryAudio: ["wav", "flac", "ogg", "mp3"],
    galleryVideo: ["mp4", "webm", "mov"],
    galleryModel: ["glb", "gltf"],
    maxListedImages: 3,
  };
}

/** The MIME table for artifact SERVING (the audio-seek stroke,
 *  2026-10-08): ONE spelling of extension → content-type shared by
 *  every route that serves run artifact bytes (the estate media
 *  route + the gallery artifact route — the gallery's inline
 *  ternary had already drifted: mp4 answered video/webm, audio
 *  answered octet-stream, and no player seeks what it is barely
 *  willing to name). Unknown extensions answer octet-stream.
 *
 *  svg is DELIBERATELY ABSENT: an inline image/svg+xml answer is a
 *  same-origin script execution vector — svg artifacts serve as
 *  octet-stream (a download), never an executable document. */
const MIME_BY_EXT: Readonly<Record<string, string>> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

/** The content-type one artifact answer carries: the extension's
 *  mapped media type, octet-stream for everything unknown. */
export function contentTypeForArtifact(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/**
 * THE SERVABLE LEAF, ONCE (2026-10-10, the MCP/media audit's H5).
 *
 * Two doors answer run-relative artifact paths and they disagreed on
 * the LEAF: the estate's media route refuses every underscore-
 * prefixed name except the minted `_poster.jpg`, while the gallery's
 * artifact route served any well-formed run-relative name — so a
 * private record (`_flow.json`, `_request.json`) was refused by one
 * door and served by the other. The SHAPE check is each door's own
 * (they take different inputs); the LEAF rule is this one.
 */
export function servableLeaf(leaf: string): boolean {
  if (!leaf.startsWith("_")) return true
  return leaf === "_poster.jpg" // the one minted exception (the thumbnail law)
}

/**
 * ONE CONFINED SEGMENT GRAMMAR, ONCE (2026-10-10, the audit's
 * "artifact-URL parsing ×3").
 *
 * Three doors judged "what is one legal segment of a run-relative
 * artifact path" with three private predicates, and they had already
 * disagreed: the estate's media route and the queue's source-echo
 * each carried an identical private `segmentOk` (not empty, not
 * `.`/`..`, no NUL — any other byte legal, because the engines MINT
 * raw names: `out 1.png`, unicode, parens), while the gallery's
 * artifact route judged a `[A-Za-z0-9._-]+` CHARSET — so an artifact
 * the engine minted with a space in its name SERVED on the media
 * route and answered 400 on the gallery's. One grammar, mint→serve
 * round-trip law intact; each door keeps its own SPLIT policy (the
 * URL-path door filters empty segments before WHATWG normalization
 * consumes them; the query-param door does not) — the BYTES of a
 * legal segment are this function and nothing else.
 */
export function segmentConfined(decoded: string): boolean {
  // defense-in-depth dot/empty fence: the HTTP doors never deliver
  // these spellings to the segment loop (WHATWG URL normalizes every
  // single/double-dot spelling; parseTarget filters empties) — the
  // fence stays for every non-URL caller, and the NUL arm below is
  // the behavioral wall.
  if (decoded === "" || decoded === "." || decoded === "..") return false
  if (decoded.includes("\0")) return false
  return true
}
