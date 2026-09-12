/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useState } from "react"
import { Button, Input, Switch } from "@deepseek-ai/dsh-client-ui-primitives"
import { SelectMenu, SlotSquare, Tip } from "./kit"
import { cn, readAsDataURL } from "@melite/card-base/chrome"
import { Link2, X } from "@melite/card-base/icons"
import s from "./studio.module.css"
import type { LinkArtifact } from "./refUtils"

/** One frame-conditioning subcard — a FULL image input, at parity with
 * every other image slot (2026-08-24 upgrade: "first frame / last frame
 * are weak versions compared to other image input nodes — I can't link
 * back to previous outputs"). The affordances:
 *
 *   • UPLOAD / OS-file drop → readAsDataURL → the source becomes a
 *     data: URL (_resolveSource decodes data: first-class).
 *   • TRAY drop → wires ONLY a known upstream artifact NAME (URL→name
 *     via the artifact index; drop honesty — an unmatched URL writes
 *     NOTHING, it would pass through unresolved at render time).
 *   • LINK TO PREVIOUS OUTPUT → the Link2 button opens an inline picker
 *     over the upstream cards' IMAGE artifacts; picking writes the
 *     artifact NAME — a LIVE reference the backend re-resolves from ctx
 *     at render time (retakes flow through; stronger than a snapshot).
 *   • the FIRST frame's exception — the prev-video continuation toggle
 *     ("use the last X seconds of the previous video", rule 3b).
 *
 * Otherwise the qwen-img-edit-2511 input pattern (2026-08-16): a typed
 * source line (artifact name / uploaded filename via the datalist), and
 * blank = none (the key deletes). */
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
  const [linkOpen, setLinkOpen] = useState(false)
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
      <div className={s.subRow}>
        <SlotSquare
          label={label}
          size="sm"
          value={thumb}
          onPickFile={(f) => void takeFile(f)}
          onDropFile={(f) => void takeFile(f)}
          onDropAsset={(url) => {
            // Drop honesty: wire ONLY a known upstream artifact (the
            // URL maps to its NAME — the vocabulary the renderer
            // resolves). A foreign URL is not this slot's language.
            const name = urlToName.get(url)
            if (name) onChange(name)
          }}
          onClear={v ? () => onChange("") : undefined}
          actions={
            <Tip tip="Link to a previous output">
              <Button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLinkOpen((o) => !o) }}
                aria-label={`Link ${label} to a previous output`}
                aria-expanded={linkOpen}
                data-testid={`${testId}-link`}
                className={s.linkBtn}
              >
                <Link2 className={s.sz8} />
              </Button>
            </Tip>
          }
        />
        <Input
          list="tl-kf-sources"
          data-testid={`${testId}-source`}
          value={value ?? ""}
          placeholder={nameToUrl.size ? "artifact or filename" : "uploaded filename"}
          aria-label={`Call ${callIndex} ${label}`}
          onChange={(e) => onChange(e.target.value)}
          className={s.srcIn}
        />
      </div>
      {fileError && (
        <span data-testid={`${testId}-file-error`} className={s.fileErr}>
          {fileError}
        </span>
      )}
      {/* ── Link-to-previous-output picker (the inline panel over the
          upstream cards' image artifacts; picking writes the ctx-key
          NAME — the live reference _resolveSource re-resolves). ── */}
      {linkOpen && (
        <div
          data-testid={`${testId}-link-panel`}
          className={s.linkPanel}
        >
          <div className={s.linkHead}>
            <span className={s.linkTitle}>
              Link to previous output
            </span>
            <Button
              type="button"
              onClick={() => setLinkOpen(false)}
              aria-label={`Close ${label} link picker`}
              className={s.linkClose}
            >
              <X className={s.sz10} />
            </Button>
          </div>
          {links && links.length > 0 ? (
            <div className={s.linkList}>
              {links.map((a) => (
                <Button variant="ghost"
                  key={`${a.title}:${a.name}`}
                  type="button"
                  data-testid={`${testId}-link-row`}
                  data-name={a.name}
                  title={`${a.title} · ${a.name}`}
                  onClick={() => { onChange(a.name); setFileError(null); setLinkOpen(false) }}
                  className={s.linkRow}
                >
                  <img src={a.url} alt="" className={s.linkThumb} />
                  <span className={s.linkNameWrap}>
                    <span className={s.linkName}>{a.name}</span>
                    <span className={s.linkSub}>{a.title}</span>
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <span className={s.linkEmpty}>
              no upstream image outputs yet — run an earlier card, or upload above
            </span>
          )}
        </div>
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
