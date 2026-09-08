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
  cache = new Map(service.cardIds().map((id) => [id, service.getCardDef(id)!]))
  return cache
}
