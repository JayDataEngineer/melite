/**
 * models-composition-seat.spec.ts — THE ONE-TABLE WALL (the
 * composition wall's ninth arm, seated in its own file 2026-10-27):
 * once a Loader composition arms the seat, EVERY door serves that
 * table — `modelsService()` and `bootModels()` are composed-first,
 * never a private boot beside it. The old state's exact shape was
 * a second, Loader-invisible table; this wall reds on it.
 *
 * WHY ITS OWN FILE: the arm constructs a STALE PRIVATE BOOT
 * (`bootModels()` before any composition — the lanes face) to make
 * composed-first observable, and the boot cell is the module-global
 * process seat: the stale `cell.booted` would outlive the arm for
 * every later arm in the file (order-luck for any future arm that
 * asserts `!modelsBooted()`). A dedicated file gets a fresh module
 * registry, so this wall owns its cell outright.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import {
  bootModels,
  modelsProvider,
  modelsService,
  ModelsService,
  whenModelsArmed,
} from '../src/models/service.ts'
import { modelsCensusGate } from '../src/models/census.ts'

import { mountRoster, rosterRows, waitFor } from './models-composition-helpers.ts'

/** A valid family DECL the probe registers live — shape mirrors
 * families-transaction's GOOD_DECL (label/group rows always
 * written). The axis the row rides is declared (plane canon L2,
 * 2026-11-02) — an undeclared group refuses at registration. */
const PROBE_DECL = {
  id: 'probe-composed-first',
  label: 'Probe',
  engine: 'comfyui',
  form: 'form_generate',
  genre: 'misc',
  variants: [{ id: 'base', label: 'Base', group: 'Variant', route: '', cells: [] }],
  variant_groups: [{ id: 'Variant', label: 'Variant' }],
}

describe('the armed seat is the only table (composed-first, no private boot beside it)', () => {
  it('modelsService() and bootModels() serve the composed seat over a stale private boot', { timeout: 30000 }, async () => {
    // THE STALE PRIVATE BOOT: a reader that called bootModels()
    // BEFORE any composition armed the seat (the lanes face, a
    // pre-estate SDK call). The composition that arms afterwards is
    // the newer truth — composed-first means the stale table loses
    // every door, the seat never plays second fiddle to it. In a
    // composition-only boot this law is UNOBSERVABLE (both cells
    // hold the same service), so the arm constructs the
    // distinguishing state on purpose.
    await bootModels()
    const ctx = new Context()
    const rows = rosterRows()
    const familyFibers = await mountRoster(ctx)
    const providerFiber = ctx.plugin(modelsProvider)
    const gateFiber = ctx.plugin(modelsCensusGate)
    let probeFiber: Fiber | null = null
    try {
      await whenModelsArmed()
      // LIVE ADD a registering family (the config-HMR row-add face)
      probeFiber = await ctx.plugin({
        name: 'family-probe-composed-first',
        inject: ['models'],
        apply(inner) {
          inner.effect(() => inner.models.registerFamily(PROBE_DECL))
        },
      })
      const ctxSvc = ctx.models as ModelsService
      await waitFor('the probe family to register', () => ctxSvc.registryIds().includes(PROBE_DECL.id))
      // the Context-less door serves the COMPOSED table: the probe is
      // visible with no ctx in hand — a private boot beside the seat
      // would serve a second table without it (the old state's shape)
      assert.ok(
        modelsService().registryIds().includes(PROBE_DECL.id),
        'modelsService() served a private boot beside the composed seat',
      )
      // bootModels is composed-first: the same table, probe included,
      // never a re-boot of the roster
      const booted = await bootModels()
      assert.ok(
        booted.registryIds().includes(PROBE_DECL.id),
        'bootModels() re-booted a private table instead of serving the armed seat',
      )
      assert.deepEqual(
        [...booted.registryIds()].sort(),
        [...ctxSvc.registryIds()].sort(),
        'bootModels() and the ctx door serve one table',
      )
      assert.equal(booted.familyCount(), rows.length + 1, 'one table, roster + probe')
    } finally {
      // full teardown whatever the verdict — a leaked gate keeps the
      // seat armed into anything that follows this file's process
      await Promise.allSettled([
        ...(probeFiber ? [probeFiber.dispose()] : []),
        gateFiber.dispose(),
        ...familyFibers.map((f) => f.dispose()),
        providerFiber.dispose(),
      ])
    }
  })
})
