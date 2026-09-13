/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useState } from "react"
import { Input, Switch } from "@deepseek-ai/dsh-client-ui-primitives"
import { SelectMenu } from "./kit"
import { cn, readAsDataURL } from "@melite/card-base/chrome"
import { SourceRow } from "@melite/card-base/form"
import s from "./studio.module.css"
import type { LinkArtifact } from "./refUtils"

/** One frame-conditioning subcard — a FULL image input, at parity with
 * every other image slot (2026-08-24 upgrade: "first frame / last frame
 * are weak versions compared to other image input nodes — I can't link
 * back to previous outputs"). The affordances:
 *
 *   THE SOURCE ROW (2026-09-13, the operator's law: ONE generic input
 *   component, no exceptions — even the studio): the bespoke SlotSquare
 *   + typed source line + inline link panel are DEAD. This subcard
 *   rides @melite/card-base's SourceRow — the same plus square, the
 *   same three-entry menu (From flow / From media / From file):
 *     • From flow lists the upstream cards' IMAGE artifacts (links);
 *       the write maps URL→NAME (the drop-honesty law: an unmatched
 *       URL writes NOTHING — it would pass through unresolved).
 *     • From file keeps the studio's OWN file law (image-only, 20 MB
 *       cap, readAsDataURL → data: URL; _resolveSource decodes data:
 *       first-class) through the wire's onFile override.
 *     • From media lists the runs library through the same door; the
 *       URL→NAME honesty applies (foreign URLs refuse visibly).
 *   • the FIRST frame's exception — the prev-video continuation toggle
 *     ("use the last X seconds of the previous video", rule 3b). */
export function CallFrameSubcard({
  label,
  hint,
  testId,
  callIndex,
  value,
  onChange,
  nameToUrl,
  urlToName,
  links,
  prevSec,
  onPrevSec,
  transition,
  onTransition,
  prevDisabled,
  prevNote,
}: {
  label: string
  hint: string
  testId: string
  callIndex: number
  value: string | undefined
  onChange: (source: string) => void
  nameToUrl: Map<string, string>
  urlToName: Map<string, string>
  /** Upstream IMAGE artifacts — the link-to-previous-output rows. */
  links?: LinkArtifact[]
  /** Present only on the FIRST-frame subcard — the prev-video opener. */
  prevSec?: number
  onPrevSec?: (sec: number | null) => void
  /** Seam mode: 'cut' = prev VIDEO tail opener; 'extend' = LATENT chain. */
  transition?: "extend" | "cut"
  onTransition?: (t: "extend" | "cut") => void
  prevDisabled?: boolean
  prevNote?: string
}) {
  const [fileError, setFileError] = useState<string | null>(null)
  const v = value?.trim() ?? ""
  // Thumbnails resolve like everywhere: a known artifact NAME → its URL;
  // an uploaded data: URL IS its own preview.
  const thumb = v.startsWith("data:") ? v : v ? nameToUrl.get(v) : undefined

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
    <div data-testid={testId} className={s.sub}>
      <div className={s.subHead}>
        <span className={s.subTitle}>
          {label}
        </span>
        <span className={cn(s.truncate, s.subHint)} title={hint}>{hint}</span>
      </div>
      {/* THE SOURCE ROW — one grammar with every input in the system
          (the operator's law); the studio's vocabulary adapters ride
          the props, not a second face. */}
      <SourceRow
        label={label}
        kind="image"
        value={v === "" ? null : v.startsWith("data:") ? v : nameToUrl.get(v) ?? v}
        candidates={(links ?? []).map((a) => ({ id: a.name, label: a.name, url: a.url }))}
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
      {onPrevSec && onTransition && (
        <div
          className={s.seamRow}
          title="How this call joins the previous one: cut re-feeds the previous VIDEO tail as an opener clip; extend chains the previous LATENT — seamless motion, texture and audio phase carry across the seam"
        >
          <span className={s.seamLabel}>seam</span>
          <SelectMenu
            value={transition === "extend" ? "extend" : "cut"}
            aria-label={"Call " + callIndex + " seam mode"}
            options={[
              { value: "cut", label: "cut — prev video opener" },
              { value: "extend", label: "extend — latent chain" },
            ]}
            onChange={(v) => onTransition(v === "extend" ? "extend" : "cut")}
            className={s.wFull}
            buttonClassName={s.mono}
          />
        </div>
      )}
      {onPrevSec && (
        <label
          className={cn(s.prevLabel, prevDisabled ? s.prevLabelOff : s.prevLabelOn)}
          title={prevNote}
        >
          <span data-testid={testId + "-prev-toggle"}>
            <Switch
              label={"Call " + callIndex + " continue from previous"}
              disabled={prevDisabled}
              checked={prevSec != null}
              onChange={(v) => onPrevSec(v ? (transition === "extend" ? 3 : 2) : null)}
            />
          </span>
          {transition === "extend" ? (
            <>
              <span className={s.nowrap}>chain the last</span>
              {prevSec != null && (
                <Input
                  type="number" min={0.5} step={0.5}
                  value={prevSec}
                  aria-label={"Call " + callIndex + " latent carry seconds"}
                  data-testid={testId + "-prev-sec"}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n > 0) onPrevSec(n)
                  }}
                  className={s.prevNum}
                />
              )}
              <span className={s.nowrap}>s of the previous latent</span>
              {prevSec != null && (
                <span className={s.prevCarryNote}>
                  seamless carry — the motion-context node splices the previous window's latent tail; carried slots hold bit-exact while the rest denoises (windows stitch into one continuous clip)
                </span>
              )}
            </>
          ) : (
            <>
              <span className={s.nowrap}>open from the last</span>
              {prevSec != null && (
                <Input
                  type="number" min={0.5} step={0.5}
                  value={prevSec}
                  aria-label={"Call " + callIndex + " previous video tail seconds"}
                  data-testid={testId + "-prev-sec"}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n) && n > 0) onPrevSec(n)
                  }}
                  className={cn(s.prevNum, s.prevNum9)}
                />
              )}
              <span className={s.nowrap}>s of the previous video</span>
              {prevSec != null && (
                <span className={s.prevNote}>
                  the tail carries the opening motion — the plan snaps it to the guide-clip packing rule
                </span>
              )}
            </>
          )}
          {prevDisabled && (
            <span className={s.prevNote}>{prevNote}</span>
          )}
        </label>
      )}
    </div>
  )
}
