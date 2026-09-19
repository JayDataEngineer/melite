// hot-door.spec — THE HOT DOOR (#39): the two real drop-ins under
// hot/examples/ load, register on the card-plane singleton, serve,
// and revert — the exact shapes the dsh-native patch reload mounts
// on the RUNNING lane. The watcher itself is dsh's own machinery
// (profile patchReload "live" → hmr.registerConfig → the loader's
// entry.update); this wall pins OUR side of the contract: the
// drop-in files cannot rot, the flavor merge serves their rows
// beside the family's own, and the refreshCardDefs re-projection
// makes their card serve and un-serve with the fiber.
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { loadCardDefs, theService } from '@melite/comfyui-cordis'
import { apply as applyRealMod } from '../hot/examples/real-mod.plugin.ts'
import { apply as applyRealCard } from '../hot/examples/real-card.plugin.ts'

vi.setConfig({ testTimeout: 240000 })

/** Mount one drop-in the way the loader does: a fresh fiber, apply
 *  synchronous. */
async function mount(apply: (ctx: Context) => void): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin({ name: 'wall-dropin', apply })
  return ctx
}

describe('THE HOT DOOR (#39): the real drop-ins under hot/examples/', () => {
  it('real-mod.plugin.ts serves its row BESIDE the family table (the flavor merge) and reverts with the fiber', async () => {
    const defs = await loadCardDefs()
    // boot proof: the REAL table (not a vacuous pass — the hot door
    // rides the same singleton the estate serves from)
    expect(defs.size).toBeGreaterThan(10)
    const svc = theService()
    expect(svc.cardIds().length).toBeGreaterThan(10)
    const before = svc.modRows('loras', 'h3-timeline')
    expect(before.some((r) => r.id === 'h3_silu_temb_grid')).toBe(false)
    expect(before.some((r) => r.id === 'h3_pk_parasyte')).toBe(true)

    const ctx = await mount(applyRealMod)
    // THE MERGE: the drop-in's row rides WITH the family's own rows
    const served = svc.modRows('loras', 'h3-timeline')
    expect(served.some((r) => r.id === 'h3_silu_temb_grid')).toBe(true)
    expect(served.some((r) => r.id === 'h3_pk_parasyte')).toBe(true)
    // family rows keep their place (registration order, family first)
    expect(served.indexOf(before[0]!)).toBe(0)

    await ctx.fiber.dispose()
    const after = svc.modRows('loras', 'h3-timeline')
    expect(after.some((r) => r.id === 'h3_silu_temb_grid')).toBe(false)
    expect(after.some((r) => r.id === 'h3_pk_parasyte')).toBe(true)
  })

  it('real-card.plugin.ts registers the hot-sketch card and its own refreshCardDefs call makes the served table carry it — until the fiber disposes', async () => {
    await loadCardDefs()
    const svc = theService()
    expect((await loadCardDefs()).has('hot-sketch')).toBe(false)

    const ctx = await mount(applyRealCard)
    expect(svc.cardIds().includes('hot-sketch')).toBe(true)
    // the drop-in itself calls refreshCardDefs() — the served table
    // carries the card with the full definition face
    const defs = await loadCardDefs()
    const def = defs.get('hot-sketch') as unknown as Record<string, unknown>
    expect(def).not.toBe(undefined)
    expect((def.identity as { label: string }).label).toBe('Hot Sketch')
    expect(JSON.stringify(def.boarded)).toContain('krea-2')
    // the compose gate is LOUD (the schema wall's own law)
    expect(() => (def.compose as (p: Record<string, unknown>, ...rest: never[]) => void)({ seed: 1 }, ...[] as never[]))
      .toThrow(/prompt/)

    await ctx.fiber.dispose()
    expect(svc.cardIds().includes('hot-sketch')).toBe(false)
    // the disposer's refresh un-serves
    expect((await loadCardDefs()).has('hot-sketch')).toBe(false)
  })

  it('a second hot-sketch registration REFUSES LOUD (duplicate ids never half-serve)', async () => {
    await loadCardDefs()
    const first = await mount(applyRealCard)
    try {
      await expect(mount(applyRealCard)).rejects.toThrow(/hot-sketch/)
    } finally {
      await first.fiber.dispose()
    }
    expect(theService().cardIds().includes('hot-sketch')).toBe(false)
  })
})
