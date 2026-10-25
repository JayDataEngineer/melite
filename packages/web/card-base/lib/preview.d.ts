/**
 * preview.tsx — THE SHARED PREVIEW COMPONENTS (the preview seam's
 * built-in claims, hour-9 2026-09-13 — the operator's law: "Where
 * the VIDEO PREVIEW and the IMAGE PREVIEW of other cards go in a
 * SLOT with SHARED DSH PRIMITIVES"). One preview per media kind,
 * DSH-pure: native media elements on card-base chrome, DSW tokens
 * BARE (no fallbacks — the hour-8 name law), zero bespoke islands.
 *
 * These are the DEFAULTS the pattern prescribes (the ui-tool law:
 * "central default views"); a card claims its kind's preview only
 * to specialize — the h3 studio rides the shared VIDEO preview for
 * its hero, exactly as an image-gen card rides the IMAGE one.
 */
import { createElement as h } from 'react';
import type { PreviewOwnerProps } from '@melite/contracts';
export { resetPickCellsForTests } from './pick-store.ts';
/** THE HISTORY HERO (stroke 40 + the output-component stroke): one
 * hook, three faces — the hero artifact, the REST of whatever set
 * the hero belongs to (the current run's other outputs, or a picked
 * history entry's other outputs — a multi-output card shows its
 * full set either way, never the current row under an old hero),
 * and THE STALENESS FACT (an explicitly picked entry is NOT the
 * current generation — the badge law; the between-runs fallback
 * hero gets NO badge: with no current run, the newest archive is
 * the closest thing to current, not a stale one). */
/** The view-identity cell id (stage + run, else urls) — ONE law,
 * exported so a preview's specialized pick cells (the video face's
 * current-set pick) derive from the SAME identity, never re-derive. */
export declare function previewCellIdOf(props: PreviewOwnerProps): string;
/** THE VIDEO PREVIEW — one hero film, one native player (the kit's
 *  FilmPlayer law: native <video controls>; no library, no kit). The
 *  hero is THE FILM (the composed artifact — a film run's artifacts
 *  arrive windows-first, the film last, so the named film wins the
 *  seat; any other video card keeps the first). The set's other
 *  clips render as PLAYABLE THUMBS in the strip (the operator's
 *  catch b, 2026-09-22: "the preview only shows one of the three
 *  clips" — a text link is not a preview): click a thumb to promote
 *  it into the hero, click it again to return (the toggle law);
 *  the name still opens the file raw in a new tab. The set is the
 *  CURRENT run's (or the picked history entry's — never mixed).
 *  Honest empty state while no artifact has landed. */
export declare function VideoStagePreview(props: PreviewOwnerProps): ReturnType<typeof h>;
/** THE IMAGE PREVIEW — the latest render hero (native <img>), the
 *  active set's thumbs beneath (the CURRENT run's gallery, or the
 *  picked history entry's full set — a multi-output card never shows
 *  the current row under an old hero), then THE OUTPUT HISTORY
 *  (stroke 40): the stage's previous unique outputs, newest first —
 *  click one to view it in the hero. Same chrome, same law. */
export declare function ImageStagePreview(props: PreviewOwnerProps): ReturnType<typeof h>;
/** THE AUDIO PREVIEW — one hero track, one native player (the same
 *  law as the video preview: native <audio controls>; no library).
 *  The active set's named clips follow in the strip row. */
export declare function AudioStagePreview(props: PreviewOwnerProps): ReturnType<typeof h>;
export declare function TextStagePreview(props: PreviewOwnerProps): ReturnType<typeof h>;
/** THE MESH PREVIEW — the seam's adapter onto the raw-three
 *  multi-asset stage (GlbStagePreview, the substrate law: NO
 *  @react-three in any client bundle). The ACTIVE set becomes
 *  stage assets (the current run's, or a picked history entry's —
 *  mesh gains the full history law every other kind already had);
 *  the empty hint honors the live-run flag. THE LIVE FIGURE
 *  (stroke 90): a card-declared preview.figure replaces the empty
 *  tombstone with the native figure (the /poser bind mesh) — the
 *  studio-viewport capability on the form card; run outputs still
 *  take the stage the moment they exist. THE ATTACHED MESH (the
 *  (j) law, 2026-11-08): the preview shows the body THE RUN WOULD
 *  BAKE — a held mesh-kind input (anny's body_glb) renders as-is
 *  through the input asset door and wins over the parametric
 *  figure (a native figure under an attached GLB would preview a
 *  body the run never bakes — compose renders the GLB as-is). The
 *  2026-09-06 order's edge holds: NEVER the low-poly anny-base-body
 *  EXPORT substituting the native figure — a USER-ATTACHED GLB is
 *  the compose-truth arm, a different artifact. THE ATTACHED IMAGE
 *  (THE INPUT PIN LAW, operator 2026-10-20, E2-1 — supersedes the
 *  (l) photo-face law by operator order, burn verbatim: "IT IS
 *  SUPPOSED TO USE THE HUMAN HMR TO CONVERT THE PHOTO TO ANNY. IT
 *  JUST PASTES THE IMAGE OVER THE ANNY PREVIEW"): the stated photo
 *  is the estimator's INPUT, never the preview's face — the 3D seat
 *  keeps the card's own body (artifacts > attached GLB > native
 *  figure > empty tombstone) and the photo pins BESIDE the stage as
 *  the ReferenceImageBadge (the 2026-09-06 source-pin pattern: the
 *  image you lifted from never leaves the view); the converted body
 *  arrives solely through the run-artifacts arm. Run outputs still
 *  take the stage the moment they exist — the pin survives them. */
export declare function MeshStagePreview(props: PreviewOwnerProps): ReturnType<typeof h>;
/** THE MESH PREVIEW — the raw-three multi-asset stage (the substrate
 *  law: NO @react-three in any client bundle). Reached through the
 *  `/client` door like every other seam in this row. */
export { GlbStagePreview, attachedMeshOf, attachedImageOf, autoFitToHeight, applyWireframe, applyWeightsHeat, skeletonHelperFor, heatColor, slotLabelOf, turntableTick, TURNTABLE_SPEED, type StageAsset, type StageLayers } from './glb-stage.tsx';
export { ReportView } from './report-view.tsx';
export { PoserFigureStage, figureGeometry, figureCoeffsOf, figureLocalChangesOf, figureCameraOf, figureShapeSig, type PoserMeshDoc } from './poser-figure.tsx';
export { ViewportFrame, ViewportAnchor, ReferenceImageBadge } from './viewportChrome.tsx';
export type { ViewportFrameProps, ViewportAnchorProps, ReferenceImageBadgeProps, ViewportAnchorDock } from './viewportChrome.tsx';
//# sourceMappingURL=preview.d.ts.map