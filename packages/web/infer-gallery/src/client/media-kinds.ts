/**
 * Media kinds — the CLIENT plane's kind vocabulary, typed data (the
 * full port, 2026-09-11: the deleted dsh-media package classified
 * from its own media-kinds.json SSOT; that file's estate-side twin
 * now lives as typed data in @melite/estate-queue's mediaKinds.ts
 * with the law "the DATA travels with the code that classifies by
 * it" — the same law gives the gallery client its own copy here,
 * because a browser bundle cannot import a server package's node
 * tree and the two classifiers must stay PARITY-PINNED instead:
 * tests/walls/ts/suites/media-sidebar.test.ts asserts exts/gallery
 * subsets byte-equal on both planes).
 *
 * The laws the data carries (from the original file's $comment,
 * preserved):
 *  - gallery = exts that LIST in the sidebar; exts = the full
 *    classifier. Gallery extras (svg/bmp/mkv/m4a/aac) classify but
 *    do NOT list — deliberate, documented here, not scattered.
 *  - key order = classifier precedence (on a contradictory row the
 *    earlier kind wins: video beats image).
 *  - maxListedImages is the DOOR-tier cap (the estate serves it in
 *    the run row's truncated marker); the client's >20 frame-dump
 *    guard is the display-tier fallback, never the truncation law.
 */
export interface MediaKindDef {
  readonly label: string
  readonly exts: readonly string[]
  readonly gallery: readonly string[]
}

export interface MediaKinds {
  readonly kinds: Readonly<Record<'video' | 'image' | 'audio' | 'model', MediaKindDef>>
  readonly policy: { readonly maxListedImages: number }
}

/** The client classifier's vocabulary (typed DATA — see header). */
export const MEDIA_KINDS: MediaKinds = {
  kinds: {
    video: {
      label: 'Video',
      exts: ['mp4', 'webm', 'mkv', 'mov'],
      gallery: ['mp4', 'webm', 'mov'],
    },
    image: {
      label: 'Images',
      exts: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp'],
      gallery: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
    },
    audio: {
      label: 'Audio',
      exts: ['wav', 'flac', 'mp3', 'ogg', 'm4a', 'aac'],
      gallery: ['wav', 'flac', 'ogg', 'mp3'],
    },
    model: {
      label: '3D',
      exts: ['glb', 'gltf'],
      gallery: ['glb', 'gltf'],
    },
  },
  policy: { maxListedImages: 3 },
}
