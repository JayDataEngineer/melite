/**
 * ViewportAnchor — the floating-content seam over a viewport
 * (2026-09-07, the plugin-layout stroke; design record
 * docs/design/studio-plugin-layout.md).
 *
 * The over-the-window family, one seam per KIND of concern:
 *   • LAYERS  — interactive full-bleed planes (PaintCanvas2D's paint
 *     plane over the image). Canvas-stack territory; owns its wrapper.
 *   • ROWS    — declared view-state chips (ViewportOverlays; the
 *     renderer owns docks, ghosting, chrome).
 *   • ANCHORS — THIS seam: floating CONTENT at a named dock. The pin
 *     (source badge), the drawer (edge-docked panel), the notice (a
 *     bottom strip), the verb that happens to float (the apply chip),
 *     the wash (drop/error veils). Content declares WHERE; the anchor
 *     owns the geometry.
 *   • MARKS   — content-positioned badges (mask studio's bbox pins at
 *     world coordinates). Data positions, not docks — THINKING.
 *
 * Geometry ONLY: no z in the base (stacking is the tenant's story —
 * the drawer sits z-10, a wash z-20, a pill z-30); z and any offset
 * override ride className through twMerge, exactly like every other
 * kit primitive. Works over any positioned parent — ViewportFrame,
 * a viewer's own wrapper, a canvas container.
 *
 * shadcn rules: data-slot, cn(), className wins, props spread.
 */
import type { ComponentProps } from "react"
import { cn } from "./utils"

/* The dock vocabulary lives ONCE in py/ui_map.py (the map SSOT);
 * re-exported here from the generated face — do not hand-spell
 * it (the written-once wall refuses). */
import type { ViewportAnchorDock } from "./uiMap.generated"

export type { ViewportAnchorDock }

/** Per-dock geometry — verbatim tenant class strings. */
const DOCK_GEOMETRY: Record<ViewportAnchorDock, string> = {
  "top-right": "absolute right-2 top-2",
  "top-left": "absolute left-2 top-2",
  "bottom-right": "absolute bottom-2 right-2",
  "bottom-left": "absolute bottom-2 left-2",
  "bottom-center": "absolute bottom-2 left-1/2 -translate-x-1/2",
  bottom: "absolute bottom-2.5 inset-x-2.5",
  fill: "absolute inset-0",
  "edge-right": "absolute inset-y-0 right-0",
  "edge-left": "absolute inset-y-0 left-0",
}

export interface ViewportAnchorProps extends ComponentProps<"div"> {
  /** Where the content docks (default top-right — the pin shape). */
  dock?: ViewportAnchorDock
}

export function ViewportAnchor({ dock = "top-right", className, ...props }: ViewportAnchorProps) {
  return (
    <div
      data-slot="viewport-anchor"
      data-dock={dock}
      className={cn(DOCK_GEOMETRY[dock], className)}
      {...props}
    />
  )
}
