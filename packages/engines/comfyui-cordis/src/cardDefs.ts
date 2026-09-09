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
// COMPOSITION LIST (M2′ stroke 1, 2026-09-09, P48.1 — completed by
// the card sweep, 2026-09-09): card PACKAGES compose explicitly —
// the receipt is references/deepseek-harness packages/shell/tool-bash
// (a tool is its own package; DSH composes packages, never discovers
// nested plugins by glob). Every card lives in its own package
// (packages/melite-<domain>/<id>); the readdir glob is DELETED and
// the table in loadCardDefs is the only composition.

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
  // THE CARD PACKAGES (the card sweep, 2026-09-09 — the glob's named
  // death date arrived): every card lives in its own package
  // (packages/melite-<domain>/<id> — one card one package: card.ts +
  // ui/ + agents/ in one unit), composed HERE by explicit import.
  // This table is the ONLY card load order; a card lands by adding
  // its package + one row. The engine src/cards tree is empty of
  // host cards (only tenants remain: the fetch-registrar manifests,
  // retired with their rows).
  const cardPackages: string[] = [
    '@melite/melite-3d-anny',
    '@melite/melite-3d-fit',
    '@melite/melite-3d-img-to-mesh',
    '@melite/melite-3d-quad-remesh',
    '@melite/melite-3d-skin',
    '@melite/melite-audio-sfx',
    '@melite/melite-image-ideogram4',
    '@melite/melite-image-input-prep',
    '@melite/melite-image-mask-studio',
    '@melite/melite-image-tagger',
    '@melite/melite-image-upscale-tools',
    '@melite/melite-video-video-gen',
    '@melite/melite-audio-music',
    '@melite/melite-audio-tts',
    '@melite/melite-audio-voice-lock',
    '@melite/melite-image-image-edit',
    '@melite/melite-motion-motion',
    '@melite/melite-video-h3-timeline',
    '@melite/melite-3d-clothing-placement',
    '@melite/melite-image-image-gen',
  ]
  for (const specifier of cardPackages) {
    const mod = (await import(specifier)) as unknown as Plugin
    if (typeof (mod as { apply?: unknown }).apply !== 'function') {
      throw new Error(`card package missing its host face: ${specifier}`)
    }
    await ctx.plugin(mod)
  }
  // THE MOD PACKS (the distinct category taxonomy — the py Mod
  // parents): the pack contracts (loras, controlnet, lanpaint,
  // mask, qvoice) live in the compose kit now (P46 — the web
  // promoted to @melite/card-kit; named import, no dir walk);
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
  // THE PACKAGED FAMILIES' FLAVORS (the model-package stroke): a
  // family promoted to its model plugin package
  // (packages/melite-models/<id>) CARRIES its mods — the flavor
  // module ships inside the package and composes HERE, same phase
  // as the walk above (packs first, flavors after; the boot-loud
  // flavor↔DECL.mods interlock is unchanged on the models side).
  const packagedFlavors: [string, string][] = [
    ['@melite/melite-models-krea-2/mods/loras', 'krea-2 loras'],
    ['@melite/melite-models-anny/mods/verbs', 'anny verbs'],
    ['@melite/melite-models-qwen3-tts/mods/qvoice', 'qwen3-tts qvoice'],
    ['@melite/melite-models-qwen-img-edit-2511/mods/lanpaint', 'qwen-img-edit-2511 lanpaint'],
    ['@melite/melite-models-qwen-img-edit-2511/mods/loras', 'qwen-img-edit-2511 loras'],
    ['@melite/melite-models-qwen-img-edit-2511/mods/mask', 'qwen-img-edit-2511 mask'],
  ]
  for (const [specifier, label] of packagedFlavors) {
    const mod = (await import(specifier)) as unknown as Plugin
    if (typeof (mod as { apply?: unknown }).apply === 'function') {
      await ctx.plugin(mod)
    } else {
      throw new Error(`packaged flavor missing: ${label} (${specifier})`)
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
