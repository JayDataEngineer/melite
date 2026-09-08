// LibraryTab — the ONE surface: the card-authoring canvas.
//
// The model (user, 2026-08-06): an asset IS a 1-level flow, and cards
// are ComfyUI subgraphs. Stringing cards = flow.json. So the Library
// is the surface where the USER authors that string, card by card —
// FlowCanvas. There are no sub-pills, no "Compose/Media/Runs" modes
// hiding three old surfaces. One canvas. One card type. Every interaction
// is a card.
//
// H-RIGHT (2026-08-21): this tab no longer embeds its own right rail —
// the layout's RightPanelHost renders the `workspace` pane (the action
// vocabulary: capability tiles + past runs) alongside the canvas, gated
// by the SAME per-tab toggle (rightPanelStore.open.library). The tab
// owns its CENTER content only.
//
// Past run artifacts (the archive) live in the sidebar (AppSidebar) and in
// each card's detail modal — they are not a separate "mode" here. The
// canvas is authoring; the archive is reachable everywhere cards render.
import { FlowCanvas } from "../flow/FlowCanvas"

export function LibraryTab() {
  return (
    <div className="flex h-full min-h-0">
      {/* Full-width readability (2026-08-07): with BOTH panels closed (left
          drawer + right rail) the canvas spans the whole window — cap the
          content column and center it so lines never stretch edge to
          edge. max-w only bites in that wide state; an open rail already
          narrows the column. */}
      <div className="mx-auto w-full max-w-[1500px] min-w-0 min-h-0 flex-1">
        <FlowCanvas />
      </div>
    </div>
  )
}
