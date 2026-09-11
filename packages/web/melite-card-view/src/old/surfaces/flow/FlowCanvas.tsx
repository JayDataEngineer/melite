// FlowCanvas — the USER-AUTHORING card surface.
//
// The model (user, 2026-08-06): cards are ComfyUI subgraphs — dense
// rectangles that TILE next to each other (the flow.json canvas).
// Stringing cards together = the flow. This surface is where the USER
// authors that string — the human-driven equivalent of the agent's
// build_flow.
//
// DESIGN PRINCIPLES (user, 2026-08-06):
// • DENSITY — every pixel earns its place. No 90%-blank rectangles.
// • TILING — cards slot into a grid (multiple per row), not a vertical
// stack of full-width rows.
// • ONE SURFACE (2026-08-09) — clicking a card zooms it IN PLACE to a
// BOUNDED detail card (640px — a card in the grid, never 100% of the
// canvas) while the siblings shrink to compact and stay visible. The
// grid is the surface — always. The 100%-wide expansion and the modal
// were both "second surfaces"; both are dead.
//
// Flow: Add card (picker) → dense tile lands in the grid → click → the card
// expands in place (auto-edit if no result yet) → type prompt / fiddle →
// Run → result lands in the tile. Wire cards by dragging one tile onto
// another, or the wire dropdown in the detail card.
import { useCallback, useState } from "react"

import { Plus, Play, RotateCw, Loader2, X, Sparkles, Square } from "lucide-react"
import { useFlowCards } from "./flowCards"
import { useLibraryFlowStore } from "./flowStore"
import { kindDef } from "@melite/slots"
import { applyDocMutation as gateDocMutation } from "@melite/formats"
import { StatusChip, FlowTileGrid } from "./FlowCard"
import { ServicePicker } from "./ServicePicker"
import {
  CAPABILITY_DRAG_MIME,
  parseCapabilityDrop,
} from "@melite/formats"
import { familyAccepts, uploadToEstate, type SourceMediaType } from "@melite/catalog"
import { ASSET_DRAG_MIME, readAsDataURL } from "@melite/ui"
import { useToastStore } from "@melite/ui"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
/** Map an OS file's MIME to the closed SourceMediaType vocabulary the input
 * family declares (FamilyEntry.accepts, pydantic-validated). null = the file
 * is not an ingest media type at all (text, pdf, …). This is the ONLY
 * free-code in the drop path — and it's a pure MIME→enum projection, not a
 * policy: the policy (which types spawn a card) lives in the catalog
 * declaration; this just translates the browser's MIME into the declared
 * vocabulary so the gate can compare apples to apples. (2026-08-09) */
function mediaTypeOf(file: File): SourceMediaType | null {
 if (file.type.startsWith("image/")) return "image"
 if (file.type.startsWith("video/")) return "video"
 if (file.type.startsWith("audio/")) return "audio"
 return null
}

/** Card title for a dropped-media Ops card. "Ops" = the operator's shorthand
 * for non-generative / non-AI tasks (crop, scale, trim, volume) — the input
 * family's whole job. Derived from the detected type so the card name stays
 * honest to what was dropped. Presentation only — NOT policy. */
function opsTitle(t: SourceMediaType): string {
 return t === "image" ? "Image Ops" : t === "video" ? "Video Ops" : "Audio Ops"
}


export function FlowCanvas() {
 const { flow, stages, runningStageId, hasRunningStage, actions, reorderRange, runAll, reRunFrom, cancelRun } = useFlowCards(useLibraryFlowStore)
 const startFlow = useLibraryFlowStore((s) => s.startFlow)
 const addStage = useLibraryFlowStore((s) => s.addStage)
 const removeStage = useLibraryFlowStore((s) => s.removeStage)
 const clear = useLibraryFlowStore((s) => s.clear)

 const [pickerOpen, setPickerOpen] = useState(false)
 // The expanded card (inline — NO modal, 2026-08-07). null = all compact.
 const [focusStageId, setFocusStageId] = useState<string | null>(null)
 // ── Grouping sub-view (2026-08-12) ──
 // Triggered from the "Group Cards" action tile in ServicePicker. When
 // true, the canvas enters a FILTERED SELECTION mode: tiles show check
 // circles, clicking toggles selection (not zoom), and the Group bar at
 // the top lets the user collapse the selected cards into one compound
 // parent. This IS the action-card entry point the user demanded:
 // "THE FEATURE NEEDS TO BE AN ACTION CARD … WHEN I CLICK ON THE ACTION
 // IT GOES INTO A FILTERED VIEW, THE SUB VIEW."
 const [groupingMode, setGroupingMode] = useState(false)
 // Capability drag-over feedback (2026-08-08): the whole canvas is a drop
 // target for capability tiles dragged from the LibrarySidebar. While a
 // capability is being dragged over, a highlight ring signals "drop here
 // to add this card."
 const [capDragOver, setCapDragOver] = useState(false)
 // Media-drag feedback (2026-08-09): a SEPARATE flag from capDragOver so the
 // empty-canvas hint can say the right thing ("Drop to create an Ops card"
 // vs "Drop to add this card"). Lights for BOTH OS file drags (browsers hide
 // file MIME during dragOver — only "Files" is exposed) AND sidebar-asset
 // drags (ASSET_DRAG_MIME). The drop handler gates each on the input
 // family's DECLARED `accepts` before spawning a card — the policy is in the
 // catalog, not the view (no free-coded type check).
 const [fileDragOver, setFileDragOver] = useState(false)

 const isEmpty = !flow || flow.stages.length === 0

 // Drop a capability tile from the sidebar → a NEW card appears. The SAME
 // addStage path as clicking the tile — drag is the click's peer for users
 // who prefer to drop in the middle. Works on BOTH the empty canvas and a
 // populated one (the card tiles let the capability MIME bubble up). 2026-08-08.
 //
 // 2026-08-09: the canvas is ALSO a drop target for media. TWO media sources
 // spawn the SAME Ops card (kind:"input") with `source` pre-loaded — the SAME
 // input stage a media drop creates (the picker's Input tile is gone —
 // since 2026-09-04 the picker lists action cards ONLY):
 // • OS files (Files) — read to a data: URL, then seeded as `source`.
 // • Sidebar assets (ASSET_DRAG_MIME — the AppSidebar media tray) — the
 // asset's url is already a URL, so it seeds `source` DIRECTLY (no
 // readAsDataURL).
 // Both GATE on the input family's DECLARED `accepts` (FamilyEntry.accepts,
 // pydantic-validated) — a media type outside the declaration HARD-FAILS
 // (toast), never a silent swallow. The InputCardEditor then owns
 // crop/scale/trim/volume/mask like any other input card. Card tiles
 // stopPropagation on media drops (they attach to the slot), so a file or
 // asset dropped ON a card never reaches here — only drops on the background.
 const onCanvasDragOver = useCallback((e: React.DragEvent) => {
 const types = e.dataTransfer.types
 const cap = types.includes(CAPABILITY_DRAG_MIME)
 const file = types.includes("Files")
 const asset = types.includes(ASSET_DRAG_MIME)
 if (!cap && !file && !asset) return
 e.preventDefault() // claim the drop for the canvas
 if (cap) setCapDragOver(true)
 if (file || asset) setFileDragOver(true)
 }, [])
 const onCanvasDragLeave = useCallback((e: React.DragEvent) => {
 // Only clear when leaving the canvas entirely. Moving between the canvas
 // and a child (a card tile) fires dragLeave too — relatedTarget is the
 // child in that case, so we keep the highlight. null = left the canvas.
 if (e.relatedTarget === null) {
 setCapDragOver(false)
 setFileDragOver(false)
 }
 }, [])
 const onCanvasDrop = useCallback((e: React.DragEvent) => {
 const types = e.dataTransfer.types
 // Capability tile drop → the tile's resolved card (existing path).
 if (types.includes(CAPABILITY_DRAG_MIME)) {
 e.preventDefault()
 setCapDragOver(false)
 setFileDragOver(false)
 const cap = parseCapabilityDrop(e.dataTransfer.getData(CAPABILITY_DRAG_MIME))
 if (!cap) return
 void addStage({
 kind: cap.kind ?? "generation",
 service: cap.service,
 title: cap.title,
 params: cap.params,
 })
 return
 }
 // Sidebar-asset drop (ASSET_DRAG_MIME — the SAME payload SlotSquare parses,
 // dragged from the AppSidebar media tray). The asset's server-classified
 // `type` is projected against the input family's DECLARED `accepts` — the
 // SAME gate the OS-file branch uses below. The asset url is already a URL
 // (hosted or data:), so it seeds `source` DIRECTLY — no readAsDataURL. An
 // asset whose type the family doesn't declare ingestion for (glb / npz /
 // mesh / motion / …) HARD-FAILS (toast) — never a silent swallow. (2026-08-09)
 if (types.includes(ASSET_DRAG_MIME)) {
 e.preventDefault()
 setCapDragOver(false)
 setFileDragOver(false)
 const raw = e.dataTransfer.getData(ASSET_DRAG_MIME)
 let payload: { url?: string; type?: string } = {}
 try {
 payload = raw ? (JSON.parse(raw) as { url?: string; type?: string }) : {}
 } catch {
 payload = {}
 }
 // Malformed drag payload (no url) — non-event, no toast.
 if (!payload.url) return
 const accepts = familyAccepts("input")
 const mt = (accepts as readonly string[]).includes(payload.type ?? "")
 ? (payload.type as SourceMediaType)
 : null
 if (!mt) {
 // HARD FAIL: the asset's type is outside the family's declared
 // ingestion vocabulary. Surface it, don't bury it.
 useToastStore.getState().addToast(
 "error",
 payload.type
 ? `Input cards don’t accept ${payload.type} assets`
 : "That asset isn’t supported — drop an image, video, or audio asset",
 )
 return
 }
 void addStage({
 kind: "input",
 service: "input",
 title: opsTitle(mt),
 params: { source: payload.url },
 })
 return
 }
 // OS media-file drop → an Ops card (kind:"input") with the file pre-loaded
 // as its source. GATED by the input family's DECLARED `accepts` list
 // (FamilyEntry.accepts, pydantic-validated) — not a free-coded prefix
 // check. A file whose type the family doesn't declare ingestion for is a
 // HARD FAIL (toast), never a silent swallow: freehand no-ops are exactly
 // the siren song the declarative pattern exists to kill (2026-08-09).
 if (types.includes("Files")) {
 const file = e.dataTransfer.files?.[0]
 // Truly empty Files drag (files:[]) = a non-event, nothing to validate.
 if (!file) return
 const accepts = familyAccepts("input")
 const mt = mediaTypeOf(file)
 if (!mt || !accepts.includes(mt)) {
 // HARD FAIL: the dropped file's type is outside the family's declared
 // ingestion vocabulary. Surface it, don't bury it.
 e.preventDefault()
 setCapDragOver(false)
 setFileDragOver(false)
 useToastStore.getState().addToast(
 "error",
 mt
 ? `Input cards don’t accept ${mt} files`
 : "That file type isn’t supported — drop an image, video, or audio file",
 )
 return
 }
 e.preventDefault()
 setCapDragOver(false)
 setFileDragOver(false)
 // THE UPLOAD RAIL (2026-09-06): image drops go through POST
 // /v1/uploads — the ESTATE PATH lands in params.source (a data:
 // URL refused at compose; the bytes must live on the estate).
 // Video/audio keep the legacy data: URL until their upload door
 // exists (recorded gap).
 if (mt === "image") {
 void uploadToEstate(file)
 .then((path) =>
 addStage({
 kind: "input",
 service: "input",
 title: opsTitle(mt),
 params: { source: path },
 }),
 )
 .catch((err: unknown) => {
 useToastStore.getState().addToast("error", (err as Error).message)
 })
 return
 }
 void readAsDataURL(file)
 .then((url) =>
 addStage({
 kind: "input",
 service: "input",
 title: opsTitle(mt),
 params: { source: url },
 }),
 )
 .catch((err: unknown) => {
 useToastStore.getState().addToast(
 "error",
 `Could not read ${mt} file: ${err instanceof Error ? err.message : String(err)}`,
 )
 })
 }
 }, [addStage])

 // kind: open vocabulary (the cardSeam cut) — the closed StageKind union is dead.
 const handlePick = useCallback(async (card: { service: string; title: string; params: Record<string, unknown>; kind?: string }) => {
 await addStage({ kind: card.kind ?? "generation", service: card.service, title: card.title, params: card.params })
 // Auto-open the new card's modal so the user types the prompt immediately
 // — in the DENSE modal, not a bloated inline expand.
 const st = useLibraryFlowStore.getState().flow?.stages ?? []
 const newest = st[st.length - 1]
 if (newest) setFocusStageId(newest.id)
 }, [addStage])

 if (isEmpty) {
 return (
 <>
 {/* The empty canvas is a drop target for capability tiles — drag a
 tile from the LibrarySidebar and drop it here to land the first
 card (the SAME addStage path as the button below). 2026-08-08. */}
 <div
 onDragOver={onCanvasDragOver}
 onDragLeave={onCanvasDragLeave}
 onDrop={onCanvasDrop}
 data-canvas-drop="empty"
 className={cn(
 "flex h-full flex-col items-center justify-center gap-4 p-8 text-center transition-all",
 (capDragOver || fileDragOver) && "ring-2 ring-brand/50 ring-offset-2 ring-offset-background bg-brand/5",
 )}
 >
 <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-brand/40 bg-brand/5">
 <Sparkles className="h-5 w-5 text-brand/70" />
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-semibold text-foreground">Author a flow</h3>
 <p className="max-w-sm text-xs text-muted-foreground">
 Add cards, set each one's prompt + params, string them together, then run. Every card is one step. An asset is a 1-card flow.
 </p>
 {capDragOver && (
 <p className="text-[11px] font-medium text-brand">Drop to add this card</p>
 )}
 {fileDragOver && !capDragOver && (
 <p className="text-[11px] font-medium text-brand">Drop to create an Ops card</p>
 )}
 </div>
 <button
 onClick={() => { if (!flow) startFlow(); setPickerOpen(true) }}
 className="flex items-center gap-1.5 rounded-md border border-brand/40 bg-brand/15 px-3 py-1.5 text-xs font-medium text-brand transition-all hover:bg-brand/25"
 >
 <Plus className="h-3.5 w-3.5" />
 Add your first card
 </button>
 </div>
 <ServicePicker
 open={pickerOpen}
 onOpenChange={setPickerOpen}
 onPick={handlePick}
 canGroup={(flow?.stages.length ?? 0) >= 2}
 onGroupAction={() => { setPickerOpen(false); setFocusStageId(null); setGroupingMode(true) }}
 />
 </>
 )
 }

 // Chain-backed runs (loaded YAML specs) mark every card "running" and
 // leave runningStageId null — the flow status is the running signal.
 const isRunning = runningStageId !== null || flow!.status === "running"
 // The Cancel button the gates promise ("press Cancel") — visible for a
 // live run AND a phantom stuck status (stage "running" without a live
 // controller). cancelRun handles both arms (2026-08-12).
 const canCancel = isRunning || hasRunningStage
 const doneCount = flow!.stages.filter((s) => s.status === "done" || s.status === "cached").length
 // opensStudio cards defer to the user (the flag, not a literal kind)
 const runnable = flow!.stages.filter((s) => !kindDef(s.kind).opensStudio)
 const allDone = doneCount === runnable.length

 return (
 // The populated canvas is ALSO a capability drop target — drop a tile
 // from the LibrarySidebar anywhere on the canvas (incl. over a card) and
 // a NEW card lands at the end of the flow. Card tiles let the
 // capability MIME bubble up (their onDrop only claims asset/file drops).
 // 2026-08-08.
 <div
 onDragOver={onCanvasDragOver}
 onDragLeave={onCanvasDragLeave}
 onDrop={onCanvasDrop}
 data-canvas-drop="populated"
 className={cn(
 "flex h-full flex-col transition-all",
 (capDragOver || fileDragOver) && "ring-2 ring-brand/40 ring-inset",
 )}
 >
 {/* ── Run-status contract verdict (2026-08-11 → toast 2026-08-14): a
 status channel that lied fires an error TOAST with Retry (re-poll) from
 runStatusContractStore — the 2026-08-14 rule: errors surface through
 toasts ONLY, never a persistent line in the webapp. ── */}
 {/* ── Header row: name/intent + status · actions row: Run all · Save · Clear ── */}
 {/* pr-32 reserves the top-right corner for the floating status cluster
 (WorkspaceLayout: RightPanelToggle + ComfyStatus + BackendStatusIcon
 — 3 × size-7 + gaps, z-30).
 Nothing interactive lives at the header's right edge anymore: the
 Clear-flow X moved next to Save in the actions row (operator
 request) after the 4th floating icon outgrew the old pr-24
 reservation (2026-08-14) and parked on top of it. The reservation
 stays so the name field never runs under the cluster. */}
 <header className="shrink-0 border-b border-border/60 bg-background/60 pl-3 pr-32 py-2">
 <div className="flex items-center gap-2">
 <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
 <input
 aria-label="Flow name"
 // Uncontrolled by design (blur-gate rename) — but a REPLACED
 // flow doc must remount the input, or the DOM value keeps
 // the old doc's name after a wand-revive (the store is right,
 // the field would lie). Keyed by doc id: new doc → fresh default.
 key={flow!.id}
 defaultValue={flow!.name ?? flow!.intent}
 onBlur={(e) => {
 // The flow rename (2026-08-09) — enforced through the
 // DOC_MUTATIONS gate (lib/cardMutations), same discipline as
 // card rename. Trim + reject via the gate: invalid = revert
 // in place (no toast, silent like the card drilldown).
 const committed = flow!.name ?? flow!.intent
 if (e.target.value.trim() === committed) return
 const res = gateDocMutation({ kind: "rename", value: e.target.value })
 if (res.ok) {
 e.target.value = res.patch.name // normalize to the trimmed commit
 useLibraryFlowStore.getState().applyDocMutation({ kind: "rename", value: res.patch.name })
 } else {
 e.target.value = committed // invalid → revert in place
 }
 }}
 className="min-w-0 flex-1 truncate rounded bg-transparent text-xs font-semibold text-foreground outline-none focus:bg-background/60 focus:px-1.5 focus:py-0.5 focus:ring-1 focus:ring-brand/40"
 />
 <StatusChip running={isRunning} />
 </div>
 <div className="mt-1.5 flex items-center gap-2">
 {!allDone ? (
 <>
 <button
 onClick={() => runAll()}
 disabled={isRunning}
 className={cn(
 "flex shrink-0 items-center gap-1 rounded-md border border-brand/40 bg-brand/15 px-2.5 py-1 text-[11px] font-medium text-brand",
 "transition-all hover:bg-brand/25 disabled:cursor-not-allowed disabled:opacity-50",
 )}
 >
 {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
 {isRunning
 ? (flow!.stages.some((s) => s.status === "queued") ? "Queued…" : "Running…")
 : "Run all"}
 </button>
 {canCancel && (
 <Tip tip="Stop the run and free the flow (also interrupts ComfyUI)">
 <button
 onClick={() => cancelRun()}
 className="flex shrink-0 items-center gap-1 rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive transition-all hover:bg-destructive/20"
 >
 <Square className="h-3 w-3 fill-current" />
 Cancel
 </button>
 </Tip>
 )}
 </>
 ) : (
 <button
 onClick={() => reRunFrom(flow!.stages[0].id)}
 className="flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-brand/40 hover:text-brand"
 >
 <RotateCw className="h-3 w-3" />
 Re-run
 </button>
 )}
 {/* The exit — IMMEDIATELY RIGHT of Save (operator request): the X used
     to close the name row's right edge and read as detached from the
     actions it governs. Same CLOBBER GUARD as before (2026-08-10):
     confirm on a non-empty flow; the message never says "not
     saved" — auto-save (storePersistence.ts) runs on every change.
     Kept h-7 w-7 so its box matches the row's control scale. */}
 <Tip tip="Clear flow">
 <button
 onClick={() => {
 const doc = useLibraryFlowStore.getState().flow
 const n = doc?.stages.length ?? 0
 if (n > 0 && !window.confirm(`Clear the flow (${n} card${n === 1 ? "" : "s"})? This cannot be undone.`)) return
 clear()
 }}
 aria-label="Clear flow"
 className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent/60 hover:text-foreground"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </Tip>
 </div>
 </header>

 {/* ── The card surface — the ONE tile grid. FlowTileGrid is the
 SAME component the Agent chat renders — one design, 1:1, never two
 (2026-08-07). Click EXPANDS one tile inline (no modal) with the
 others shrinking; flex-basis transitions animate the grow/shrink. */}
 <div className="flex-1 min-h-0 overflow-y-auto p-3">
 <FlowTileGrid
 stages={stages}
 runningStageId={runningStageId}
 actions={actions}
 onRemove={(id) => removeStage(id)}
 onReorderRange={(fromIds, toId) => reorderRange(fromIds, toId)}
 focusStageId={focusStageId}
 onFocusStageId={setFocusStageId}
 selectionMode={groupingMode}
 onExitSelectionMode={() => setGroupingMode(false)}
 /* Add-card tile — hidden while a card is expanded. */
 addTile={!focusStageId && (
 <button
 onClick={() => setPickerOpen(true)}
 className={cn(
 "flex min-h-[120px] basis-[200px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 text-muted-foreground/60 transition-all",
 "hover:border-brand/40 hover:text-brand",
 )}
 >
 <Plus className="h-5 w-5" />
 <span className="text-[10px] font-medium">Add a card</span>
 </button>
 )}
 />
 </div>

 <ServicePicker
 open={pickerOpen}
 onOpenChange={setPickerOpen}
 onPick={handlePick}
 canGroup={(flow?.stages.length ?? 0) >= 2}
 onGroupAction={() => { setPickerOpen(false); setFocusStageId(null); setGroupingMode(true) }}
 />
 </div>
 )
}
