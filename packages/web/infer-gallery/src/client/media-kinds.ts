/**
 * Media kinds — the CLIENT plane's kind vocabulary, DERIVED from the
 * contract's mediaVocab() (the li-ay stroke, 2026-10-11).
 *
 * History: the deleted dsh-media package classified from its own
 * media-kinds.json; the 2026-09-11 full port carried a HAND COPY of
 * the vocabulary here ("parity-pinned" byte-equal by the wall — two
 * typed copies, zero drift, by assertion). The copy is dead: the
 * contract floor is importable from the browser (both planes build
 * on it), so the client DERIVES now — exts and gallery subsets come
 * from mediaVocab() itself, and only the UI LABELS are this file's
 * own (a label is presentation, not classification).
 *
 * The laws the data carries (from the original file's $comment,
 * preserved):
 *  - gallery = exts that LIST in the sidebar; exts = the full
 *    classifier. Gallery extras classify but do NOT list —
 *    deliberate, documented at the vocab, not scattered.
 *  - key order = classifier precedence (on a contradictory row the
 *    earlier kind wins: video beats image).
 *  - maxListedImages is the DOOR-tier cap (the estate serves it in
 *    the run row's truncated marker); the client's >20 frame-dump
 *    guard is the display-tier fallback, never the truncation law.
 */
import { mediaVocab } from '@melite/contracts/mediaKinds'

export interface MediaKindDef {
  readonly label: string
  readonly exts: readonly string[]
  readonly gallery: readonly string[]
}

export interface MediaKinds {
  readonly kinds: Readonly<Record<'video' | 'image' | 'audio' | 'model' | 'text', MediaKindDef>>
  readonly policy: { readonly maxListedImages: number }
}

/** The labels are the client's own; every EXTENSION LIST is the
 *  contract's vocabulary, verbatim, in the vocab's own order. */
const LABELS: Readonly<Record<'video' | 'image' | 'audio' | 'model' | 'text', string>> = {
  video: 'Video',
  image: 'Images',
  audio: 'Audio',
  model: '3D',
  text: 'Text',
}

const GALLERY_KEY: Readonly<Record<'video' | 'image' | 'audio' | 'model' | 'text',
  'galleryVideo' | 'galleryImage' | 'galleryAudio' | 'galleryModel' | 'galleryText'>> = {
  video: 'galleryVideo',
  image: 'galleryImage',
  audio: 'galleryAudio',
  model: 'galleryModel',
  text: 'galleryText',
}

/** The client classifier's vocabulary (DERIVED — see header). */
export const MEDIA_KINDS: MediaKinds = (() => {
  const vocab = mediaVocab()
  const kinds = {} as Record<'video' | 'image' | 'audio' | 'model' | 'text', MediaKindDef>
  // key order = classifier precedence: video first (a contradictory
  // row can never list as its image poster).
  for (const kind of ['video', 'image', 'audio', 'model', 'text'] as const) {
    kinds[kind] = {
      label: LABELS[kind],
      exts: vocab[kind],
      gallery: vocab[GALLERY_KEY[kind]],
    }
  }
  return { kinds, policy: { maxListedImages: vocab.maxListedImages } }
})()
