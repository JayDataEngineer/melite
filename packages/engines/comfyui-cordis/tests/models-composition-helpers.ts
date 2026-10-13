/**
 * models-composition-helpers.ts — the shared truth readers for the
 * Loader-composition walls (models-composition.spec.ts and
 * models-composition-seat.spec.ts): the estate manifest, the family
 * roster parsed THROUGH the host's own patch pointer, and the
 * roster mount. One truth, no spec-file imports (a spec imported
 * from a spec re-registers its tests).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import type { Fiber, Plugin } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'

interface PatchRow { id?: unknown; name?: unknown }

/** The estate package root — where the manifest and its patch live. */
export const ESTATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../web/melite-estate')

/** The estate's manifest, read whole (the roster's specifier
 * closure + the host's patch pointer both live here). */
export function estateManifest(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ESTATE_ROOT, 'package.json'), 'utf8')) as Record<string, unknown>
}

/** The estate bundle's real family roster, read THROUGH THE HOST'S
 * OWN POINTER (manifest dsh.bundle.patch → the yml the Loader
 * applies). A hardcoded path here would keep the wall green while
 * the manifest rotted and the lane silently lost every family row
 * — the pointer IS the contract. */
export function rosterRows(): { id: string; name: string }[] {
  const manifest = estateManifest()
  const dsh = manifest['dsh'] as { bundle?: { patch?: string } } | undefined
  const patchPath = dsh?.bundle?.patch
  assert.ok(typeof patchPath === 'string' && patchPath.endsWith('.yml'),
    'the estate manifest carries dsh.bundle.patch — the host pointer to the composition rows')
  const yml = readFileSync(join(ESTATE_ROOT, patchPath), 'utf8')
  const doc = parse(yml) as Array<{ insert?: PatchRow[] }> | null
  const rows = (doc?.[0]?.insert ?? []).filter(
    (row): row is { id: string; name: string } =>
      typeof row.id === 'string' && typeof row.name === 'string' && row.id.startsWith('family-'),
  )
  return rows
}

/** Mount the roster's families as PENDING fibers (dependency-driven:
 * they wait for the 'models' service — the Loader row order). */
export async function mountRoster(ctx: Context): Promise<Fiber[]> {
  const fibers: Fiber[] = []
  for (const row of rosterRows()) {
    const mod = (await import(row.name)) as { default: Plugin }
    fibers.push(ctx.plugin(mod.default))
  }
  return fibers
}

/** Poll until the predicate holds (the re-census is a microtask +
 * async contracts pass; the wall must not race it). */
export async function waitFor(what: string, predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
