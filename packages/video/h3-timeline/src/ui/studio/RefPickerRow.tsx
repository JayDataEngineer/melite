/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { SelectMenu, cn, readAsDataURL } from "./kit"
import { Upload, X } from "./icons"
import s from "./studio.module.css"
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
    <div className={s.refRow} data-testid={testId}>
      <div className={s.refHead}>
        <span className={s.refLabel}>{label}</span>
        <span className={cn(s.refCount, over ? s.refCountOver : s.refCountOk)}>
          {chips.length}/{cap}{over ? " over cap" : ""}
        </span>
      </div>
      {chips.length > 0 && (
        <div className={s.chips}>
          {chips.map((chip, ci) => (
            <span
              key={`${chip}-${ci}`}
              title={chip.startsWith("data:") ? "uploaded (inline)" : artifactThumbNote(chip)}
              className={s.chip}
            >
              <span className={s.truncate}>{chip.startsWith("data:") ? `upload (${Math.round(chip.length / 1365)}kB)` : chip}</span>
              <Button
                type="button"
                aria-label={`Remove ${label} ${chip.startsWith("data:") ? "upload" : chip}`}
                onClick={() => setChips(chips.filter((_, x) => x !== ci))}
                className={s.chipX}
              >
                <X className={s.sz10} aria-hidden />
              </Button>
            </span>
          ))}
        </div>
      )}
      <div className={s.pickRow}>
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
          className={s.pickSel}
          buttonClassName={candidates.length ? s.pickSelBoxOk : s.pickSelBoxEmpty}
        />
        <label
          className={s.uploadBtn}
          title={`Upload a ${genre} (${up.note}, rides inline as a data: URL)`}
        >
          <Upload className={s.sz10} aria-hidden />
          <input
            type="file"
            accept={up.accept}
            className={s.hiddenInput}
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
