// families/index.ts — the family table (59 plugins, generated +
// frozen): every family owns its declaration file; this index is
// the ONLY load order (sorted by genre then id — the table's key
// order is id-sorted at the service, order here is just load
// order). bootModels loads each through ctx.plugin — one fiber per
// family, transactional.
import type { Plugin } from "@deepseek-ai/cordis";

import { family as anny } from "@melite/models-anny";
import { family as anycreature } from "@melite/models-anycreature";
import { family as autoremesher } from "@melite/models-autoremesher";
import { family as mesh_refine } from "@melite/models-mesh_refine";
import { family as pixal3d } from "@melite/models-pixal3d";
import { family as skintokens } from "@melite/models-skintokens";
import { family as somax } from "@melite/models-somax";
import { family as step1x_texture } from "@melite/models-step1x_texture";
import { family as transfer_rig } from "@melite/models-transfer_rig";
import { family as trellis2Native } from "@melite/models-trellis2-native";
import { family as trellis_native } from "@melite/models-trellis_native";
import { family as aceStep } from "@melite/models-ace-step";
import { family as moss } from "@melite/models-moss";
import { family as mossSfx } from "@melite/models-moss-sfx";
import { family as music3 } from "@melite/models-music3";
import { family as yue2 } from "@melite/models-yue2";
import { family as qwen3Tts } from "@melite/models-qwen3-tts";
import { family as qwen3TtsVoiceDesign } from "@melite/models-qwen3-tts-voicedesign";
import { family as anima } from "@melite/models-anima";
import { family as autoDetect } from "@melite/models-auto-detect";
import { family as basic_resize } from "@melite/models-basic_resize";
import { family as florence2 } from "@melite/models-florence2";
import { family as fluxFillDev } from "@melite/models-flux-fill-dev";
import { family as input } from "@melite/models-input";
import { family as joycaption } from "@melite/models-joycaption";
import { family as joytag } from "@melite/models-joytag";
import { family as krea2 } from "@melite/models-krea-2";
import { family as pixel_upscale } from "@melite/models-pixel_upscale";
import { family as qwenImg21 } from "@melite/models-qwen-img-21";
import { family as qwenImgEdit21 } from "@melite/models-qwen-img-edit-21";
import { family as qwenImgEdit2511 } from "@melite/models-qwen-img-edit-2511";
import { family as seedvr2_ema } from "@melite/models-seedvr2_ema";
import { family as wd14 } from "@melite/models-wd14";
import { family as zImage } from "@melite/models-z-image";
import { family as kimodo } from "@melite/models-kimodo";
import { family as dwpose } from "@melite/models-dwpose";
import { family as gem_soma } from "@melite/models-gem_soma";
import { family as latentsync } from "@melite/models-latentsync";
import { family as seeThrough } from "@melite/models-see-through";
import { family as stretchyRig } from "@melite/models-stretchy-rig";
import { family as concat } from "@melite/models-concat";
import { family as h3Timeline } from "@melite/models-h3-timeline";
import { family as ltx23 } from "@melite/models-ltx-2-3";
import { family as ltxDirectorDistilled } from "@melite/models-ltx-director-distilled";
import { family as rtxVsr } from "@melite/models-rtx-vsr";
import { family as scail2Animate } from "@melite/models-scail2-animate";
import { family as wanVace } from "@melite/models-wan-vace";

export const FAMILY_PLUGINS: Plugin[] = [
  anny,
  anycreature,
  autoremesher,
  mesh_refine,
  pixal3d,
  skintokens,
  somax,
  step1x_texture,
  transfer_rig,
  trellis2Native,
  trellis_native,
  aceStep,
  moss,
  mossSfx,
  music3,
  yue2,
  qwen3Tts,
  qwen3TtsVoiceDesign,
  anima,
  autoDetect,
  basic_resize,
  florence2,
  fluxFillDev,
  input,
  joycaption,
  joytag,
  krea2,
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
  h3Timeline,
  qwenImg21,
  qwenImgEdit21,
  ltx23,
  ltxDirectorDistilled,
  rtxVsr,
  scail2Animate,
  wanVace,
];
