// HeaderIconButton — the shared shell for the floating top-right icon
// cluster (RightPanelToggle, ComfyStatus, KeyHealthButton).
//
// These three buttons were previously hand-rolled / copy-pasted, which let
// their sizes (14px vs 16px icons), radii, hover colors, and connectivity
// dots drift apart — the "slight misalignment" between the CPU + Key dots.
// This primitive owns ONE <Button variant="ghost" size="icon-sm"> shell, a
// fixed 16px icon slot, the active (brand) state, and an optional statusDot
// slot, so the trio is pixel-identical by definition (2026-08-13
// consolidation). Callers only supply icon, color, and health semantics.
//
// Tooltip (2026-08-14 tooltip unification): the shell renders the styled
// Radix Tip around the Button — `title` (when provided) overrides `label`
// as BOTH the tooltip text and the accessible name, so state-dependent
// titles (e.g. "ComfyUI backend: unreachable") stay discoverable.
//
// The KeyHealthButton is cloned by Base UI's <DialogTrigger render={…}>,
// which merges trigger props (onClick, aria-haspopup, aria-expanded, ref)
// onto the element — so all props are forwarded to the Button root.
import type { LucideIcon } from "lucide-react"
import { Button } from "@melite/ui/button"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"

const DOT_CLASS: Record<"up" | "busy" | "down", string> = {
  // Same emerald + cyan glow used by the old ComfyStatus dot — the pair's
  // canonical connectivity badge. "down" mirrors it in red so a dead
  // backend reads at a glance even when the icon color is ambiguous.
  // "busy" (2026-08-14): amber, no glow — reachable but slow to answer
  // (heavy load). Distinct from "down" so the operator can tell "stressed"
  // from "dropped" at a glance — the tri-state /health contract.
  up: "bg-emerald-400 shadow-[0_0_8px_2px_oklch(0.72_0.19_192/0.6)]",
  busy: "bg-amber-400",
  down: "bg-red-400 shadow-[0_0_8px_2px_oklch(0.63_0.22_27/0.6)]",
}

interface HeaderIconButtonProps
  extends React.ComponentProps<typeof Button> {
  icon: LucideIcon
  /** a11y label + default tooltip. */
  label: string
  /** Brand-highlighted state (right-panel toggle open). */
  active?: boolean
  /** Connectivity badge rendered in the top-right corner. */
  statusDot?: "up" | "busy" | "down" | null
}

export function HeaderIconButton({
  icon: Icon,
  label,
  active,
  statusDot,
  className,
  title,
  ...props
}: HeaderIconButtonProps) {
  return (
    <Tip tip={title ?? label} side="bottom">
      <Button
        variant="ghost"
        size="icon-sm"
        {...props}
        aria-pressed={active}
        aria-label={title ?? label}
        className={cn(
          "relative",
          active
            ? "bg-brand/12 text-brand ring-1 ring-brand/40"
            : "text-muted-foreground/70 hover:text-foreground",
          className,
        )}
      >
        <Icon className="h-4 w-4" />
        {statusDot && (
          <span
            aria-hidden
            className={cn(
              "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
              DOT_CLASS[statusDot],
            )}
          />
        )}
      </Button>
    </Tip>
  )
}
