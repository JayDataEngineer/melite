// cardDefs.ts — the in-process card-def loader for serving surfaces.
//
// The compose door boots a fresh
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
    '@melite/3d-img-to-mesh/card',
    '@melite/3d-quad-remesh',
    // THE RIG CARD (card program P0, 2026-09-21): "skeleton +
    // weights on this GLB" — engine-native, three lanes (auto
    // SOMA-77 / copy donor→target / species anyCreature bridge) over
    // the vendored autorig + poser packs. No checkpoints ride.
    '@melite/3d-rig',
    '@melite/audio-sfx',
    // RETIRED 2026-09-17 (operator order, the form-seams stroke):
    // ideogram4 — the card AND its model family are GONE (the
    // family's tenant binding WAS this card; nothing else consumed
    // it). No historical row survives it — the frozen identity ring
    // is DELETED (2026-09-18): identity is native on the defs.
    '@melite/image-input-prep',
  // RETIRED 2026-09-16 (operator order, stroke 87): 3d-skin + 3d-fit —
  // DCC surgery masquerading as cards. Verified at source: skin's
  // GLB attach refuses un-UV'd meshes (NO unwrap — it packs noise
  // PNGs and mutes the normal map to 0; the real shading is Unity's
  // SetFloat at runtime) and fit is a hand-rolled numpy rigging
  // kernel (bone matrices, quaternions) — Blender work in the wrong
  // layer. Both surfaces moved to the MCP door as SKILLS, not cards:
  // packages/engines/mcp/models/3d/blender/agents/spawn/ (skin
  // unwrap + rigging), served by the skills plane as
  // model:blender:<skill>. The vendored poser node packs stay
  // (Layer C) — the retired flows that compose them via raw
  // workflows (skin-apply, fit-seat, character) still resolve.
    // RETIRED 2026-09-16 (CONTRACT D — parity reached, stroke 75):
    // mask-studio's card row. The FORM card (mask-form) owns the
    // mask surface — its bag covers every wire knob the studio
    // declared (detect/subject/parts/paint + the scalar knobs).
    // The studio PACKAGE survives demoted: ui/ (PaintCanvas2D + the
    // studio internals) is the paint leaf-face carrier (its own
    // stroke); the runs-plane mask_studio mappings stay (historical
    // runs resolve their engine).
    '@melite/image-mask-form/card',
    '@melite/image-tagger',
    '@melite/image-upscale-tools',
    // video-gen RETIRED (2026-09-21, operator order — "the ONLY
    // video gen I want is the timeline tool"; "there is no wan-vace,
    // there is only H3 in timeline studio"): card + wan-vace +
    // scail2-animate families ALL gone. h3-timeline is the only
    // video door.
    '@melite/audio-music',
    '@melite/audio-tts',
    '@melite/image-image-edit',
    '@melite/motion-motion/card',
    '@melite/video-h3-timeline/card',
  // RETIRED 2026-09-16 (operator order, stroke 86): 3d-clothing-
  // placement — the LAST CLI-proxy-era card (it required
  // melite-blender-proxy-nodes and carried mcp_addr/autoboot knobs).
  // Its surface moved to the agent door the architecture already
  // serves: craft-loop + mcp:blender — the agent loads the two GLBs,
  // places, renders a capture, and the vision critic checks the fit
  // (flows/craft-loop/agents/AGENT.md carries the garment example).
  // RETIRED 2026-09-15 (superseded by the MCP card, operator
  // order): 3d-unity, 3d-blender, 3d-blender-shot — the CLI-era
  // proxy-node cards. The MCP lane (mcp:<server>) owns the 3d
  // compose surface now; the vendored node packs stay (Layer C).
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
  // THE MOD PACKS (the distinct category taxonomy — the Mod
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
    ['@melite/models-h3-timeline/mods/loras', 'h3-timeline loras'],
    ['@melite/models-z-image/mods/loras', 'z-image loras'],
    ['@melite/models-z-image/mods/controlnet', 'z-image controlnet'],
    ['@melite/models-z-image/mods/ip_adapter', 'z-image ip_adapter'],
    ['@melite/models-anny/mods/verbs', 'anny verbs'],
    ['@melite/models-qwen3-tts/mods/qvoice', 'qwen3-tts qvoice'],
    ['@melite/models-qwen3-tts-voicedesign/mods/qvoice_save', 'qwen3-tts-voicedesign qvoice_save'],
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
 *  DELETED with the ring, 2026-09-18). A card
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
  //  DELETED with the ring, 2026-09-18). A card
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

/** Refresh the served defs map from the LIVE singleton (#39, the
 *  hotload prototype): loadCardDefs' cache is a boot snapshot, so a
 *  card registered after boot (the hot root's drop-ins) never
 *  serves until the projection re-derives. This re-runs the SAME
 *  build line against theService() — the identity wall rides, the
 *  per-request doors (form-spec, forms, catalog) pick it up on
 *  their next read. Cold boots are untouched: the first
 *  loadCardDefs() call is exactly what it was; only a process that
 *  ALREADY booted can refresh. */
export const refreshCardDefs = (): Map<string, CardDefinition> => {
  const service = theService()
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
