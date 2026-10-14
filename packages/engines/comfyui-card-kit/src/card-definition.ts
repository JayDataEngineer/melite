// card-definition.ts — THE CARD PLUGIN CONTRACT (moved from
// comfyui-cordis/service.ts, the workspace-acyclicity cure): the
// card definition shape is plugin-side vocabulary — cards declare
// it, the engine composes it. The leaf tier owns the shape; the
// host's ComfyUIService satisfies the registrar face in
// service-faces.ts against it. Consumers import this module,
// never a host façade.
import Schema from '@deepseek-ai/schemastery'
// The plugin-facing Context re-export (the fiber augmentation rides
// this module's import chain): plugins type their apply() parameter
// from the kit's contract surface, not a bare framework specifier —
// one import site for the whole leaf tier.
export type { Context } from '@deepseek-ai/cordis'
import type { GraphBuilder, PromptGraph } from './graph.ts'
import type { ModelFacts } from './facts.ts'
import type { Schema as CarrierSchema, DeclaredModifierKind } from './params-emit.ts'
import type { ProvisionRow } from './model-contract.ts'

export interface CardFlowOutputBinding {
  channel: string
  node: string
  nodeClass: string
  when?: (params: Record<string, unknown>) => boolean
}

export interface ComposeEstate {
  stateRoots: readonly string[]
}

export interface CardDefinition {
  id: string
  /** Stage-row id the compose emits (retired compose.skeleton=
   *  verbatim, SSOT'd from the decls; TS owns the truth post-flip
   *  — required on every card, never a fallback). */
  skeleton: string
  /** Boarded model ids (the board gate; unboarded models refuse). */
  boarded: readonly string[]
  /** Retrieval tags (the card-catalog search key, 2026-09-09): the
   *  card DECLARES these — modality + operation words the agent
   *  searches ({image, upscale}) — never derived, never the ring's.
   *  Sibling of boarded, NOT identity prose: identity merges with
   *  the frozen ring, tags are orthogonal and always card-owned. */
  tags?: readonly string[]
  /** Pure-tool cards (boarded: [], no model families — the Blender
   *  card precedent): skip the {model:} demand everywhere (cardGate,
   *  compose, CLI). Default true — every existing card needs one. */
  requiresModel?: boolean
  /** Admission extras (the class-attr `admits` half): params the
   *  compose door admits BEYOND the schema knobs (route stamps,
   *  renderer vocab, studio writes flattened at port time). Most
   *  cards carry none — the schema IS the surface. */
  admits?: readonly string[]
  jsonArrayParams?: readonly string[]
  /** $spell-eligible params (the `spell_params` half): file slots
   *  whose "$name" values pool for two-card-flow handoff instead of
   *  composing. Empty/absent = no spell pooling. */
  spells?: readonly string[]
  /** Extension packs the card's renderers ride (EXTENSION LAW). */
  requires?: readonly string[]
  /** Per-family extension packs — the requires_by_family declaration.
   *  Declared here on the seam owner since 2026-11-05 (card-UI audit
   *  A15: boundary types live with their owner — the former local
   *  module augmentations at each consumer are deleted; the compose
   *  door gates the active family's slice, never the flat union
   *  alone). */
  requiresByFamily?: Record<string, readonly string[]>
  /** The card's preview claims (output-component gap 4, stroke 67):
   *  `historyStrip: false` claims the bottom bar — an advanced card
   *  whose own face IS the history (h3-timeline's timeline). Served
   *  verbatim on the form-spec doc's `preview` arm; absent = the
   *  strip is ON (the QOL default).
   *
   *  `figure` (stroke 90 + the live follow-up, the keep-all-features
   *  order): the LIVE initial mesh — the native figure the mesh
   *  stage renders BEFORE any run output exists (anny's /poser
   *  shaped bind mesh, never the low-poly GLB export), RESHAPED
   *  live by the card's resolved identity/morph params (the client
   *  derives the coeff arms; the fetch rides the shared
   *  fetchBindMesh surface). Run outputs take the stage once they
   *  land; the figure is the empty state's replacement, never a
   *  second hero. */
  preview?: {
    historyStrip?: boolean
    figure?: { identityModel: string }
    /** the OPTIONAL BOTTOM SEAM (the form-seams stroke 2026-09-17):
     *  claim a scrub timeline along the shell's bottom slot, wired
     *  to the video preview's shared player. Video-output cards. */
    timeline?: boolean
  }
  /** Card-declared modifier kinds (the MODs generalization,
   *  CONTRACT A): action kinds the CARD owns (MASK's mask sources),
   *  served through the ONE
   *  features.modifiers channel beside the family-DECL pack kinds.
   *  fields/kindFields are the served spec rows (the JSON wire
   *  shape SpecField projects); options carry static catalog rows —
   *  the card IS the catalog for its action kinds. Served VERBATIM
   *  by specModifiers; the leaf never learns the declarer. */
  mods?: readonly DeclaredModifierKind[]
  /** Schemastery schema of the card params (validated before compose).
   *  The callable IS the carrier (N4 cure, 2026-10-22): schemastery
   *  schema objects are functions with `.dict` (+ `.toJSON`), so the
   *  field types the carrier bits it always had — the walk sites no
   *  longer escape through `as unknown` to read them. Cards with
   *  hand-written normalizers leave the bits unset (a card that
   *  WRAPS its schema carries the inner one at schemaCarrier). */
  schema: ((v: unknown) => Record<string, unknown>) & { dict?: Record<string, CarrierSchema>, toJSON?: () => unknown }
  /** When the registered schema is a hand-written normalizer, the
   *  underlying Schemastery object whose .dict the emitters walk
   *  (formSpec/params-emit). Cards with plain schemas leave this
   *  unset — schema is the carrier. (Ledger row 23, 2026-09-10:
   *  typed as Schema — the field's whole job is carrying .dict;
   *  the old `unknown` forced cast-throughs at every walk site.) */
  schemaCarrier?: Schema
  compose(params: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string, estate?: ComposeEstate): void
  /** Post-serialize pass — the lane's autofill-strip calibration
   *  (stripAutofill / stripEmptyAutofill). Cards whose renderer
   *  strips port the table here. */
  finalize?(graph: PromptGraph): PromptGraph
  /** THE IDENTITY RUNG — NATIVE (since 2026-09-10; the frozen ring
   *  DELETED 2026-09-18): EVERY card declares its identity inline
   *  (loadCardDefs refuses a card without one).
   *  icon is the capability-tile glyph; principles are the agent
   *  guidance lines the catalog cards arm serves (empty/absent =
   *  none — most cards carry none). */
  identity?: {
    label: string
    description: string
    genre: string
    icon?: string
    principles?: readonly string[]
  }
  /** Card-owned download rows (the mask-studio precedent): a
   *  card that is a tool, not weights (boarded: []), still needs
   *  weight bytes through the provision door — it declares them
   *  HERE (same row shape as the family DECL provisions). Family
   *  weights stay on the DECL; card tools carry their own. */
  provisions?: ProvisionRow[]
  /** THE ARM WEIGHTS (the silent-truncation law, 2026-10-09): a
   *  family-less card's pins skip the family presence gate — an
   *  absent weight used to die downstream in silence (the mask
   *  arm truncated with no voice). The card names, per RUN, which
   *  of its provision rows this merged params set actually touches
   *  (the mask card: sam2 bag labels → the sam2 row + the selected
   *  detectors' rows; an unused arm names nothing — an unused arm
   *  never blocks a run). The compose door checks each named row
   *  against the injected presence reader and refuses LOUD with
   *  the missing file + its declared fetch URL. A function like
   *  schema/compose (never serialized — the snapshot serves
   *  derived rows). Absent = no weight gate. */
  armWeights?: (merged: Record<string, unknown>) => readonly string[]
  /** THE DOWNLOAD OWNER (the family-owns-downloads order,
   * 2026-10-12): when the card's provision rows belong to a FAMILY
   * DECL (the mask card serves mask-select's export), this names
   * that family id — the missing-weight rescue then points at the
   * ONE download door with the id it accepts (provision_model
   * model=<family>). Absent = the card owns its rows and the
   * rescue names the card id, as ever. */
  provisionOwner?: string
  /** THE UNIVERSAL-SIDEBAR TRIO (sidebar_order /
   *  sidebar / sidebar_hidden half, 2026-09-10): the /v1/forms arm
   *  derives its order/plugin/sidebar_key/hidden row from the CARD,
   *  never a frozen export — one card, one row, REQUIRED (a card
   *  with no sidebar declaration is a declaration bug, refused
   *  loud by the discovery door). key is the sidebar section
   *  (the closed SIDEBAR_SECTIONS vocabulary); order is the global
   *  sidebar position (gaps are retired cards — never renumbered);
   *  hidden keeps utility cards off the rail (they still serve). */
  sidebar: {
    key: string
    order: number
    hidden?: boolean
  }
  /** THE STUDIO SURFACE (the size/layout half): the
   *  form-spec envelope's size/layout derive here — huge cards
   *  render the wide body frame, studio cards the studio frame.
   *  Absent = the plain panel (size null, layout null). */
  surface?: {
    size?: 'huge'
    layout?: 'studio'
  }
  /** THE FLOW-STAGE I/O (the stage half): the /v1/schema
   *  snapshot's per-card row derives here — the flow kinds the
   *  card consumes/produces plus whether a flow stage running this
   *  card routes a model (REQUIRED, even when false — the sfx
   *  precedent: boarding a family and requiring a stage model are
   *  different declarations). */
  flowKinds: {
    inputs: Record<string, string>
    outputs: Record<string, string>
    requiresModel: boolean
    /** THE NAMING LAW (2026-10-09, the operator's catch): one
     *  concept, one visible name. A retired spelling that old
     *  graphs still wire (image-edit's numbered image2/image3)
     *  rides here — the lattice derives its kind so historical
     *  graphs keep validating, but NO face offers it: never a
     *  form row, never a picker seat, never a tool param. The
     *  alias must still exist in the schema carrier (the same
     *  loud gate as inputs) so compose can read it. */
    legacyAliases?: Record<string, string>
  }
  flowOutputBindings?: readonly CardFlowOutputBinding[]
  /** THE DECLARED HERO (the mask hero defect, 2026-10-09): the
   *  artifact filename STEM that leads the stage gallery (the
   *  history/preview hero is gallery[0] — engine completion order,
   *  which a card saving secondary same-kind artifacts cannot
   *  control). A card whose engine saves more than its product
   *  (the mask card's manifest/crops beside mask_combined)
   *  declares the product's stem here; the harness moves the
   *  matching artifact first (exact stem, stem + "_" counter, or
   *  stem + extension). Generic mechanism, card-owned data — the
   *  engine-film lead is the precedent. Absent = engine order. */
  primaryFile?: string
}
