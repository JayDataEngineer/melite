// Tier 2.5 — the emit kit (operator order 2026-09-07:
// "MOST OF THIS LANE JUST RIDES DEFAULTS AND A FEW COMFYUI NODES
// SLAPPED TOGETHER").
//
// The admission contract landed (card-decls carries knobs+admits+
// skeleton; the compose rim enforces) — what remains in each card is
// a loader chain → one or two card-specific nodes → save, with pin
// defaults (AUTOFILL) doing most of the work. This module owns every
// such graph recipe as data + small functions over the existing
// GraphBuilder + atoms blocks:
//
//   loaders by model-facts rows (lane_inputs.unet/vae/text_encoder/
//   clip_type/model_path/...) → encode/sample/decode slabs → save tail,
//   per-card param wiring from the contract.
//
// A card file is then: contract-derived decl (id/skeleton/boarded/
// requires/schema (Schemastery direct); decls are pinned by the cli admission gate,
// so decls NEVER move here) + admission
// stroke 2026-09-08: one contract, TS owns the knob vocabulary on
// guards (the card's loud voice) + one recipe call. h3-timeline and
// img-to-mesh keep their bespoke multi-family bodies in-card and ride
// the kit for arms/strips/shared chains.
//
// RECIPE LAW: every recipe below mirrors its card
// (creation order IS node-id order; input key insertion order IS the
// serialized order) — touch a recipe and the compose wall goes red.
// The package face re-exports the render-kit quartet (the reference's
// subtree-top-index mechanism: consumers name the package, never a
// path inside it — P46).
export { loadTextPair, decodeSave, stackLoras, stackControlNets, scaleDeliverable } from "./blocks/render-kit.js";
export { isItemWrapped, unwrapItemArrays, coerceWireArrays, coerceWireNumbers, wireTypeLedger } from "./coerceWireArrays.js";
export { collapsePromptSpace } from "./craft.js";
export { mintSeed, voiceLockSeed } from "./graph-helpers.js";
export { declaredAction, instantiateAction } from "./action.js";
export { IMPACT_DETECTOR_IDS, IMPACT_DETECTORS, IMPACT_DETECTOR_PROVISIONS, IMPACT_PACKS, impactArmNames, impactDetector, } from "./impact.js";
export { IMAGE_EDIT_STRIP, finalizeImageEdit, refuseImageEditFiring, refuseDeliverableSize, editRefs, orderedInputImages, editImageCap, regionSegs, statedRegion, regionSourceKind, detailerSave, genDetailerSave, deliverableSizeOf, isSpell, laneSampler, laneScheduler, } from "./lanes-image.js";
export { qvoiceUse } from "./lanes-audio.js";
export { ANNY_STRIP, finalizeAnny, MOTION_STRIP, finalizeMotion, MESH_RESOLUTIONS, MESH_BG_MODES, MESH_PIXAL_FOVS, MESH_BAKE_SIZES, MESH_ATLAS_SIZES, MESH_AO_SIZES, MESH_NORMAL_SIZES, admitMeshLiftShared, } from "./lanes-3d.js";
export { TAGGER_STRIP, finalizeTagger, finalizeMask, TAGGER_CAPTION_TASKS, TAGGER_CAPTION_TYPES, TAGGER_CAPTION_LENGTHS, TAGGER_EXTRA_OPTIONS, taggerSaveText, parseWeightlessFacts, assertTagInput, } from "./lanes-image-tools.js";
// the audio render blocks (the atom-vocabulary stroke 3: family
// actions port the audiocore segments on the SAME calibrated pins
// and loaders — one owner, the lanes stay as byte-oracles).
export { AUDIACORE_TTS_AUTOFILL, AUDIACORE_STUDIO_AUTOFILL, loadAudiocore, saveAudio, laneStr, } from "./blocks/audio-kit.js";
// the 3D render blocks (the poser turnaround consensus: one place per
// multi-node shape, so the anny/fit/skin families compose the sheet
// instead of hand-rolling the node chain).
export { renderGLBViews, renderGLBViewsNode, positive, } from "./blocks/poser-kit.js";
//# sourceMappingURL=kit.js.map