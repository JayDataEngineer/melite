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
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Plugin } from '@deepseek-ai/cordis'
import { ComfyUIService } from './service.ts'
import type { CardDefinition } from './service.ts'
import type { ProvisionRow } from './models/families/contract.ts'
// COMPOSITION LIST (M2′ stroke 1, 2026-09-09, P48.1 — completed by
// the card sweep, 2026-09-09): card PACKAGES compose explicitly —
// the receipt is references/deepseek-harness packages/shell/tool-bash
// (a tool is its own package; DSH composes packages, never discovers
// nested plugins by glob). Every card lives in its own package
// (packages/<domain>/<id>); the readdir glob is DELETED and
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
/** THE CARD PACKAGES (the card sweep, 2026-09-09 — the glob's named
 *  death date arrived): every card lives in its own package
 *  (packages/<domain>/<id> — one card one package: card.ts +
 *  ui/ + agents/ in one unit). This table is the ONLY card
 *  composition (loadCardDefs' cache-boot AND the compose door's
 *  fresh-Context boot both ride it); a card lands by adding its
 *  package + one row. The engine src/cards tree is empty of host
 *  cards (only tenants remain: the fetch-registrar manifests,
 *  retired with their rows). */
export const cardPackages: string[] = [
    '@melite/3d-anny/card',
    '@melite/3d-fit',
    '@melite/3d-img-to-mesh/card',
    '@melite/3d-quad-remesh',
    '@melite/3d-skin',
    '@melite/audio-sfx',
    '@melite/image-ideogram4/card',
    '@melite/image-input-prep',
    '@melite/image-mask-studio/card',
    '@melite/image-tagger',
    '@melite/image-upscale-tools',
    '@melite/video-video-gen',
    '@melite/audio-music',
    '@melite/audio-tts',
    '@melite/audio-voice-lock',
    '@melite/image-image-edit',
    '@melite/motion-motion/card',
    '@melite/video-h3-timeline/card',
    '@melite/3d-clothing-placement',
  '@melite/image-image-gen',
]

/** One package onto the context (the shared composition step —
 * the WHOLE module namespace rides: cards declare `export const
 * inject = ['comfyui']` at module level; passing only { apply }
 * drops the inject declaration and the service dies with "cannot
 * get property comfyui without inject"). A package without a host
 * face refuses with its kind's voice — never a silent skip, never
 * cordis' anonymous error. */
export const pluginPackage = async (
  ctx: Context,
  specifier: string,
  kind: 'card package' | 'packaged flavor',
  label?: string,
): Promise<void> => {
  const mod = (await import(specifier)) as unknown as Plugin
  if (typeof (mod as { apply?: unknown }).apply === 'function') {
    await ctx.plugin(mod)
    return
  }
  throw new Error(kind === 'card package'
    ? `card package missing its host face: ${specifier}`
    : `packaged flavor missing: ${label} (${specifier})`)
}

/** Compose the card set into a Context (the shared auto-load loop —
 * every card rides pluginPackage above). */
export const composeCards = async (ctx: Context): Promise<void> => {
  for (const specifier of cardPackages) {
    await pluginPackage(ctx, specifier, 'card package')
  }
}

/** Compose the mod plane into a Context (packs first, flavors
 *  after — the flavor↔DECL.mods interlock is unchanged on the
 *  models side). SHARED composition: loadCardDefs rides it for the
 *  registry, and the gateway's per-request composeOnce rides it too
 *  (2026-09-10 — composeOnce built a fresh service with cards only,
 *  so flavor rows were absent at compose and every LoRA id refused).
 *  The dir-walk over src/models/families/<genre>/<id>/mods that used
 *  to live here was DEAD CODE (ledger row 24, 2026-09-10). */
export const composeModPlane = async (ctx: Context): Promise<void> => {
  // THE MOD PACKS (the distinct category taxonomy — the py Mod
  // parents): the pack contracts (loras, controlnet, lanpaint,
  // mask, qvoice) live in the compose kit now (P46 — the web
  // promoted to @melite/card-kit; named import, no dir walk);
  // the service validates LOUD at registration. PACKS FIRST — a
  // flavor for an unregistered pack refuses (the category lands
  // before the boardings).
  // PACKS FIRST — no apply-guard here (dead defense, dropped
  // 2026-09-12: ctx.plugin refuses an apply-less module LOUD on
  // its own; the guard's false arm could never fire).
  await ctx.plugin((await import('./mods/packs.ts')) as unknown as Plugin)
  // THE FAMILY FLAVORS — every flavor rides the EXPLICIT table
  // (the DSH compose law: packages compose, never glob-discover).
  // A family promoted to its model plugin package
  // (packages/models/<id>) CARRIES its mods — the flavor module
  // ships inside the package and composes here.
  const packagedFlavors: [string, string][] = [
    ['@melite/models-krea-2/mods/loras', 'krea-2 loras'],
    ['@melite/models-z-image/mods/loras', 'z-image loras'],
    ['@melite/models-z-image/mods/controlnet', 'z-image controlnet'],
    ['@melite/models-anny/mods/verbs', 'anny verbs'],
    ['@melite/models-qwen3-tts/mods/qvoice', 'qwen3-tts qvoice'],
    ['@melite/models-qwen-img-edit-2511/mods/lanpaint', 'qwen-img-edit-2511 lanpaint'],
    ['@melite/models-qwen-img-edit-2511/mods/loras', 'qwen-img-edit-2511 loras'],
    ['@melite/models-qwen-img-edit-2511/mods/mask', 'qwen-img-edit-2511 mask'],
  ]
  for (const [specifier, label] of packagedFlavors) {
    await pluginPackage(ctx, specifier, 'packaged flavor', label)
  }
}

/** THE IDENTITY RUNG (native since 2026-09-10): every card
 *  declares its identity inline (label/description/genre — the
 *  frozen ring is retired from this path; it survives only as the
 *  models-golden wall's anchor for the registry emission). A card
 *  with no identity refuses LOUD here (the m1 wall: no card
 *  without it) — never a silent fallback, never generated prose. */
export const assertCardIdentity = (id: string, def: CardDefinition): void => {
  const ident = def.identity
  if (
    ident === undefined ||
    typeof ident.label !== "string" ||
    ident.label === "" ||
    typeof ident.description !== "string" ||
    typeof ident.genre !== "string" ||
    ident.genre === ""
  ) {
    throw new Error(
      `card '${id}' declares no identity (label/description/genre) — ` +
        "the card owns its identity rung; the frozen ring no longer backfills it",
    );
  }
}

export const loadCardDefs = async (): Promise<Map<string, CardDefinition>> => {
  if (cache !== null) return cache
  const ctx = new Context()
  const service = new ComfyUIService(ctx)
  await composeCards(ctx)
  await composeModPlane(ctx)
  // THE IDENTITY RUNG (native since 2026-09-10): every card
  //  declares its identity inline (label/description/genre — the
  //  frozen ring is retired from this path; it survives only as the
  //  models-golden wall's anchor for the registry emission). A card
  //  with no identity refuses LOUD here (the m1 wall: no card
  //  without it) — never a silent fallback, never generated prose.
  bootedService = service
  cache = new Map(service.cardIds().map((id) => {
    const def = service.getCardDef(id)!
    assertCardIdentity(id, def)
    return [id, def]
  }))
  return cache
}

/** Every family's declaration provision rows (DECL provisions for
 *  every model id, then card-owned provisions), keyed by family —
 *  the download + serve surface (provision.ts downloads them; the
 *  provision door serves them). ONE spelling — the door delegates
 *  here, never a frozen capture.
 *
 *  The models reads are a LAZY import (models/models.ts carries the
 *  boot top-level-await, and the models boot dynamically imports
 *  THIS module — a static edge here deadlocks both boots). Call
 *  only after boot (loadCardDefs / the door's liveSources). */
export async function provisionsByFamily(
  defs: Map<string, CardDefinition>,
): Promise<Record<string, { engine: string; provisions: ProvisionRow[] }>> {
  const { modelIds, getModel } = await import('./models/models.ts')
  const out: Record<string, { engine: string; provisions: ProvisionRow[] }> = {}
  for (const id of modelIds()) {
    let decl
    try {
      decl = getModel(id)
    /* v8 ignore start -- ROW 28 (census): a model whose DECL fails
     * resolution is dropped from the provisions map — named in the
     * warn, never vanished (the boot continues; the operator
     * reconciles). No DECL fails today (91/91 resolve), so the arm
     * cannot fire without a broken DECL; the warn text stays pinned
     * by the census record, not a test. */
    } catch (e) {
      console.warn(
        `[card-defs] model ${id} dropped from provisions map — DECL resolution failed:`,
        e instanceof Error ? e.message : String(e),
      )
      continue
    }
    /* v8 ignore stop */
    out[id] = { engine: decl.engine ?? '', provisions: decl.provisions ?? [] }
  }
  for (const [id, def] of defs) {
    if (def.provisions !== undefined && def.provisions.length > 0) {
      out[id] = { engine: 'comfyui', provisions: [...def.provisions] }
    }
  }
  return out
}
