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
import { runMediaPrefixOf, canonicalRunMediaUrl } from "@melite/contracts/benchStage"
import { fetchMediaLibrary } from "@melite/card-base/client"
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

/** (operator 2026-11-05: "I CAN'T EVEN USE AN IMAGE FROM MEDIA" —
 *  the estate's OWN media library is not a foreign seat.) A picked
 *  source the estate media service itself serves (/melite-media/runs
 *  or the legacy /v1/assets/runs spelling, with or without an
 *  origin) is legal currency at every pick door: it commits in its
 *  canonical live spelling and the estate's media heal resolves it
 *  at the run. Everything else http(s) that is not this run's
 *  artifact stays refused (the M1 law).
 * @param v the picked source, any spelling.
 * @returns the canonical run-media chip, or null when foreign. */
export function estateMediaChip(v: string): string | null {
  if (!v.startsWith("/") && !/^https?:\/\//i.test(v)) return null
  const path = v.replace(/^https?:\/\/[^/]+/i, "")
  if (runMediaPrefixOf(path) === null) return null
  return canonicalRunMediaUrl(path)
}

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

/** THE DISPLAY TRANSLATION, ONE SPELLING (2026-11-04, the stale-✕
 *  cure): a committed source is a ctx-key NAME (the wire law — the
 *  estate re-resolves names each run) or a data: URL; the square
 *  displays the SERVABLE url. This is the display half only — the
 *  param keeps its name verbatim (the currency law). It lived as
 *  three seat-local `startsWith("data:") ? v : map.get(v) ?? v`
 *  closures (anchor, guides, keyframes, buckets); one spelling now,
 *  because a map miss must degrade to the HELD face (the raw name,
 *  detach armed) at every seat alike — a divergence here is exactly
 *  the seat that painted PLUS over a full slot.
 * @param v the committed source (a ctx-key name or a data: URL).
 * @param nameToUrl the artifact index's NAME → servable url map.
 * @returns the data: URL verbatim, the mapped url, else the raw
 *  value (held — the square's held face carries it). */
export function displaySource(v: string, nameToUrl: Map<string, string>): string {
  if (v.startsWith("data:")) return v
  return nameToUrl.get(v) ?? v
}
/** Short display name for a declared URL (last path segment) — the
 * full URL rides the title. */
export function declaredShortName(url: string): string {
  const path = url.split("?")[0]
  const tail = path.slice(path.lastIndexOf("/") + 1)
  return tail === "" ? url : tail
}

/** (2026-11-06, the lane-add parity law) the image-row filter for the
 *  keyframe add doors' From-media arm (THE DEP LAW: module scope, one
 *  identity forever — the provider's modal effect keys on the
 *  function's identity; an inline arrow re-fires it into the freeze).
 *  A data: IMAGE chip rides too (the chip law): its mime spelling
 *  carries no dot-extension, so the regex alone would starve the door
 *  of legal currency. */
export const IMAGE_ROW_RE = /\.(png|jpe?g|webp|gif|bmp|avif)(\?|$)/i
export const loadImageMedia = async (_kind: string, signal: AbortSignal) => {
  const rows = await fetchMediaLibrary("all", signal)
  return rows.filter((r) => r.url.startsWith("data:image/") || IMAGE_ROW_RE.test(r.url) || IMAGE_ROW_RE.test(r.name))
}

/** (2026-11-06) the keyframe add doors' shared commit spine — estate
 *  media canonical, the run's own artifact URLs, data: chips ride
 *  verbatim; foreign URLs refuse. ONE spelling: the rail subview's
 *  add door and the lane head's add door judge identically.
 *  @returns the image value to commit, or the refusal's words. */
export function classifyImageSrc(src: string, byUrl: Map<string, string>): { image: string } | { refusal: string } {
  if (src.startsWith("data:")) return { image: src }
  // (2026-11-05) the estate's own media paths are legal currency at
  // this door — From media picks commit in the canonical live
  // spelling and the run's media heal resolves them.
  const media = estateMediaChip(src)
  if (media !== null) return { image: media }
  const name = byUrl.get(src)
  if (name !== undefined) return { image: name }
  return { refusal: FOREIGN_URL_REFUSAL }
}

/** (D1, operator 2026-11-06: "keyframe image insert must shrink-to-fit
 *  into the movie, never clipped") THE CONTAIN MATH — pure, one
 *  spelling, judged on its own: scale a (sw,sh) source DOWN to fit a
 *  (tw,th) target (never up), centered, transparent pad on the
 *  mismatch axis. The engine composites the pin into the film; an
 *  off-aspect pin gets COVER-cropped there — this fit letterboxes it
 *  client-side so nothing is ever clipped.
 *  @returns the draw rect (dx,dy,dw,dh) on the tw×th canvas. */
export function fitRect(
  sw: number, sh: number, tw: number, th: number,
): { dx: number; dy: number; dw: number; dh: number } {
  // shrink-to-fit: the contain scale, capped at 1 (never upscale)
  const scale = Math.min(tw / sw, th / sh, 1)
  const dw = sw * scale
  const dh = sh * scale
  return { dx: (tw - dw) / 2, dy: (th - dh) / 2, dw, dh }
}

/** (D1) THE CANVAS RIDER — the browser face of the same law: decode
 *  the source, draw it via fitRect onto a tw×th canvas, return the
 *  PNG data: URL. SAME-ASPECT sources return VERBATIM (no re-encode,
 *  no generation loss); a source that cannot decode (CORS-blocked,
 *  dead URL, a test env without Image) also returns verbatim — the
 *  fit is a courtesy the commit never depends on.
 *  (2026-10-16, THE AUTORIZE CURE — operator: "YOU DID NOT FIX THE
 *  AUTORIZE ON THE KEYFRAME"): the old data:-only gate starved the
 *  PICKER arms — From media and From flow commit URLs, the fit never
 *  ran, and the engine COVER-CROPPED every off-aspect pick (chopped
 *  fingers) while the file-drop arm alone fitted. The rider now
 *  decodes EVERY browser-renderable source — data:, http(s), and
 *  rooted estate paths — and only bare artifact NAMES ride verbatim
 *  (no origin, no decode: the engine resolves them, and a decode
 *  attempt would hang a loaderless source forever).
 *  crossOrigin anonymous keeps the canvas drawable for cross-origin
 *  artifacts; a tainted/undecodable source still falls to the
 *  verbatim catch (the courtesy law).
 *  @returns the fitted data: URL, or src unchanged. */
export const fitImageToAspect = async (src: string, tw: number, th: number): Promise<string> => {
  // renderable spellings only: data:, protocols, and rooted estate
  // paths. A bare name is engine currency — verbatim, never a decode.
  if (tw <= 0 || th <= 0 || !/^(data:|https?:|\/)/.test(src)) return src
  try {
    // (the courtesy law, made true 2026-10-16) the comment has always
    // promised "the fit is a courtesy the commit never depends on" —
    // but a decode that never settles (a stalled loader, a jsdom env
    // that fires neither onload nor onerror for rooted paths) parked
    // the commit forever: the estate pick arm wrote NOTHING (the
    // studio-call-cards wall's red at HEAD). The decode races a
    // 700ms courtesy window (under the UI's own 1s settle budget — a slower decode rides verbatim); a loss rides verbatim, same as the
    // tainted/undecodable catch.
    const img = await Promise.race([
      new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        // (the autorize cure) anonymous keeps the canvas drawable for
        // cross-origin artifact urls — a tainted toDataURL throws into
        // the verbatim catch, never a silent half-fit
        el.crossOrigin = "anonymous"
        el.onload = () => { resolve(el) }
        el.onerror = () => { reject(new Error("decode failed")) }
        el.src = src
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => { reject(new Error("decode stalled")) }, 700)
      }),
    ])
    const sw = img.naturalWidth
    const sh = img.naturalHeight
    if (sw <= 0 || sh <= 0) return src
    // same aspect within a half-pixel at the target scale: verbatim
    const ratioDelta = Math.abs(sw / sh - tw / th)
    if (ratioDelta < (tw / th) * 0.005) return src
    const canvas = document.createElement("canvas")
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext("2d")
    if (ctx === null) return src
    const r = fitRect(sw, sh, tw, th)
    ctx.drawImage(img, r.dx, r.dy, r.dw, r.dh)
    return canvas.toDataURL("image/png")
  } catch {
    return src
  }
}
