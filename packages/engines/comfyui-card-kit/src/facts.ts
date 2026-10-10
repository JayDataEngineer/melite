// Model facts — DERIVED, not declared (merged 2026-09-08,
// package-boundary extermination). The registry (models/) owns
// every model-owned key; the cards own the compose slices; loadFacts
// ASSEMBLES the row each reader (kit, service, doors, CLI, walls)
// renders from. One spelling is truth (the DECL), the row is its
// derived realization (paper §3.2.3) — the doubled spelling is dead.
//
// The slices file keeps ONLY what the registry cannot carry:
// per-card outputs/requires_by_family, the
// row roster and extension_node_types.

import type { GraphBuilder } from './graph.ts'
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

/** An action binding's build signature (DRY sweep C8, 2026-10-18 —
 * was byte-identical in five card files): params doc, resolved model
 * facts, the graph builder, the run id. */
export type ActionBinding = (p: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void

/** The lane facts' ONE typed string reader (the attainment audit's
 *  F7, 2026-10-12): lane_inputs is Record<string, unknown> by
 *  declaration, and the region law at lanes-image.ts reads
 *  text_encode_node through an unchecked unknown. Absent, non-string,
 *  or empty read as undefined — a REFUSAL-grade absence, never a
 *  silent default.
 * @param raw the resolved lane_inputs (family + variant)
 * @param key the facts key to read
 * @returns the non-empty string at key, or undefined */
export function laneStringOf(raw: LaneInputsFacts, key: string): string | undefined {
  const value = raw[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** The facts door's ONE string extractor (the attainment audit's
 *  F4: ten hand copies across eight families, already diverged
 *  into three shapes — two of them casting the very values their
 *  own loop had just proved). The label names the refusing door
 *  (family + action) so the message stays the caller's own; the
 *  wording is pinned by the families' refusal assertions.
 * @param raw the resolved lane_inputs (family ⊕ variant)
 * @param key the facts key the door requires
 * @param label the refusing door's name (family + action), message-prefixed
 * @returns the non-empty string at key
 * @throws Error when the key is absent, not a string, or empty */
export function requireText(raw: LaneInputsFacts, key: string, label: string): string {
  const value = raw[key]
  if (typeof value !== 'string' || value === '') {
    throw new Error(`${label}: lane_inputs.${key} = ${JSON.stringify(value)} — a non-empty string is required`)
  }
  return value
}

/** The diffusion-lane facts core every t2i/edit door parses (the J2/J3
 *  consolidation, 2026-10-18): the four model slots every family's
 *  loaders read, the gated node literal the action builds on, and the
 *  optional sampling_shift. Families keep their own typed T2IFacts/
 *  EditFacts (the self-containment contract, B4) and project this
 *  return into them — the checks and refusal prose live HERE, once. */
export interface DiffusionLaneFacts<Node extends string = string> {
  unet: string
  text_encoder: string
  vae: string
  clip_type: string
  /** The gated node literal (raw[gate.key] after the whitelist check) —
   *  generic so a family whose facts pin the literal type projects
   *  without a cast. */
  node: Node
  sampling_shift?: number
}

/** Parse the diffusion-lane core: the four requireText model slots, the
 *  node-literal whitelist gate, and the optional sampling_shift number
 *  check. The refusal prose is the families' pinned form (the specs
 *  assert the family-tagged prefix + these tails).
 * @param raw the resolved lane_inputs (family ⊕ variant)
 * @param label the refusing door's name (family + action), message-prefixed
 * @param gate the facts key holding the node literal + the one allowed value
 * @param shift false to skip the sampling_shift check (edit doors carry none)
 * @returns the core facts; families project into their own typed shape
 * @throws Error when a model slot is missing, the node literal is not the
 *  whitelisted value, or sampling_shift is present but not a number */
export function parseDiffusionLaneFacts<Node extends string>(
  raw: LaneInputsFacts,
  label: string,
  gate: { key: 'latent_node' | 'text_encode_node'; node: Node },
  shift: boolean = true,
): DiffusionLaneFacts<Node> {
  const text = (key: string): string => requireText(raw, key, label)
  const node = raw[gate.key]
  // !== refusal below proves node === gate.node; the returns carry
  // gate.node itself (already the literal type — no cast).
  if (node !== gate.node) {
    throw new Error(
      `${label}: lane_inputs.${gate.key} = ${JSON.stringify(node)} — the action builds on ${gate.node}`,
    )
  }
  if (shift) {
    const value = raw.sampling_shift
    if (value !== undefined && typeof value !== 'number') {
      throw new Error(`${label}: lane_inputs.sampling_shift = ${JSON.stringify(value)} — a number is required`)
    }
    return {
      unet: text('unet'),
      text_encoder: text('text_encoder'),
      vae: text('vae'),
      clip_type: text('clip_type'),
      node: gate.node,
      sampling_shift: value,
    }
  }
  return {
    unet: text('unet'),
    text_encoder: text('text_encoder'),
    vae: text('vae'),
    clip_type: text('clip_type'),
    node: gate.node,
  }
}

/** The edit door's max_images floor: a finite number ≥ 1, floored.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @param label the refusing door's name (family + action), message-prefixed
 *  @returns Math.floor(raw.max_images)
 *  @throws Error when max_images is absent, non-finite, or < 1 */
export function parseEditCap(raw: LaneInputsFacts, label: string): number {
  const cap = raw.max_images
  if (typeof cap !== 'number' || !Number.isFinite(cap) || cap < 1) {
    throw new Error(`${label}: lane_inputs.max_images = ${JSON.stringify(cap)} — a number ≥ 1 is required`)
  }
  return Math.floor(cap)
}

/** The generic image-cap door (004/C4, the reference-guided t2i lane):
 *  one lane_inputs number ≥ 1 read loud — the t2i lane's own cap key
 *  (`max_references`) with the same refusal shape as the edit cap.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @param key the cap's lane_inputs key
 *  @param label the refusing door's name (family + action), message-prefixed
 *  @returns Math.floor(raw[key])
 *  @throws Error when the key is absent, non-finite, or < 1 */
export function parseLaneCap(raw: LaneInputsFacts, key: string, label: string): number {
  const cap = raw[key]
  if (typeof cap !== 'number' || !Number.isFinite(cap) || cap < 1) {
    throw new Error(`${label}: lane_inputs.${key} = ${JSON.stringify(cap)} — a number ≥ 1 is required`)
  }
  return Math.floor(cap)
}

import type { LaneRelations, SamplerEnvelope } from '@melite/contracts/laneRelations'

/** THE RELATION WORDS, wire twin — DERIVED, NOT SPELLED (2026-10-10,
 *  the four-agent contract audit's top finding: this interface was a
 *  hand-copy of four of the six words — `at_most_one` and `required`
 *  were simply absent, so every facts reader was typed against a
 *  grammar that could not name half the laws the DECLs declare (the
 *  tts required-word rows included). The runtime clone always carried
 *  them; the TYPE lied, which is the same drift class as the drift
 *  gate, and it is now unrepresentable: the mirror is derived from
 *  the floor, and the contract's own type test below fails to compile
 *  the moment a seventh word lands here without landing there.
 *
 *  The judged shape is readonly; a facts row is a plain-JSON snapshot
 *  built by JSON clone, so the mirror is its mutable counterpart. */
type Mutable<T> = { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? Mutable<U>[] : Mutable<T[K]> }
export type LaneRelationsFacts = Mutable<LaneRelations>

/** THE COMPILE-TIME PROOF (the drift wall, at the type level): every
 *  word the floor declares is a word this mirror serves. Delete a
 *  word from the floor and this line stops compiling; add one and it
 *  compiles only if the mirror derives it. */
type _EveryDeclaredWordIsMirrored = {
  [K in keyof LaneRelations]-?: K extends keyof LaneRelationsFacts ? true : never
}
export type FactsMirrorCoversEveryWord = [keyof LaneRelationsFacts] extends [keyof LaneRelations]
  ? true
  : never

export interface ModelFacts {
  id: string
  card: string
  /** The OWNING family id (the addressOwners derivation): a route
   *  address ('krea-2-raw', 'qwen-img-21-bf16') names its ladder
   *  owner here — derived rows always carry it; absent on hand
   *  literals ≡ the row id (identity, never a refusal — the
   *  FactsFile.owners law). Compose seats that key by family (the
   *  card's ACTION_BINDINGS) read THIS field, never id: a route id
   *  keys nothing and the row would silently ride the fallback. */
  family?: string
  defaults: Record<string, string | number | boolean | null>
  lane_inputs: LaneInputsFacts
  /** THE BASE PARAMETER SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix
   * shape): the params every lane of this family accepts. Present
   * only where the DECL declares one (absent ≡ the card's union
   * table authors the fields — the legacy truth, nothing binds). */
  params?: string[]
  /** The family-wide relation words (judged on every lane).
   * Present only where declared. */
  relations?: LaneRelationsFacts
  /** The family-wide numeric bounds (per-field replaced by a
   * variant's own row — the RANGE RULE: whoever owns the default
   * owns the floor). Present only where declared. */
  bounds?: Record<string, { min?: number; max?: number }>
  /** Compose splice SSOT rows (card field → NodeClass.idx.input). */
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

/** One (variant × quant) matrix cell: tier, route, artifact
 *  basename ("" when the cell ships no download place), VRAM peak. */
export interface VariantCellFacts {
  quant: string
  label: string
  route: string
  hide_from_dropdown?: boolean
  artifact: string
  vram_peak_gb: number | null
}

/** One variant row: cascade stamps + its quant cells. */
export interface ModelVariantFacts {
  id: string
  label: string
  group: string
  hide_from_dropdown?: boolean
  route: string
  resolver_defaults: Record<string, unknown>
  /** THE VARIANT LANE (2026-09-23, the clone-lane repair): a variant
   *  may re-key the compose lane (qwen3-tts Base: synth_lane clone) —
   *  the service merges this over the family lane_inputs when the
   *  run addresses the variant's route. Absent on old literals = {}
   *  at the reader (never undefined inside deriveRow) — the TYPE
   *  honors the same law: optional on literal fixtures. */
  lane_inputs?: LaneInputsFacts
  // THE DECLARATION'S OWN SPELLING (the contract audit): the DECL
  // schema declares `z.array(z.number())` (families/contract.ts) and
  // the floor mirrors `number[]`; this twin alone claimed a 2-TUPLE,
  // so a reader asking whether `steps: [4]` is legal got two answers.
  sampler_envelope?: Partial<SamplerEnvelope> | null
  defaults: Record<string, unknown>
  /** THE LANE SURFACE (2026-10-10, the YOU_ARE_A_LIAR fix shape):
   *  the params this variant accepts IN ADDITION to the family
   *  base. Present only where the DECL declares it (absent ≡
   *  inherits the family surface verbatim — the cascade law,
   *  add-never-subtract). */
  params?: string[]
  /** This lane's relation words (judged in addition to the family's
   *  own). Present only where declared. */
  relations?: LaneRelationsFacts
  /** This lane's numeric bounds (per-field REPLACING the family's
   *  row for the fields it states). Present only where declared. */
  bounds?: Record<string, { min?: number; max?: number }>
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
  rows?: Record<string, { card: string; frozen?: ModelFacts }>
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

/** Deep-clone a relation declaration into the derived row's own
 *  data (the rows are frozen snapshots — never an alias into the
 *  registry's live DECL objects). Plain-JSON shapes only. */
function structuredCloneRelations(raw: unknown): LaneRelationsFacts {
  return JSON.parse(JSON.stringify(raw)) as LaneRelationsFacts
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
      ...(v.hide_from_dropdown === true ? { hide_from_dropdown: true } : {}),
      route: reAddr((v.route ?? '') as string),
      resolver_defaults: (v.resolver_defaults ?? {}) as Record<string, unknown>,
      lane_inputs: ((v.lane_inputs ?? {}) as LaneInputsFacts),
      // THE ROUTE ENVELOPE (cardsVariant.envelopeRefusal reads it):
      // a distilled lane declares the closed bounds its sampler
      // marriage lives in — stated values outside refuse at compose.
      // number[] — the declaration (line 136), the floor, and every
      // consumer twin. The 2-tuple this cast claimed bought a reader
      // asking "is steps: [4] legal" a second answer; normalizeEnvelope
      // reads unknown and length-checks at runtime, so it accepts the
      // array either way.
      sampler_envelope: (v.sampler_envelope ?? null) as Partial<SamplerEnvelope> | null,
      defaults: (v.wire_defaults ?? {}) as Record<string, unknown>,
      // THE LANE SURFACE + RELATIONS (2026-10-10, the fix shape):
      // carried VERBATIM from the DECL variant — present only where
      // declared (the absent-equals-empty law; deriveRow never
      // invents a surface).
      ...(Array.isArray(v.params)
        ? { params: [...(v.params as string[])] } : {}),
      ...(v.relations !== undefined && v.relations !== null
        ? { relations: structuredCloneRelations(v.relations) } : {}),
      ...(v.bounds !== undefined && v.bounds !== null
        ? { bounds: JSON.parse(JSON.stringify(v.bounds)) as Record<string, { min?: number; max?: number }> } : {}),
      cells: ((v.cells ?? []) as Array<Record<string, unknown>>).map((c) => ({
        quant: c.quant as string,
        label: c.label as string,
        ...(c.hide_from_dropdown === true ? { hide_from_dropdown: true } : {}),
        route: reAddr((c.route ?? '') as string),
        artifact: artifactBasename(c as { artifact?: { source_url?: string; filename?: string } }),
        vram_peak_gb: (c.vram_peak_gb ?? null) as number | null,
      })),
    }
  })
  const row: ModelFacts = {
    id: address,
    card,
    family: owner,
    defaults: ((d.defaults ?? {}) as Record<string, string | number | boolean | null>),
    lane_inputs: ((d.lane_inputs ?? {}) as LaneInputsFacts),
    variants,
    variant_groups: ((d.variant_groups ?? []) as VariantGroupFacts[]),
    outputs,
  }
  // THE BASE SURFACE + FAMILY RELATIONS (2026-10-10, the fix
  // shape): verbatim, present-only-where-declared.
  if (Array.isArray(d.params)) row.params = [...(d.params as string[])]
  if (d.relations !== undefined && d.relations !== null) {
    row.relations = structuredCloneRelations(d.relations)
  }
  // THE BASE BOUNDS (the RANGE RULE's carry): per-field numeric
  // domains, verbatim, present-only-where-declared.
  if (d.bounds !== undefined && d.bounds !== null) {
    row.bounds = JSON.parse(JSON.stringify(d.bounds)) as Record<string, { min?: number; max?: number }>
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
      cardSlice?.outputs ?? [],
      cardSlice?.requires_by_family,
      owners,
    )
  }
  // THE EXPORTER RULE, AUTOMATED (2026-09-29, the third live break:
  // 'no-model-facts: krea-2-raw' — the raw variant stamped its route
  // as the model and the hand roster never listed the address, so
  // compose phase 1 refused a route the registry itself resolves).
  // The roster was a hand-copy of registry truth and had drifted
  // across 54 claimed addresses. Every address the registry claims
  // whose OWNING family serves a row now derives its own row —
  // through the same deriveRow that already shaped the hand-listed
  // route rows (qwen3-tts-base). A family with no roster row is a
  // serving decision (its routes cannot compose either way — the
  // family itself is unserved), never silently papered over here.
  for (const [address, owner] of owners) {
    if (models[address] !== undefined) continue
    const ownerSlice = slices.rows?.[owner]
    if (ownerSlice === undefined || ownerSlice.frozen !== undefined) continue
    const cardSlice = slices.cards?.[ownerSlice.card]
    models[address] = deriveRow(
      reads,
      address,
      ownerSlice.card,
      cardSlice?.outputs ?? [],
      cardSlice?.requires_by_family,
      owners,
    )
  }
  return { models, extension_node_types: slices.extension_node_types ?? {}, owners: Object.fromEntries(owners) }
}
