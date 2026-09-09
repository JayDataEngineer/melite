// families/index.ts — the family table (59 plugins, generated +
// frozen): every family owns its declaration file; this index is
// the ONLY load order (sorted by genre then id — the table's key
// order is id-sorted at the service, order here is just load
// order). bootModels loads each through ctx.plugin — one fiber per
// family, transactional.
import type { Plugin } from "@deepseek-ai/cordis";

import { family as anny } from "@melite/melite-models-anny";
import { family as anycreature } from "@melite/melite-models-anycreature";
import { family as autoremesher } from "@melite/melite-models-autoremesher";
import { family as fit } from "@melite/melite-models-fit";
import { family as mesh_refine } from "@melite/melite-models-mesh_refine";
import { family as pixal3d } from "@melite/melite-models-pixal3d";
import { family as skin } from "@melite/melite-models-skin";
import { family as skintokens } from "@melite/melite-models-skintokens";
import { family as somax } from "@melite/melite-models-somax";
import { family as step1x_texture } from "@melite/melite-models-step1x_texture";
import { family as transfer_rig } from "@melite/melite-models-transfer_rig";
import { family as trellis2Native } from "@melite/melite-models-trellis2-native";
import { family as trellis_native } from "@melite/melite-models-trellis_native";
import { family as aceStep } from "@melite/melite-models-ace-step";
import { family as moss } from "@melite/melite-models-moss";
import { family as mossSfx } from "@melite/melite-models-moss-sfx";
import { family as music3 } from "@melite/melite-models-music3";
import { family as qwen3Tts } from "@melite/melite-models-qwen3-tts";
import { family as anima } from "@melite/melite-models-anima";
import { family as autoDetect } from "@melite/melite-models-auto-detect";
import { family as basic_resize } from "@melite/melite-models-basic_resize";
import { family as florence2 } from "@melite/melite-models-florence2";
import { family as fluxFillDev } from "@melite/melite-models-flux-fill-dev";
import { family as ideogram } from "@melite/melite-models-ideogram";
import { family as input } from "@melite/melite-models-input";
import { family as joycaption } from "@melite/melite-models-joycaption";
import { family as joytag } from "@melite/melite-models-joytag";
import { family as krea2 } from "@melite/melite-models-krea-2";
import { family as pixel_upscale } from "@melite/melite-models-pixel_upscale";
import { family as qwenImgEdit2511 } from "@melite/melite-models-qwen-img-edit-2511";
import { family as seedvr2_ema } from "@melite/melite-models-seedvr2_ema";
import { family as wd14 } from "@melite/melite-models-wd14";
import { family as zImage } from "@melite/melite-models-z-image";
import { family as kimodo } from "@melite/melite-models-kimodo";
import { family as dwpose } from "@melite/melite-models-dwpose";
import { family as gem_soma } from "@melite/melite-models-gem_soma";
import { family as latentsync } from "@melite/melite-models-latentsync";
import { family as seeThrough } from "@melite/melite-models-see-through";
import { family as stretchyRig } from "@melite/melite-models-stretchy-rig";
import { family as concat } from "@melite/melite-models-concat";
import { family as h3 } from "@melite/melite-models-h3";
import { family as h3Keyframe } from "@melite/melite-models-h3-keyframe";
import { family as h3Timeline } from "@melite/melite-models-h3-timeline";
import { family as ltx23 } from "@melite/melite-models-ltx-2-3";
import { family as ltxDirectorDistilled } from "@melite/melite-models-ltx-director-distilled";
import { family as rtxVsr } from "@melite/melite-models-rtx-vsr";
import { family as scail2Animate } from "@melite/melite-models-scail2-animate";
import { family as wanVace } from "@melite/melite-models-wan-vace";

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
  moss,
  mossSfx,
  music3,
  qwen3Tts,
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
