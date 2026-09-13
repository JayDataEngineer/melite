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
