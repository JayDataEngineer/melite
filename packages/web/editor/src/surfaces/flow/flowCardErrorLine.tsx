// flowCardErrorLine — CardErrorLine, the tile's failure line, moved
// VERBATIM from FlowCard.tsx (Cut 2, C4): one truncated line with a
// click-to-expand scroll-capped block carrying the complete error message.
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@melite/ui"
import type { CardStage } from "@melite/contracts"
/** The tile's failure line (2026-08-15 rework) — click to expand the FULL
 * error inline. The 2026-08-10 version truncated to one line with the full
 * text on hover only; a toast telling the user "(full error on the card)"
 * while the card itself clips at one line was a lie. Contract: default =
 * single truncated line (data-card-error preserved); click toggles an
 * expanded, wrapping, scroll-capped block carrying the complete message;
 * only rendered for status === "error" with a non-empty error.
 *
 * 2026-08-23: long errors (>300 chars — the EXACT threshold where the
 * failure toast appends "… (full error on the card)") start OPEN. When the
 * toast makes that promise, the card must already be showing the full text:
 * a micro-chevron nobody finds behind an 8px truncate is still the lie.
 * Short errors keep the one-line default. */
export function CardErrorLine({ stage }: { stage: CardStage }) {
  // Initializer runs once per mount; the panel state then belongs to the user.
  const [open, setOpen] = useState(() => (stage.error?.length ?? 0) > 300)
  if (stage.status !== "error" || !stage.error) return null
  return (
    <div data-card-error={stage.id} data-open={open ? "true" : "false"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="card-error-toggle"
        aria-expanded={open}
        className="flex w-full items-start gap-1 text-left"
      >
        {/* ALWAYS the one truncated line — never the wrapping form. The
         * 2026-08-15 duplicate bug: the open state switched this span to
         * break-words/pre-wrap AND the expanded block below rendered the
         * same text again — the full error appeared TWICE on the card, and
         * the wrapping span's unbounded height stretched the tile (and via
         * items-stretch, the whole row). The complete message lives ONLY
         * in the scroll-capped block; this line stays one line. */}
        <span className="min-w-0 flex-1 truncate text-[8px] leading-tight text-destructive">
          {stage.error}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-3 w-3 shrink-0 text-destructive/60 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          data-testid="card-error-full"
          className="mt-1 max-h-40 overflow-y-auto rounded border border-destructive/30 bg-destructive/10 p-1.5 font-mono text-[8px] leading-snug break-words whitespace-pre-wrap text-destructive"
        >
          {stage.error}
        </div>
      )}
    </div>
  )
}
