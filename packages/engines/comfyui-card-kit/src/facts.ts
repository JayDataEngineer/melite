// Model facts — DERIVED, not declared (merged 2026-09-08,
// package-boundary extermination). The registry (models/) owns
// every model-owned key; the cards own the compose slices; loadFacts
// ASSEMBLES the row each reader (kit, service, doors, CLI, walls)
// renders from. One spelling is truth (the DECL), the row is its
// derived realization (paper §3.2.3) — the doubled spelling is dead.
//
// The slices file keeps ONLY what the registry cannot carry:
// per-card outputs/requires_by_family, per-address card_knobs, the
// row roster, extension_node_types, and the mask-studio whole row
// (unoffered, no DECL — card-owned, stays frozen).

import { readFileSync } from 'node:fs'

/** The registry reads derivation renders through — injected, never
 *  imported (this module is evaluation-cycle-clean: models.ts runs
 *  its top-level boot, so any static edge back into it deadlocks
 *  the boot that awaits this module. Callers pass their own reads:
 *  walls/CLI/doors pass the booted registry, the models bridge
 *  passes its service-bound closures). */
export interface FactsReads {
  getModel(id: string): unknown
  registryIds(): string[]
  registryModel(id: string): unknown
}

/** Lane rows are per-lane shaped (an image lane's unet/vae/clip, a 3D
 *  lane's rig fields...) — the card that owns the lane knows its
 *  fields; the row carries whatever the model row declared. */
export type LaneInputsFacts = Record<string, unknown>

export interface ModelFacts {
  id: string
  card: string
  defaults: Record<string, string | number | boolean | null>
  lane_inputs: LaneInputsFacts
  /** Compose splice SSOT rows (card field → NodeClass.idx.input). */
  card_knobs: CardKnobFacts[]
  /** Variant matrix rows + per-cell weight coordinates. */
  variants: ModelVariantFacts[]
  /** UI selector groups (Recipe group is grammar-owned). */
  variant_groups: VariantGroupFacts[]
  /** Owning card's output contract copy (compose delivery gate). */
  outputs: OutputFacts[]
  /** Ingested media kinds — present only where the Model declares. */
  accepts?: string[]
  /** Families-section studio claim — present only where declared. */
  studio?: StudioFacts | null
  /** Owning card's per-family extension gates — present only where
   *  the card declares requires_by_family. */
  requires_by_family?: Record<string, string[]>
  /** The atom's mutation boarding (≡ the model's DECL.mods, pinned
   *  by the flows wall) — the CONSUMPTION GATE reads this: a pack
   *  mutation fires only where the boarding names it. Absent = no
   *  mutations boarded. */
  mods?: string[]
}

/** One card-knob declaration (KnobRow card/inject/kind). */
export interface CardKnobFacts {
  card: string
  inject: string
  kind: 'n' | 's' | 'b'
}

/** One (variant × quant) matrix cell: tier, route, artifact
 *  basename ("" when the cell ships no download place), VRAM peak. */
export interface VariantCellFacts {
  quant: string
  label: string
  route: string
  artifact: string
  vram_peak_gb: number | null
}

/** One variant row: cascade stamps + its quant cells. */
export interface ModelVariantFacts {
  id: string
  label: string
  group: string
  route: string
  resolver_defaults: Record<string, unknown>
  /** THE VARIANT LANE (2026-09-23, the clone-lane repair): a variant
   *  may re-key the compose lane (qwen3-tts Base: synth_lane clone) —
   *  the service merges this over the family lane_inputs when the
   *  run addresses the variant's route. Absent on old literals = {}
   *  at the reader (never undefined inside deriveRow) — the TYPE
   *  honors the same law: optional on literal fixtures. */
  lane_inputs?: LaneInputsFacts
  sampler_envelope?: { steps?: [number, number]; cfg?: [number, number] } | null
  defaults: Record<string, unknown>
  cells: VariantCellFacts[]
}

/** One UI selector group. */
export interface VariantGroupFacts {
  id: string
  label: string
  tooltip: string
  default: string
}

/** One output-contract row (OutputRow patterns/label/many). */
export interface OutputFacts {
  patterns: string[]
  label: string
  many: boolean
}

/** The families-section studio claim (Studio row). */
export interface StudioFacts {
  tenant: string
  owns_params: boolean
  writes: string[]
  kind: string
  size: string
  layout: string
}

/** The extension node map (EXTENSION LAW gate data): pack name →
 *  node class types it provides. */
export interface FactsFile {
  models: Record<string, ModelFacts>
  extension_node_types: Record<string, string[]>
  /** Route → ladder-owner family (the addressOwners derivation,
   *  emitted so the compose door resolves variant routes without a
   *  registry read: 'qwen3-tts-base' → 'qwen3-tts'. Family ids map
   *  to themselves; absent on old literals = identity (the reader
   *  defaults, never refuses) — the TYPE honors the same law:
   *  optional, so an inline fixture (the image-gen krea-2 stub)
   *  omits it without a cast-through-unknown. */
  owners?: Record<string, string>
}

/** The frozen card-owned slices (what the registry cannot carry). */
interface FactsSlices {
  extension_node_types?: Record<string, string[]>
  cards?: Record<string, { outputs?: OutputFacts[]; requires_by_family?: Record<string, string[]> }>
  rows?: Record<string, { card: string; card_knobs?: CardKnobFacts[]; frozen?: ModelFacts }>
}

/** address → ladder owner, built from the registry ladders (variant
 *  + cell route claims; first claimant wins — boardings resolve
 *  before ladders at assembly). */
function addressOwners(reads: FactsReads): Map<string, string> {
  const map = new Map<string, string>()
  for (const id of reads.registryIds()) {
    map.set(id, id)
    const decl = reads.registryModel(id) as {
      variants?: Array<{ route?: string; cells?: Array<{ route?: string }> }>
    }
    for (const v of decl.variants ?? []) {
      if (v.route !== undefined && v.route !== id && !map.has(v.route)) map.set(v.route, id)
      for (const c of v.cells ?? []) {
        if (c.route !== undefined && c.route !== id && !map.has(c.route)) map.set(c.route, id)
      }
    }
  }
  return map
}

function artifactBasename(cell: { artifact?: { source_url?: string; filename?: string } }): string {
  const a = cell.artifact
  if (a === undefined || a === null) return ''
  if (typeof a.filename === 'string' && a.filename !== '') return a.filename.split('/').pop() as string
  if (typeof a.source_url === 'string' && a.source_url !== '') return a.source_url.split('/').pop() as string
  return ''
}

/** The derived row for one roster address (route addresses offer the
 *  shared matrix minus siblings' tables — the exporter rule, kept:
 *  keep variants routed to "" or the ladder owner). */
function deriveRow(
  reads: FactsReads,
  address: string,
  card: string,
  knobs: CardKnobFacts[],
  outputs: OutputFacts[],
  requires: Record<string, string[]> | undefined,
  owners: Map<string, string>,
): ModelFacts {
  const owner = owners.get(address) ?? address
  const d = reads.getModel(address) as unknown as Record<string, unknown>
  const declVariants = (d.variants ?? []) as Array<Record<string, unknown>>
  // Route rows are SELF-CONTAINED (the exporter rule, kept): the
  // address offers the shared matrix with variants re-addressed to
  // itself (selecting standard under qwen3-tts-base stays on the
  // base table — consumers never leave the row). Recipe "" stays.
  const isRouteRow = address !== owner
  const kept = isRouteRow
    ? declVariants.filter((v) => {
        const r = (v.route ?? '') as string
        return r === '' || r === owner
      })
    : declVariants
  const variants: ModelVariantFacts[] = kept.map((v) => {
    const reAddr = (r: string): string => (isRouteRow && r !== '' ? address : r)
    return {
      id: v.id as string,
      label: v.label as string,
      group: v.group as string,
      route: reAddr((v.route ?? '') as string),
      resolver_defaults: (v.resolver_defaults ?? {}) as Record<string, unknown>,
      lane_inputs: ((v.lane_inputs ?? {}) as LaneInputsFacts),
      // THE ROUTE ENVELOPE (cardsVariant.envelopeRefusal reads it):
      // a distilled lane declares the closed bounds its sampler
      // marriage lives in — stated values outside refuse at compose.
      sampler_envelope: ((v.sampler_envelope ?? null) as {
        steps?: [number, number];
        cfg?: [number, number];
      } | null),
      defaults: (v.wire_defaults ?? {}) as Record<string, unknown>,
      cells: ((v.cells ?? []) as Array<Record<string, unknown>>).map((c) => ({
        quant: c.quant as string,
        label: c.label as string,
        route: reAddr((c.route ?? '') as string),
        artifact: artifactBasename(c as { artifact?: { source_url?: string; filename?: string } }),
        vram_peak_gb: (c.vram_peak_gb ?? null) as number | null,
      })),
    }
  })
  const row: ModelFacts = {
    id: address,
    card,
    defaults: ((d.defaults ?? {}) as Record<string, string | number | boolean | null>),
    lane_inputs: ((d.lane_inputs ?? {}) as LaneInputsFacts),
    card_knobs: knobs,
    variants,
    variant_groups: ((d.variant_groups ?? []) as VariantGroupFacts[]),
    outputs,
  }
  const mods = d.mods as string[] | undefined
  if (mods !== undefined && mods.length > 0) row.mods = mods
  const accepts = d.accepts as string[] | undefined
  if (accepts !== undefined && accepts.length > 0) row.accepts = accepts
  if (d.studio !== undefined && d.studio !== null) row.studio = d.studio as StudioFacts
  if (requires !== undefined) row.requires_by_family = requires
  return row
}

/** Assemble the compose contract: frozen slices in, registry truth
 *  derived through the caller's reads, rows out. Same return shape
 *  every reader renders from — the file shrank, the callers boot
 *  the registry and pass their reads. */
export function loadFacts(path: string, reads: FactsReads): FactsFile {
  const slices = JSON.parse(readFileSync(path, 'utf8')) as FactsSlices
  const owners = addressOwners(reads)
  const models: Record<string, ModelFacts> = {}
  for (const [address, slice] of Object.entries(slices.rows ?? {})) {
    if (slice.frozen !== undefined) {
      models[address] = slice.frozen
      continue
    }
    const cardSlice = slices.cards?.[slice.card]
    models[address] = deriveRow(
      reads,
      address,
      slice.card,
      slice.card_knobs ?? [],
      cardSlice?.outputs ?? [],
      cardSlice?.requires_by_family,
      owners,
    )
  }
  return { models, extension_node_types: slices.extension_node_types ?? {}, owners: Object.fromEntries(owners) }
}
