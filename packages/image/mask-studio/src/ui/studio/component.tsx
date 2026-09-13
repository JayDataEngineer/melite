// MaskStudioEditor — drill-down surface for the mask-studio card.
//
// THREE MASK PRODUCERS (2026-08-10 rework — "three different kinds of mask
// we can send"):
// • brush — paint_mask, authored on the canvas (white-on-black data URL)
// • detect — YOLO+SAM, the face/hands/body mode buttons; "none" turns the
// producer OFF (the marquee + Segm/Bbox one-gesture flow)
// • SAM3 — open-vocabulary TEXT-prompted segmentation ("ask AI for
// clothing or specific parts"); a prompt + Segment runs it
// (scoped by the marquee when one is committed)
//
// "layers don't make sense to be honest, but exporting the paint brush /
// mask does"). Every produced mask (mask_combined + face/hands/body + sam3)
// renders as a thumbnail + the paint row is live — export is AUTOMATIC
// (the editor never exposes per-mask switches; the brick emits everything
// the run produced). Overlay alphas on the canvas are FIXED (view-only).
//
// INPUT SOURCING (2026-08-10): the base image — params.input_image / slot 0
// — accepts the SAME three affordances every other image input slot does
// stuff"):
// • from file — Upload button + OS file drag-drop + paste
// • from assets — drag-drop from the asset tray (ASSET_DRAG_MIME)
// • from a prior card — wire input_image to an earlier stage's output
// The wire path is the SAME WirePickerModal SlotGrid uses (one wire UX
// across the app). It's GOOFY by design: a wire is live but resolves only
// once the upstream runs. When wired + the upstream has no result yet, the
// canvas is replaced by a WaitingState ("block"): the user can't paint on
// an image that doesn't exist yet, and the note explains why + how to
// unblock (run the upstream, or unwire and attach a file). At runtime,
// collectUpstreamResults injects the resolved URL into params.input_image
// (falsy guard) the moment the upstream produces — the canvas lights up
// then.
//
// BACKEND CONTRACT (unchanged): params.paint_mask (white-on-black data URL
// of the brushed mask) + params.export_paint, plus detect_mode / threshold /
// sam_* / export_{face,hands,body} booleans. Layer visibility / opacity /
// order are LOCAL presentation state (view-only — the exported PNG is always
// the full-opacity binary mask). The bridge to the card is the same
// onEditSave path ParamGrid uses.
//
// WHY NOT mount useInpaintStore directly? It's a GLOBAL singleton wired for
// GENERATION (prompt / loras / controlnets / branches / history). A mask
// card isn't a generation surface, and bridging a store that large through
// a card is fragile (it would clobber the Inpaint Studio tab). Instead this
// editor adopts the canvas app's STRUCTURE + primitives (layer model, tool
// dock, options bar, empty state) in a self-contained component — the same
// design call BodyCardEditor makes. The visual language is identical to
// Inpaint Studio.
//
// STUDIO TENANT #3 (2026-08-15, the card-studio migration): this editor is
// a registered tenant (cardStudios.ts, service "mask-studio") — the zoom
// overlay's wide panel IS this surface. Two layout changes came with the
// tenancy, both shell-mandated (spec §5/§7.9/§7.10):
// • The param stack (MaskSourceControls — the 2026-08-16 source-first
//   rework: ONE radio for the four mask sources, class chips, then
//   shared/contextual knobs) PROJECTS into the studio's LEFT rail via
//   StudioRail. Standalone it renders IN PLACE on the left too — the same
//   side the shell puts it, so both layouts read as one. Vertical space
//   is precious: one narrow scrolling column, never a wide right panel.
// • The right-rail MaskStrip became the BOTTOM BAR — the owner's ask,
//   verbatim: "make the bottom bar a list of the outputs, since this one
//   is dynamic in its outputs… when we hit play, we could see those
//   little subcards fill up." Phase A (2026-08-16): the bar became the
//   RECIPE bar — one subcard per ARMED recipe labeled Filter·Selection
//   ("'BBox1, Person' next to 'Hands'"), not one fixed slot per
//   emittable output (see OutputStrip + spec §8.15).
// The fixed h-[520px] row is GONE — the tenant stretches (flex-1/min-h-0,
// the HEIGHT RULE) so the canvas eats every pixel above the output bar.
//
// SPLIT (monolith decomposition): one focused module per concern under
// this dir — constants, canvas-ops, one module per subcomponent, hooks
// for the editor body + recipe.ts. This file is the thin composition.
// CONTRACT: this module MUST keep `export default MaskStudioEditor` (the
// cardStudios glob imports that exact default export).
import { useCallback, useEffect, useMemo, useState } from "react"
import type { CardStage } from "@melite/contracts"
import { StudioShell } from "@melite/card-base/shell"
import { defineShellDeclaration } from "@melite/card-base/shell"
import { WirePickerModal } from "@melite/card-base/wirePicker"
import styles from "./mask.module.css"
import { EMPTY_ARTIFACTS, INPUT_SLOT } from "./constants"
import type { MaskSource, SelectionRect } from "./constants"
import { producedMasks } from "./canvas-ops"
import { OutputStrip } from "./OutputStrip"
import { MaskSourceControls } from "./MaskSourceControls"
import { StudioCanvas } from "./StudioCanvas"
import { useStudioRefs } from "./useStudioRefs"
import { useInstances } from "./useInstances"
import { useCanvasView } from "./useCanvasView"
import { usePaintTools } from "./usePaintTools"
import { useStageRail } from "./useStageRail"
import { usePrepPreview } from "./usePrepPreview"
import { useImageImport } from "./useImageImport"
import { deriveRecipe } from "./recipe"

// ── Main editor ──────────────────────────────────────────────────────────
export function MaskStudioEditor({
  stage,
  onSave: onSaveProp,
  upstreams = [],
  onWireSlot,
  onRun,
}: {
  stage: CardStage
  onSave: (params: Record<string, unknown>) => void
  /** ALL stages of the enclosing run, in array order — the wire picker
  * restricts to indices BEFORE this stage. Defaults to [] (display-only
  * mounts — tests — see no wire affordance). */
  upstreams?: CardStage[]
  /** Wire/unwire the input_image slot (store's setSlotInput, stage-scoped
  * by the caller). Omit to hide the wire affordance entirely. */
  onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void
  /** Trigger the card run (2026-08-10 rework): the Segm/Bbox selection
  * buttons write output_mode + roi THEN run — detection is one gesture,
  * not "edit params, then find the Run button". CardDetailModal passes
  * actions.onRun(stage.id). */
  onRun?: () => void
}) {
  // ── Input sourcing: wire (slot 0) takes precedence over manual attach ──
  // A slot is EITHER wired OR manually attached — never both (the SlotGrid
  // contract). When wired, the base image is the upstream's resolved URL;
  // collectUpstreamResults injects it at runtime, but here in the editor we
  // resolve it client-side from the upstream's result (the same read
  // SlotGrid's thumbnail does). No result yet → wiredPending (blocked).
  const wiredId = stage.inputs[0]
  const wiredUpstream = wiredId ? upstreams.find((u) => u.id === wiredId) : undefined
  const isWired = !!wiredUpstream
  const wiredOutputName = stage.inputOutputs?.[0] ?? null
  const wiredUrl = wiredUpstream?.result
  ? (wiredOutputName && wiredUpstream.result.artifacts?.[wiredOutputName]
  ? wiredUpstream.result.artifacts[wiredOutputName]
  : wiredUpstream.result.assetUrls[0])
  : null
  const wiredPending = isWired && !wiredUrl
  const attachedImage = (stage.params.input_image as string) ?? ""
  // Effective base image: the wire's resolved URL when wired, else the
  // manual attachment. Empty when neither (→ empty state).
  const inputImage = isWired ? (wiredUrl ?? "") : attachedImage
  // Stable `artifacts` identity. The naive `stage.result?.artifacts ?? {}`
  // mints a FRESH object on every render when the card has no result yet —
  // the layers/load effects below depend on it, so each render re-fired
  // them → setState → render → "Maximum update depth exceeded" the instant
  // a fresh mask card mounted (2026-08-10). Memoize against the same
  // reference the store wrote, and share one frozen empty map for the
  // no-result case so an unchanged stage never changes `artifacts`.
  const artifacts = useMemo(
  () => stage.result?.artifacts ?? EMPTY_ARTIFACTS,
  [stage.result?.artifacts],
  )
  const params = stage.params

  // ── Phase C (2026-08-16): the editor AUTHORS FLAT ─────────────────────
  // ``outputs`` is the AGENT's normalized recipe (mask_recipe.py); when
  // present it OVERRIDES the flat params at the brick. Any USER gesture
  // replaces the recipe: every editor write re-flattens it to [] (empty =
  // flat form — the brick's contract), carrying the flat knobs the
  // gesture just touched. The user reads what the agent wrote in the bar,
  // then refines it in the rail's vocabulary.
  const onSave = useCallback(
  (p: Record<string, unknown>) => onSaveProp({ ...p, outputs: [] }),
  [onSaveProp],
  )

  // Shared paint/selection state (owned here — the canvas, paint, recipe,
  // and prep hooks all read it; setters thread through).
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [hasPaint, setHasPaint] = useState(Boolean(params.paint_mask))
  const [paintVersion, setPaintVersion] = useState(0)
  // The produced-mask set (stable identity per artifacts change — redraw
  // and the strip both derive from it; no per-layer state anymore).
  const masks = useMemo(() => producedMasks(artifacts), [artifacts])

  const refs = useStudioRefs()
  const instances = useInstances({ params, artifacts, stage, onSave, onSaveProp, onRun })
  const canvas = useCanvasView({
  stage, inputImage, artifacts, masks, hasPaint,
  boxes: instances.boxes, selectedInstances: instances.selectedInstances,
  setSelection, setHasPaint, setPaintVersion, onSave, refs,
  })
  const paint = usePaintTools({
  stage, artifacts, inputImage, hasPaint, setHasPaint, setPaintVersion,
  setSelection,
  view: {
  isZoomed: canvas.isZoomed, pan: canvas.pan, zoom: canvas.zoom,
  setPan: canvas.setPan, panDragging: canvas.panDragging,
  setPanDragging: canvas.setPanDragging, clampPanFor: canvas.clampPanFor,
  zoomToPoint: canvas.zoomToPoint, resetZoom: canvas.resetZoom,
  scheduleRedraw: canvas.scheduleRedraw, flushRedraw: canvas.flushRedraw,
  },
  onSave, onRun, refs,
  })

  // ── Source derivation (2026-08-16) — the rail's radio is DERIVED from
  // params wherever params can express it, plus ONE piece of ephemeral view
  // state: Person/Box = detect on (output_mode picks precise vs
  // rectangles); Brush = detect off, nothing else armed. Text is the
  // exception — params can only say "a prompt exists", so an EMPTY prompt
  // that has not been typed yet is indistinguishable from Brush. textArmed
  // holds the tile tap until the prompt lands (spec §5: ephemeral view
  // state, never persisted — reopen with no prompt falls back to Brush,
  // which is honest: nothing was armed). A prompt under Person/Box RIDES
  // ALONG (both producers run — the brick allows it; the rail shows the
  // Text box with an "also running" tag).
  const [textArmed] = useState(false)
  const detectMode = (params.detect_mode as string) ?? "body"
  const outputMode = (params.output_mode as string) ?? "segm"
  const sam3Prompt = (params.sam3_prompt as string) ?? ""
  const sam3Active = Boolean(sam3Prompt.trim())
  const source: MaskSource =
  detectMode !== "none"
  ? (outputMode === "bbox" ? "box" : "person")
  : (sam3Active || textArmed ? "text" : "brush")
  // The marquee's always-visible answer (the SHARED Scope chip): the live
  // marquee, the persisted roi (an agent write / revive with no local
  // marquee), or the full image.
  const roiParam = (params.roi as string | number[] | undefined) ?? ""
  const hasScope = Boolean(selection) || (Array.isArray(roiParam) ? roiParam.length > 0 : Boolean(roiParam))
  const scopeLabel = selection
  ? `Sel ${Math.round(selection.w)}×${Math.round(selection.h)}`
  : hasScope ? "Scoped (card)" : "Full image"

  useEffect(() => {
  if (detectMode === "face" || detectMode === "hands" || detectMode === "body") {
  refs.lastClassRef.current = detectMode
  }
  }, [detectMode, refs.lastClassRef])

  const rail = useStageRail({ stage, refs, onSave, onRun })
  const prep = usePrepPreview({
  artifacts, hasPaint, paintVersion, refs, redrawRef: canvas.redrawRef,
  })
  const im = useImageImport({ stage, onSave, onWireSlot, upstreams })

  const updateParam = (key: string, value: unknown) => onSave({ ...stage.params, [key]: value })

  const detecting = stage.status === "running"
  const showsSize = paint.tool === "brush" || paint.tool === "eraser"

  const recipe = deriveRecipe({
  params, artifacts,
  recipeOutputs: instances.recipeOutputs, recipeDetect: instances.recipeDetect,
  detectMode, outputMode, sam3Prompt, sam3Active, textArmed,
  hasPaint, hasScope,
  instanceLabel: instances.instanceLabel, filterActive: instances.filterActive,
  boxes: instances.boxes, selectedInstances: instances.selectedInstances,
  onPrimaryKeep: instances.applyPrimaryKeep,
  onClearSelection: paint.clearSelection,
  onSwitchInstance: instances.switchInstance,
  })

  return (

  // STRETCH, NOT FIXED (tenant #3, 2026-08-15): the root is a flex-1/min-h-0
  // column of the studio's tenant area (the HEIGHT RULE — body/motion
  // parity), so the canvas row eats every pixel above the OUTPUT bottom
  // bar. Standalone mounts (the test suite) keep the same tree; there is
  // no fixed 520px to lean on anywhere.
  <div className={styles.studioRoot} data-mask-studio>
  <StudioShell
  /* THE RAIL — the pre-ordained LEFT sidebar (2026-08-16): the whole
  mask param surface (source picker → classes → shared → refine →
  text), declared to THE SHELL's rail seam (§2 + §7.10; the shell
  owns the StudioRail portal since stroke 1). Standalone (test
  mounts) the shell renders it in place — the one-shell standalone
  shape every studio shares. Vertical space is precious: it is
  one narrow scrolling column, never a wide right panel. */
  params={
  <MaskSourceControls
  params={params}
  source={source}
  detectMode={detectMode}
  exportFace={Boolean(params.export_face)}
  exportHands={Boolean(params.export_hands)}
  exportBody={Boolean(params.export_body)}
  sam3Active={sam3Active}
  scopeLabel={scopeLabel}
  hasScope={hasScope}
  detecting={detecting}
  hasInput={Boolean(inputImage)}
  boxes={instances.boxes}
  bboxCount={rail.bboxCount}
  instancesSelected={instances.selectedInstances}
  selectedAll={!instances.filterActive}
  typeDraft={rail.typeDraft}
  draftPrompt={rail.promptDraft}
  stageGeometry={rail.stageGeom}
  hasPaint={hasPaint}
  onBboxCount={rail.setBboxCountCapped}
  onBboxRun={rail.runBboxIsolated}
  onInstancePick={instances.applyPrimaryKeepSilent}
  onStageType={rail.openStageType}
  onPromptDraft={rail.setPromptDraft}
  onGeometry={rail.setStageGeom}
  onAdd={rail.commitStageAdd}
  onSegment={paint.runSam3}
  onPlay={onRun}
  onChange={updateParam}
  onClearScope={paint.clearSelection}
  />
  }
  /* CENTER — the 2D paint viewport (PaintCanvas2D inside
   * StudioCanvas): dock + canvas side by side, the canvas eating
   * every pixel above the OUTPUT bottom bar (HEIGHT RULE). */
  preview={
  <div className={styles.centerRow}>
  <StudioCanvas
  tool={paint.tool}
  setTool={paint.setTool}
  prepPreviewOn={prep.prepPreviewOn}
  setPrepPreviewOn={prep.setPrepPreviewOn}
  showsSize={showsSize}
  brushSize={paint.brushSize}
  setBrushSize={paint.setBrushSize}
  selection={selection}
  inputImage={inputImage}
  zoom={canvas.zoom}
  setZoom={canvas.setZoom}
  pan={canvas.pan}
  setPan={canvas.setPan}
  isZoomed={canvas.isZoomed}
  resetZoom={canvas.resetZoom}
  hasPaint={hasPaint}
  clearPaint={paint.clearPaint}
  colRef={refs.colRef}
  canvasContainerRef={refs.canvasContainerRef}
  viewCanvasRef={refs.viewCanvasRef}
  wiredPending={wiredPending}
  onCanvasDrop={im.onCanvasDrop}
  onCanvasDragOver={im.onCanvasDragOver}
  onCanvasDragLeave={im.onCanvasDragLeave}
  viewSize={canvas.viewSize}
  dropHighlight={im.dropHighlight}
  imageLoading={canvas.imageLoading}
  wiredUpstreamTitle={wiredUpstream?.title ?? ""}
  onUnwire={() => onWireSlot?.(INPUT_SLOT, null, null)}
  onPointerDown={paint.onPointerDown}
  onPointerMove={paint.onPointerMove}
  onPointerUp={paint.onPointerUp}
  panDragging={canvas.panDragging}
  isWired={isWired}
  canWire={im.canWire}
  setWireOpen={im.setWireOpen}
  boxes={instances.boxes}
  detectMode={detectMode}
  recipeDetect={instances.recipeDetect}
  selectedInstances={instances.selectedInstances}
  toggleInstance={instances.toggleInstance}
  importImageFile={im.importImageFile}
  attachImage={im.attachImage}
  detecting={detecting}
  prepGrow={prep.prepGrow}
  setPrepGrow={prep.setPrepGrow}
  prepFeather={prep.prepFeather}
  setPrepFeather={prep.setPrepFeather}
  prepCoveragePct={prep.prepCoveragePct}
  prepSourceLabel={prep.prepSourceLabel}
  runDetect={paint.runDetect}
  clearSelection={paint.clearSelection}
  />
  </div>
  }
  /* BOTTOM — the recipe bar: what the run narrates. */
  bottom={
  /* THE RECIPE BAR (2026-08-16 phase A): one subcard per ARMED mask
  recipe — FILTER over SELECTION, Combined naming its winner — filling
  as artifacts land. Dynamic, not fixed: the emittable contract lives
  in the schema; this bar narrates the run. */
  <OutputStrip
  entries={recipe.cards}
  hasPaint={hasPaint}
  paintVersion={paintVersion}
  imgCache={refs.imgCacheRef.current}
  paintCanvas={refs.paintCanvasRef.current}
  running={detecting}
  filters={recipe.chips}
  />
  }
  />

  {/* Wire picker — link input_image to a previous card's output. Same
  modal SlotGrid uses; the write contract is identical (wire writes
  onWireSlot AND clears the slot param so the falsy-injection guard
  can't shadow the live wire). Open from the empty state's "Wire
  from card" button or the canvas wired-badge. */}
  {im.wireOpen && onWireSlot && (
  <WirePickerModal
  slot={INPUT_SLOT}
  priorStages={im.priorStages}
  currentId={wiredId}
  currentOutput={wiredOutputName}
  onPick={(upstreamId, outputName) => {
  onWireSlot(INPUT_SLOT, upstreamId, outputName ?? null)
  // Clear the slot param so a stale manual attach can't shadow
  // the wire (the mutual-exclusion contract, SlotGrid parity).
  onSave({ ...stage.params, input_image: null })
  im.setWireOpen(false)
  }}
  onUnwire={() => {
  onWireSlot(INPUT_SLOT, null, null)
  onSave({ ...stage.params, input_image: null })
  im.setWireOpen(false)
  }}
  onClose={() => im.setWireOpen(false)}
  />
  )}
  </div>
  )
}
/** THE SHELL RIDE, as data (row 5 stroke 4): PaintCanvas2D in the
 *  center (the 2D viewport primitive, stroke 3), the mask param
 *  surface in the rail (producers = rail verbs), the recipe bar on
 *  the bottom. Pinned by the shell wall + the mask suite's
 *  declaration coherence test. */
export const shellDeclaration = defineShellDeclaration({
  preview: { kind: "paint2d" },
  bottom: { kind: "recipe" },
  params: { slots: [INPUT_SLOT] },
})

export default MaskStudioEditor
