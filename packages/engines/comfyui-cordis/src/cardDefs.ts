// cardDefs.ts — the in-process card-def loader for serving surfaces.
//
// The compose door (flowsCard.ts in the gateway) boots a fresh
// Context + full card auto-load per compose call — correct for
// compose (fresh graph state), wasteful for /v1/tools which only
// needs the registered DEFINITIONS (schema carrier + boarded) to
// project params_schema. This loader does the same auto-load loop
// ONCE and caches: the card set is boot-static (a card lands by
// dropping its file; no runtime mutation), so a module-level cache
// is sound. Law carried from the compose door's loop: the WHOLE
// module namespace rides (cards declare `export const inject =
// ['comfyui']` at module level — passing only { apply } drops the
// inject declaration and the service dies with "cannot get property
// comfyui without inject").
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import type { Plugin } from '@deepseek-ai/cordis'
import { ComfyUIService } from './service.ts'
import type { CardDefinition } from './service.ts'
// COMPOSITION LIST (M2′ stroke 1, 2026-09-09, P48.1): card
// PACKAGES compose explicitly — the receipt is
// references/deepseek-harness packages/shell/tool-bash (a tool is
// its own package; DSH composes packages, never discovers nested
// plugins by glob). Each stroke moves a card out of src/cards into
// packages/<genre>/<card>/ and adds its import here; when all 20
// are packages, the readdir glob below is DELETED and this list is
// the only composition.
import * as melite3dClothingPlacement from '@melite/melite-3d-clothing-placement'
import * as meliteImageImageGen from '@melite/melite-image-image-gen'

let cache: Map<string, CardDefinition> | null = null
let bootedService: ComfyUIService | null = null

/** The booted ComfyUIService (the card set + mods + verbs ride
 *  it). Throws if loadCardDefs has not settled. */
export const theService = (): ComfyUIService => {
  if (bootedService === null) {
    throw new Error('card defs not booted — await loadCardDefs() first')
  }
  return bootedService
}

/** Boot the card set once and return id → CardDefinition.
 * Deterministic across calls in one process. */
export const loadCardDefs = async (): Promise<Map<string, CardDefinition>> => {
  if (cache !== null) return cache
  const ctx = new Context()
  const service = new ComfyUIService(ctx)
  // Card packages (the composition list above) compose FIRST —
  // explicit, ordered, no discovery.
  await ctx.plugin(melite3dClothingPlacement as unknown as Plugin)
  await ctx.plugin(meliteImageImageGen as unknown as Plugin)
  // TRANSITIONAL GLOB (named bridge, P48.1 — death date: the
  // 20-card sweep): the remaining src/cards modules.
  // the cli.ts:59-63 auto-load loop (in-process): every card module
  // under src/cards. One layout — the doc-derived shape (card-folder
  // design record, 2026-09-08): one card one folder,
  // cards/<genre>/<card>/card.ts (+ ui/ + agents/ where owned).
  const cardsDir = join(dirname(new URL(import.meta.url).pathname), 'cards')
  const cardFiles: string[] = []
  for (const genre of readdirSync(cardsDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!genre.isDirectory()) continue
    const genreDir = join(cardsDir, genre.name)
    for (const card of readdirSync(genreDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!card.isDirectory()) continue
      const cardTs = join(genreDir, card.name, 'card.ts')
      if (existsSync(cardTs)) cardFiles.push(cardTs)
    }
  }
  cardFiles.sort()
  for (const f of cardFiles) {
    const mod = (await import(pathToFileURL(f).href)) as unknown as Plugin
    if (typeof (mod as { apply?: unknown }).apply === 'function') {
      await ctx.plugin(mod)
    }
  }
  // THE MOD PACKS (the distinct category taxonomy — the py Mod
  // parents): the pack contracts (loras, controlnet, lanpaint,
  // mask, qvoice) live in the compose kit now (P46 — the web
  // promoted to @comfyui/card-kit; named import, no dir walk);
  // the service validates LOUD at registration. PACKS FIRST — a
  // flavor for an unregistered pack refuses (the category lands
  // before the boardings).
  const packs = (await import('./mods/packs.ts')) as unknown as Plugin
  if (typeof (packs as { apply?: unknown }).apply === 'function') {
    await ctx.plugin(packs)
  }
  // THE FAMILY FLAVORS (the correction stroke 2026-09-08): every
  // module under the FAMILIES' own mods/ dirs (the py
  // models/<family>/mods/*.py layout, cross-package deep-import —
  // the identity-ring seam precedent) registers through
  // ctx.comfyui.registerFlavor/registerVerb — FAMILY-OWNED data:
  // rows, runtime doors, bare boardings, SubActionMod verbs. The
  // py truth: the mod's catalog data lives HERE, in the family's
  // own mods package — never crammed into the family DECL, never
  // centralized in the cards plane. The boot-loud flavor↔DECL.mods
  // interlock runs on the models side (validateBootContracts).
  const familiesRoot = join(
    dirname(new URL(import.meta.url).pathname),
    './models/families',
  )
  const flavorFiles: string[] = []
  for (const genre of readdirSync(familiesRoot, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (!genre.isDirectory()) continue // the barrel is a file
    const genreDir = join(familiesRoot, genre.name)
    for (const id of readdirSync(genreDir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (!id.isDirectory()) continue
      const modsDirOf = join(genreDir, id.name, 'mods')
      let entries: string[] = []
      try {
        entries = readdirSync(modsDirOf).filter((x) => x.endsWith('.ts'))
      } catch {
        continue // no mods dir — the family boards nothing
      }
      for (const f of entries.sort()) flavorFiles.push(join(modsDirOf, f))
    }
  }
  for (const file of flavorFiles.sort()) {
    const mod = (await import(pathToFileURL(file).href)) as unknown as Plugin
    if (typeof (mod as { apply?: unknown }).apply === 'function') {
      await ctx.plugin(mod)
    }
  }
  // THE IDENTITY RUNG (card DSL phase 2): attach the frozen ring
  // (the py identity truth — engine-comfyui models/
  // cardIdentity.generated.ts, byte-equal to the golden) onto every
  // def that has not declared its own inline. ONE spelling from
  // here down: consumers read def.identity.
  const ring = (await import(
    // deep-import past the package exports (frozen data module):
    // the identity ring is engine-comfyui-owned, cross-package
    new URL(
      './models/cardIdentity.generated.ts',
      import.meta.url,
    ).href,
    { with: { type: 'json' } } as never,
  )) as unknown as {
    CARD_IDENTITY: ReadonlyArray<{
      id: string
      label: string
      description: string
      genre: string
      icon?: string
    }>
  }
  const byId = new Map<string, { label: string; description: string; genre: string; icon?: string }>(
    ring.CARD_IDENTITY.map((row) => [row.id, {
      label: row.label, description: row.description, genre: row.genre,
      ...(row.icon !== undefined && row.icon !== '' ? { icon: row.icon } : {}),
    }]),
  )
  bootedService = service
  cache = new Map(service.cardIds().map((id) => {
    const def = service.getCardDef(id)!
    if (def.identity === undefined) {
      const row = byId.get(id)
      if (row !== undefined) {
        (def as { identity?: CardDefinition['identity'] }).identity = row
      }
    }
    return [id, def]
  }))
  return cache
}
