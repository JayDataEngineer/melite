/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 *
 * NO RE-EXPORT SHIM since the rail-law audit's H6 (2026-10-31): this
 * file briefly re-exported timelineContract's normalizeDeclaredRefs/
 * refGenreOf/splitRefList while every consumer imported the contract
 * directly — a bypassed door. This module owns only what it owns:
 * the upload spec, the foreign-URL refusal literal, the declared
 * short name, and the LinkArtifact type.
 */
/** One upstream image artifact — a link-to-previous-output picker row. */
export interface LinkArtifact {
  /** The ctx-key NAME the picker writes (what _resolveSource resolves). */
  name: string
  /** Servable URL — the row's thumbnail. */
  url: string
  /** The owning upstream card's title. */
  title: string
}

export const REF_UPLOAD_SPEC: Record<"image" | "video" | "audio", { accept: string; maxMb: number; note: string }> = {
  image: { accept: "image/*", maxMb: 20, note: "≤20 MB" },
  video: { accept: "video/*", maxMb: 24, note: "≤24 MB" },
  audio: { accept: "audio/*", maxMb: 16, note: "≤16 MB" },
}

/** THE FOREIGN-URL REFUSAL (the upload audit's M1, 2026-10-26; ONE
 *  literal since the rail-law audit's H2, 2026-10-31 — it lived as
 *  three seat-local spellings): a picked URL that is not this run's
 *  artifact committed VERBATIM and died later at the run's refs
 *  resolution. Every seat — anchor, buckets, strip lanes — refuses
 *  the identical gesture with the identical words. */
export const FOREIGN_URL_REFUSAL = "that URL is not in this run's artifacts — pick a run artifact or upload a file"

/** THE UPLOAD COMMIT CHECK (one law since the rail-law audit's square
 *  gap follow-through, 2026-10-31 — the genre gate + cap + read error
 *  lived as seat-local spellings at the anchor and the buckets): the
 *  same gate, the same words, at every source seat.
 * @param file the OS-picked or dropped file.
 * @param kind the lane's genre (the accept family).
 * @returns the visible refusal when the file fails the gate, else null. */
export function refUploadError(file: File, kind: "image" | "video" | "audio"): string | null {
  if (!file.type.startsWith(`${kind}/`)) {
    return `wrong file type (${file.type || "unknown type"}) — expected ${kind}/*`
  }
  if (file.size > REF_UPLOAD_SPEC[kind].maxMb * 1024 * 1024) {
    return `file too large (max ${REF_UPLOAD_SPEC[kind].maxMb} MB)`
  }
  return null
}

/** The read arm's one spelling — a failed readAsDataURL at any seat. */
export const REF_READ_ERROR = "could not read that file"
/** Short display name for a declared URL (last path segment) — the
 * full URL rides the title. */
export function declaredShortName(url: string): string {
  const path = url.split("?")[0]
  const tail = path.slice(path.lastIndexOf("/") + 1)
  return tail === "" ? url : tail
}
