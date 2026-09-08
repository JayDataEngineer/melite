// families/index.ts — the family table (59 plugins, generated +
// frozen): every family owns its declaration file; this index is
// the ONLY load order (sorted by genre then id — the table's key
// order is id-sorted at the service, order here is just load
// order). bootModels loads each through ctx.plugin — one fiber per
// family, transactional.
import type { Plugin } from "@deepseek-ai/cordis";

import { family as anny } from "./3d/anny.ts";
import { family as anycreature } from "./3d/anycreature.ts";
import { family as autoremesher } from "./3d/autoremesher.ts";
import { family as fit } from "./3d/fit.ts";
import { family as mesh_refine } from "./3d/mesh_refine.ts";
import { family as pixal3d } from "./3d/pixal3d.ts";
import { family as skin } from "./3d/skin.ts";
import { family as skintokens } from "./3d/skintokens.ts";
import { family as somax } from "./3d/somax.ts";
import { family as step1x_texture } from "./3d/step1x_texture.ts";
import { family as transfer_rig } from "./3d/transfer_rig.ts";
import { family as trellis2Native } from "./3d/trellis2-native.ts";
import { family as trellis_native } from "./3d/trellis_native.ts";
import { family as aceStep } from "./audio/ace-step.ts";
import { family as aceStepBase } from "./audio/ace-step-base.ts";
import { family as aceStepBaseBf16 } from "./audio/ace-step-base-bf16.ts";
import { family as aceStepBf16 } from "./audio/ace-step-bf16.ts";
import { family as aceStepSft } from "./audio/ace-step-sft.ts";
import { family as aceStepXl } from "./audio/ace-step-xl.ts";
import { family as mossSfx } from "./audio/moss-sfx.ts";
import { family as mossTts } from "./audio/moss-tts.ts";
import { family as mossTtsLocal } from "./audio/moss-tts-local.ts";
import { family as moss_voicegenerator } from "./audio/moss_voicegenerator.ts";
import { family as music3 } from "./audio/music3.ts";
import { family as qwen3Tts } from "./audio/qwen3-tts.ts";
import { family as qwen3TtsBase } from "./audio/qwen3-tts-base.ts";
import { family as qwen3TtsVoicedesign } from "./audio/qwen3-tts-voicedesign.ts";
import { family as txt2music } from "./audio/txt2music.ts";
import { family as anima } from "./image/anima.ts";
import { family as autoDetect } from "./image/auto-detect.ts";
import { family as basic_resize } from "./image/basic_resize.ts";
import { family as florence2 } from "./image/florence2.ts";
import { family as fluxFillDev } from "./image/flux-fill-dev.ts";
import { family as ideogram } from "./image/ideogram.ts";
import { family as input } from "./image/input.ts";
import { family as joycaption } from "./image/joycaption.ts";
import { family as joytag } from "./image/joytag.ts";
import { family as krea2 } from "./image/krea-2.ts";
import { family as maskStudio } from "./image/mask-studio.ts";
import { family as pixel_upscale } from "./image/pixel_upscale.ts";
import { family as qwenImgEdit2511 } from "./image/qwen-img-edit-2511.ts";
import { family as seedvr2_ema } from "./image/seedvr2_ema.ts";
import { family as wd14 } from "./image/wd14.ts";
import { family as zImage } from "./image/z-image.ts";
import { family as kimodo } from "./motion/kimodo.ts";
import { family as dwpose } from "./other/dwpose.ts";
import { family as gem_soma } from "./other/gem_soma.ts";
import { family as latentsync } from "./other/latentsync.ts";
import { family as seeThrough } from "./other/see-through.ts";
import { family as stretchyRig } from "./other/stretchy-rig.ts";
import { family as concat } from "./video/concat.ts";
import { family as h3 } from "./video/h3.ts";
import { family as h3Keyframe } from "./video/h3-keyframe.ts";
import { family as h3Timeline } from "./video/h3-timeline.ts";
import { family as ltx23 } from "./video/ltx-2-3.ts";
import { family as ltxDirectorDistilled } from "./video/ltx-director-distilled.ts";
import { family as rtxVsr } from "./video/rtx-vsr.ts";
import { family as scail2Animate } from "./video/scail2-animate.ts";
import { family as wanVace } from "./video/wan-vace.ts";

export const FAMILY_PLUGINS: Plugin[] = [
  anny,
  anycreature,
  autoremesher,
  fit,
  mesh_refine,
  pixal3d,
  skin,
  skintokens,
  somax,
  step1x_texture,
  transfer_rig,
  trellis2Native,
  trellis_native,
  aceStep,
  aceStepBase,
  aceStepBaseBf16,
  aceStepBf16,
  aceStepSft,
  aceStepXl,
  mossSfx,
  mossTts,
  mossTtsLocal,
  moss_voicegenerator,
  music3,
  qwen3Tts,
  qwen3TtsBase,
  qwen3TtsVoicedesign,
  txt2music,
  anima,
  autoDetect,
  basic_resize,
  florence2,
  fluxFillDev,
  ideogram,
  input,
  joycaption,
  joytag,
  krea2,
  maskStudio,
  pixel_upscale,
  qwenImgEdit2511,
  seedvr2_ema,
  wd14,
  zImage,
  kimodo,
  dwpose,
  gem_soma,
  latentsync,
  seeThrough,
  stretchyRig,
  concat,
  h3,
  h3Keyframe,
  h3Timeline,
  ltx23,
  ltxDirectorDistilled,
  rtxVsr,
  scail2Animate,
  wanVace,
];
