// service-faces.ts — THE PLUGIN-SIDE SERVICE FACES AND CONTEXT
// AUGMENTATIONS (the workspace-acyclicity cure): plugins call
// exactly three engine members (registerCard/registerFlavor/
// registerVerb) and one models member (registerFamily); these
// faces name those, and the Context augmentation lives HERE at
// the leaf tier so a plugin activates it with no host edge. The
// host classes (comfyui-cordis's ComfyUIService and
// ModelsService) satisfy the faces structurally — assignment
// sites compile against them.

import type {} from '@deepseek-ai/cordis'
import type { CardDefinition, ComposeEstate } from './card-definition.ts'
import type { PackContract } from './pack-fields.ts'
import type { FactsFile } from './facts.ts'
import type { PromptGraph } from './graph.ts'
import type { ModelDecl } from './model-contract.ts'

/** A mod's field contract: a Schemastery OBJECT schema (the
 *  dual-declaration pattern — the same z.object({...}) style the
 *  cards declare; UI meta rides .extra('extra', bag({group, zone,
 *  order, visible_when})) exactly like card fields). ONE meta path
 *  walks both card and mod surfaces; same-pack flavor merging is
 *  Schema.intersect semantics (constraints merge per key). */
export type ModFields = {
  (v: unknown): Record<string, unknown>
  dict?: Record<string, Record<string, unknown>>
}

/** A lora catalog row (grammar.LoraRow — no link, no row).
 *  The shape is the shared catalog-row shape for row-bearing packs
 *  (loras today, controlnet: its rows carry the served tooltip and
 *  the upstream-map preprocessor note — catalog facts, never
 *  execution: no preprocessor runs in this plane). */
export interface LoraRowDecl {
  readonly id: string
  readonly filename: string
  /** The upstream fetch source — REQUIRED on executable rows
   *  (the CN/LoRA law: no link, no row). A vocabulary-only row
   *  (ip_adapter's refused-fate catalog) carries NONE: no source
   *  exists, so none is claimed — nothing fetches, nothing lies. */
  readonly source_url?: string
  readonly label?: string
  readonly category?: string
  readonly default_strength?: number
  /** The scalar default under a pack whose dial is 'weight'
   *  (ip_adapter's retired wire) — discovery stamps it into the
   *  option defaults under the pack's scalar_key. */
  readonly default_weight?: number
  /** Steps applied (2026-09-18): a DISTILL adapter's married step
   *  count — one lora for four steps, another for eight. Served into
   *  the option defaults so boarding stamps it onto the entry; the
   *  compose honors it when the caller pins no steps of their own.
   *  RANGE FACTS (the 4-to-8 correction): `steps_min`/`steps_max`
   *  declare the adapter's valid domain when it is not a fixed
   *  point (Turbo 4-to-8: min 4, max 8; the married default stays
   *  `steps`). A bare `steps` implies the fixed point. */
  readonly steps?: number
  readonly steps_min?: number
  readonly steps_max?: number
  readonly tooltip?: string
  readonly preprocessor?: string
  /** ControlNet schedule capability (002 H3): 'ranged' when the
   *  row's apply node carries start/end inputs (H3's
   *  Fun-ControlNet Union dials); absent = full-schedule only
   *  (z-image's node). Stamped onto the resolved entry so the
   *  kit's schedule law reads the ROW's capability, never a
   *  foreign family's node. */
  readonly schedule?: 'full' | 'ranged'
  /** ControlNet strength ceiling (002 H5): the row's own maximum
   *  (H3's dial runs to 10; the pack default stays 2 for rows
   *  that declare none). Stamped onto the resolved entry; the
   *  bound and the doc live on the row, not the pack. */
  readonly strength_max?: number
}

/** A flavor registration — ONE family's boarding of a pack (the
 *  Model.mods tuple entry): bare (fields-only boarding), row-bearing
 *  (the family's catalog rows), or the runtime-catalog door. The
 *  file lives in the family's own mods/ dir — the scope below IS
 *  the owning declaration, gated ≡ the model's DECL.mods at boot. */
export interface FlavorRegistration {
  readonly pack: string
  readonly families: readonly string[]
  readonly rows?: readonly LoraRowDecl[]
  /** The RUNTIME CATALOG door (estate qwen loras catalog): no own rows
   *  the union of every family's declared rows serves; family rows
   *  always win over the union. */
  readonly runtimeCatalog?: boolean
}

/** A verb engine row (dsl.VerbEngine — exactly one arm). */
export interface VerbEngineRow {
  readonly id: string
  readonly flow?: string
  readonly local?: string
  readonly refusal?: string
}

/** A verb registration (SubActionMod: knobs NEVER join the card
 *  surface; they ride the engine invocation). */
export interface VerbRegistration {
  readonly id: string
  readonly label: string
  readonly families: readonly string[]
  readonly engines: readonly VerbEngineRow[]
  readonly writes: readonly string[]
  readonly requires: readonly string[]
  readonly fields: ModFields
}

/** A mod's absorbed contract (the family scope attached — the
 *  emission filter). */
export interface AbsorbedMod {
  readonly pack: string
  readonly fields: ModFields
  readonly families: readonly string[]
}

/** The registrar face a card's registerCard(ctx, comfy) entry
 *  receives — the engine service read down to the members a
 *  plugin may call. */
export interface ComfyUIServiceFace {
  registerCard(card: CardDefinition): () => void
  registerFlavor(flavor: FlavorRegistration): () => void
  registerVerb(verb: VerbRegistration): () => void
  registerPack(contract: PackContract): () => void
  setFacts(facts: FactsFile): void
  getCardDef(id: string): CardDefinition | undefined
  setObjectInfo(objectInfo: Record<string, any> | null): void
  setWeightPresent(fn: ((relativePath: string, name: string) => boolean) | null): void
  compose(cardId: string, modelId: string | null, params: unknown, runId: string, estate?: ComposeEstate): PromptGraph
}

/** The registry face a family plugin's apply(ctx) sees as
 *  ctx.models. */
export interface ModelsServiceFace {
  registerFamily(decl: ModelDecl): () => void
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    comfyui: ComfyUIServiceFace
    models: ModelsServiceFace
  }
}
