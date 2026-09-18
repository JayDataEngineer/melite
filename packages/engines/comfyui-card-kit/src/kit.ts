// Tier 2.5 — the emit kit (docs/design/one-contract-compose.md §2,
// "absorb comfy-script into the card kit"; operator order 2026-09-07:
// "MOST OF THIS [REDACTED 2026-11-05] JUST RIDES DEFAULTS AND A FEW COMFYUI NODES
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
// requires/schema (import
// stroke 2026-09-08: one contract, TS owns the knob vocabulary on
// Schemastery direct); decls are pinned by the cli admission gate,
// so decls NEVER move here) + admission
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
export { mintSeed } from './graph-helpers.ts'
export {
  IMAGE_GEN_STRIP,
  finalizeImageGen,
  imageT2I,
  IMAGE_EDIT_STRIP,
  finalizeImageEdit,
  refuseImageEditFiring,
  imageEdit,
} from './lanes-image.ts'
export {
  VIDEO_NEGATIVE_FALLBACK,
  VACE_LIGHTNING_LORA,
  VIDEO_REQUIRED_PATHS,
  wanVace,
  scail2,
  H3_T4_STRIP,
  finalizeH3,
} from './lanes-video.ts'
export { musicT1, ttsT1, sfxT1, voicelockT1 } from './lanes-audio.ts'
export {
  ANNY_STRIP,
  finalizeAnny,
  annyLane,
  MOTION_STRIP,
  finalizeMotion,
  motionLane,
  quadRemeshLane,
  trellisArm,
  pixalArm,
  transferRigArm,
  admitMeshLift,
} from './lanes-3d.ts'
export {
  maskT1,
  upscaleLane,
  inputPrepLane,
  TAGGER_STRIP,
  finalizeTagger,
  TAGGER_CAPTION_TASKS,
  TAGGER_CAPTION_TYPES,
  TAGGER_CAPTION_LENGTHS,
  TAGGER_EXTRA_OPTIONS,
  TAGGER_ARMS,
  taggerLane,
} from './lanes-image-tools.ts'
// lanes.spec.ts names the StripTable type off the kit face (the lanes'
// strip tables are StripTable-typed) — re-exported as a type, erased at runtime.
export type { StripTable } from './graph.ts'
