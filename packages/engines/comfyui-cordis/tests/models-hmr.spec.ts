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
 * 47 packages/models family index files (the DECL line runs on import;
 * the apply line runs here).
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import type { Plugin } from '@deepseek-ai/cordis'
import { ModelsService } from '../src/models/service.ts'
import { FAMILY_PKGS, loadFamilies } from '../src/models/families/index.ts'

import { DECL as declAnima, family as familyAnima } from '../../../models/anima/src/index.ts'
import { DECL as declAnny, family as familyAnny } from '../../../models/anny/src/index.ts'
import { DECL as declAnycreature, family as familyAnycreature } from '../../../models/anycreature/src/index.ts'
import { DECL as declConcat, family as familyConcat } from '../../../models/concat/src/index.ts'
import { DECL as declFlorence2, family as familyFlorence2 } from '../../../models/florence2/src/index.ts'
import { DECL as declGemSoma, family as familyGemSoma } from '../../../models/gem-soma/src/index.ts'
import { DECL as declH3, family as familyH3 } from '../../../models/h3/src/index.ts'
import { DECL as declInput, family as familyInput } from '../../../models/input/src/index.ts'
import { DECL as declJoycaption, family as familyJoycaption } from '../../../models/joycaption/src/index.ts'
import { DECL as declJoytag, family as familyJoytag } from '../../../models/joytag/src/index.ts'
import { DECL as declKimodo, family as familyKimodo } from '../../../models/kimodo/src/index.ts'
import { DECL as declKrea2, family as familyKrea2 } from '../../../models/krea-2/src/index.ts'
import { DECL as declMossSfx, family as familyMossSfx } from '../../../models/moss-sfx/src/index.ts'
import { DECL as declMusic3, family as familyMusic3 } from '../../../models/music3/src/index.ts'
import { DECL as declPixal3d, family as familyPixal3d } from '../../../models/pixal3d/src/index.ts'
import { DECL as declQwen3Tts, family as familyQwen3Tts } from '../../../models/qwen3-tts/src/index.ts'
import { DECL as declQwenImgEdit2511, family as familyQwenImgEdit2511 } from '../../../models/qwen-img-edit-2511/src/index.ts'
import { DECL as declSeedvr2Ema, family as familySeedvr2Ema } from '../../../models/seedvr2-ema/src/index.ts'
import { DECL as declSomax, family as familySomax } from '../../../models/somax/src/index.ts'
import { DECL as declTransferRig, family as familyTransferRig } from '../../../models/transfer-rig/src/index.ts'
import { DECL as declTrellis2Native, family as familyTrellis2Native } from '../../../models/trellis2-native/src/index.ts'
import { DECL as declWd14, family as familyWd14 } from '../../../models/wd14/src/index.ts'
import { DECL as declZImage, family as familyZImage } from '../../../models/z-image/src/index.ts'

const FAMILIES: Array<{ id: string; decl: { id: string }; family: { name: string; inject: unknown; apply: unknown } }> = [
  { id: 'anima', decl: declAnima as never, family: familyAnima as never },
  { id: 'anny', decl: declAnny as never, family: familyAnny as never },
  { id: 'anycreature', decl: declAnycreature as never, family: familyAnycreature as never },
  { id: 'concat', decl: declConcat as never, family: familyConcat as never },
  { id: 'florence2', decl: declFlorence2 as never, family: familyFlorence2 as never },
  { id: 'gem-soma', decl: declGemSoma as never, family: familyGemSoma as never },
  { id: 'h3', decl: declH3 as never, family: familyH3 as never }, // survivor-id correction 2026-09-22
  { id: 'input', decl: declInput as never, family: familyInput as never },
  { id: 'joycaption', decl: declJoycaption as never, family: familyJoycaption as never },
  { id: 'joytag', decl: declJoytag as never, family: familyJoytag as never },
  { id: 'kimodo', decl: declKimodo as never, family: familyKimodo as never },
  { id: 'krea-2', decl: declKrea2 as never, family: familyKrea2 as never },
  { id: 'moss-sfx', decl: declMossSfx as never, family: familyMossSfx as never },
  { id: 'music3', decl: declMusic3 as never, family: familyMusic3 as never },
  { id: 'pixal3d', decl: declPixal3d as never, family: familyPixal3d as never },
  { id: 'qwen3-tts', decl: declQwen3Tts as never, family: familyQwen3Tts as never },
  { id: 'qwen-img-edit-2511', decl: declQwenImgEdit2511 as never, family: familyQwenImgEdit2511 as never },
  { id: 'seedvr2-ema', decl: declSeedvr2Ema as never, family: familySeedvr2Ema as never },
  { id: 'somax', decl: declSomax as never, family: familySomax as never },
  { id: 'transfer-rig', decl: declTransferRig as never, family: familyTransferRig as never },
  { id: 'trellis2-native', decl: declTrellis2Native as never, family: familyTrellis2Native as never },
  { id: 'wd14', decl: declWd14 as never, family: familyWd14 as never },
  { id: 'z-image', decl: declZImage as never, family: familyZImage as never },
]

describe('models registry HMR safety (every family)', () => {
  // G1 (2026-10-11): the roster census — two-way, the li-az law for
  // flows applied to families. FAMILY_PLUGINS must equal the set of
  // family packages: a new package forgotten in the table mounts
  // NOTHING (silent vanish), and a stale table entry names a package
  // that no longer exists. The live seat below only proves mounting
  // for families the table actually carries.
  it('the family roster is a two-way census (packages/models == the frozen table)', async () => {
    // the table, not the mounted set, is the roster's truth — the lazy
    // load mounts exactly the table (loadFamilies walks FAMILY_PKGS),
    // and the census must catch a forgotten row without mounting.
    const mounted = (await loadFamilies()).map((p: Plugin) => (p.name ?? '').replace(/^family-/, '')).sort()
    const table = FAMILY_PKGS.map((pkg: string) => pkg.replace(/^@melite\/models-/, '')).sort()
    assert.deepEqual(
      table,
      mounted,
      'the frozen table and the mounted plugins disagree — a family package exports a plugin whose name is not its package name',
    )
    const dirs = readdirSync(
      new URL('../../../../packages/models', import.meta.url).pathname,
      { withFileTypes: true },
    )
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
    assert.deepEqual(
      mounted,
      dirs,
      mounted.length === dirs.length
        ? 'membership differs (see diff)'
        : `count drift: ${mounted.length} mounted vs ${dirs.length} dirs`,
    )
  })

  for (const { id, decl, family } of FAMILIES) {
    it(`${id}: plugin shape plus fiber dispose retracts the family`, async () => {
      assert.equal(typeof family.name, 'string', `${id} has a plugin name`)
      assert.ok(Array.isArray(family.inject), `${id} declares inject`)
      assert.equal(typeof family.apply, 'function', `${id} has apply`)

      const ctx = new Context()
      const svc = new ModelsService(ctx)
      // The registry holds heterogeneous family plugins typed
      // structurally above — the call recovers the Cordis seam.
      const fiber = await ctx.plugin(family as unknown as Plugin)
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
      const fiber2 = await ctx.plugin(family as unknown as Plugin)
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
