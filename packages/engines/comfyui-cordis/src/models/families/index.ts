// families/index.ts — the family table (59 plugins, generated +
// frozen): every family owns its declaration file; this index is
// the ONLY load order (sorted by genre then id — the table's key
// order is id-sorted at the service, order here is just load
// order). bootModels loads each through ctx.plugin — one fiber per
// family, transactional.
import type { Plugin } from "@deepseek-ai/cordis";

import { family as anny } from "./3d/anny/index.ts";
import { family as anycreature } from "./3d/anycreature/index.ts";
import { family as autoremesher } from "./3d/autoremesher/index.ts";
import { family as fit } from "./3d/fit/index.ts";
import { family as mesh_refine } from "./3d/mesh_refine/index.ts";
import { family as pixal3d } from "./3d/pixal3d/index.ts";
import { family as skin } from "./3d/skin/index.ts";
import { family as skintokens } from "./3d/skintokens/index.ts";
import { family as somax } from "./3d/somax/index.ts";
import { family as step1x_texture } from "./3d/step1x_texture/index.ts";
import { family as transfer_rig } from "./3d/transfer_rig/index.ts";
import { family as trellis2Native } from "./3d/trellis2-native/index.ts";
import { family as trellis_native } from "./3d/trellis_native/index.ts";
import { family as aceStep } from "./audio/ace-step/index.ts";
import { family as moss } from "./audio/moss/index.ts";
import { family as mossSfx } from "./audio/moss-sfx/index.ts";
import { family as music3 } from "./audio/music3/index.ts";
import { family as qwen3Tts } from "./audio/qwen3-tts/index.ts";
import { family as anima } from "@melite/melite-models-anima";
import { family as autoDetect } from "./image/auto-detect/index.ts";
import { family as basic_resize } from "./image/basic_resize/index.ts";
import { family as florence2 } from "./image/florence2/index.ts";
import { family as fluxFillDev } from "./image/flux-fill-dev/index.ts";
import { family as ideogram } from "./image/ideogram/index.ts";
import { family as input } from "./image/input/index.ts";
import { family as joycaption } from "./image/joycaption/index.ts";
import { family as joytag } from "./image/joytag/index.ts";
import { family as krea2 } from "@melite/melite-models-krea-2";
import { family as pixel_upscale } from "./image/pixel_upscale/index.ts";
import { family as qwenImgEdit2511 } from "./image/qwen-img-edit-2511/index.ts";
import { family as seedvr2_ema } from "./image/seedvr2_ema/index.ts";
import { family as wd14 } from "./image/wd14/index.ts";
import { family as zImage } from "@melite/melite-models-z-image";
import { family as kimodo } from "./motion/kimodo/index.ts";
import { family as dwpose } from "./other/dwpose/index.ts";
import { family as gem_soma } from "./other/gem_soma/index.ts";
import { family as latentsync } from "./other/latentsync/index.ts";
import { family as seeThrough } from "./other/see-through/index.ts";
import { family as stretchyRig } from "./other/stretchy-rig/index.ts";
import { family as concat } from "./video/concat/index.ts";
import { family as h3 } from "./video/h3/index.ts";
import { family as h3Keyframe } from "./video/h3-keyframe/index.ts";
import { family as h3Timeline } from "./video/h3-timeline/index.ts";
import { family as ltx23 } from "./video/ltx-2-3/index.ts";
import { family as ltxDirectorDistilled } from "./video/ltx-director-distilled/index.ts";
import { family as rtxVsr } from "./video/rtx-vsr/index.ts";
import { family as scail2Animate } from "./video/scail2-animate/index.ts";
import { family as wanVace } from "./video/wan-vace/index.ts";

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
