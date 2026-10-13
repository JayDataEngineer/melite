/**
 * models-composition.spec.ts — THE LOADER-COMPOSITION WALL (ROADMAP
 * "Models-boot Loader composition", 2026-10-13): model families
 * boot as DSH plugin ROWS — the estate bundle's cordis.patch.yml
 * roster, one row per @melite/models-* package — and the census
 * gate (src/models/census.ts) owns the transactional law the
 * retired plugin loop held: settle every family fiber, count them
 * against the registered table, cross-validate the boot contracts,
 * and ARM the process seat so Context-less readers serve the
 * composed table (never a private boot beside it).
 *
 * DEPTH: the roster is PARSED from the real cordis.patch.yml (no
 * hand-maintained list), the family plugins load by the rows' own
 * bare specifiers (the resolution the Loader performs — engine
 * node_modules carries the closure, W9 pins the manifest), and the
 * boot rides the real registry: families mount FIRST as PENDING
 * fibers (dependency-driven — they wait for the 'models' service),
 * the provider registers the service, the gate censuses.
 *
 * Pinned shapes:
 *   1. ROSTER — the patch rows ≡ the engine's FAMILY_PKGS table
 *      (two spellings, one wall); every row default-exports its
 *      plugin (unwrapExports law).
 *   2. CENSUS — awaiting the gate settles the composition, arms
 *      the seat (modelsService() IS the composed service), and the
 *      table holds every roster family.
 *   3. LIVE REMOVE/ADD — disposing a family fiber re-censuses
 *      (internal/status): the model leaves the composed table;
 *      re-mounting the row brings it back. The config-HMR law.
 *   4. REGISTERED-NOTHING REFUSES — a family fiber that applied
 *      without registering refuses the gate (the transactional
 *      gate, composition face).
 *   5. BROKEN LIVE-ADD STANDS — a family failing AFTER boot logs
 *      loud and the last-good arm stands (the table never drains).
 *   6. NO GATE, NO ARM — without the census gate the composition
 *      never arms the seat (the toggle-out proof).
 *   7. THE ROSTER RESOLVES FROM THE ESTATE — the yml is read through
 *      the manifest's dsh.bundle.patch pointer (the host's own door,
 *      never a hardcoded path), and every row specifier is declared
 *      in the estate's dependencies (a row the lane cannot resolve
 *      refuses here, not at the operator's restart).
 *   8. STARTUP REFUSAL SETTLES LOUD — a family failing at startup
 *      fails the gate AND rejects whenModelsArmed (failModelsSeat):
 *      the estate never hangs on a broken boot.
 *   9. ONE TABLE — after the arm, modelsService() and bootModels()
 *      serve the composed seat (composed-first): a live-added probe
 *      family is visible through every door; a private boot beside
 *      the seat is the old state, and it reds here. SEATED IN ITS
 *      OWN FILE (models-composition-seat.spec.ts, sharing this
 *      file's helpers through models-composition-helpers.ts): the
 *      arm constructs a stale private boot to make the law
 *      observable, and that boot lives in the module-global process
 *      seat — keeping it in this file would poison every later
 *      arm's modelsBooted() (order-luck; a fresh file owns its
 *      cell).
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { Context, type Fiber, type Plugin } from '@deepseek-ai/cordis'
import {
  modelsBooted,
  modelsProvider,
  modelsService,
  ModelsService,
  whenModelsArmed,
} from '../src/models/service.ts'
import { modelsCensusGate } from '../src/models/census.ts'
import { FAMILY_PKGS } from '../src/models/families/index.ts'
import { estateManifest, mountRoster, rosterRows, waitFor } from './models-composition-helpers.ts'


/** A family-shaped probe that applies without registering — the
 * registered-nothing refusal arm. */
const EMPTY_PROBE: Plugin = {
  name: 'family-registered-nothing',
  inject: ['models'],
  apply(): void {},
}

/** A family-shaped probe whose apply throws — the broken live-add
 * arm (a FAILED fiber after a healthy boot), and the startup
 * refusal arm (a FAILED fiber the census must rethrow). */
const THROWING_PROBE: Plugin = {
  name: 'family-throws-after-boot',
  inject: ['models'],
  apply(): void {
    throw new Error('probe: broken family')
  },
}


describe('the models boot is a Loader composition (families as rows, the census gate armed)', () => {
  it('the patch roster and the engine table are one truth, and every row default-exports its plugin', { timeout: 30000 }, async () => {
    const rows = rosterRows()
    assert.ok(rows.length > 0, 'the estate patch carries family rows')
    // two spellings, one wall: rows ≡ FAMILY_PKGS
    const rowNames = rows.map((row) => row.name).sort()
    const table = [...FAMILY_PKGS].sort()
    assert.deepEqual(
      rowNames.map((name) => name),
      table,
      'the patch roster and the engine FAMILY_PKGS table diverged',
    )
    // the unwrapExports law: a row's module must default-export the
    // plugin (the Loader takes exports.default ?? exports) — EVERY
    // row, not a sample: the Loader mounts all of them, so the wall
    // judges all of them
    for (const row of rows) {
      const mod = (await import(row.name)) as { default?: Plugin }
      assert.equal(typeof mod.default?.apply, 'function', `${row.name} default-exports no plugin`)
      assert.ok(mod.default?.name?.startsWith('family-'), `${row.name} plugin name mismatch`)
      assert.ok(mod.default?.inject?.includes('models'),
        `${row.name} lost inject:['models'] — the Loader would mount it before the seat exists`)
    }
  })

  it('the estate manifest declares the roster closure (a row the estate cannot resolve never boots)', () => {
    // The estate package is the composition's consumer — the Loader
    // resolves every row specifier FROM ITS TREE. A row dropped from
    // the manifest deps resolves nowhere and the lane boot dies at
    // module-not-found (loud, but only on the operator's lane); this
    // arm fires the same refusal in the battery, before any restart.
    // Mirrors W9's engine-manifest closure on the estate side (one
    // edge, one home each).
    const deps = (estateManifest()['dependencies'] ?? {}) as Record<string, string>
    const missing = rosterRows()
      .map((row) => row.name)
      .filter((name) => deps[name] === undefined)
    assert.deepEqual(missing, [],
      'patch rows with no estate dependency declaration (unresolvable at lane boot)')
  })

  it('awaiting the gate settles the composition, arms the seat, and the table holds every roster family', { timeout: 30000 }, async () => {
    const ctx = new Context()
    const familyFibers = await mountRoster(ctx).catch((err: unknown) => {
      throw err
    })
    const providerFiber = ctx.plugin(modelsProvider)
    const gateFiber = ctx.plugin(modelsCensusGate)
    // the settle contract — awaiting the gate's fiber can resolve
    // before cordis starts its apply (deferred inject activation);
    // whenModelsArmed is the composition's own door
    await whenModelsArmed().catch((err: unknown) => {
      throw err
    })
    try {
      const rows = rosterRows()
      const svc: ModelsService = ctx.models
      const bootedNow = modelsBooted()
      assert.ok(bootedNow, 'the composition armed the boot cell')
      // the composed seat IS the door readers serve — ctx.models
      // hands out a traceable wrapper per read, so the invariant is
      // the SERVED TABLE (same registry content through the
      // Context-less door), never wrapper identity
      const seatNow = modelsService()
      assert.deepEqual(
        [...seatNow.registryIds()].sort(),
        [...svc.registryIds()].sort(),
        'the composed seat serves the same registry as the ctx door',
      )
      assert.equal(seatNow.familyCount(), svc.familyCount(), 'the composed seat census count')
      assert.equal(svc.familyCount(), rows.length, 'the census count')
      // every roster family registered
      for (const fiber of familyFibers) {
        assert.notEqual(fiber.state, 3 /* FAILED */)
      }
      // every roster family registered a DISTINCT atom — the DECL
      // id is the family's own truth (mask registers mask-select,
      // the h3 pattern: family id ≠ card id), so name↔id equality
      // is no law; a duplicate id would shadow one row with another
      const ids = new Set(svc.registryIds())
      assert.equal(ids.size, rosterRows().length, 'every roster row registered a distinct family id')
    } finally {
      await gateFiber.dispose().catch((err: unknown) => {
        throw err
      })
      await Promise.allSettled(familyFibers.map((f) => f.dispose()))
      await providerFiber.dispose().catch((err: unknown) => {
        throw err
      })
    }
  })

  it('disposing a family fiber re-censuses live; re-mounting the row restores it', { timeout: 30000 }, async () => {
    const ctx = new Context()
    const familyFibers = await mountRoster(ctx)
    const providerFiber = ctx.plugin(modelsProvider)
    const gateFiber = ctx.plugin(modelsCensusGate)
    await whenModelsArmed()
    const rows = rosterRows()
    const svc: ModelsService = ctx.models
    try {
      assert.equal(svc.familyCount(), rows.length)
      // LIVE REMOVE — config-HMR unmount
      const gone = familyFibers[0]
      const goneId = rows[0].id.slice('family-'.length)
      await gone.dispose()
      await waitFor('familyCount to drop after the fiber dispose', () =>
        svc.familyCount() === rows.length - 1)
      // the seat stands (the composed table, minus the row) —
      // content identity: the Context-less door keeps serving the
      // same registry the ctx door serves (traceable wrappers per
      // read make object identity the wrong invariant)
      assert.equal(modelsService().familyCount(), svc.familyCount(), 'the seat stands after the live remove')
      // LIVE RE-ADD — the config-HMR mount of the same row
      const mod = (await import(rows[0].name)) as { default: Plugin }
      await ctx.plugin(mod.default)
      await waitFor('familyCount to return after the row re-mount', () =>
        svc.familyCount() === rows.length)
      assert.ok(svc.registryIds().includes(goneId), 'the re-added family registered again')
    } finally {
      await gateFiber.dispose()
      await Promise.allSettled(familyFibers.map((f) => f.dispose()))
      await providerFiber.dispose()
    }
  })

  it('a family that applies without registering refuses the gate (the transactional gate, composition face)', { timeout: 30000 }, async () => {
    const ctx = new Context()
    const providerFiber = ctx.plugin(modelsProvider)
    const probeFiber = ctx.plugin(EMPTY_PROBE)
    await probeFiber
    const gateFiber = ctx.plugin(modelsCensusGate)
    try {
      await assert.rejects(() => gateFiber.await(), /families but \d+ family fibers mounted/)
    } finally {
      await Promise.allSettled([probeFiber.dispose(), providerFiber.dispose()])
    }
  })

  it('a family failing after boot keeps the last-good arm (the table never drains)', { timeout: 30000 }, async () => {
    const ctx = new Context()
    const familyFibers = await mountRoster(ctx)
    const providerFiber = ctx.plugin(modelsProvider)
    const gateFiber = ctx.plugin(modelsCensusGate)
    await whenModelsArmed()
    const rows = rosterRows()
    const svc: ModelsService = ctx.models
    try {
      assert.equal(svc.familyCount(), rows.length)
      // the broken live-add: the fiber FAILS, the re-census logs and
      // stands — the healthy table never drains to a partial arm
      await assert.rejects(() => ctx.plugin(THROWING_PROBE).await(), /probe: broken family/)
      assert.ok(modelsBooted(), 'the arm stands after the broken live-add')
      assert.equal(svc.familyCount(), rows.length, 'the table never drained')
    } finally {
      await gateFiber.dispose()
      await Promise.allSettled(familyFibers.map((f) => f.dispose()))
      await providerFiber.dispose()
    }
  })

  it('without the census gate the composition never arms the seat (toggle-out proof)', { timeout: 30000 }, async () => {
    const ctx = new Context()
    const familyFibers = await mountRoster(ctx)
    const providerFiber = ctx.plugin(modelsProvider)
    await providerFiber
    try {
      // no gate mounted: families settle, the table serves its ctx,
      // but the process seat stays unarmed — Context-less readers
      // would fall back to a private boot (the cosmetic trap)
      await Promise.all(familyFibers.map((f) => f.await()))
      assert.ok(!modelsBooted(), 'the seat armed without the census gate')
    } finally {
      await Promise.allSettled(familyFibers.map((f) => f.dispose()))
      await providerFiber.dispose()
    }
  })

  it('a family failing at startup refuses the gate AND the settle — the estate never hangs', { timeout: 30000 }, async () => {
    const ctx = new Context()
    const providerFiber = ctx.plugin(modelsProvider)
    const brokenFiber = ctx.plugin(THROWING_PROBE)
    const gateFiber = ctx.plugin(modelsCensusGate)
    try {
      // registered in the gate-mount statement's tail (the settle's
      // ordering law: cordis defers the gate's apply, so the waiter
      // always beats the census verdict). The INVARIANT is the
      // verdict itself — whichever census refusal speaks (a broken
      // family's rethrow, a count mismatch, a card contract) the
      // settle REJECTS, never hangs
      await assert.rejects(
        () => whenModelsArmed(),
        /broken family|family fibers mounted|no such model registered/,
        'whenModelsArmed must REJECT on a refused census — an estate awaiting it would hang',
      )
      assert.ok(!modelsBooted(), 'a refused composition never arms the seat')
      await assert.rejects(() => gateFiber.await(), /broken family|family fibers mounted|no such model registered/)
    } finally {
      await Promise.allSettled([brokenFiber.dispose(), gateFiber.dispose(), providerFiber.dispose()])
    }
  })

})
