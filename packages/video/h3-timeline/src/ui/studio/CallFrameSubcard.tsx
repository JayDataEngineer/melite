/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * THE BUNDLE SPLIT (operator correction, 2026-09-18): the first
 * frame and the reference images are NOT alien categories — they
 * are slots on ONE image bus (first frame = slot 1, the anchor;
 * refs = slots 2-9). This file now exports the two PIECES the
 * unified Reference bundle panel seats:
 *   • FirstFrameSlot — the anchor's image square (the estate's
 *     SourceRow grammar, matching every other image input:
 *     From flow / From media / From file), writing `image`.
 *   • SeamControls — the call's seam law (how this call joins the
 *     previous one: cut re-feeds the previous VIDEO tail; extend
 *     chains the previous LATENT). Seam concepts, not bundle
 *     concepts — they ride under the bus, never inside a slot.
 */
import { useState } from "react"
import { Input, Switch } from "@deepseek-ai/dsh-client-ui-primitives"
import { SpecAtom } from "@melite/card-base/client"
import { cn, readAsDataURL } from '@melite/card-base/client'
import { SourceRow } from '@melite/card-base/client'
import { fetchMediaLibrary } from '@melite/card-base/client'
import s from "./studio.module.css"
import { FOREIGN_URL_REFUSAL, REF_READ_ERROR, refUploadError } from "./refUtils.ts"
import { studioCopy } from "./studioCopy.ts"
import type { LinkArtifact } from "./refUtils.ts"

/** The anchor slot — ONE image square in the bus grammar
 * (2026-08-24 affordance law: "first frame / last frame are weak
 * versions compared to other image input nodes — I can't link back
 * to previous outputs"):
 *   • From flow lists the upstream cards' IMAGE artifacts (links);
 *     the write maps URL→NAME (the drop-honesty law: an unmatched
 *     URL writes NOTHING — it would pass through unresolved).
 *   • From file keeps the studio's OWN file law (image-only, 20 MB
 *     cap, readAsDataURL → data: URL; _resolveSource decodes data:
 *     first-class) through the wire's onFile override.
 *   • From media lists the runs library through the same door; the
 *     URL→NAME honesty applies (foreign URLs refuse visibly). */
export function FirstFrameSlot({
  testId,
  callIndex,
  value,
  onChange,
  nameToUrl,
  urlToName,
  links,
}: {
  testId: string
  callIndex: number
  value: string | undefined
  onChange: (source: string) => void
  nameToUrl: Map<string, string>
  urlToName: Map<string, string>
  /** Upstream IMAGE artifacts — the link-to-previous-output rows. */
  links?: LinkArtifact[]
}) {
  const [fileError, setFileError] = useState<string | null>(null)
  const v = value?.trim() ?? ""
  /** File upload / OS drop → data: URL into the source. The genre +
   *  cap gate + read error are ONE law at every source seat
   *  (refUtils' refUploadError / REF_READ_ERROR); a rejection is
   *  VISIBLE (the inline error line), never a silent drop. */
  const takeFile = async (file: File) => {
    const err = refUploadError(file, "image")
    if (err !== null) {
      setFileError(err)
      return
    }
    try {
      const dataUrl = await readAsDataURL(file)
      setFileError(null)
      onChange(dataUrl)
    } catch {
      setFileError(REF_READ_ERROR)
    }
  }
  return (
    <span data-testid={testId} className={s.busAnchor}>
      {/* THE SOURCE ROW — one grammar with every input in the system
          (the operator's law); the studio's vocabulary adapters ride
          the props, not a second face. The label states the slot's
          role in the bus (the anchor is a REFERENCE slot with extra
          semantics, never an alien category). */}
      <SourceRow
        label={studioCopy.anchorSlot}
        kind="image"
        value={v === "" ? null : v.startsWith("data:") ? v : nameToUrl.get(v) ?? v}
        candidates={(links ?? []).map((a) => ({ id: a.name, label: a.name, url: a.url }))}
        loadMedia={fetchMediaLibrary}
        onFile={(f) => { void takeFile(f) }}
        onEdit={(src) => {
          if (src === "") { onChange(""); return }
          if (src.startsWith("data:")) { onChange(src); return }
          // URL→NAME honesty (the drop law, verbatim): a foreign URL
          // writes NOTHING — it would pass through unresolved at
          // render time. The refusal is visible, never silent.
          const name = urlToName.get(src)
          if (name !== undefined) { onChange(name); setFileError(null); return }
          setFileError(FOREIGN_URL_REFUSAL)
        }}
      />
      {fileError && (
        <span data-testid={`${testId}-file-error`} className={s.fileErr}>
          {fileError}
        </span>
      )}
    </span>
  )
}

/** A NON-IMAGE GUIDE SLOT (the rail-law audit's square gap b,
 *  2026-10-31): the clip and audio guides rode raw datalist inputs
 *  while every other source seat in the system rides the square —
 *  the anchor slot's twin, same URL→NAME honesty, same shared
 *  upload law (refUtils), same From-flow rows filtered to the
 *  guide's genre. The track-color dot stays OUTSIDE the square
 *  (the lane's visual law rides the grammar, not inside it).
 * @param kind the guide's genre — clip → video artifacts, audio →
 *  audio artifacts (the From-flow filter + the upload gate).
 * @param callIndex the call's index (the accessible seat name).
 * @param value the guide's committed source ("" = none).
 * @param onChange the one write verb (empty detaches the guide).
 * @param nameToUrl artifact NAME → url (the square's display).
 * @param urlToName url → NAME (the drop-honesty translation).
 * @param links this genre's upstream artifacts (From-flow rows).
 * @param trackColorHex the lane dot's color (VIDEO_TIMELINE_TRACKS). */
export function GuideSlot({
  kind, callIndex, value, onChange, nameToUrl, urlToName, links, trackColorHex,
}: {
  kind: "clip" | "audio"
  callIndex: number
  value: string | undefined
  onChange: (source: string) => void
  nameToUrl: Map<string, string>
  urlToName: Map<string, string>
  links: LinkArtifact[]
  trackColorHex: string
}) {
  const [fileError, setFileError] = useState<string | null>(null)
  const v = value?.trim() ?? ""
  const takeFile = async (file: File) => {
    // clip's upload family is video (REF_UPLOAD_SPEC's genre seat).
    const err = refUploadError(file, kind === "clip" ? "video" : "audio")
    if (err !== null) {
      setFileError(err)
      return
    }
    try {
      const dataUrl = await readAsDataURL(file)
      setFileError(null)
      onChange(dataUrl)
    } catch {
      setFileError(REF_READ_ERROR)
    }
  }
  return (
    <span className={s.guideWrap} data-testid={`tl-guide-${kind}`}>
      <span
        className={s.guideDot}
        style={{ background: v ? trackColorHex : "transparent", border: `1px solid ${trackColorHex}77` }}
        aria-hidden
      />
      <SourceRow
        label={`${kind} guide`}
        ariaLabel={`Call ${callIndex} ${kind} guide`}
        kind="file"
        value={v === "" ? null : v.startsWith("data:") ? v : nameToUrl.get(v) ?? v}
        candidates={links.map((a) => ({ id: a.name, label: a.name, url: a.url }))}
        loadMedia={fetchMediaLibrary}
        onFile={(f) => { void takeFile(f) }}
        onEdit={(src) => {
          if (src === "") { onChange(""); return }
          if (src.startsWith("data:")) { onChange(src); return }
          const name = urlToName.get(src)
          if (name !== undefined) { onChange(name); setFileError(null); return }
          setFileError(FOREIGN_URL_REFUSAL)
        }}
      />
      {fileError && (
        <span data-testid={`tl-call-guide-error-${kind}`} className={s.fileErr}>
          {fileError}
        </span>
      )}
    </span>
  )
}

/** The call's seam law — carried vs cut (rule 3b). Renders under the
 *  image bus (the seam is the CALL'S join, not a bundle slot).
 *  (2026-09-20: the seam is AUTOMATIC — the drift-control continuation
 *  carries every non-cut join at the director's proven 22-frame
 *  overlap with the soft AV audio release; the seconds picker died
 *  with the MotionContext seam. The one authorable fact left is
 *  whether the join carries at all.) */
export function SeamControls({
  callIndex,
  transition,
  onTransition,
}: {
  callIndex: number
  transition?: "extend" | "cut"
  onTransition?: (t: "extend" | "cut") => void
}) {
  return (
    <>
      {onTransition !== undefined && (
        <div
          className={s.seamRow}
          title={studioCopy.seamHelp}
        >
          <span className={s.seamLabel}>seam</span>
          <SpecAtom
            f={{
              name: "seam_mode", label: "Call " + callIndex + " seam mode", type: "select",
              options: [
                { value: "extend", label: studioCopy.seamCarried },
                { value: "cut", label: studioCopy.seamCut },
              ],
            }}
            value={transition === "cut" ? "cut" : "extend"}
            onEdit={(_, v) => onTransition?.(v === "extend" ? "extend" : "cut")}
          />
        </div>
      )}
    </>
  )
}
