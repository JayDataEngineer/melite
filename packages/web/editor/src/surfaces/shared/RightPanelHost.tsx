// RightPanelHost — the right sidebar as a BROWSER-TAB HOST (H-RIGHT §16.7).
//
// The DSH pattern, adapted to melite's seam law — now with DSH's layout
// engine discipline too:
//
//   TAB BAR   the chrome is a browser-style top bar (RailTabBar): one chip
//             per open pane, an × per tab, and a "+" whose MENU asks which
//             pane to add. The strip is user-curated: closing a tab records
//             it hidden (rightPanelStore.hidden); + re-adds. Closing a
//             mode's LAST tab closes the rail and clears that curation.
//   RESIZE    RailResizeHandle: pointer capture + rAF throttle, clamped to
//             the rail contract (railGeometry RAIL_MIN/MAX), double-click
//             resets to the pane's declared px; widths persist per pane.
//   CONCEDE   concedeRailWidth(viewport, preferred) — pure solver, center
//             keeps ≥640px, the rail shrinks toward its 300px floor then
//             auto-closes WITHOUT touching the stored preference (re-widen
//             auto-recovers). The solved width publishes to
//             railEffectiveWidth so WorkspaceLayout's floating cluster
//             reads the SAME number (one resolution rule).
//   MOUNTED   the pane subtree NEVER unmounts on close (the DSH rule):
//             closed renders as width-0 + inert — scroll and input state
//             survive every toggle. Mode switches still swap hosts.
//
// Panes are `right.panels` registry entries (first-party in
// rightPanelEntries.tsx, third-party via the plugin shell lane); visible
// panes derive from the ACTIVE CENTER TAB (each pane declares `modes`).
import { useMemo, useRef, useState, useLayoutEffect } from "react"
import { RightPanel } from "@/components/ui/WorkspaceShell"
import {
  useRightPanelEntries,
  rightPanesForMode,
  type RightPaneMeta,
} from "@/shell/rightPanelEntries"
import { useRightPanelStore } from "./rightPanelStore"
import { RailTabBar, type RailTab } from "./RailTabBar"
import { RailResizeHandle } from "./RailResizeHandle"
import {
  RAIL_MAX_PX,
  RAIL_MIN_PX,
  clampRailWidth,
  concedeRailWidth,
  railEffectiveWidth,
  useRailViewport,
} from "./railGeometry"
import { cn } from "@melite/ui"

type PaneComponent = React.ComponentType & Partial<RightPaneMeta>

const RAIL_DEFAULT_PX = 288

export function RightPanelHost({ tab }: { tab: string }) {
  const entries = useRightPanelEntries()
  const open = useRightPanelStore((s) => s.open[tab] ?? false)
  const activePaneId = useRightPanelStore((s) => s.pane[tab])
  const hiddenMap = useRightPanelStore((s) => s.hidden)
  const widths = useRightPanelStore((s) => s.widths)

  const wrapRef = useRef<HTMLDivElement>(null)
  const viewport = useRailViewport(wrapRef)
  const [dragging, setDragging] = useState(false)
  const startWidthRef = useRef(0)

  const visible = rightPanesForMode(entries, tab)
  const shown = useMemo(() => {
    const hidden = new Set(hiddenMap[tab] ?? [])
    return visible.filter((e) => !hidden.has(String(e.id)))
  }, [visible, hiddenMap, tab])

  // The pick: the user's selection when it's still an open tab, else the
  // first remaining tab — never render a pane outside its declared modes.
  const pick = shown.find((e) => e.id === activePaneId) ?? shown[0]

  const meta = ((pick?.component as PaneComponent) ?? {}) as Partial<RightPaneMeta>
  const preferred = clampRailWidth(
    widths[String(pick?.id)] ?? meta.px ?? RAIL_DEFAULT_PX,
  )

  const interactive = open && pick !== undefined
  const effective = concedeRailWidth(viewport, interactive ? preferred : 0)

  // Publish the solved width for the layout's floating-cluster offset.
  useLayoutEffect(() => {
    railEffectiveWidth.set(effective)
    return () => {
      railEffectiveWidth.set(0)
    }
  }, [effective])

  if (visible.length === 0 || !pick) return null // full-width mode

  const Pane = pick.component
  const pickId = String(pick.id)

  const tabs: RailTab[] = shown.map((e) => {
    const m = (e.component as PaneComponent) as Partial<RightPaneMeta>
    return { id: String(e.id), label: m.label ?? String(e.id), icon: m.icon }
  })
  const addable: RailTab[] = visible
    .filter((e) => !shown.some((s2) => s2.id === e.id))
    .map((e) => {
      const m = (e.component as PaneComponent) as Partial<RightPaneMeta>
      return { id: String(e.id), label: m.label ?? String(e.id), icon: m.icon }
    })

  const onCloseTab = (id: string) => {
    const store = useRightPanelStore.getState()
    if (shown.length <= 1) {
      // Last tab closes the window: rail down, curation reset — the next
      // open shows the mode's defaults again.
      store.hidePane(tab, id)
      store.setOpen(tab, false)
      store.clearHidden(tab)
      return
    }
    store.hidePane(tab, id)
    if (pickId === id) {
      const next = shown.find((e) => String(e.id) !== id)
      if (next) store.setPane(tab, String(next.id))
    }
  }

  const dragStartWidth = preferred

  return (
    <div
      ref={wrapRef}
      data-rail="right"
      data-right-rail
      data-open={interactive || undefined}
      data-resizing={dragging || undefined}
      inert={!interactive}
      style={{ width: effective }}
      className={cn(
        "relative h-full shrink-0 overflow-hidden",
        // The width transition IS the open/close slide now (and the
        // pane-switch morph); dragging kills it for 1:1 tracking.
        !dragging &&
          "transition-[width] duration-200 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
      )}
    >
      <RightPanel
        title={meta.label ?? pickId}
        subtitle={meta.subtitle}
        icon={meta.icon}
        className="h-full border-l-0"
        bodyClassName="flex flex-col overflow-y-auto scrollbar-thin"
        header={
          <RailTabBar
            tabs={tabs}
            activeId={pickId}
            addable={addable}
            subtitle={meta.subtitle}
            onSelect={(id) => useRightPanelStore.getState().setPane(tab, id)}
            onCloseTab={onCloseTab}
            onAdd={(id) => useRightPanelStore.getState().showPane(tab, id)}
            onCloseRail={() => useRightPanelStore.getState().setOpen(tab, false)}
          />
        }
      >
        {/* Width comes from the ACTIVE pane (its stored or declared px);
            panes are width-agnostic content. */}
        <div
          style={{ width: preferred }}
          className="flex h-full min-h-0 flex-col"
          data-right-pane-width
        >
          <Pane />
        </div>
      </RightPanel>
      {interactive && (
        <RailResizeHandle
          value={preferred}
          min={RAIL_MIN_PX}
          max={RAIL_MAX_PX}
          onDragStart={() => {
            startWidthRef.current = dragStartWidth
            setDragging(true)
          }}
          onDrag={(dx) =>
            useRightPanelStore
              .getState()
              .setPaneWidth(pickId, clampRailWidth(startWidthRef.current - dx))
          }
          onDragEnd={() => setDragging(false)}
          onNudge={(d) =>
            useRightPanelStore
              .getState()
              .setPaneWidth(pickId, clampRailWidth(preferred + d))
          }
          onReset={() => useRightPanelStore.getState().setPaneWidth(pickId, undefined)}
        />
      )}
    </div>
  )
}
