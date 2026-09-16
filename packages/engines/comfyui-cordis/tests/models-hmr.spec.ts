/**
 * models-hmr.spec.ts — EVERY models registry gets an HMR-safety test
 * (DSH testing.md tier 1: "dispose the contributing fiber, assert
 * cleanup").
 *
 * Each model family is a Cordis plugin (name/inject/apply) whose apply
 * rides ctx.effect(() => ctx.models.registerFamily(DECL)). This spec
 * lives with the registry owner (@melite/comfyui-cordis) so bare
 * framework specifiers resolve through this package's node_modules
 * (bare DSH specifiers do not resolve from root tests/). It mounts
 * every family against the REAL ModelsService (prefer the real
 * implementation over a mock — no network, no clock), asserts the DECL
 * lands in registryIds(), disposes the contributing fiber, asserts
 * cleanup, and re-registers.
 *
 * Covering apply() also holds the per-file 100% coverage gate on all
 * 48 packages/models family index files (the DECL line runs on import;
 * the apply line runs here).
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import { ModelsService } from '../src/models/service.ts'

import { DECL as declAceStep, family as familyAceStep } from '../../../models/ace-step/src/index.ts'
import { DECL as declAnima, family as familyAnima } from '../../../models/anima/src/index.ts'
import { DECL as declAnny, family as familyAnny } from '../../../models/anny/src/index.ts'
import { DECL as declAnycreature, family as familyAnycreature } from '../../../models/anycreature/src/index.ts'
import { DECL as declAutoDetect, family as familyAutoDetect } from '../../../models/auto-detect/src/index.ts'
import { DECL as declAutoremesher, family as familyAutoremesher } from '../../../models/autoremesher/src/index.ts'
import { DECL as declBasicResize, family as familyBasicResize } from '../../../models/basic_resize/src/index.ts'
import { DECL as declConcat, family as familyConcat } from '../../../models/concat/src/index.ts'
import { DECL as declDwpose, family as familyDwpose } from '../../../models/dwpose/src/index.ts'
import { DECL as declFlorence2, family as familyFlorence2 } from '../../../models/florence2/src/index.ts'
import { DECL as declFluxFillDev, family as familyFluxFillDev } from '../../../models/flux-fill-dev/src/index.ts'
import { DECL as declGemSoma, family as familyGemSoma } from '../../../models/gem_soma/src/index.ts'
import { DECL as declH3, family as familyH3 } from '../../../models/h3/src/index.ts'
import { DECL as declH3Keyframe, family as familyH3Keyframe } from '../../../models/h3-keyframe/src/index.ts'
import { DECL as declH3Timeline, family as familyH3Timeline } from '../../../models/h3-timeline/src/index.ts'
import { DECL as declIdeogram, family as familyIdeogram } from '../../../models/ideogram/src/index.ts'
import { DECL as declInput, family as familyInput } from '../../../models/input/src/index.ts'
import { DECL as declJoycaption, family as familyJoycaption } from '../../../models/joycaption/src/index.ts'
import { DECL as declJoytag, family as familyJoytag } from '../../../models/joytag/src/index.ts'
import { DECL as declKimodo, family as familyKimodo } from '../../../models/kimodo/src/index.ts'
import { DECL as declKrea2, family as familyKrea2 } from '../../../models/krea-2/src/index.ts'
import { DECL as declLatentsync, family as familyLatentsync } from '../../../models/latentsync/src/index.ts'
import { DECL as declLtx23, family as familyLtx23 } from '../../../models/ltx-2-3/src/index.ts'
import { DECL as declLtxDirectorDistilled, family as familyLtxDirectorDistilled } from '../../../models/ltx-director-distilled/src/index.ts'
import { DECL as declMeshRefine, family as familyMeshRefine } from '../../../models/mesh_refine/src/index.ts'
import { DECL as declMoss, family as familyMoss } from '../../../models/moss/src/index.ts'
import { DECL as declMossSfx, family as familyMossSfx } from '../../../models/moss-sfx/src/index.ts'
import { DECL as declMusic3, family as familyMusic3 } from '../../../models/music3/src/index.ts'
import { DECL as declPixal3d, family as familyPixal3d } from '../../../models/pixal3d/src/index.ts'
import { DECL as declPixelUpscale, family as familyPixelUpscale } from '../../../models/pixel_upscale/src/index.ts'
import { DECL as declQwen3Tts, family as familyQwen3Tts } from '../../../models/qwen3-tts/src/index.ts'
import { DECL as declQwenImgEdit2511, family as familyQwenImgEdit2511 } from '../../../models/qwen-img-edit-2511/src/index.ts'
import { DECL as declRtxVsr, family as familyRtxVsr } from '../../../models/rtx-vsr/src/index.ts'
import { DECL as declScail2Animate, family as familyScail2Animate } from '../../../models/scail2-animate/src/index.ts'
import { DECL as declSeedvr2Ema, family as familySeedvr2Ema } from '../../../models/seedvr2_ema/src/index.ts'
import { DECL as declSeeThrough, family as familySeeThrough } from '../../../models/see-through/src/index.ts'
import { DECL as declSkintokens, family as familySkintokens } from '../../../models/skintokens/src/index.ts'
import { DECL as declSomax, family as familySomax } from '../../../models/somax/src/index.ts'
import { DECL as declStep1xTexture, family as familyStep1xTexture } from '../../../models/step1x_texture/src/index.ts'
import { DECL as declStretchyRig, family as familyStretchyRig } from '../../../models/stretchy-rig/src/index.ts'
import { DECL as declTransferRig, family as familyTransferRig } from '../../../models/transfer_rig/src/index.ts'
import { DECL as declTrellis2Native, family as familyTrellis2Native } from '../../../models/trellis2-native/src/index.ts'
import { DECL as declTrellisNative, family as familyTrellisNative } from '../../../models/trellis_native/src/index.ts'
import { DECL as declWanVace, family as familyWanVace } from '../../../models/wan-vace/src/index.ts'
import { DECL as declWd14, family as familyWd14 } from '../../../models/wd14/src/index.ts'
import { DECL as declZImage, family as familyZImage } from '../../../models/z-image/src/index.ts'

const FAMILIES: Array<{ id: string; decl: { id: string }; family: { name: string; inject: unknown; apply: unknown } }> = [
  { id: 'ace-step', decl: declAceStep as never, family: familyAceStep as never },
  { id: 'anima', decl: declAnima as never, family: familyAnima as never },
  { id: 'anny', decl: declAnny as never, family: familyAnny as never },
  { id: 'anycreature', decl: declAnycreature as never, family: familyAnycreature as never },
  { id: 'auto-detect', decl: declAutoDetect as never, family: familyAutoDetect as never },
  { id: 'autoremesher', decl: declAutoremesher as never, family: familyAutoremesher as never },
  { id: 'basic_resize', decl: declBasicResize as never, family: familyBasicResize as never },
  { id: 'concat', decl: declConcat as never, family: familyConcat as never },
  { id: 'dwpose', decl: declDwpose as never, family: familyDwpose as never },
  { id: 'florence2', decl: declFlorence2 as never, family: familyFlorence2 as never },
  { id: 'flux-fill-dev', decl: declFluxFillDev as never, family: familyFluxFillDev as never },
  { id: 'gem_soma', decl: declGemSoma as never, family: familyGemSoma as never },
  { id: 'h3', decl: declH3 as never, family: familyH3 as never },
  { id: 'h3-keyframe', decl: declH3Keyframe as never, family: familyH3Keyframe as never },
  { id: 'h3-timeline', decl: declH3Timeline as never, family: familyH3Timeline as never },
  { id: 'ideogram', decl: declIdeogram as never, family: familyIdeogram as never },
  { id: 'input', decl: declInput as never, family: familyInput as never },
  { id: 'joycaption', decl: declJoycaption as never, family: familyJoycaption as never },
  { id: 'joytag', decl: declJoytag as never, family: familyJoytag as never },
  { id: 'kimodo', decl: declKimodo as never, family: familyKimodo as never },
  { id: 'krea-2', decl: declKrea2 as never, family: familyKrea2 as never },
  { id: 'latentsync', decl: declLatentsync as never, family: familyLatentsync as never },
  { id: 'ltx-2-3', decl: declLtx23 as never, family: familyLtx23 as never },
  { id: 'ltx-director-distilled', decl: declLtxDirectorDistilled as never, family: familyLtxDirectorDistilled as never },
  { id: 'mesh_refine', decl: declMeshRefine as never, family: familyMeshRefine as never },
  { id: 'moss', decl: declMoss as never, family: familyMoss as never },
  { id: 'moss-sfx', decl: declMossSfx as never, family: familyMossSfx as never },
  { id: 'music3', decl: declMusic3 as never, family: familyMusic3 as never },
  { id: 'pixal3d', decl: declPixal3d as never, family: familyPixal3d as never },
  { id: 'pixel_upscale', decl: declPixelUpscale as never, family: familyPixelUpscale as never },
  { id: 'qwen3-tts', decl: declQwen3Tts as never, family: familyQwen3Tts as never },
  { id: 'qwen-img-edit-2511', decl: declQwenImgEdit2511 as never, family: familyQwenImgEdit2511 as never },
  { id: 'rtx-vsr', decl: declRtxVsr as never, family: familyRtxVsr as never },
  { id: 'scail2-animate', decl: declScail2Animate as never, family: familyScail2Animate as never },
  { id: 'seedvr2_ema', decl: declSeedvr2Ema as never, family: familySeedvr2Ema as never },
  { id: 'see-through', decl: declSeeThrough as never, family: familySeeThrough as never },
  { id: 'skintokens', decl: declSkintokens as never, family: familySkintokens as never },
  { id: 'somax', decl: declSomax as never, family: familySomax as never },
  { id: 'step1x_texture', decl: declStep1xTexture as never, family: familyStep1xTexture as never },
  { id: 'stretchy-rig', decl: declStretchyRig as never, family: familyStretchyRig as never },
  { id: 'transfer_rig', decl: declTransferRig as never, family: familyTransferRig as never },
  { id: 'trellis2-native', decl: declTrellis2Native as never, family: familyTrellis2Native as never },
  { id: 'trellis_native', decl: declTrellisNative as never, family: familyTrellisNative as never },
  { id: 'wan-vace', decl: declWanVace as never, family: familyWanVace as never },
  { id: 'wd14', decl: declWd14 as never, family: familyWd14 as never },
  { id: 'z-image', decl: declZImage as never, family: familyZImage as never },
]

describe('models registry HMR safety (every family)', () => {
  for (const { id, decl, family } of FAMILIES) {
    it(`${id}: plugin shape plus fiber dispose retracts the family`, async () => {
      assert.equal(typeof family.name, 'string', `${id} has a plugin name`)
      assert.ok(Array.isArray(family.inject), `${id} declares inject`)
      assert.equal(typeof family.apply, 'function', `${id} has apply`)

      const ctx = new Context()
      const svc = new ModelsService(ctx)
      const fiber = await ctx.plugin(family as never)
      try {
        assert.ok(
          svc.registryIds().includes(decl.id),
          `${id} registered while live (decl.id ${decl.id})`,
        )
      } finally {
        await fiber.dispose()
      }
      assert.ok(
        !svc.registryIds().includes(decl.id),
        `${id} fiber dispose must retract its family`,
      )
      const fiber2 = await ctx.plugin(family as never)
      try {
        assert.ok(svc.registryIds().includes(decl.id), `${id} re-registers after dispose`)
      } finally {
        await fiber2.dispose()
      }
      // No ctx.dispose: the Context holds no acquired resource beyond
      // the two fibers (ports, paths, children are not used here).
      // Each fiber is disposed above; the Context itself is GC-owned.
    })
  }

  it('guard: no family carries a default export', async () => {
    for (const { id, family } of FAMILIES) {
      assert.equal(
        'default' in (family as Record<string, unknown>),
        false,
        `${id} carries no default export (named name/inject/apply only)`,
      )
    }
  })
})
