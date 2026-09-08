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
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import type { Plugin } from '@deepseek-ai/cordis'
import { ComfyUIService } from './service.ts'
import type { CardDefinition } from './service.ts'

let cache: Map<string, CardDefinition> | null = null

/** Boot the card set once and return id → CardDefinition.
 * Deterministic across calls in one process. */
export const loadCardDefs = async (): Promise<Map<string, CardDefinition>> => {
  if (cache !== null) return cache
  const ctx = new Context()
  const service = new ComfyUIService(ctx)
  // the cli.ts:59-63 auto-load loop (in-process): every card module
  // under src/cards, full namespace, in readdirSync order
  const cardsDir = join(dirname(new URL(import.meta.url).pathname), 'cards')
  for (const f of readdirSync(cardsDir).filter((x) => x.endsWith('.ts')).sort()) {
    const mod = (await import(pathToFileURL(join(cardsDir, f)).href)) as unknown as Plugin
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
      '../../comfyui/src/models/cardIdentity.generated.ts',
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
