// FlowCard — the ONE card kit for every surface that shows a run.
          //
// TWO. THERE IS ONE WAY TO SEE THE CARD. THE LIBRARY WAY… IT IS 1:1 TO WHAT
// WE SEE IN AGENT VIEW." The card IS CardTile — the dense Library rectangle
// — rendered by FlowTileGrid on every surface (Library canvas, Agent
// chat). The full-width FlowCard and the zoom modal were the SECOND
// design — deleted (rule 4). Details expand INLINE (CardDetailInline) via
// the shared body in CardDetailModal.tsx.
          //
// Each surface maps its own data model into the CardStage view-model and
// provides CardActions callbacks — the card does not know about any
// surface's store. The presentational pieces (StatusChip/ServiceBadge/
// UpstreamBadge/StatusPill/FlowProgressBar/ParamEditor)
// live here, so every surface renders with one visual language.
          //
// Card statuses are ONE vocabulary spanning every source:
// pending|running|done|error|stale|cached — agent flow stages
// pending|running|done|error|skipped|reused — YAML brick stages
// The superset is CardStatus; adapters map their own status into it.
export { isAudioOutput, cardIsRunnable, tilePlayAffordance } from "./flowCardTypes"
export { JsonParamField } from "./flowCardJsonField"
export { ParamEditor } from "./flowParamEditor"




// ── Live-feedback pieces moved to CardActivity.tsx (2026-08-15) ──────────
// cardActivityLabel / CardActivityLine / CardProgressBar now live in their
// own module: the CardStudio rail renders them too (studio live ComfyUI
// feedback), and CardStudio cannot VALUE-import from FlowCard (this
// file renders CardStudio — a value cycle). Re-exported here so the tile,
// the zoomed detail, and every existing test keep their import paths.
export { cardActivityLabel, CardActivityLine, CardProgressBar } from "./CardActivity"
export { CardTile } from "./flowCardTile"
export { CardErrorLine } from "./flowCardErrorLine"
export { ChainCardTile, StatusChip, ServiceBadge, UpstreamBadge } from "./flowCardBadges"
export { StatusPill, FlowProgressBar } from "./flowCardStatus"
export { CardZoomOverlay } from "./flowCardZoom"
export { FlowTileGrid } from "./flowCardGrid"








