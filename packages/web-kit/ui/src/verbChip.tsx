/**
 * VerbChip — ONE verb UX across every card (row 5 stroke 5,
 * 2026-09-07; design record docs/design/studio-shell.md §4).
 *
 * A card's IN-CARD action rides the queue doors (SubAction → flow
 * runs — never direct GPU) and streams its result back through the
 * events door. The gesture is always the same shape:
 *
 *   the CHIP in the actions zone (icon → spinner when in flight,
 *   the phase-derived label) + the NOTE line under it (feedback in
 *   place — progress at the chip that started it, errors at the
 *   object, NEVER a toast; §5.4).
 *
 * Extracted from the three hand-rolled copies (anny's Estimate-body
 * + Load-preset chips, mask's SAM3 Segment) — same DOM bones, the
 * tenants keep their phases and derive label/busy/note at the call
 * site. The chip OWNS no run state: onClick is the queue gesture,
 * busy/note are the live feedback the tenant already tracks.
 *
 * GENRE-BLIND: no card, flow, or lane vocabulary — tone names the
 * accent (brand default; violet for the SAM3 ride-along). The shell
 * wall's import discipline covers this module like every @melite/ui
 * primitive.
 */
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "./button"
import { cn } from "./utils"

export interface VerbChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** The queue gesture (compose-first — the tenant mints the draft). */
  onClick: () => void
  /** Phase-derived label (the tenant maps queued/running → text). */
  label: string
  /** In flight: the icon swaps to the spinner. */
  busy?: boolean
  /** The glyph at rest (default Sparkles — the verb affordance). */
  icon?: ReactNode
  /** Accent: brand (default) or violet (the ride-along SAM3 tone). */
  tone?: "brand" | "violet"
  /** Full-width centered shape (the prompt-box run). */
  wide?: boolean
  /** Live feedback under the chip (progress or the loud error). */
  note?: string | null
  /** The note is a failure → role=alert (screen readers hear it). */
  noteIsError?: boolean
}

export function VerbChip({
  onClick,
  label,
  busy = false,
  icon,
  tone = "brand",
  wide = false,
  note,
  noteIsError = false,
  className,
  ...rest
}: VerbChipProps): ReactElement {
  return (
    <>
      <Button
        variant="ghost"
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          wide
            ? "w-full justify-center bg-violet-600 py-1 text-[11px] font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
            : "border py-1 text-foreground",
          !wide && tone === "brand" && "border-brand/40 bg-brand/10 hover:bg-brand/20",
          !wide && tone === "violet" && "border-violet-400/40 bg-violet-400/10 hover:bg-violet-400/20",
          className,
        )}
        {...rest}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : (icon ?? <Sparkles className="h-3 w-3" />)}
        {label}
      </Button>
      {note && (
        <p
          role={noteIsError ? "alert" : "status"}
          title={note}
          className="w-full line-clamp-2 text-[9px] leading-relaxed text-muted-foreground/70"
        >
          {note}
        </p>
      )}
    </>
  )
}
