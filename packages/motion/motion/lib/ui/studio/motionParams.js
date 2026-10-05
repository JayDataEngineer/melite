/** Shared motion-studio param keys + stage constants.
 *
 *  Moved verbatim from `component.tsx` (the MotionCardEditor godfile split):
 *  the three module-level constants the studio + its seam hooks/panels share.
 *  `component.tsx` re-exports them so the original path keeps its surface.
 */
/** stage.params key for the Motion Card background image (option b). A user
 *  image rendered behind the mannequin in place of the dark stage (STAGE_BACKGROUND_DARK).
 *  UI-only — never sent to ComfyUI (registered in compile.ts's
 *  _KNOWN_NON_SIG_PARAMS so it's stripped before the run). Holds either a
 *  data: URL (file picker) or an asset URL (e.g. a scene-flow output). */
export const MOTION_BG_IMAGE_PARAM = "motion_bg_image";
/** stage.params key for the Motion Card preview BODY (2026-08-15 character
 *  import): a SOMAX-rigged character GLB the motion previews ON — the
 *  studio's live viewport skins it client-side (lib/glbSkin.ts → the same
 *  LBS as the neutral mannequin), and the runner's post-run preview bake
 *  bakes each output NPZ onto it instead of the mannequin (the explicit-
 *  import carve-out of the 2026-07-31 mannequin-default policy).
 *
 *  A REAL wire-level param, NOT UI-only: kimodo_motion's family signature
 *  declares it (the card lane's input kind → glb, form_motion_kimodo
 *  input slot), so the agent can set it headlessly. In the studio it renders as
 *  an INPUT SUBCARD (a InputSquare — the same square the image inputs use,
 *  per the user directive): file pick / asset drop / OS drop / WIRE to an
 *  upstream 3D card's GLB output (wired XOR attached — the SlotGrid
 *  contract). Holds a data: URL (upload) or an asset URL. */
export const MOTION_PREVIEW_GLB_PARAM = "preview_glb";
export const FLOOR_LIFT_Y = 0.02;
//# sourceMappingURL=motionParams.js.map
