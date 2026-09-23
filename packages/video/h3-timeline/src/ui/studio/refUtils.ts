/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
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

/** Genre of an artifact by name AND url — the ref buckets are
 * GENRE-TYPED (images → ref_image_*, videos → ref_video_*, audios →
 * ref_audio_*, video_audios → ref_video_audio_*): a picker that offers
 * "a.png" inside Ref videos is the freetext bug wearing a costume.
 * (2026-09-02 audit) extension-only was blind to THIS estate's own
 * artifact names — video_w1_main carries no extension and classed
 * "other", so the run's own films never appeared in ANY picker. Estate
 * name patterns + the URL's extension (served URLs carry real ones). */
export function refGenreOf(name: string, url?: string): "image" | "video" | "audio" | "other" {
  const n = name.toLowerCase()
  if (/^video_w\d+_/.test(n)) {
    // window renders: *_main / *_seam* / the final cut are FILMS;
    // *_last_frame and the *_prev seam stills are IMAGES.
    if (n.endsWith("_last_frame") || n.includes("_prev")) return "image"
    return "video"
  }
  const src = `${n} ${url ? url.toLowerCase().split("?")[0] : ""}`
  // (split never returns [] — .pop()/[0] are always strings; no `?? ""`.)
  const e = (src.split(".").pop() as string).split(/[^a-z0-9]/)[0] as string
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"].includes(e)) return "image"
  if (["mp4", "webm", "mov", "mkv", "avi", "m4v"].includes(e)) return "video"
  if (["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"].includes(e)) return "audio"
  return "other"
}

/** Split a serialized ref list WITHOUT shredding data: URLs — the
 * wire format is a comma list, but an inline upload carries its OWN
 * comma (data:<mime>;base64,<payload>). Same state machine as the
 * backend's cc_split_ref_list: inside a data: token, the first comma
 * is the mime separator, later commas end the token. */
export function splitRefList(v: string | undefined): string[] {
  if (!v) return []
  const out: string[] = []
  let i = 0
  while (i < v.length) {
    while (i < v.length && (v[i] === "," || v[i] === " " || v[i] === "\t")) i++
    if (i >= v.length) break
    const start = i
    const isData = v.startsWith("data:", i)
    let mimeComma = false
    while (i < v.length) {
      if (v[i] === ",") {
        if (isData && !mimeComma) { mimeComma = true; i++; continue }
        break
      }
      i++
    }
    let end = i
    while (end > start && (v[end - 1] === " " || v[end - 1] === "\t")) end--
    // (end > start always holds: the separator skip guarantees v[start]
    // is not a separator, so the token keeps at least its first char —
    // no empty-push guard.)
    out.push(v.slice(start, end))
  }
  return out
}

export const REF_UPLOAD_SPEC: Record<"image" | "video" | "audio", { accept: string; maxMb: number; note: string }> = {
  image: { accept: "image/*", maxMb: 20, note: "≤20 MB" },
  video: { accept: "video/*", maxMb: 24, note: "≤24 MB" },
  audio: { accept: "audio/*", maxMb: 16, note: "≤16 MB" },
}
/** Chip hover note: a known upstream artifact names its card, an
 * unknown name is flagged (it would pass through unresolved). */
export function artifactThumbNote(name: string): string {
  return `artifact: ${name}`
}
/** THE DECLARED SURFACE (2026-09-23, the operator: the agent-persisted
 * card-level ref_images showed NOWHERE — every lane read only the
 * per-call refs while the compose merges the card-level fields as
 * PRIMARY onto every stanza's bus; the bundle said "0/9" with 2
 * images riding the bus). Normalize the card-level field (the schema
 * holds string[]; the wire also admits the comma list) to a list. */
export function normalizeDeclaredRefs(v: unknown): string[] {
  if (Array.isArray(v)) return (v as unknown[]).filter((s): s is string => typeof s === "string" && s.trim() !== "")
  if (typeof v === "string") return splitRefList(v)
  return []
}
/** THE BUS-ORDER MERGE (UI twin of the compose's mergeRefs, card.ts:
 * declared PRIMARY first, per-call appended deduped — the compose
 * and the UI agree or they lie). */
export function mergeDeclaredRefs(declared: string[], perCall: string[]): string[] {
  return [...declared, ...perCall.filter((s) => !declared.includes(s))]
}
/** Short display name for a declared URL (last path segment) — the
 * full URL rides the title. */
export function declaredShortName(url: string): string {
  const tail = url.split("?")[0].split("/").pop() ?? url
  return tail === "" ? url : tail
}
