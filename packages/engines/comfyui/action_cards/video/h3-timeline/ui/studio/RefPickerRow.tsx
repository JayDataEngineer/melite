/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Upload, X } from "lucide-react"
import { Button } from "@melite/ui/button"
import { Input, SelectMenu, cn, readAsDataURL } from "@melite/ui"
import { REF_UPLOAD_SPEC, artifactThumbNote, refGenreOf, splitRefList } from "./refUtils"

/** One ref bucket row — the ARTIFACT SYSTEM, not freetext (operator
 * 2026-09-02: "REF IS FREETEXT? WE HAVE A SYSTEM TO HANDLE [REDACTED 2026-11-05] LIKE
 * THIS"). Sources, in estate order:
 *   • PICK — a genre-filtered select over the AVAILABLE artifacts:
 *     upstream cards PLUS the run's own outputs (window films, seams,
 *     the final cut — in a standalone timeline card those are the only
 *     sources; "no artifacts upstream" with a filmstrip full of clips
 *     on screen was the 2026-09-02 lazy-audit bug). A picked chip
 *     carries the artifact NAME, a live ctx reference the backend
 *     re-resolves each run.
 *   • UPLOAD — EVERY bucket (2026-09-02: "ONLY SOME HAVE UPLOAD
 *     BUTTON"): file → data: URL chip; the backend's ref staging
 *     base64-decodes data: sources into the input dir (same law as
 *     audio clips). Per-genre accept + cap.
 *   • REMOVE — the × on a chip.
 * The serialized shape is unchanged (comma string → arrays on save). */
export function RefPickerRow({
  label,
  ariaLabel,
  testId,
  value,
  onChange,
  genre,
  cap,
  artifacts,
}: {
  label: string
  ariaLabel: string
  testId: string
  /** Comma string (UI state form — "" / undefined = none). */
  value: string | undefined
  onChange: (next: string | undefined) => void
  genre: "image" | "video" | "audio"
  /** Bundle cap (10 images, 3 videos, 3 audios — the bundle bus law). */
  cap: number
  /** Available artifacts of ANY genre — filtered to this bucket's. */
  artifacts: { name: string; url: string }[]
}) {
  const chips = splitRefList(value)
  const candidates = artifacts.filter((a) => refGenreOf(a.name, a.url) === genre && !chips.includes(a.name) && !chips.some((c) => c === a.name))
  const over = chips.length > cap
  const setChips = (next: string[]) => onChange(next.length ? next.join(", ") : undefined)
  const up = REF_UPLOAD_SPEC[genre]
  return (
    <div className="flex flex-col gap-0.5" data-testid={testId}>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-muted-foreground/70">{label}</span>
        <span className={cn("text-[8px] tabular-nums", over ? "text-amber-400" : "text-muted-foreground/35")}>
          {chips.length}/{cap}{over ? " over cap" : ""}
        </span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip, ci) => (
            <span
              key={`${chip}-${ci}`}
              title={chip.startsWith("data:") ? "uploaded (inline)" : artifactThumbNote(chip)}
              className="inline-flex max-w-full items-center gap-1 rounded border border-white/10 bg-black/30 px-1 py-px font-mono text-[9px] text-foreground/85"
            >
              <span className="truncate">{chip.startsWith("data:") ? `upload (${Math.round(chip.length / 1365)}kB)` : chip}</span>
              <Button
                type="button"
                aria-label={`Remove ${label} ${chip.startsWith("data:") ? "upload" : chip}`}
                onClick={() => setChips(chips.filter((_, x) => x !== ci))}
                className="rounded-sm p-px text-muted-foreground/50 hover:bg-white/10 hover:text-foreground"
              >
                <X className="h-2.5 w-2.5" aria-hidden />
              </Button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1">
        <SelectMenu
          aria-label={`Add ${ariaLabel}`}
          value=""
          disabled={candidates.length === 0}
          options={[
            {
              value: "",
              label:
                candidates.length === 0
                  ? chips.length >= cap
                    ? "at cap"
                    : `no ${genre} artifacts yet`
                  : `+ pick ${genre} artifact…`,
            },
            ...candidates.map((a) => ({ value: a.name, label: a.name })),
          ]}
          onChange={(n) => {
            if (n) setChips([...chips, n])
          }}
          className="min-w-0 flex-1"
          buttonClassName={cn(
            "min-w-0 flex-1 rounded border bg-black/30 px-1 py-0.5 font-mono text-[9px] outline-none",
            candidates.length
              ? "border-white/10 text-foreground/85 focus:border-brand/60"
              : "border-white/[0.06] text-muted-foreground/40",
          )}
        />
        <label
          className="inline-flex cursor-pointer items-center gap-1 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/70 hover:border-brand/50 hover:text-foreground"
          title={`Upload a ${genre} (${up.note}, rides inline as a data: URL)`}
        >
          <Upload className="h-2.5 w-2.5" aria-hidden />
          <Input
            type="file"
            accept={up.accept}
            className="hidden"
            aria-label={`Upload ${ariaLabel}`}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ""
              if (!f) return
              if (f.size > up.maxMb * 1024 * 1024) return
              try {
                setChips([...chips, await readAsDataURL(f)])
              } catch { /* unreadable — the pickers never throw */ }
            }}
          />
        </label>
      </div>
    </div>
  )
}
