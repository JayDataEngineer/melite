/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useState } from "react"
import { Link2, X } from "lucide-react"
import { Button } from "@melite/ui/button"
import { Checkbox, Input, SelectMenu, SlotSquare, Tip, cn, readAsDataURL } from "@melite/ui"
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
    <div data-testid={testId} className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60">
          {label}
        </span>
        <span className="truncate text-[8px] text-muted-foreground/40" title={hint}>{hint}</span>
      </div>
      <div className="flex items-center gap-1.5">
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
                className="flex h-4 w-4 items-center justify-center rounded bg-background/90 text-brand hover:text-brand/80"
              >
                <Link2 className="h-2 w-2" />
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
          className="min-w-0 flex-1 h-auto rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-foreground/90 outline-none placeholder:font-sans placeholder:text-muted-foreground/55 focus:border-brand/60"
        />
      </div>
      {fileError && (
        <span data-testid={`${testId}-file-error`} className="text-[8px] leading-tight text-destructive">
          {fileError}
        </span>
      )}
      {/* ── Link-to-previous-output picker (the inline panel over the
          upstream cards' image artifacts; picking writes the ctx-key
          NAME — the live reference _resolveSource re-resolves). ── */}
      {linkOpen && (
        <div
          data-testid={`${testId}-link-panel`}
          className="rounded border border-white/10 bg-popover p-1 shadow-sm"
        >
          <div className="flex items-center justify-between px-1 pb-0.5">
            <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
              Link to previous output
            </span>
            <Button
              type="button"
              onClick={() => setLinkOpen(false)}
              aria-label={`Close ${label} link picker`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
          {links && links.length > 0 ? (
            <div className="max-h-36 overflow-y-auto">
              {links.map((a) => (
                <Button variant="ghost"
                  key={`${a.title}:${a.name}`}
                  type="button"
                  data-testid={`${testId}-link-row`}
                  data-name={a.name}
                  title={`${a.title} · ${a.name}`}
                  onClick={() => { onChange(a.name); setFileError(null); setLinkOpen(false) }}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors hover:bg-accent"
                >
                  <img src={a.url} alt="" className="h-6 w-6 shrink-0 rounded border border-white/10 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[9px] text-foreground/90">{a.name}</span>
                    <span className="block truncate text-[8px] text-muted-foreground/50">{a.title}</span>
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <span className="block px-1 py-1 text-[8px] leading-snug text-muted-foreground/45">
              no upstream image outputs yet — run an earlier card, or upload above
            </span>
          )}
        </div>
      )}
      {onPrevSec && onTransition && (
        <div
          className="flex items-center gap-1 text-[10px] leading-tight text-muted-foreground/70"
          title="How this call joins the previous one: cut re-feeds the previous VIDEO tail as an opener clip; extend chains the previous LATENT — seamless motion, texture and audio phase carry across the seam"
        >
          <span className="shrink-0 uppercase tracking-wide text-muted-foreground/70">seam</span>
          <SelectMenu
            value={transition === "extend" ? "extend" : "cut"}
            aria-label={"Call " + callIndex + " seam mode"}
            options={[
              { value: "cut", label: "cut — prev video opener" },
              { value: "extend", label: "extend — latent chain" },
            ]}
            onChange={(v) => onTransition(v === "extend" ? "extend" : "cut")}
            className="w-full shrink"
            buttonClassName="w-full shrink rounded border border-white/10 bg-black/30 px-1 py-px font-mono text-[10px] text-foreground/90 outline-none focus:border-brand/60"
            popoverClassName="font-mono text-[10px]"
          />
        </div>
      )}
      {onPrevSec && (
        <label
          className={cn(
            "flex flex-wrap items-center gap-1 text-[10px] leading-tight",
            prevDisabled ? "cursor-not-allowed text-muted-foreground/35" : "text-muted-foreground/70",
          )}
          title={prevNote}
        >
          <Checkbox
            checked={prevSec != null}
            disabled={prevDisabled}
            aria-label={"Call " + callIndex + " continue from previous"}
            data-testid={testId + "-prev-toggle"}
            onChange={(e) => onPrevSec(e.target.checked ? (transition === "extend" ? 3 : 2) : null)}
            className="h-3 w-3"
          />
          {transition === "extend" ? (
            <>
              <span className="whitespace-nowrap">chain the last</span>
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
                  className="w-12 shrink-0 h-auto rounded border border-white/10 bg-black/30 px-1 py-px text-center font-mono text-[10px] tabular-nums text-foreground/90 outline-none focus:border-brand/60"
                />
              )}
              <span className="whitespace-nowrap">s of the previous latent</span>
              {prevSec != null && (
                <span className="w-full text-[8px] text-brand/45">
                  seamless carry — the motion-context node splices the previous window's latent tail; carried slots hold bit-exact while the rest denoises (windows stitch into one continuous clip)
                </span>
              )}
            </>
          ) : (
            <>
              <span className="whitespace-nowrap">open from the last</span>
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
                  className="w-12 shrink-0 h-auto rounded border border-white/10 bg-black/30 px-1 py-px text-center font-mono text-[9px] tabular-nums text-foreground/90 outline-none focus:border-brand/60"
                />
              )}
              <span className="whitespace-nowrap">s of the previous video</span>
              {prevSec != null && (
                <span className="w-full text-[8px] text-muted-foreground/35">
                  the tail carries the opening motion — the plan snaps it to the guide-clip packing rule
                </span>
              )}
            </>
          )}
          {prevDisabled && (
            <span className="w-full text-[8px] text-muted-foreground/35">{prevNote}</span>
          )}
        </label>
      )}
    </div>
  )
}
