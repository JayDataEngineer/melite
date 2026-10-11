// families/index.ts — the family table (41 plugins, generated +
// frozen): every family owns its declaration file; this index is
// the ONLY load order (sorted by genre then id — the table's key
// order is id-sorted at the service, order here is just load
// order). bootModels loads each through ctx.plugin — one fiber per
// family, transactional.
//
// The table is a STRING TABLE loaded through dynamic import (the
// cordis config-driven plugin pattern): the engine never statically
// imports its plugins — a static edge here would cycle, because
// every family imports the engine's own service/contract types.
// The manifest's @melite/models-* dependency rows are the declared
// closure that makes these specifiers resolvable at runtime; the
// census wall (tests/walls/ts/suites/artifact-plane-law.spec.ts W9)
// pins the table to the manifests so a renamed family cannot rot
// silently.
import type { Plugin } from "@deepseek-ai/cordis";

/** The contract every family module exports: one plugin object. */
interface FamilyModule {
  family: Plugin
}

/** The frozen load order, one row per family package. Exported for
 *  the census test: the roster is judged against packages/models
 *  without mounting a single plugin (loading is loadFamilies). */
export const FAMILY_PKGS: readonly string[] = [
  "@melite/models-anny",
  "@melite/models-anycreature",
  "@melite/models-fit",
  "@melite/models-mesh_refine",
  "@melite/models-pixal3d",
  "@melite/models-skin",
  "@melite/models-skintokens",
  "@melite/models-somax",
  "@melite/models-step1x_texture",
  "@melite/models-transfer_rig",
  "@melite/models-trellis2-native",
  "@melite/models-trellis_native",
  "@melite/models-ace-step",
  "@melite/models-moss",
  "@melite/models-moss-sfx",
  "@melite/models-music3",
  "@melite/models-yue2",
  "@melite/models-qwen3-tts",
  "@melite/models-qwen3-tts-voicedesign",
  "@melite/models-anima",
  "@melite/models-auto-detect",
  "@melite/models-basic_resize",
  "@melite/models-florence2",
  "@melite/models-flux-fill-dev",
  "@melite/models-flux-klein",
  "@melite/models-input",
  "@melite/models-joycaption",
  "@melite/models-joytag",
  "@melite/models-krea-2",
  "@melite/models-mask",
  "@melite/models-pixel_upscale",
  "@melite/models-qwen-img-21",
  "@melite/models-qwen-img-edit-21",
  "@melite/models-qwen-img-edit-2511",
  "@melite/models-seedvr2_ema",
  "@melite/models-wd14",
  "@melite/models-z-image",
  "@melite/models-kimodo",
  "@melite/models-dwpose",
  "@melite/models-gem_soma",
  "@melite/models-latentsync",
  "@melite/models-see-through",
  "@melite/models-stretchy-rig",
  "@melite/models-concat",
  "@melite/models-h3",
  "@melite/models-ltx-2-3",
  "@melite/models-ltx-director-distilled",
  "@melite/models-rtx-vsr",
]

/** Load every family plugin, in table order. */
export async function loadFamilies(): Promise<Plugin[]> {
  const out: Plugin[] = []
  for (const pkg of FAMILY_PKGS) {
    const mod = (await import(pkg)) as FamilyModule
    out.push(mod.family)
  }
  return out
}
