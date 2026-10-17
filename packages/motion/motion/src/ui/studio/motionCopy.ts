/**
 * motionCopy.ts — THE MOTION STUDIO COPY DICTIONARY (the rail-law
 * audit's §2a, 2026-10-31). Client UI copy is locale-owned (the
 * estate's decision, mirrored from card-base's square.ts): presentation
 * code owns no copy literals; it consumes them here through the typed
 * seat. A second locale plugs into this dictionary without touching
 * a single studio component.
 *
 * THE BOUND: static user-visible FACES live here (labels, titles,
 * aria names, button faces, empty states, hints). Parameterized
 * sentences whose shape is fixed but whose slots are live (the frame
 * chip, the fps readout, the export summary, the rect/output aria
 * names, the body-notice fallback) live here as typed dict functions
 * (the square.ts pattern) — the site passes exactly the params the
 * entry declares. `tip=` hover help and `desc=` option sub-lines are
 * not census seats (the client-copy census walk does not seat them);
 * they stay at the site, except the exact twins that share a flagged
 * face — those ride the same key so one string has one owner.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const motionCopy = {
  /** Background picker: keep the stage's own background. */
  bgPreserve: "Preserve",
  /** Background picker: alpha PNG (no background). */
  bgTransparent: "Transparent",
  /** Background picker: flat black. */
  bgBlack: "Black",
  /** Background picker: flat white. */
  bgWhite: "White",
  /** Background picker: the mannequin stage dark. */
  bgDark: "Dark",
  /** Render-mode card: the raw mesh pass. */
  modeMesh: "Raw mesh",
  /** Render-mode card: the COCO-18 skeleton pass. */
  modeOpenPose: "OpenPose",
  /** Render-mode card: the grayscale depth pass. */
  modeDepth: "Depth",
  /** Export dialog head. */
  dialogTitle: "Export Motion",
  /** Frame chip: "frame <current>/<total>". */
  frameChip: (p: { current: number; total: number }): string => `frame ${p.current}/${p.total}`,
  /** Dismiss action (dialog X aria name + footer button). */
  close: "Close",
  /** Scope card: the framed rect at the user's angle. */
  scopeSingle: "Single view",
  /** Scope card: the same rect walked around the azimuth ring. */
  scopeBatch: "8-angle batch",
  /** Scope card: the raw motion NPZ + baked GLB files. */
  scopeDownloads: "Downloads",
  /** Downloads scope hover law when no run exists yet. */
  downloadsNeedsRunTitle: "Run the card first — the raw NPZ exists after a run",
  /** Visual-framing section head. */
  frameShotTitle: "Frame the shot",
  /** Live-framing panel head. */
  rectOnStageTitle: "Rectangle on the stage",
  /** Framing help, lead fragment (renders before the styled subject). */
  liveHelpDragThe: "Drag the",
  /** Framing help, styled subject (the stage rectangle). */
  liveHelpSubject: "rectangle over the character",
  /** Framing help, body fragment (renders after the styled subject). */
  liveHelpMoves: "— its body moves it, its corners resize it (aspect-locked). The rectangle is just the framing tool:",
  /** Framing help, second styled fragment (the typed-pixel promise). */
  liveHelpPixels: "any size on screen exports the typed pixels below",
  /** Framing help, tail (the camera is the user's own). */
  liveHelpCamera: ". The camera is yours — orbit/zoom for the angle.",
  /** Rect position field label ("x pos %" / "y pos %"). */
  rectPosLabel: (p: { part: string }): string => p.part + " pos %",
  /** Rect position input aria name ("Rectangle x position (percent)"). */
  rectPosAria: (p: { part: string }): string => `Rectangle ${p.part} position (percent)`,
  /** Output-size field label: width. */
  outWidthLabel: "width px",
  /** Output-size field label: height. */
  outHeightLabel: "height px",
  /** Output-size input aria name ("Output width (pixels)"). */
  outDimAria: (p: { dim: "w" | "h" }): string => `Output ${p.dim === "w" ? "width" : "height"} (pixels)`,
  /** Typed-size readout caption. */
  outputReadout: "output",
  /** Frame preset: refit the default rectangle. */
  resetFrame: "Reset frame",
  /** Frame preset: cover the whole stage. */
  wholeStage: "Whole stage",
  /** Render-modes section head. */
  renderModesTitle: "Render modes",
  /** Render-modes warning when no mode is selected. */
  pickAtLeastOne: "pick at least one",
  /** Frame scrubber section head. */
  frameSectionTitle: "Frame",
  /** Frame scrubber pause action (aria + hover twin). */
  pausePreview: "Pause preview",
  /** Frame scrubber play action (aria + hover twin). */
  playPreview: "Play preview",
  /** Background section head (dialog + rail share the face). */
  background: "Background",
  /** Export summary: the single-view file list. */
  summarySingle: (p: { modes: string }): string => "Stage frame — " + p.modes,
  /** Export summary: the batch file list (count walks the azimuth ring). */
  summaryBatch: (p: { count: number; modes: string }): string => `${p.count} angles, same rect — ${p.modes}`,
  /** Export summary: the empty-modes face. */
  noModesSelected: "no modes selected",
  /** Export summary: the downloads file list. */
  summaryDownloads: (p: { withGlb: boolean }): string => "Raw motion NPZ" + (p.withGlb ? " + baked GLB" : ""),
  /** Summary row: the baked GLB is downloadable. */
  glbPreviewAvailable: "GLB preview available for download",
  /** Export button busy face. */
  exporting: "Exporting…",
  /** Export button idle face ("Export the frame" / "Export 8 angles" / "Export files"). */
  exportAction: (p: { scope: "single" | "batch" | "downloads" }): string =>
    "Export " + (p.scope === "single" ? "the frame" : p.scope === "batch" ? "8 angles" : "files"),
  /** Rail group label: the view toggles. */
  viewGroup: "View",
  /** Rail toggle: the joint skeleton overlay. */
  skeletonToggle: "Skeleton",
  /** Rail toggle: pin the figure at the origin. */
  inPlaceToggle: "In-place",
  /** Rail group label: the pose tools. */
  poseGroup: "Pose",
  /** Pose toggle face when edit mode is on. */
  poseDone: "Done",
  /** Pose toggle face when edit mode is off. */
  refinePose: "Refine pose",
  /** Pose action: stamp the edited pose as a timeline keyframe. */
  stamp: "Stamp",
  /** Pose action face (the edit-hint twin shares it). */
  repose: "Repose",
  /** Pose action busy face. */
  reposing: "Reposing…",
  /** Pose action: discard the refined pose at this frame. */
  resetPose: "Reset pose",
  /** Spec form section: generation params. */
  sectionGeneration: "Generation",
  /** Spec form section: guidance params. */
  sectionGuidance: "Guidance",
  /** Spec form section: clock params. */
  sectionClock: "Clock",
  /** Rail group label: the output tools. */
  outputGroup: "Output",
  /** Rail toggle: the export panel. */
  railExport: "Export",
  /** Rail group label: the preview-body input subcard. */
  previewBody: "Preview body",
  /** Wire-button aria name for the preview-body slot. */
  wireBodyAria: "Wire the preview body from an earlier card",
  /** Body notice fallback: "<notice> — previewing on the neutral mannequin." */
  bodyNoticeSuffix: (p: { notice: string }): string => p.notice + " — previewing on the neutral mannequin.",
  /** Stage drop veil: what a drop does. */
  dropHint: "Drop a GLB to set the preview body — an image to set the background",
  /** Stage loading veil aria name (the bind pose). */
  loadingMannequin: "Loading mannequin",
  /** Rail hover twin of the mannequin loading face. */
  loadingMannequinBusy: "Loading mannequin…",
  /** Stage loading veil aria name (the motion). */
  loadingMotion: "Loading motion",
  /** Camera pill: step −45° (tip + aria share the face). */
  rotateLeft: "Rotate view left (45°)",
  /** Camera pill: full-body framing (tip + aria share the face). */
  framingFull: "Full body framing",
  /** Camera pill: upper-half framing. */
  framingUpper: "Upper half framing",
  /** Camera pill: step +45° (tip + aria share the face). */
  rotateRight: "Rotate view right (45°)",
  /** Export-frame rectangle aria name. */
  exportRectAria: "Export frame — drag to move, drag a corner to resize",
  /** Export-frame rectangle hint bar. */
  rectHint: "Drag the rectangle over the character · corners resize (aspect-locked) · any size exports the typed pixels · orbit for the angle",
  /** Timeline empty face (no total frames yet). */
  emptyTimeline: "Run the card — the timeline appears with the motion",
  /** Transport pause action (aria + hover twin). */
  pauseSpace: "Pause (Space)",
  /** Transport play action (aria + hover twin). */
  playSpace: "Play (Space)",
  /** Transport empty face (no motion yet). */
  noMotion: "No motion yet — run the card",
  /** Timeline fps chip ("30 fps · 120f"). */
  fpsChip: (p: { fps: string; frames: number }): string => `${p.fps} fps · ${p.frames}f`,
  /** Timeline bar head. */
  timelineTitle: "Timeline · prompt cards",
  /** Timeline action: carve a new prompt card. */
  addPromptCard: "Add prompt card",
  /** Edit-hint lead (renders before the styled Repose word). */
  editHintLead: "Drag joints to refine the pose at this frame (IK moves the chain).",
  /** Edit-hint tail (renders after the styled Repose word). */
  editHintTail: "patches rotations for the edited frame and saves it as the chain start. Hit Run when ready — kimodo conditions on it. Finger/toe tip rotations are approximate (translate edits).",
} as const
