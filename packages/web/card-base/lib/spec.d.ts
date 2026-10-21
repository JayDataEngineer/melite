/**
 * spec.ts — @melite/card-base: THE EMISSION CONTRACT.
 *
 * A card package EMITS; the base CONSTRUCTS (operator order,
 * 2026-09-12: "The package to construct the card ui should see that
 * the card package emits an image input, then constructs the input
 * component automatically"). This module is the emission's client-side
 * shape — the served form-spec document as the base consumes it —
 * plus the PURE projections. No fetchers here (wire.ts), no
 * components (form.tsx): types and derivations only.
 *
 * THE LAYERED-PARAMS LAW (the parameter audit, 2026-09-14 — the
 * DSH settings model, subsystems/settings.md): the form-spec serves
 * the card's own SERIALIZED SCHEMA (schemastery toJSON — the SSOT,
 * one serializer server-side) and the bench's stage params ARE the
 * USER layer: a key's PRESENCE is the override mark, never its
 * value. resolveValue layers schema defaults <- model defaults <-
 * served stamps <- user — the engine's compose cascade verbatim,
 * resolved client-side so the form shows exactly what a run
 * composes. Edits are set/unset ops over the user layer; a family
 * Recipe macro pick is an ordinary multi-set of declared keys —
 * no stamp ledger, no value-compare heuristics, no heal walk
 * (seedUser's one validation clause aside).
 *
 * THE EDGE LAW (operator order, 2026-09-12: "whenever a card emits
 * via the package system, it needs to have 'input' 'required=True',
 * or 'output', so the edges are defined"): every card's emission
 * carries `inputs` — one row per declared input edge, the required
 * fact joined per the law (dsl.py Field.emit: `required: True
 * emits, False omits`) — and `outputs`, the declared output edges.
 * The base constructs input components and picker candidates from
 * THESE, never from result-URL sniffing.
 */
/** Build an envelope from raw dict nodes — the TEST-side and
 *  migration-side constructor; the served envelopes come from
 *  schemastery's own toJSON. Ids assign in insertion order; a node
 *  carrying `consts` (string labels or {value,label} rows) expands
 *  into minted const refs with the union's `list` wired to them —
 *  the shape schemastery's union-of-consts serializes to. */
export declare function schemaEnvelope(dict: Record<string, SchemaRef & {
    consts?: unknown;
}>): SchemaEnvelope;
import type { FormSpecDoc, InputEdge, ModifierKind, SchemaEnvelope, SchemaRef, SpecField, FormVariantRow } from '@melite/contracts/formSpec';
export type { FormSpecDoc, InputEdge, ModifierKind, ModifierOption, SchemaEnvelope, SchemaRef, SpecField, FormVariantRow, } from '@melite/contracts/formSpec';
import { type LaneBounds, type LaneRelations, type LaneViolation } from '@melite/contracts/laneRelations';
/** THE MOD-OWNED NAMES (the SubcardGrid law, enforced): every name a
 *  served modifier kind owns — its fields' names plus its param_key
 *  (the bag storage). CardForm EXCLUDES these from the flat param
 *  groups: mod params render ONLY inside the mod system. PURE.
 *
 *  THE SSOT DISEMBIGUATION (the voice_name brick, 2026-10-21): a
 *  name the card's own schema declares as a root leaf is a MAIN-FACE
 *  field — a pack envelope naming the same knob never steals its
 *  seat. The tts burn: the qvoice_save pack restates voice_name, the
 *  exclusion hid the card's widget leaf from the whole main face,
 *  and the lane's required-together pair could never be stated —
 *  every half-pair write refused and the studio bricked. One knob,
 *  one owner: the owner is the card's own serialized schema.
 *
 *  THE HIDDEN CARRIER ARM (the input_mask regression, caught by
 *  real-contract + modifiers suites the same day): a main leaf
 *  declaring extra.hidden is VALIDATION-ONLY — it never renders on
 *  the main face (fieldsOfEnvelope's hidden arm skips it), so
 *  releasing its name to the main face would orphan the visible
 *  knob entirely. image-edit's input_mask: a hidden flow-gate
 *  carrier on the card, the VISIBLE Region Mask row on the mask
 *  pack (the operator's one-list merge, 2026-10-10). A hidden main
 *  leaf keeps its pack ownership; only a SERVED main leaf claims
 *  the name. */
export declare function modOwnedFields(spec: FormSpecDoc): Set<string>;
/** Is this kind an OPTION kind (lora-shaped: served catalog rows) —
 *  as opposed to a FIELD kind (mask-shaped: its own param fields)? */
export declare function isOptionKind(k: ModifierKind): boolean;
/** THE HYBRID TEST (the served entry mode — never the kind name):
 *  catalog rows AND bag-element entry fields. */
export declare function isHybridKind(k: ModifierKind): boolean;
/** The catalog-bound field (the hybrid type / the option id) —
 *  'id' when the door serves no key (the lora backstop). */
export declare function optionKeyOf(k: ModifierKind): string;
/** The scalar dial of a bag element (the pack's own name —
 *  'strength' backstop when the door serves none). */
export declare function scalarKeyOf(k: ModifierKind): string;
/** One catalog card (/v1/model-catalog's cards section). */
export interface CatalogCard {
    id: string;
    label: string;
    description: string;
    genre: string;
    families: string[];
}
/** THE TITLE-CASE FACE (the operator's sweep law): machine ids
 *  (krea-2, z-image, euler, comfyui…) render titled — never raw.
 *  FACES ONLY: option values, param keys, and wire bodies keep the
 *  verbatim id (the 1:1 law — the eye gets prose, the door gets the
 *  id). First letter of each separator-bound word upper, the rest
 *  untouched (INT8 stays INT8); idempotent on titled prose. */
export declare function titleCaseId(id: string): string;
export type SpecValues = Record<string, unknown>;
/** THE SCHEMA LAYER's declared defaults (fieldsOfEnvelope's output —
 *  resolveValue's first layer; the base never invents one). */
export declare function specDefaults(fields: SpecField[]): SpecValues;
/** ── THE UNSET-FACE LAW (hour 22 — the operator's catch: "steps is
 *  blank… the UI doesn't even reflect the call that will be sent") ──
 *
 * An unset field serializes ABSENT from the wire doc and the
 * ADMISSION GATE fills the SCHEMA'S OWN DEFAULT at compose. Every
 * face must therefore show EXACTLY what composes for an unset field:
 * the explicit inherited stamp first (a run-level override sitting
 * over the floor), else the schema's declared default, else nothing
 * — a bare "inherit" is honest ONLY when no schema truth exists.
 * ONE law in the generic surface; no face hand-rolls this chain
 * again (the h3 knob fold's private copy silently dropped the
 * default and showed "inherit" while the engine sent 12). PURE. */
export type UnsetFace = {
    composed: string | undefined;
    from: 'stamp' | 'schema' | 'none';
};
export declare function composeUnset(inherited: unknown, schemaDefault: unknown): UnsetFace;
export declare function unsetFaceLabel(face: UnsetFace): string;
/** The unset face's PROSE (the tooltip): names in words what unset
 *  composes. `render` adapts the vocabulary (e.g. boolean on/off). */
export declare function unsetFaceTip(face: UnsetFace, render?: (v: string) => string): string;
/** ── THE ENVELOPE WALKER ─────────────────────────────────────────
 *
 * One pure projection: serialized schemastery schema -> derived
 * SpecFields. Every presentation fact lives in the nodes' meta (the
 * declaration IS the UI contract — the Field.emit law); this
 * walk reads, never invents. THE ORDER: dict insertion order with
 * the declared `order` hint as tie-break (a stable sort — equal
 * keys keep insertion order).
 *
 * Families scoping: a node whose extra.families names families the
 * spec does NOT serve skips (the absorption is family-scoped —
 * the card serves only the boarded plane).
 *
 * Nullable pairs: a union of [X, const(null)] wires as X — the
 * OUTER meta wins (schemastery's nullable() shape, probed live on
 * image-gen 2026-09-14).
 *
 * Presentation types (the audit's client-side derivation — a view
 * choice over typed meta, never a server row): extra.wtype wins
 * (declared presentation); union-of-consts -> select; number ->
 * step 1 -> seed, any other step -> slider, no step -> slider;
 * string -> text; boolean -> boolean; array -> loras.
 *
 * Option labels: a union's const members carry their own
 * meta.description (the emitter's label law) — the declared
 * extra.options override when present. */
export declare function fieldsOfEnvelope(env: SchemaEnvelope | null | undefined, family?: string): SpecField[];
/** THE HYBRID PROJECTION (the controlnet restoration): the envelope
 *  root's bag array (param_key) holds entry OBJECTS — project the
 *  ELEMENT's dict as the kind's entry fields (the catalog select
 *  joins them in the leaf). Empty when the bag is absent or its
 *  element is not an object (a pure OPTION kind like lora). */
export declare function entryFieldsOfEnvelope(env: SchemaEnvelope | null | undefined, paramKey: string, family?: string): SpecField[];
/** THE PACK-LEVEL PROJECTION (the controlnet strength floor): the
 *  envelope root's fields OUTSIDE the bag array — the section's own
 *  rows above the tiles. Bag-external arrays are not section rows
 *  (no atom renders a bag) — scalars only. */
export declare function kindScalarFieldsOfEnvelope(env: SchemaEnvelope | null | undefined, paramKey: string, family?: string): SpecField[];
/** THE EDIT COERCION (the one specPatch duty that survives, moved
 * to the edit boundary): atoms emit raw strings while typing; a
 * numeric field's edit rides the user layer as a NUMBER. An
 * unparseable/empty numeric string rides VERBATIM (display
 * continuity through clear-and-retype — the bench drill's law; a
 * blank that reaches the run's schema parse refuses loud, naming
 * the field — never a silent 0). `v === undefined` stays undefined
 * (the tri-state's inherit — the caller's unset signal). The
 * STUDIOS' blank-inherits law lives one door up, at their own edit
 * verb (useResolvedForm) — each face owns its blank semantics.
 * PURE. */
/** THE NUMERIC PARSE, shared by both blank laws (2026-10-13, the card-UI
 *  duplication audit): a finite parse is a number, anything else is
 *  NOT one. The blank SEMANTICS then differ by seat and stay there —
 *  this file rides an unparseable value VERBATIM (never a silent 0),
 *  while the drill modal keeps the prior value (a typed "x" must
 *  never reach a number param). One parse, two named laws; the two
 *  copies of the parse itself are gone. */
export declare function parseNumericInput(v: string): number | undefined;
export declare function coerceFieldEdit(f: SpecField | undefined, v: unknown): unknown;
/** THE FAMILY-KEY RESOLUTION (the families-DRY law, 2026-09-21):
 * a field's `families` declares BASE family ids — the card's
 * boarded ids — while the served model key may be a COMPOSED
 * catalog row (family-variant-quant, e.g. 'pixal3d-1536-int8').
 * Resolve the active key to its base against the spec's OWN
 * boarded-families rows: the longest id matching the key at a
 * '-' boundary wins (a 'pixal3d' + 'pixal3d-pro' board resolves
 * to the longer). An unresolved key passes through verbatim —
 * single-family cards and keys with no boarded base walk
 * unchanged; the resolution never drops a field, it only widens
 * what a declared base id covers. */
export declare function resolveFamilyKey(spec: FormSpecDoc): string | undefined;
/** The card's own derived fields (the schema envelope walked,
 * families-scoped to the served family). Memoize at the caller for
 * hot loops — the walk is pure. */
export declare function fieldsOf(spec: FormSpecDoc): SpecField[];
/** THE LAYERED RESOLUTION — the engine's compose cascade mirrored
 * client-side (stroke 34 — the card-recipe layer is dead): schema
 * defaults <- model defaults <- SERVED STAMPS <- user. The form
 * SHOWS exactly what a run composes; `user` rides verbatim by key
 * presence (a PRESENCE is the override mark, never its value — the
 * settings law). Arrays (lora bags) and nulls in model_defaults
 * skip, matching the engine's overlay filter.
 *
 * THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): `base` is the
 * stage row's `resolved` map — prepareCardParams' own stamped +
 * lifted body, served by the drafts doors. It layers UNDER the user
 * (presence still wins) and OVER model_defaults (the server's own
 * family/variant stamps replace the client's guesses — variant
 * resolver_defaults, family defaults, the surface filter). Absent
 * base = the registry-less lane derive. PURE. */
export declare function resolveValue(spec: FormSpecDoc, user: SpecValues, base?: SpecValues): SpecValues;
/** evalVisibleWhen's serving shape: "key=value" guards, `&`-ANDed;
 * one guard's value may be a `|`-SET ("key=a|b" = key ∈ {a,b}).
 * (The ONE schema grammar — a field declares its own visibility;
 * the walker interprets, cards never hand-rolled predicates.) A
 * field with no visible_when always shows. Unknown guard keys:
 * show (never hide on a typo). Examples:
 *   "sharpen_enabled=true"
 *   "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass" */
export declare function fieldVisible(f: SpecField, values: SpecValues): boolean;
/** THE CONDITIONAL-REQUIRED (2026-10-12, the operator's catch: the
 *  mask card's sam3 prompt threw at compose while the form showed a
 *  lawful-looking optional blank): a field the compose demands only
 *  in some states declares WHICH through the SAME grammar
 *  fieldVisible interprets — the required star paints exactly when
 *  the guards hold. `required: true` stays the unconditional face;
 *  this is its scoped sibling, never a second interpreter. */
export declare function fieldRequired(f: SpecField, values: SpecValues): boolean;
/** The resolved lane surface for the current variant, or null when
 *  the family declares none (the legacy truth — visibility falls
 *  back to visible_when). `variantId` is the RESOLVED variant
 *  value (values.variant); an unknown id inherits the family base
 *  verbatim (a Quant-only or unset axis). */
export declare function laneSurfaceFor(spec: FormSpecDoc, variantId: string | null, quantId?: string | null): readonly string[] | null;
/** The relation words that judge the resolved lane: the family's
 *  own + the variant's own (both layers fire — the DECL cascade). */
export declare function laneRelationsFor(spec: FormSpecDoc, variantId: string | null): LaneRelations[];
/** The numeric bounds that judge the resolved lane: family rows,
 *  per-field replaced by the variant's own (the DECL cascade's
 *  replace-law for numbers). */
export declare function laneBoundsFor(spec: FormSpecDoc, variantId: string | null): LaneBounds | null;
/** Field visibility UNDER the lane contract: a declared surface
 *  hides every field it does not name (the declaration is the
 *  author — the field set IS the variant); a family that declares
 *  no surface keeps the visible_when grammar. */
export declare function fieldOnLane(spec: FormSpecDoc, paramName: string, values: SpecValues): boolean;
/** THE INLINE GATE: the lane's relation + surface violations over
 *  what the state CARRIES — rendered under the named field while the
 *  user types, refused by the bench door when the state is saved.
 *  Empty = a state the run accepts.
 *
 *  THE CARRIED LAYERS, NOT THE RESOLVED MAP (2026-10-10, the
 *  form-plane audit's CRITICAL-1): the resolved `values` map
 *  materializes schema defaults and model_defaults as own
 *  properties, so a defaulted field reads as STATED whether the user
 *  ever touched it. On a lane that excludes a defaulted field that
 *  produced a perpetual, UNCURABLE warning: the row was hidden
 *  (fieldOnLane) so the cure ("drop it") was unclickable, and
 *  unsetting it re-materialized the default. The bench judges the
 *  PREPARED body — the operator's own params plus the stamps that
 *  survive the null-skip — so the form judges the same thing: the
 *  user layer over the base layer, non-null keys only. A schema
 *  default is a PREFILL the operator never sent, and a variant's
 *  `voice: null` stamp is exactly how the bench says "no persona on
 *  this lane". */
export declare function laneViolations(spec: FormSpecDoc, fields: readonly SpecField[], user: SpecValues, base?: SpecValues): LaneViolation[];
/** Group the visible fields (the spec's own group key, first-appearance
 *  order — ungrouped first under no heading). */
export declare function groupFields(fields: SpecField[], values: SpecValues): Array<{
    group: string | null;
    fields: SpecField[];
}>;
/** The declared input edge for a param, if the emission names one
 *  (THE EDGE LOOKUP — the constructor's one way to know a field is
 *  slot-shaped: the DECLARATION says so, the wtype never guesses). */
export declare function inputEdgeOf(spec: FormSpecDoc, paramName: string): InputEdge | undefined;
/** The axis groups in declaration order: features.variant_groups'
 *  key order when the door serves it, else the rows' distinct groups
 *  in first-seen order. Empty group names never ride. The Recipe
 *  group never rides (the recipe-axis yield above). */
export declare function axisGroups(spec: FormSpecDoc): string[];
/** The variant_groups contract's keys, in served order (the door
 *  serves it under features when the family declares axis groups). */
export declare function variantGroupsContract(spec: FormSpecDoc): string[];
/** One axis' rows (served order). AN ALIAS IS AN ADDRESS, NEVER AN
 *  OFFER (the duped-variant cure, 2026-10-21): the synthesized
 *  family-address row (`<lane>__head`) rides spec.variants so drafts
 *  naming the family address resolve, but no pick, ground, or chain
 *  may seat it — the door refuses its id against the family matrix,
 *  so an offered alias is a trap row. Direct spec.variants reads
 *  (address resolution, walls) still see it. */
export declare function rowsFor(spec: FormSpecDoc, group: string): FormVariantRow[];
export declare function composingRows(spec: FormSpecDoc, group: string, active: Record<string, string | undefined>): FormVariantRow[];
/** The Variant axis' rows (group 'Variant', served order). */
export declare function variantRows(spec: FormSpecDoc): FormVariantRow[];
/** The Quant cells composing with a variant (THE CHAIN). */
export declare function quantRowsFor(spec: FormSpecDoc, variantId: string | null): FormVariantRow[];
/** The Model select's options (stroke 21, the operator's law:
 *  "WHY IS KREA-2 AND KREA-2-RAW MODELS! THAT IS A VARIANT") — THE
 *  FAMILY THE SPEC SERVES, full stop. A variant row's re-point
 *  (krea-2-raw) is the DECL's compose stamp, resolved server-side
 *  into the run's params — it is NOT a model and never renders as
 *  one. The rail's other options are the card's boarded families
 *  (spec.families, served from the card package). */
export declare function modelChoices(spec: FormSpecDoc): string[];
/** THE ACTIVE-ENTRY LAW (activeVariantId, generalized to the served
 *  shape): a row is active when its re-pointed model (defaults.model
 *  ?? route) matches the held `model` value AND its owner chain
 *  holds. Nothing matches → undefined (the caller falls to the first
 *  composing row — the catalog's first-declared law). */
export declare function activeVariantId(spec: FormSpecDoc, values: SpecValues, group: 'Variant' | 'Quant'): string | undefined;
/** The ACTIVE RECIPE (the dropdown's selection state, derived from
 * the ONE truth -- never a persisted key): a recipe row is active
 * when EVERY key its pick stamps (axisPickPatch, minus the durable
 * axis keys -- the run door refuses an undeclared `recipe` param)
 * deep-equals the user layer's held value. Stamp-for-stamp matches
 * are naturally exclusive (a two-row bag matches only the row that
 * stamps two rows); first-declared wins on a tie. NOTHING matches ->
 * undefined (the dropdown shows its placeholder -- a hand-edited
 * layer is not a recipe, and the form never lies about it). */
export declare function activeRecipeId(spec: FormSpecDoc, values: SpecValues): string | undefined;
/** One group's active row under the owner chain (inner recursion of
 *  activeVariantId — Variant resolves first, chained groups after). */
export declare function activeRowId(spec: FormSpecDoc, values: SpecValues, group: string, active: Record<string, string | undefined>): string | undefined;
/** THE AXIS STAMP VOCABULARY (2026-09-29, caught LIVE by the
 *  compose gate in the CI seat: the client stamped the Quant row's
 *  composed catalog id — 'raw__int8' — where the door's contract
 *  speaks the CELL's quant field — 'int8'; the gate refused with the
 *  door's own voice and the write never left the studio, which is
 *  exactly the law working). The value an axis pick stamps on the
 *  durable key is the value the DOOR reads: the variant id for
 *  Variant, the cell quant for Quant. Never the flat-catalog id.
 * PURE. */
export declare function axisStampOf(row: FormVariantRow): string;
/** The durable param key an axis rides (the group's id, lowercased —
 *  'variant', 'quant', 'recipe', 'precision'). */
export declare function axisKey(group: string): string;
/** THE ROW'S OWN STAMP (the pill-offer law, 2026-11-08 — the
 *  combinations-sweep live catch): what the row ITSELF writes — its
 *  defaults minus the model re-point (the transport's word, never the
 *  user layer's) minus the durable axis key when the group rides no
 *  axis (the vocabulary guard's mirror). The envelope reconcile is
 *  the NEW choice's truth, never the row's voice — judging the
 *  reconciled pick patch offers stamp-less rows under a served
 *  envelope (Default rendered live, picked, and no row could ever
 *  show active — the face stayed '-- recipe --'). The menu offers
 *  exactly the rows whose own stamp is non-empty. PURE. */
export declare function ownStampOf(spec: FormSpecDoc, row: FormVariantRow): SpecValues;
/** A pick's full value patch — the old onPick law: the row's
 *  `defaults` overlay rides (model re-point + every resolver default),
 *  plus the durable axis keys themselves so a reopened stage restores
 *  its selects. Picking a row also re-seeds the axes BELOW it (their
 *  first composing row). */
export declare function axisPickPatch(spec: FormSpecDoc, row: FormVariantRow, held?: SpecValues): SpecValues;
/** A model switch's full value patch (the stale-variant cure,
 *  operator 2026-09-14: model anima + variant turbo refused at
 *  compose — a switch that keeps the old family's axes is a broken
 *  stage). Every axis re-seeds to its FIRST row re-pointing at the
 *  new model (else its first composing row), and the picked rows'
 *  defaults overlay rides (raw → {model, steps, cfg} — the pick
 *  law, same as axisPickPatch). THE OVERRIDE LAW (2026-11-05, the
 *  multi-level cure): with `held` the switch lands the SEEDED
 *  variant's envelope keys on the new choice's own truth
 *  (reconcilePick), and a CROSS-FAMILY switch nulls the departing
 *  vocabulary — every envelope key this spec's rows name that the
 *  patch does not own (the unset law: null deletes at compose; the
 *  new family's seed re-derives on spec-land, never the departed
 *  family's 52 riding under a 4-step distill). The caller writes
 *  every key through onEdit. PURE. */
export declare function modelSwitchPatch(spec: FormSpecDoc, model: string, held?: SpecValues, arrival?: FormSpecDoc): SpecValues;
/** THE SWITCH-FRAME MERGE, ONE HOME (the drill null-set cure,
 *  2026-11-08 — the P4 merge-order half): a caller's frame merges
 *  UNDER a switch patch, but the patch's NULL verdicts — the
 *  departed-surface keys the verb deleted — BEAT the frame: an
 *  incoming frame that re-plants a departed stamp (a recipe re-point
 *  carrying the departed recipe key) dies here, and every other
 *  frame key keeps the caller-wins law. The single spelling both the
 *  drill's per-key seam and the walls ride; re-implementing the
 *  spread locally is how the caller-wins order silently grew.
 *  @param patch the switch verb's patch (its nulls are verdicts).
 *  @param frame the caller's own keys — they win except under a null
 *  verdict. */
export declare function mergeSwitchFrame(patch: SpecValues, frame: Record<string, unknown>): Record<string, unknown>;
/** THE EMPTY-SELECTION LAW's authoring decision (2026-10-10, the
 *  operator's live bench: a stage carrying quant:"" — born when a
 *  model switch CLEARED the axis to '' — which the RUN door refused:
 *  'unknown quant "" for model "z-image" variant "turbo" (known:
 *  int8)'). A stated EMPTY selection is UNSTATED: the authoring
 *  seat unsets the key instead of writing the empty string, so
 *  compose defaults the cell. ONE pure decision, shared by the seed
 *  (seedAxisValues omits) and the write (the drill's onSet unsets)
 *  — the form's rendering is untouched (a missing axis key reads
 *  as '' on screen). */
export declare function axisUnset(name: string, v: unknown, spec: FormSpecDoc | null): boolean;
/** Seed the axis keys for a fresh stage (the catalog's first-declared
 *  law: each axis defaults to its FIRST composing row). Held values
 *  win (a reopened stage never re-seeds). The key a re-seed WRITES is
 *  the value the DOOR reads (axisStampOf) — never the flat row id. */
export declare function seedAxisValues(spec: FormSpecDoc, held: SpecValues): SpecValues;
/** Seed a stage's USER layer from its held params (the bench's
 * stage.params — the only migration seam). Presence-based, per the
 * settings law: every HELD key rides verbatim (the override marks
 * survived the reopen), the absent axis keys seed per the axis law
 * (seedAxisValues above — first composing row, one direction).
 *
 * THE ONE VALIDATION CLAUSE (never value-compare): a held `recipe`
 * the card's schema does not declare is poison — the dead
 * card-recipe layer's stamp (strokes 33+34). Dropped on open, so
 * the run flush's null-domain half deletes the bench key and the
 * card composes again. Everything else rides untouched.
 *
 * PURE — the caller owns the write (onSet per fresh key). */
export declare function seedUser(spec: FormSpecDoc, held: SpecValues): SpecValues;
/** THE MODEL-REKEY RESEAT (order d, operator 2026-11-06: "model-switch
 *  leaves stale cfg 3.5 outside the new lane envelope [1,2] — re-seat
 *  envelope-bound params to new lane defaults on switch"). The
 *  cross-family null set in modelSwitchPatch reads only the
 *  DEPARTING spec's envelope keys — an envelope-less departure
 *  (anima/z-image/h3) nulls nothing, so a stated cfg 3.5 rides the
 *  seed VERBATIM into the arrival family's first lane (krea-2
 *  turbo, cfg [1,2]) and every door refuses it. This verb runs at
 *  the ARRIVAL re-spec seed's re-key arm only: the seeded user
 *  layer's envelope-bound numerics reconcile against the RESOLVED
 *  VARIANT's envelope (overrideEnvelopeKeys — outside clamps to the
 *  nearest bound, absent keys seed from the offered row's own
 *  truth), exactly what a pick at that seat would do. A fresh open
 *  NEVER rides it (the reopen rides verbatim — seedUser's law).
 *  PURE — the caller owns the write. */
export declare function reseatEnvelopeKeys(spec: FormSpecDoc, seeded: SpecValues): SpecValues;
/** THE RECIPE BIRTH-STAMP (D12, 2026-10-23, the operator's "Default
 *  needs to be a 4 step LORA"; k 2026-11-08 — the initial-recipe
 *  law): a fresh card is born stamped with the DECLARED default
 *  Recipe row's payload — `features.variant_groups.Recipe.default`
 *  (served from the DECL's variant_groups by groupContract), never
 *  the first row by declaration order (row order is presentation;
 *  the old first-composing law was row-order-emergent state). No
 *  declaration, or a declaration naming no composing row → BLANK:
 *  nothing stamps. The axis seed writes axis KEYS only
 *  (seedAxisValues — and the Recipe group YIELDS, never an axis),
 *  and compose never applies recipe wire_defaults server-side (the
 *  card carries recipe as a rider); without this, a payload-carrying
 *  default recipe would compose unstamped. The stamp mirrors the
 *  pick verb (axisPickPatch minus the re-point: the `model` route
 *  resolves server-side, never lands in the user layer) for keys
 *  the seed does not hold — seeded axes win, so a DECL-authored
 *  axis key inside a payload can never corrupt the chain. The bag
 *  rides the USER layer on purpose (resolveValue skips base/model
 *  arrays — a resolver-stamped bag would compose invisible). PURE —
 *  the caller owns the write (the add door). */
export declare function seedRecipeStamp(spec: FormSpecDoc, seeds: SpecValues): SpecValues;
/** THE BLANK RECIPE WRITE (k, 2026-11-08): picking "no recipe" is a
 *  real write, not a face. Every key the ACTIVE row stamps that the
 *  held layer still carries at the stamp value unstated (null
 *  deletes at compose) — the D4 departed-preset law applied to a
 *  departure-to-nothing: a key the user hand-edited away from the
 *  stamp is the user's word and stands (deepEqualJson, the F3 fix —
 *  `===` never matched an array bag). NEVER a persisted `recipe`
 *  key (the dead card-recipe layer; the compose door refuses the
 *  undeclared param). PURE — the caller owns the write. */
export declare function recipeDeparturePatch(row: FormVariantRow, held?: SpecValues): SpecValues;
/** The door's variant resolution, ONE spelling (the dragbar clamp,
 *  2026-10-13): the stated variant matched by id OR route over the
 *  matrix, else pool[0] — the row whose sampler_envelope the
 *  judge and the form's dragbar clamps BOTH read. Undefined only
 *  when the pool itself is empty (an all-Recipe matrix) or the
 *  stated id misses the matrix (the miss voice is composeValidate's
 *  own). A hidden row cannot occur on a served matrix; if a caller
 *  hands one, the row resolves exactly as the pre-consolidation
 *  pool read it (hide flags were never the mirror's pool law).
 *  @param all the spec's full variants array, cells included.
 *  @param doc the resolved display doc (the held variant key). */
export declare function offeredVariantOf(all: readonly FormVariantRow[], doc: Readonly<Record<string, unknown>>): FormVariantRow | undefined;
export interface ComposeViolation {
    /** the door's own voice — the same message the estate would send,
     *  prefixed by the gate that caught it (BEFORE the wire). */
    message: string;
    /** the named field when the producer knows it exactly (the mirror
     *  and family clauses name keys the surface does not own) — the
     *  drill's banner rides it to the field's unstamp affordance (SD-7:
     *  a banner that names a field the form does not render must let
     *  the words ACT, never refuse without cure). */
    field?: string;
}
/** THE REOPEN CARRY DROP (the stale-carry reopen cure, 2026-10-21 —
 *  the saved-doc heal). dropStaleAxisCarry seats the prev ∩ ¬next
 *  drop at the PICK only; a SAVED doc that arrives already resolved
 *  to a lane its stated keys do not serve (written by an older door,
 *  patched by the agent, restored from an older save) rides ghosts
 *  the press gate refuses forever — the user never typed the key on
 *  THIS lane, so no unstamp affordance exists for it. The reopen
 *  derives the drop from the RESOLVED surface alone: every STATED
 *  key the resolved lane cannot state — not on its surface, not a
 *  mod bag's param_key, not transport (model + axis keys) — is dead
 *  carry BY CONSTRUCTION: the form renders no widget for it and the
 *  estate door refuses off-lane writes, so a saved doc never carries
 *  fresh authoring there. Blank carried keys have nothing to drop; a
 *  carrier with no lanes block (or a surface-less family) drops
 *  nothing — never a guess. PURE — the caller owns the write: the
 *  drill's open effect flushes the nulls through the ledger like a
 *  pick's drop (a null deletes the bench key).
 *  @param spec the doc's served form-spec.
 *  @param held the SAVED doc the drill opened.
 *  @returns the null-patch for the dead carried keys ({} when the
 *    doc is already stateable on its resolved lane). */
export declare function dropStaleReopenCarry(spec: FormSpecDoc, held: SpecValues | undefined): Record<string, null>;
export declare function composeValidate(spec: FormSpecDoc | null, doc: SpecValues): ComposeViolation[];
/** Compose the CANDIDATE doc the door would judge: the bench row's
 *  held params, the user layer's overrides, then the in-flight frame
 *  — later layers win, and a null value DELETES the key (the wire's
 *  own unset law). This is composition: the full doc, assembled
 *  where the edit happens, so the law can run BEFORE the write. */
export declare function composeCandidateDoc(held: SpecValues, user: SpecValues, frame: Record<string, unknown>): SpecValues;
//# sourceMappingURL=spec.d.ts.map
