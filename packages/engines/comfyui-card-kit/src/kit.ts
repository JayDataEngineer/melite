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
export { loadTextPair, decodeSave, stackLoras, stackControlNets } from './blocks/render-kit.ts'
export { isItemWrapped, unwrapItemArrays, coerceWireArrays, coerceWireNumbers, wireTypeLedger } from './coerceWireArrays.ts'
export { mintSeed, voiceLockSeed } from './graph-helpers.ts'
export { declaredAction, instantiateAction, type ComfyActionSpec, type ComfyActionContext } from './action.ts'
export {
  IMPACT_DETECTOR_IDS,
  IMPACT_DETECTORS,
  IMPACT_DETECTOR_PROVISIONS,
  IMPACT_PACKS,
  impactArmNames,
  impactDetector,
  type ImpactDetectorFacts,
  type ImpactDetectorId,
  type ImpactProvision,
} from './impact.ts'
export {
  IMAGE_EDIT_STRIP,
  finalizeImageEdit,
  refuseImageEditFiring,
  editRefs,
  orderedInputImages,
  editImageCap,
  regionSegs,
  detailerSave,
  isSpell,
  laneSampler,
  laneScheduler,
} from './lanes-image.ts'
export type { TensorRef } from './lanes-image.ts'
export type { ActionBinding } from './facts.ts'
export { qvoiceUse, type QVoiceUse } from './lanes-audio.ts'
export {
  ANNY_STRIP,
  finalizeAnny,
  MOTION_STRIP,
  finalizeMotion,
  MESH_RESOLUTIONS,
  MESH_BG_MODES,
  MESH_PIXAL_FOVS,
  MESH_BAKE_SIZES,
  MESH_ATLAS_SIZES,
  MESH_AO_SIZES,
  MESH_NORMAL_SIZES,
} from './lanes-3d.ts'
export {
  TAGGER_STRIP,
  finalizeTagger,
  finalizeMask,
  TAGGER_CAPTION_TASKS,
  TAGGER_CAPTION_TYPES,
  TAGGER_CAPTION_LENGTHS,
  TAGGER_EXTRA_OPTIONS,
  taggerSaveText,
  parseWeightlessFacts,
  assertTagInput,
  type WeightlessFacts,
  type WeightlessParams,
} from './lanes-image-tools.ts'
// the audio render blocks (the atom-vocabulary stroke 3: family
// actions port the audiocore segments on the SAME calibrated pins
// and loaders — one owner, the lanes stay as byte-oracles).
export {
  AUDIACORE_TTS_AUTOFILL,
  AUDIACORE_STUDIO_AUTOFILL,
  loadAudiocore,
  saveAudio,
  laneStr,
} from './blocks/audio-kit.ts'
// the 3D render blocks (the poser turnaround consensus: one place per
// multi-node shape, so the anny/fit/skin families compose the sheet
// instead of hand-rolling the node chain).
export {
  renderGLBViews,
  renderGLBViewsNode,
  positive,
} from './blocks/poser-kit.ts'
// lanes.spec.ts names the StripTable type off the kit face (the lanes'
// strip tables are StripTable-typed) — re-exported as a type, erased at runtime.
export type { StripTable } from './graph.ts'
