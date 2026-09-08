/**
 * viewportOverlays — the OVERLAY seam (row 5 stroke 6, 2026-09-07;
 * design record docs/design/studio-shell.md §2.5).
 *
 * Buttons INSIDE the viewport, as DECLARED ROWS — never hand-rolled
 * absolute-positioned DOM over the canvas:
 *
 *   overlays={[
 *     { id: "hair", kind: "toggle", dock: "tl", group: "parts",
 *       label: "Hair", active: on, onAct: () => ... },
 *     { id: "cam", kind: "segmented", dock: "tr", group: "view",
 *       options: ["front", "3/4", "back"], value: "3/4", onAct: ... },
 *     { id: "run", kind: "status", dock: "tl", group: "run",
 *       label: "Detecting…" },
 *   ]}
 *
 * `kind` and `dock` are CLOSED unions (the pydantic mirror — a
 * bogus member is a BUILD error). THE RENDERER owns positioning,
 * hover/active states, and grouping; the card declares rows and
 * handles onAct.
 *
 * VIEW state ≠ CARD state (the load-bearing rule): overlays mutate
 * VIEW state only — camera, visibility, ghost modes — client-local,
 * ephemeral, NEVER served, NEVER a card knob. A control that
 * changes what the card REMEMBERS is a VERB (VerbChip), not an
 * overlay.
 *
 * CHROME-LESS (§5): overlays recede — ghosted until pointer-near —
 * never cover the subject, never animate the layout.
 *
 * GENRE-BLIND: no card/lane vocabulary; the seam serves any
 * viewport primitive that owns a positioned wrapper (Stage3D,
 * PaintCanvas2D).
 */
import type { ReactElement, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "./utils"

/* The overlay vocabularies live ONCE in py/ui_map.py (the map
 * SSOT); re-exported here from the generated face. */
import type { OverlayDock, OverlayKind } from "./uiMap.generated"

export type { OverlayDock, OverlayKind }

export interface ViewportOverlay {
  /** Stable row id (grouping + React keys). */
  id: string
  kind: OverlayKind
  dock: OverlayDock
  /** Rows of one group stack together at the dock. */
  group?: string
  /** toggle/status: the chip text. segmented: omitted (options carry it). */
  label?: string
  /** toggle: the pressed state. */
  active?: boolean
  /** segmented: the closed option list + the lit one. */
  options?: readonly string[]
  value?: string
  /** status: in-flight rows carry the spinner. */
  busy?: boolean
  /** toggle/segmented: the row's gesture (view-state writes). */
  onAct?: (value?: string) => void
  /** Optional leading glyph (status/toggle). */
  icon?: ReactNode
}

const DOCK_CLASS: Record<OverlayDock, string> = {
  tl: "left-2 top-2",
  tr: "right-2 top-2",
  bl: "bottom-2 left-2",
  br: "bottom-2 right-2",
}

function OverlayChip({
  row,
}: {
  row: ViewportOverlay
}): ReactElement | null {
  const base =
    "pointer-events-auto flex items-center gap-1 rounded bg-background/80 px-2 py-1 text-[10px] font-medium text-foreground/90 backdrop-blur-sm transition-opacity"
  if (row.kind === "status") {
    return (
      <span className={cn(base, "cursor-default")}>
        {row.busy && <Loader2 className="h-3 w-3 animate-spin text-brand" />}
        {row.icon}
        {row.label}
      </span>
    )
  }
  if (row.kind === "toggle") {
    return (
      <button
        type="button"
        aria-pressed={row.active ?? false}
        onClick={() => row.onAct?.(row.id)}
        className={cn(
          base,
          "hover:bg-background",
          row.active
            ? "border border-brand/50 text-brand"
            : "border border-transparent text-muted-foreground hover:text-foreground",
        )}
      >
        {row.icon}
        {row.label}
      </button>
    )
  }
  // segmented: one chip per option, the lit one branded
  return (
    <span className="pointer-events-auto flex items-center gap-0.5 rounded bg-background/80 p-0.5 backdrop-blur-sm transition-opacity">
      {(row.options ?? []).map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={opt === row.value}
          onClick={() => row.onAct?.(opt)}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
            opt === row.value
              ? "bg-brand/20 text-brand"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </span>
  )
}

/** The renderer: one absolutely-positioned stack per dock corner,
 *  rows grouped (same group stacks in declaration order), the whole
 *  dock GHOSTED until pointer-near (chrome-less §5 — recede, never
 *  cover). Empty docks render nothing. */
export function ViewportOverlays({
  overlays,
}: {
  overlays: readonly ViewportOverlay[]
}): ReactElement | null {
  if (overlays.length === 0) return null
  const docks = new Map<OverlayDock, ViewportOverlay[]>()
  for (const row of overlays) {
    const list = docks.get(row.dock) ?? []
    list.push(row)
    docks.set(row.dock, list)
  }
  return (
    <>
      {[...docks.entries()].map(([dock, rows]) => (
        <div
          key={dock}
          data-overlay-dock={dock}
          className={cn(
            "absolute z-10 flex flex-col gap-1 opacity-60 transition-opacity hover:opacity-100",
            DOCK_CLASS[dock],
          )}
        >
          {rows.map((row) => (
            <OverlayChip key={row.id} row={row} />
          ))}
        </div>
      ))}
    </>
  )
}
