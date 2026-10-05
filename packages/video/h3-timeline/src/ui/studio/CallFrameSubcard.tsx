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
  /** File upload / OS drop → data: URL into the source. Image-only with
   * a size cap (the doc stores the payload inline — keep it sane); a
   * rejection is VISIBLE (the inline error line), never a silent drop. */
  const takeFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setFileError(`not an image (${file.type || "unknown type"})`)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setFileError("image too large (max 20 MB)")
      return
    }
    try {
      const dataUrl = await readAsDataURL(file)
      setFileError(null)
      onChange(dataUrl)
    } catch {
      setFileError("could not read that file")
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
        label="first frame · slot 1"
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
          setFileError("that source is not in this timeline\u2019s vocabulary")
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
          title="How this call joins the previous one: carried continues the previous window's latent through drift control (schedule-matched carry, soft audio release — seamless across the seam); cut is an independent window, a true butt"
        >
          <span className={s.seamLabel}>seam</span>
          <SpecAtom
            f={{
              name: "seam_mode", label: "Call " + callIndex + " seam mode", type: "select",
              options: [
                { value: "extend", label: "carried — drift-control chain" },
                { value: "cut", label: "cut — independent window" },
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
