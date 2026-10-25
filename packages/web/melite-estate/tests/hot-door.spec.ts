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
import { loadCardDefs, refreshCardDefs, theService } from '@melite/comfyui-cordis'
import { apply as applyRealMod } from '../hot/examples/real-mod.plugin.ts'
import { apply as applyRealCard } from '../hot/examples/real-card.plugin.ts'
import { apply as applyG2Door } from '../hot/g2-maker-door.plugin.ts'
import * as realModModule from '../hot/examples/real-mod.plugin.ts'
import * as realCardModule from '../hot/examples/real-card.plugin.ts'
import * as g2DoorModule from '../hot/g2-maker-door.plugin.ts'

vi.setConfig({ testTimeout: 240000 })

/** Mount one drop-in the way the loader does: a fresh fiber, apply
 *  synchronous. */
async function mount(apply: (ctx: Context) => void): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin({ name: 'wall-dropin', apply })
  return ctx
}

describe('THE HOT DOOR (#39): the real drop-ins under hot/examples/', () => {
  it('the drop-ins keep the loader export contract: named apply, never a default (testing.md L40 — a default replacing the named export rots the patch reload silently)', () => {
    // The patch reload mounts these files BY PATH and requires the
    // named `apply`; this spec's own `import { apply }` would also
    // catch a rename, but ONLY this namespace round-trip catches the
    // silent-rot shape: a default export ADDED beside apply (or
    // replacing it) keeps every named-import wall green while the
    // loader serves nothing.
    for (const mod of [realCardModule, realModModule, g2DoorModule]) {
      expect('default' in mod).toBe(false)
      expect(typeof mod.apply).toBe('function')
      expect(Object.keys(mod).sort()).toEqual(['apply'])
    }
  })

  it('real-mod.plugin.ts serves its row BESIDE the family table (the flavor merge) and reverts with the fiber', async () => {
    const defs = await loadCardDefs()
    // boot proof: the REAL table (not a vacuous pass — the hot door
    // rides the same singleton the estate serves from)
    expect(defs.size).toBeGreaterThan(10)
    const svc = theService()
    expect(svc.cardIds().length).toBeGreaterThan(10)
    const before = svc.modRows('loras', 'h3')
    expect(before.some((r) => r.id === 'h3_silu_temb_grid')).toBe(false)
    expect(before.some((r) => r.id === 'h3_pk_parasyte')).toBe(true)

    const ctx = await mount(applyRealMod)
    // THE MERGE: the drop-in's row rides WITH the family's own rows
    const served = svc.modRows('loras', 'h3')
    expect(served.some((r) => r.id === 'h3_silu_temb_grid')).toBe(true)
    expect(served.some((r) => r.id === 'h3_pk_parasyte')).toBe(true)
    // family rows keep their place (registration order, family first)
    expect(served.indexOf(before[0]!)).toBe(0)

    await ctx.fiber.dispose()
    const after = svc.modRows('loras', 'h3')
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
    expect(JSON.stringify(def.boarded)).toContain('moss')
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

describe('THE G2 ARM: the maker-profile row is live (2026-10-11)', () => {
  it('g2-maker-door.plugin.ts boards the moss ID STRING on a card id no package claims, serves, and un-serves with the fiber', async () => {
    await loadCardDefs()
    const svc = theService()
    // the boarding law, verified LIVE (not trusted from this file's
    // comment): moss is claimed by no packaged card — the served
    // table's every other def that boards moss would own its form
    const defsBefore = await loadCardDefs()
    for (const [id, def] of defsBefore) {
      // EXACT membership (a JSON substring would false-positive on
      // 'moss-sfx' — the sfx card boards THAT family, not moss)
      const boarded = (def as unknown as { boarded?: string[] }).boarded ?? []
      if (boarded.includes('moss')) throw new Error('a packaged card (' + id + ') already claims moss — the G2 drop-in would hijack its form')
    }
    expect(defsBefore.has('hot-g2-door')).toBe(false)

    const ctx = await mount(applyG2Door)
    expect(svc.cardIds().includes('hot-g2-door')).toBe(true)
    const defs = await loadCardDefs()
    const def = defs.get('hot-g2-door') as unknown as Record<string, unknown>
    expect(def).not.toBe(undefined)
    // THE ID-STRING SPELLING (the G2 charge): the boarded family is
    // the string 'moss' — never an imported DECL
    expect(JSON.stringify(def.boarded)).toBe('["moss"]')
    expect((def.identity as { label: string }).label).toBe('Hot G2 Door')

    await ctx.fiber.dispose()
    expect(svc.cardIds().includes('hot-g2-door')).toBe(false)
    expect((await loadCardDefs()).has('hot-g2-door')).toBe(false)
  })

  it('a SECOND drop-in boarding the same family REFUSES family-taken — the krea-2-hijack cure holds across hot cards too', async () => {
    // The runtime law is stricter than "distinct card ids": ONE
    // family, ONE card, even between two hot drop-ins. The G2 card
    // holds moss; the retired example (hot-sketch) boards the same
    // family and the register refuses it LOUD — the same
    // service.ts family gate that cured the krea-2 outage.
    await loadCardDefs()
    const first = await mount(applyG2Door)
    try {
      await expect(mount(applyRealCard)).rejects.toThrow(/family-taken|moss.*already boarded/)
    } finally {
      await first.fiber.dispose()
    }
    expect(theService().cardIds().includes('hot-g2-door')).toBe(false)
    expect(theService().cardIds().includes('hot-sketch')).toBe(false)
  })
})

describe('THE HEAT-CLASS BOUNDARY (HMR audit 009 F6, 2026-11-12): registration is hot, code rides the re-import', () => {
  // A drop-in's EDITED SOURCE needs a fiber replacement (the loader's
  // re-import) before the served face changes — the hot/README's "not
  // a replacement for a stable card package" was comment-law until
  // this arm. The executed truth: mount v1, serve, REPLACE the module
  // (dispose + mount the edited closure — the re-import analog), and
  // the served table follows the NEW module exactly — never the stale
  // v1 snapshot. A boot snapshot that outlived its fiber would serve
  // v1's face here and red.
  const heatCard = (label: string, marker: string) => (ctx: Context): void => {
    ctx.effect(() => {
      const off = theService().registerCard({
        id: 'hot-heat-wall',
        skeleton: 'generate',
        boarded: ['moss'],
        tags: ['image', 'generate', 'hot'],
        identity: { label, description: 'the heat-class wall card', genre: 'image', icon: 'spark' },
        sidebar: { key: 'image', order: 5 },
        flowKinds: { inputs: {}, outputs: { default: 'image' }, requiresModel: true },
        schema: ((v: unknown) => v) as unknown as (v: unknown) => Record<string, unknown>,
        compose() {
          throw new Error('heat-wall ' + marker)
        },
      })
      refreshCardDefs()
      return () => { off(); refreshCardDefs() }
    })
  }

  it('a re-mounted drop-in with changed bytes serves ITS face — the served table follows the re-import, never the stale snapshot', async () => {
    await loadCardDefs()
    const v1 = await mount(heatCard('Heat Wall v1', 'v1-marker'))
    let defs = await loadCardDefs()
    let def = defs.get('hot-heat-wall') as unknown as Record<string, unknown>
    expect(def).not.toBe(undefined)
    expect((def.identity as { label: string }).label).toBe('Heat Wall v1')
    expect(() => (def.compose as (p: Record<string, unknown>, ...rest: never[]) => void)({} as Record<string, unknown>, ...[] as never[])).toThrow(/v1-marker/)

    // the re-import: dispose the fiber, mount the EDITED module
    await v1.fiber.dispose()
    expect(theService().cardIds().includes('hot-heat-wall')).toBe(false)
    const v2 = await mount(heatCard('Heat Wall v2', 'v2-marker'))
    defs = await loadCardDefs()
    def = defs.get('hot-heat-wall') as unknown as Record<string, unknown>
    // the served face is v2's — label AND compose bytes; a stale
    // boot snapshot (the F6 burn class) would still carry v1
    expect((def.identity as { label: string }).label).toBe('Heat Wall v2')
    expect(() => (def.compose as (p: Record<string, unknown>, ...rest: never[]) => void)({} as Record<string, unknown>, ...[] as never[])).toThrow(/v2-marker/)

    await v2.fiber.dispose()
    expect((await loadCardDefs()).has('hot-heat-wall')).toBe(false)
  })
})
